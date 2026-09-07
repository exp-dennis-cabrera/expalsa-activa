import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Tabs, Tab, Typography, Stack, IconButton, Button, Divider, Alert,
  Table, TableBody, TableCell, TableHead, TableRow, CircularProgress,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import { QRCodeSVG } from 'qrcode.react';

import AssetStatusSelect from '../components/AssetStatusSelect';
import { assetsApi } from '../api/assets';
import { ApiRequestError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../context/TitleContext';
import ConfirmDialog from '../components/ConfirmDialog';
import type { AssetResponse } from '../types';

/**
 * Copia fiel de downloadQRCode de Assets/Show/AssetDetails.tsx real:
 * convierte el SVG del QR a PNG de 120x120 y lo descarga.
 */
const downloadQRCode = (value: string) => {
  const svgElement = document.getElementById(`qr-code-${value}`);
  if (!svgElement) return;

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  canvas.width = 120;
  canvas.height = 120;

  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    ctx?.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `qr-code-${value}.png`;
    link.click();
  };

  img.src = url;
};

/** Etiquetas de estado, iguales a las del listado de ordenes. */
const WORK_ORDER_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierta',
  IN_PROGRESS: 'En progreso',
  ON_HOLD: 'En espera',
  COMPLETED: 'Completada',
};

type TabValue = 'details' | 'work-orders' | 'parts' | 'files' | 'meters' | 'downtimes' | 'analytics';

/** Las 7 pestañas del detalle real, en su mismo orden. */
const TABS: { value: TabValue; label: string }[] = [
  { value: 'details', label: 'Detalles' },
  { value: 'work-orders', label: 'Órdenes de trabajo' },
  { value: 'parts', label: 'Repuestos' },
  { value: 'files', label: 'Archivos' },
  { value: 'meters', label: 'Mediciones' },
  { value: 'downtimes', label: 'Tiempo de inactividad' },
  { value: 'analytics', label: 'Estadísticas' },
];

