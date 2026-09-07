import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import CustomDatagrid2 from '../components/CustomDatagrid2';
import useTableState from '../hooks/useTableState';
import {
  Box,
  Typography,
  Button,
  Chip,
  Alert,
  Stack,
  Menu,
  MenuItem,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import ReplayTwoToneIcon from '@mui/icons-material/ReplayTwoTone';
import MoreVertTwoToneIcon from '@mui/icons-material/MoreVertTwoTone';
import SearchInput from '../components/SearchInput';
import { downloadFile } from '../api/client';
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import AssetDetailDrawer from '../components/AssetDetailDrawer';
import CreateAssetDialog from '../components/CreateAssetDialog';
import WorkOrderDetailDrawer from '../components/WorkOrderDetailDrawer';
import { useAuth } from '../context/AuthContext';
import { useDispatch, useSelector } from '../store';
import { getAssetChildren, resetAssetsHierarchy } from '../slices/asset';
import { assetsApi } from '../api/assets';
import { workOrdersApi } from '../api/workOrders';
import type { AssetResponse, WorkOrder } from '../types';
import { ApiRequestError } from '../api/client';
import { ASSET_STATUS_LABELS, ASSET_STATUS_COLORS } from '../constants';

/** Fila del grid: el activo mas su profundidad en el arbol. */
type AssetRow = AssetResponse & { depth: number };

/** Igual que PAGE_SIZE real: cuantos nodos raiz se piden por pagina. */
const PAGE_SIZE = 40;

export default function AssetsPage() {
  const { hasCreatePermission } = useAuth();
  const [view, setView] = useState<'list' | 'hierarchy'>('hierarchy');
  // La jerarquia vive en el store como LISTA PLANA, igual que en Atlas:
  // cada activo trae su parentAssetId y el arbol se arma al dibujar.
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { assetsHierarchy, childrenPages, loadingHierarchy } = useSelector((state) => state.assets);
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [allAssets, setAllAssets] = useState<AssetResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');
  // Paginacion de la RAIZ en vista jerarquica. El original la maneja con la
  // paginacion del propio grid: los hijos usan "cargar mas", pero los nodos
  // raiz se recorren por paginas.
  const [rootPage, setRootPage] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const tableState = useTableState({ prefix: 'assets' });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetResponse | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetResponse | null>(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);

  async function loadAssets() {
    setLoading(true);
    setError(null);
    try {
      if (view === 'hierarchy') {
        // Igual que el efecto real: al entrar se piden solo los nodos raiz
        // (id = 0). Los hijos llegan al expandir, no de golpe.
        dispatch(resetAssetsHierarchy());
        await dispatch(getAssetChildren(0, rootPage.pageIndex, rootPage.pageSize));
      } else {
        const response = await assetsApi.list({ size: 100, search: search || undefined });
        setAssets(response.content);
        setAllAssets(response.content);
        setTotalElements(response.totalElements);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudieron cargar los activos');
    } finally {
      setLoading(false);
    }
  }

  // Catalogo completo para el selector de "activo padre" del formulario:
  // la vista jerarquica solo tiene los nodos cargados, y en lista solo la
  // pagina actual.
  useEffect(() => {
    assetsApi
      .list({ size: 500 })
      .then((r) => setAllAssets(r.content))
      .catch(() => setAllAssets([]));
  }, []);

  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, search, rootPage]);


  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /**
   * Copia fiel de getHierarchicalData real: aplana la lista segun lo que
   * este expandido. Cada nodo se agrega, y si esta abierto se insertan sus
   * hijos justo debajo con un nivel mas de sangria.
   */
  function getHierarchicalData(
    flatList: AssetResponse[],
    parentId: number | null = null,
    depth = 0
  ): AssetRow[] {
    let result: AssetRow[] = [];

    const nodes = flatList.filter((item) =>
      parentId === null ? !item.parentAssetId : item.parentAssetId === parentId
    );

    for (const node of nodes) {
      result.push({ ...node, depth });
      if (expanded.has(node.id)) {
        const children = getHierarchicalData(flatList, node.id, depth + 1);
        if (children.length > 0) {
          result = [...result, ...children];
          // Copia fiel del real: la fila "cargar mas" se inserta DESPUES de
          // los hijos, como una fila mas del grid -- no como un boton suelto.
          if (hasMorePages(node.id)) {
            result.push({
              id: `load-more-${node.id}`,
              name: 'Cargar más',
              depth: 0,
              isLoadMoreRow: true,
              parentId: node.id,
            } as unknown as AssetRow);
          }
        }
      }
    }
    return result;
  }

  /** Igual que hasMorePages real: quedan hijos por traer de ese padre. */
  function hasMorePages(id: number): boolean {
    const page = childrenPages[id];
    return !!page && !page.last;
  }

  /**
   * Copia fiel de handleToggleExpand real: al abrir un nodo por primera
   * vez se piden sus hijos al servidor; si ya estan en el store, solo se
   * alterna el estado.
   */
  async function handleToggleExpand(asset: AssetResponse) {
    const isExpanded = expanded.has(asset.id);
    if (!isExpanded) {
      const hasChildrenLoaded = assetsHierarchy.some((a) => a.parentAssetId === asset.id);
      if (!hasChildrenLoaded) {
        await dispatch(getAssetChildren(asset.id, 0, 20));
      }
    }
    toggleExpand(asset.id);
  }

  /** Filas aplanadas para el grid, con su profundidad. */
  const tableData: AssetRow[] = useMemo(
    () =>
      view === 'hierarchy'
        ? getHierarchicalData(assetsHierarchy)
        : assets.map((a) => ({ ...a, depth: 0 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, assets, assetsHierarchy, expanded],
  );

  /**
   * Las 17 columnas del grid real, en su mismo orden y con sus tamaños
   * exactos. La primera (expander) solo aparece en vista jerarquica.
   */
  const columns: ColumnDef<AssetRow>[] = [
    {
      id: 'expander',
      header: '',
      cell: ({ row }) => {
        const asset = row.original;
        const isExpanded = expanded.has(asset.id);
        const hasSubRows =
          asset.hasChildren || assetsHierarchy.some((a) => a.parentAssetId === asset.id);
        if (!hasSubRows) return <Box sx={{ width: 24 }} />;
        return (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleExpand(asset);
            }}
            sx={{ padding: 0.5 }}
          >
            {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        );
      },
      size: 50,
    },
    { accessorKey: 'customId', header: 'ID', cell: (i) => (i.getValue() as string) || '', size: 100 },
    {
      accessorKey: 'name',
      header: 'Nombre',
      // La sangria del arbol va en esta celda, segun la profundidad.
      cell: (info) => {
        const row = info.row.original as AssetRow & { isLoadMoreRow?: boolean; parentId?: number };
        // La fila "cargar mas" se dibuja como boton dentro de esta celda.
        if (row.isLoadMoreRow) {
          return (
            <Box sx={{ py: 1, fontWeight: 'bold' }}>
              <Button
                size="small"
                variant="text"
                disabled={loadingHierarchy}
                onClick={(e) => {
                  e.stopPropagation();
                  if (row.parentId) {
                    dispatch(getAssetChildren(row.parentId, (childrenPages[row.parentId]?.number ?? 0) + 1, 20));
                  }
                }}
              >
                {info.getValue() as string}
              </Button>
            </Box>
          );
        }
        return (
          // Sangria en pixeles, igual que el real: depth * 24, y solo en
          // vista jerarquica.
          <Box sx={{ py: 1, fontWeight: 'bold', ml: view === 'hierarchy' ? `${row.depth * 24}px` : 0 }}>
            {info.getValue() as string}
          </Box>
        );
      },
      size: 200,
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: (info) => {
        const estado = info.getValue() as AssetResponse['status'];
        return (
          <Chip
            label={ASSET_STATUS_LABELS[estado]}
            size="small"
            color={ASSET_STATUS_COLORS[estado]}
            variant="outlined"
          />
        );
      },
      size: 120,
    },
    { accessorKey: 'locationName', header: 'Localización', cell: (i) => (i.getValue() as string) || '', size: 150 },
    {
      accessorKey: 'imageUrl',
      header: 'Imagen',
      cell: (info) =>
        info.getValue() ? (
          <img
            style={{ borderRadius: 5, maxHeight: 36, maxWidth: '100%', objectFit: 'cover' }}
            src={info.getValue() as string}
            alt=""
          />
        ) : null,
      size: 100,
    },
    { accessorKey: 'area', header: 'Área', cell: (i) => (i.getValue() as string) || '', size: 100 },
    { accessorKey: 'model', header: 'Modelo', cell: (i) => (i.getValue() as string) || '', size: 120 },
    { accessorKey: 'barCode', header: 'Código de barras', cell: (i) => (i.getValue() as string) || '', size: 120 },
    { accessorKey: 'categoryName', header: 'Categoría', cell: (i) => (i.getValue() as string) || '', size: 120 },
    { accessorKey: 'description', header: 'Descripción', cell: (i) => (i.getValue() as string) || '', size: 250 },
    { accessorKey: 'primaryUserName', header: 'Usuario principal', cell: (i) => (i.getValue() as string) || '', size: 150 },
    {
      id: 'assignedTo',
      header: 'Usuarios asignados',
      cell: ({ row }) => (row.original.assignedUsers ?? []).map((u) => u.name).join(', '),
      size: 150,
    },
    {
      id: 'teams',
      header: 'Equipos',
      cell: ({ row }) => (row.original.teams ?? []).map((t) => t.name).join(', '),
      size: 150,
    },
    {
      id: 'vendors',
      header: 'Proveedores',
      cell: ({ row }) => (row.original.vendors ?? []).map((v) => v.name).join(', '),
      size: 150,
    },
    { accessorKey: 'parentAssetName', header: 'Activo padre', cell: (i) => (i.getValue() as string) || '', size: 150 },
    {
      accessorKey: 'createdAt',
      header: 'Fecha de creación',
      cell: (info) => new Date(info.getValue() as string).toLocaleDateString(),
      size: 140,
    },
  ];

  return (
    <>
      {/* Estructura de la cabecera real: el buscador a la IZQUIERDA y las
          acciones a la derecha, separados por justifyContent="space-between". */}
      <Box
        my={1}
        display="flex"
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        {/* Copia fiel de onQueryChange real: NO hay selector de vista. Al
            escribir se pasa a lista plana, y al vaciar el campo vuelve al
            arbol -- un arbol no sirve para mostrar resultados de busqueda,
            porque los coincidentes estan en niveles distintos. */}
        <SearchInput
          value={search}
          onChange={(e) => {
            const valor = e.target.value;
            setSearch(valor);
            setView(valor ? 'list' : 'hierarchy');
          }}
        />

        <Stack direction="row" spacing={1} alignItems="center">
          {/* Recargar, en azul, igual que el real. */}
          <IconButton onClick={() => loadAssets()} color="primary">
            <ReplayTwoToneIcon />
          </IconButton>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} color="primary">
            <MoreVertTwoToneIcon />
          </IconButton>
          {hasCreatePermission('ASSETS') && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingAsset(null);
                setDialogOpen(true);
              }}
            >
              Activo
            </Button>
          )}
        </Stack>
      </Box>

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            downloadFile('/assets/export', 'activos.csv');
          }}
        >
          Exportar activos
        </MenuItem>
      </Menu>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Igual que el real: en jerarquia van las 17 columnas; en lista se
          quita la primera (el expansor). El mensaje de vacio lo maneja el
          propio grid con noRowsMessage. */}
      <CustomDatagrid2
        columns={view === 'hierarchy' ? columns : columns.slice(1)}
        data={tableData}
        loading={loading || loadingHierarchy}
        onRowClick={(row) => {
          // Igual que el real: la fila "cargar mas" no abre nada.
          if ('isLoadMoreRow' in row && (row as { isLoadMoreRow?: boolean }).isLoadMoreRow) return;
          // Igual que el real: navega al detalle en pantalla completa.
          navigate(`/app/assets/${row.id}`);
        }}
        noRowsMessage="No hay activos todavía."
        pagination={view === 'hierarchy' ? rootPage : tableState.pagination}
        onPaginationChange={(p) => (view === 'hierarchy' ? setRootPage(p) : tableState.setPagination(p))}
        totalRows={
          view === 'hierarchy'
            ? childrenPages[0]?.totalElements ?? assetsHierarchy.length
            : totalElements
        }
        pageSizeOptions={
          view === 'list' ? [10, 20, 50] : [PAGE_SIZE, PAGE_SIZE * 2, PAGE_SIZE * 3, PAGE_SIZE * 4]
        }
        sorting={sorting}
        onSortingChange={setSorting}
        getRowId={(row) => String(row.id)}
        enableColumnReordering
        enableColumnResizing
        columnOrder={tableState.columnOrder}
        onColumnOrderChange={tableState.setColumnOrder}
        columnSizing={tableState.columnSizing}
        onColumnSizingChange={tableState.setColumnSizing}
      />

      <CreateAssetDialog
        open={dialogOpen}
        editAsset={editingAsset}
        allAssets={allAssets}
        onClose={() => {
          setDialogOpen(false);
          setEditingAsset(null);
        }}
        onSaved={loadAssets}
      />

      <AssetDetailDrawer
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onEdit={(asset) => {
          setSelectedAsset(null);
          setEditingAsset(asset);
          setDialogOpen(true);
        }}
        onSelectWorkOrder={async (id) => {
          try {
            setSelectedWorkOrder(await workOrdersApi.getById(id));
          } catch {
            // silencioso
          }
        }}
      />

      <WorkOrderDetailDrawer
        workOrder={selectedWorkOrder}
        onClose={() => setSelectedWorkOrder(null)}
        onChanged={() => {
          if (selectedWorkOrder) {
            workOrdersApi.getById(selectedWorkOrder.id).then(setSelectedWorkOrder).catch(() => {});
          }
        }}
      />
    </>
  );
}
