import { useEffect, useState } from 'react';
import {
  MenuItem,
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import ConfirmDialog from '../components/ConfirmDialog';
import { categoriesApi } from '../api/categories';
import type { CategorySummary } from '../types';
import { ApiRequestError } from '../api/client';
import { useDispatch, useSelector } from '../store';
import { getCategories } from '../slices/category';

// Mismos 6 tipos que el real (Purchase Orders no se incluye porque ese
// modulo no existe en nuestra app todavia).
const TABS: { value: string; label: string }[] = [
  { value: 'WORK_ORDER', label: 'Órdenes de trabajo' },
  { value: 'ASSET', label: 'Activos' },
  { value: 'METER', label: 'Medidores' },
  { value: 'TIMER', label: 'Cronómetros' },
  { value: 'COST', label: 'Costos' },
  { value: 'PART', label: 'Repuestos' },
];

export default function CategoriesPage() {
  const [type, setType] = useState(TABS[0].value);
  // Las categorias se guardan por TIPO en el store, igual que el original.
  const dispatch = useDispatch();
  const categoriesByType = useSelector((state) => state.categories.categories);
  const categories = categoriesByType[type] ?? [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategorySummary | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      dispatch(getCategories(type));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function openAdd() {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setDialogOpen(true);
  }

  function openEdit(c: CategorySummary) {
    setEditingCategory(c);
    setName(c.name);
    setDescription(c.description ?? '');
    setParentId(c.parentId ?? '');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, name.trim(), description.trim() || undefined, parentId || undefined);
      } else {
        await categoriesApi.create(name.trim(), type, description.trim() || undefined, parentId || undefined);
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo guardar la categoría');
    } finally {
      setSubmitting(false);
    }
  }

  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  async function handleDelete() {
    if (deleteTargetId == null) return;
    try {
      await categoriesApi.delete(deleteTargetId);
      setDeleteTargetId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar la categoría');
      setDeleteTargetId(null);
    }
  }

  // Padres primero, cada uno seguido de sus hijas.
  const categoriasOrdenadas = [
    ...categories.filter((c) => !c.parentId),
  ].flatMap((padre) => [padre, ...categories.filter((h) => h.parentId === padre.id)])
    // Las que quedaron sin padre visible (por si el padre es de otro tipo).
    .concat(categories.filter((c) => c.parentId && !categories.some((p) => p.id === c.parentId)));

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Tabs value={type} onChange={(_, v) => setType(v)} variant="scrollable">
          {TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Categoría
        </Button>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>Cargando…</Typography>
      ) : categories.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6">No hay categorías de {TABS.find((t) => t.value === type)?.label.toLowerCase()} todavía.</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Crea la primera con el botón "Categoría" de arriba.
          </Typography>
        </Box>
      ) : (
        <List disablePadding>
          {/* Se ordena por jerarquia: cada padre seguido de sus hijas, que
              van con sangria. Asi "Agua dulce" y "Agua clarificada"
              aparecen bajo "Agua". */}
          {categoriasOrdenadas.map((c) => (
            <Box key={c.id}>
              <ListItem
                sx={{ py: 1.5 }}
                secondaryAction={
                  <Box>
                    <IconButton onClick={() => openEdit(c)} sx={{ color: 'primary.main' }}>
                      <EditTwoToneIcon fontSize="small" />
                    </IconButton>
                    <IconButton onClick={() => setDeleteTargetId(c.id)} sx={{ color: 'error.main', ml: 1 }}>
                      <DeleteTwoToneIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  sx={{ ml: c.parentId ? 4 : 0 }}
                  primary={
                    <Typography variant="h6" sx={{ fontWeight: c.parentId ? 400 : 600 }}>
                      {c.name}
                    </Typography>
                  }
                  secondary={c.description || undefined}
                />
              </ListItem>
              <Divider />
            </Box>
          ))}
        </List>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 0.5 }}>
          {editingCategory ? 'Editar categoría' : 'Agregar categoría'}
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 400, mt: 0.5 }}>
            {editingCategory ? 'Actualiza los datos de la categoría' : 'Completa los campos para crear una nueva categoría'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }}>
          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required fullWidth autoFocus />
          <TextField label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={3} fullWidth />
          {/* Solo se ofrecen categorias de primer nivel: la jerarquia es de
              dos niveles, asi que una hija no puede tener hijas. */}
          <TextField
            select
            label="Categoría padre"
            value={parentId}
            onChange={(e) => setParentId(e.target.value === '' ? '' : Number(e.target.value))}
            fullWidth
            helperText="Opcional. Agrupa variantes bajo un concepto común, por ejemplo «Agua dulce» bajo «Agua»."
          >
            <MenuItem value="">Ninguna (categoría de primer nivel)</MenuItem>
            {categories
              .filter((c) => !c.parentId && c.id !== editingCategory?.id)
              .map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={submitting}>
            {submitting ? 'Guardando…' : editingCategory ? 'Guardar' : 'Agregar categoría'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteTargetId != null}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        confirmText="Borrar"
        question="¿Está seguro de que desea eliminar esta categoría?"
      />
    </>
  );
}