/** Tabla simple para las pestañas que listan registros. */
function SimpleTable({
  columns,
  rows,
  loading,
  emptyMessage,
  onRowClick,
}: {
  columns: { key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode }[];
  rows: Record<string, unknown>[];
  loading: boolean;
  emptyMessage: string;
  onRowClick?: (row: Record<string, unknown>) => void;
}) {
  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (rows.length === 0) {
    return (
      <Typography sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
        {emptyMessage}
      </Typography>
    );
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {columns.map((c) => (
            <TableCell key={c.key}>{c.label}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow
            key={(row.id as number) ?? i}
            hover={!!onRowClick}
            onClick={() => onRowClick?.(row)}
            sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
          >
            {columns.map((c) => (
              <TableCell key={c.key}>
                {c.render ? c.render(row) : ((row[c.key] as string) ?? '—')}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AssetDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasEditPermission, hasCreatePermission, hasDeletePermission } = useAuth();

  const assetId = Number(id);
  const [asset, setAsset] = useState<AssetResponse | null>(null);
  const [tab, setTab] = useState<TabValue>('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cada pestaña carga sus datos al abrirse, no de golpe.
  const [tabRows, setTabRows] = useState<Record<string, unknown>[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [analytics, setAnalytics] = useState<{
    mtbfHours: number; mttrHours: number; downtimeHours: number;
    uptimeHours: number; totalCost: number;
  } | null>(null);

  function loadAsset() {
    setLoading(true);
    assetsApi
      .getById(assetId)
      .then(setAsset)
      .catch((err) =>
        setError(err instanceof ApiRequestError ? err.message : 'No se pudo cargar el activo'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(loadAsset, [assetId]);

  /**
   * Copia del caso ASSETS de hasEditPermission real: puede editar quien lo
   * creo, quien tiene permiso general, o quien esta asignado (usuario
   * principal o en la lista de asignados).
   *
   * Nuestro AssetResponse no expone createdById, asi que ese criterio no
   * se puede evaluar aqui -- el backend lo valida igual al guardar.
   */
  const registroPermiso = asset
    ? {
        createdById: null,
        assignedUserIds: [
          ...(asset.primaryUserId != null ? [asset.primaryUserId] : []),
          ...(asset.assignedUsers ?? []).map((u) => u.id),
        ],
      }
    : null;

  // Igual que setTitle(asset?.name) real: el titulo de la pantalla es el
  // nombre del activo.
  usePageTitle(asset?.name);

  useEffect(() => {
    if (tab === 'analytics') {
      setAnalytics(null);
      // Nuestro endpoint pide rango; el original no lo filtra. Se usa el
      // ultimo año, que es el periodo con el que estas cifras tienen sentido.
      {
        const hasta = new Date();
        const desde = new Date();
        desde.setFullYear(desde.getFullYear() - 1);
        assetsApi
          .getAnalytics(assetId, desde.toISOString(), hasta.toISOString())
          .then(setAnalytics)
          .catch(() => setAnalytics(null));
      }
      return;
    }
    if (tab === 'details') return;
    setTabLoading(true);
    setTabRows([]);
    const rutas: Record<string, () => Promise<unknown>> = {
      'work-orders': () => assetsApi.getWorkOrderHistory(assetId),
      parts: () => assetsApi.getParts(assetId),
      files: () => assetsApi.getFiles(assetId),
      meters: () => assetsApi.getMeters(assetId),
      downtimes: () => assetsApi.getDowntimes(assetId),
    };
    rutas[tab]?.()
      .then((r) => setTabRows((r as Record<string, unknown>[]) ?? []))
      .catch(() => setTabRows([]))
      .finally(() => setTabLoading(false));
  }, [tab, assetId]);

  async function handleStatusChange(status: AssetResponse['status']) {
    if (!asset) return;
    try {
      // El backend espera UpdateAssetRequest (con ids), no el objeto de
      // respuesta. Se arma el payload con los valores actuales, cambiando
      // solo el estado.
      await assetsApi.update(asset.id, {
        name: asset.name,
        description: asset.description ?? undefined,
        status,
        categoryId: asset.categoryId ?? undefined,
        locationId: asset.locationId ?? undefined,
        parentAssetId: asset.parentAssetId ?? undefined,
        serialNumber: asset.serialNumber ?? undefined,
        model: asset.model ?? undefined,
        manufacturer: asset.manufacturer ?? undefined,
        power: asset.power ?? undefined,
        area: asset.area ?? undefined,
        barCode: asset.barCode ?? undefined,
        nfcId: asset.nfcId ?? undefined,
        acquisitionCost: asset.acquisitionCost ?? undefined,
        inServiceDate: asset.inServiceDate ?? undefined,
        warrantyExpirationDate: asset.warrantyExpirationDate ?? undefined,
        additionalInfos: asset.additionalInfos ?? undefined,
        primaryUserId: asset.primaryUserId ?? undefined,
        assignedUserIds: (asset.assignedUsers ?? []).map((u) => u.id),
        teamIds: (asset.teams ?? []).map((t) => t.id),
        vendorIds: (asset.vendors ?? []).map((v) => v.id),
      } as never);
      loadAsset();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo cambiar el estado');
    }
  }

  if (loading) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!asset) {
    return <Alert severity="error">{error ?? 'Activo no encontrado'}</Alert>;
  }

  /**
   * Los 11 campos de la seccion "Información del activo", en el mismo orden
   * que el real: nombre, descripcion, categoria, modelo, numero de serie,
   * potencia, fabricante, costo de adquisicion, area, codigo de barras e
   * informacion adicional.
   */
  const campos: { label: string; value: unknown; barcode?: boolean }[] = [
    { label: 'Nombre', value: asset.name },
    { label: 'Descripción', value: asset.description },
    { label: 'Categoría', value: asset.categoryName },
    { label: 'Modelo', value: asset.model },
    { label: 'Número de serie', value: asset.serialNumber },
    { label: 'Potencia', value: asset.power },
    { label: 'Fabricante', value: asset.manufacturer },
    { label: 'Costo de adquisición', value: asset.acquisitionCost },
    { label: 'Área', value: asset.area },
    { label: 'Código de barras', value: asset.barCode, barcode: true },
  ];

  /**
   * Segunda seccion del detalle real: "Más información", con los datos que
   * no describen el equipo en si.
   */
  const camposMasInfo: { label: string; value: unknown }[] = [
    { label: 'Información adicional', value: asset.additionalInfos },
    {
      label: 'Puesta en servicio',
      value: asset.inServiceDate ? new Date(asset.inServiceDate).toLocaleDateString() : null,
    },
    {
      label: 'Vencimiento de garantía',
      value: asset.warrantyExpirationDate
        ? new Date(asset.warrantyExpirationDate).toLocaleDateString()
        : null,
    },
    { label: 'Trabajador principal', value: asset.primaryUserName },
  ];

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Igual que MultipleTabsLayout real: Editar y Eliminar arriba a la
          derecha, junto a las pestañas. */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Stack direction="row" spacing={1}>
          {hasEditPermission('ASSETS', registroPermiso) && (
            <Button
              startIcon={<EditTwoToneIcon />}
              variant="contained"
              onClick={() => navigate(`/app/assets?edit=${asset.id}`)}
            >
              Editar
            </Button>
          )}
          {hasDeletePermission('ASSETS', registroPermiso) && (
            <Button
              startIcon={<DeleteTwoToneIcon />}
              variant="outlined"
              onClick={() => setConfirmDelete(true)}
            >
              Eliminar
            </Button>
          )}
        </Stack>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        {TABS.map(({ value, label }) => (
          <Tab key={value} value={value} label={label} />
        ))}
      </Tabs>

      <Card sx={{ p: 3 }}>
        {tab === 'details' && (
          <Grid container spacing={2}>
            {asset.imageUrl && (
              <Grid item xs={12}>
                <img height="300px" src={asset.imageUrl} alt={asset.name} />
              </Grid>
            )}

            <Grid item xs={12}>
              {/* Misma cabecera que el real: titulo + selector de estado +
                  boton copiar a la izquierda, y "+ Orden de trabajo" a la
                  derecha. */}
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="h3">Información del activo</Typography>
                  <AssetStatusSelect
                    value={asset.status}
                    onChange={handleStatusChange}
                    disabled={!hasEditPermission('ASSETS', registroPermiso)}
                  />
                  {hasCreatePermission('ASSETS') && (
                    <IconButton
                      onClick={() => navigate(`/app/assets?copy=${asset.id}`)}
                      title="Copiar activo"
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  )}
                </Stack>
                {hasCreatePermission('WORK_ORDERS') && (
                  <Button
                    onClick={() => navigate(`/app/work-orders?asset=${asset.id}`)}
                    startIcon={<AddTwoToneIcon />}
                    variant="contained"
                  >
                    Orden de trabajo
                  </Button>
                )}
              </Stack>
              <Divider sx={{ mt: 2 }} />
            </Grid>

            {campos.map(({ label, value, barcode }) =>
              value ? (
                // Copia fiel del BasicField real: etiqueta y valor ambos en
                // variant="h6", separados por spacing={5}, y un Divider al
                // final de cada campo.
                <Grid item xs={12} key={label}>
                  <Stack spacing={5} direction="row">
                    <Typography variant="h6" fontWeight="bold">
                      {label}
                    </Typography>
                    <Box>
                      <Typography variant="h6" fontWeight="normal">{String(value)}</Typography>
                      {barcode && (
                        <QRCodeSVG
                          id={`qr-code-${value}`}
                          value={value.toString()}
                          size={120}
                          level="H"
                          onClick={() => downloadQRCode(value.toString())}
                          style={{ marginTop: 8, cursor: 'pointer' }}
                        />
                      )}
                    </Box>
                  </Stack>
                  <Divider sx={{ mt: 1 }} />
                </Grid>
              ) : null,
            )}

            {/* Segunda seccion, igual que el real. */}
            <Grid item xs={12}>
              <Typography variant="h3">Más información</Typography>
            </Grid>
            {camposMasInfo.map(({ label, value }) =>
              value ? (
                <Grid item xs={12} key={label}>
                  <Stack spacing={5} direction="row">
                    <Typography variant="h6" fontWeight="bold">
                      {label}
                    </Typography>
                    <Typography variant="h6" fontWeight="normal">{String(value)}</Typography>
                  </Stack>
                  <Divider sx={{ mt: 1 }} />
                </Grid>
              ) : null,
            )}
          </Grid>
        )}

        {tab === 'work-orders' && (
          // Copia fiel de AssetWorkOrders real: una tarjeta por orden, con
          // titulo, numero, vencimiento (en rojo si lo tiene), responsable
          // y estado en una sola fila.
          <Grid container spacing={2}>
            {tabLoading ? (
              <Grid item xs={12} sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Grid>
            ) : tabRows.length ? (
              tabRows.map((wo) => (
                <Grid key={wo.id as number} item xs={12}>
                  <Card
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/app/work-orders?open=${wo.id}`)}
                  >
                    <Box
                      sx={{
                        p: 2,
                        flexDirection: 'row',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="h4" gutterBottom>
                          {wo.title as string}
                        </Typography>
                        <Typography variant="subtitle1">{`#${wo.id}`}</Typography>
                      </Box>
                      <Typography variant="h6" color={wo.dueDate ? 'error' : 'primary'}>
                        {wo.dueDate
                          ? `Vence el ${new Date(wo.dueDate as string).toLocaleDateString()}`
                          : 'Sin fecha de vencimiento'}
                      </Typography>
                      <Typography variant="h6">
                        {(wo.primaryAssigneeName as string) ?? 'Sin trabajador principal'}
                      </Typography>
                      <Typography variant="h6">
                        {WORK_ORDER_STATUS_LABELS[wo.status as string] ?? (wo.status as string)}
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Typography sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                  Este activo no tiene órdenes de trabajo.
                </Typography>
              </Grid>
            )}
          </Grid>
        )}

        {tab === 'parts' && (
          <SimpleTable
            loading={tabLoading}
            rows={tabRows}
            emptyMessage="Este activo no tiene repuestos asociados."
            // Mismas columnas que AssetParts real: nombre, costo, descripcion.
            columns={[
              { key: 'name', label: 'Nombre' },
              {
                key: 'cost',
                label: 'Costo',
                render: (r) => (r.cost != null ? `$${Number(r.cost).toFixed(2)}` : '—'),
              },
              { key: 'description', label: 'Descripción' },
            ]}
          />
        )}

        {tab === 'files' && (
          <SimpleTable
            loading={tabLoading}
            rows={tabRows}
            emptyMessage="Este activo no tiene archivos."
            // AssetFiles real muestra solo el nombre, con accion de abrir.
            columns={[
              {
                key: 'fileName',
                label: 'Nombre',
                render: (r) => (
                  <a href={r.downloadUrl as string} target="_blank" rel="noopener noreferrer">
                    {r.fileName as string}
                  </a>
                ),
              },
            ]}
          />
        )}

        {tab === 'meters' && (
          <SimpleTable
            loading={tabLoading}
            rows={tabRows}
            emptyMessage="Este activo no tiene medidores."
            onRowClick={(row) => navigate(`/app/meters?open=${row.id}`)}
            // Mismas columnas que AssetMeters real: lectura, fecha, agregado por.
            columns={[
              { key: 'lastReading', label: 'Lectura' },
              {
                key: 'lastReadingAt',
                label: 'Fecha',
                render: (r) =>
                  r.lastReadingAt ? new Date(r.lastReadingAt as string).toLocaleDateString() : '—',
              },
              { key: 'name', label: 'Medidor' },
            ]}
          />
        )}

        {tab === 'downtimes' && (
          <SimpleTable
            loading={tabLoading}
            rows={tabRows}
            emptyMessage="Este activo no registra paradas."
            columns={[
              {
                key: 'startsOn',
                label: 'Inicio',
                render: (r) => new Date(r.startsOn as string).toLocaleString(),
              },
              {
                key: 'duration',
                label: 'Duración',
                render: (r) =>
                  r.duration != null ? `${Math.round((r.duration as number) / 60)} min` : '—',
              },
            ]}
          />
        )}

        {tab === 'analytics' && (
          // Copia fiel de AssetAnalytics real: MTBF, MTTR, horas de
          // inactividad, horas operativas y costo total, cada uno en su
          // tarjeta.
          <Grid container spacing={2}>
            {analytics ? (
              [
                { label: 'MTBF', value: analytics.mtbfHours.toFixed(2) },
                { label: 'MTTR', value: analytics.mttrHours.toFixed(2) },
                { label: 'Horas de inactividad', value: analytics.downtimeHours.toFixed(2) },
                { label: 'Horas operativas', value: analytics.uptimeHours.toFixed(2) },
                { label: 'Costo total', value: `$${analytics.totalCost.toFixed(2)}` },
              ].map(({ label, value }) => (
                <Grid item xs={12} md={4} lg={3} key={label}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {label}
                      </Typography>
                      <Typography variant="h3">{value}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid item xs={12} sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Grid>
            )}
          </Grid>
        )}
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        question={`¿Eliminar "${asset.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={async () => {
          try {
            await assetsApi.delete(asset.id);
            navigate('/app/assets');
          } catch (err) {
            setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar el activo');
          } finally {
            setConfirmDelete(false);
          }
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
