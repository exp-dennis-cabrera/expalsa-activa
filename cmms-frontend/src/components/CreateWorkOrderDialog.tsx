import { useEffect, useState, type FormEvent } from 'react';
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/SearchRounded';
import { workOrdersApi } from '../api/workOrders';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { locationsApi } from '../api/locations';
import { assetsApi } from '../api/assets';
import { usersApi, type UserMini } from '../api/users';
import { categoriesApi } from '../api/categories';
import { vendorsApi } from '../api/vendors';
import { teamsApi, type TeamMiniResponse } from '../api/teams';
import type { AssetResponse, CategorySummary, LocationSummary, VendorSummary, WorkOrder, WorkOrderPriority } from '../types';
import { ApiRequestError } from '../api/client';
import { filesApi } from '../api/files';
import AddIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import ConfirmDialog from './ConfirmDialog';
import { PRIORITY_LABELS, PRIORITY_ORDER, ASSET_STATUS_LABELS, ASSET_STATUS_ORDER } from '../constants';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Si se pasa, el dialogo entra en modo edicion: prellena el formulario y
   *  hace PUT en vez de POST al guardar -- mismo componente que "Agregar",
   *  igual que el modal de edicion real de Atlas reutiliza el de creacion. */
  editWorkOrder?: WorkOrder | null;
}

// Mismos 7 valores reales de AssetStatus (ver constants.ts ASSET_STATUS_ORDER).
const ASSET_STATUS_OPTIONS = ASSET_STATUS_ORDER.map((value) => ({ value, label: ASSET_STATUS_LABELS[value] }));

export default function CreateWorkOrderDialog({ open, onClose, onCreated, editWorkOrder }: Props) {
  const isEditMode = !!editWorkOrder;
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [users, setUsers] = useState<UserMini[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [teams, setTeams] = useState<TeamMiniResponse[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [assetStatus, setAssetStatus] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedStartDate, setEstimatedStartDate] = useState('');
  const [estimatedDurationHours, setEstimatedDurationHours] = useState('');
  const [priority, setPriority] = useState<WorkOrderPriority>('NONE');
  const [categoryId, setCategoryId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [primaryAssigneeId, setPrimaryAssigneeId] = useState('');
  const [additionalAssigneeIds, setAdditionalAssigneeIds] = useState<string[]>([]);
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [taskLabels, setTaskLabels] = useState<string[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDirty(false);
    locationsApi.list().then(setLocations).catch(() => setLocations([]));
    assetsApi.list({ size: 100 }).then((r) => setAssets(r.content)).catch(() => setAssets([]));
    usersApi.mini().then(setUsers).catch(() => setUsers([]));
    categoriesApi.list('WORK_ORDER').then(setCategories).catch(() => setCategories([]));
    vendorsApi.list().then(setVendors).catch(() => setVendors([]));
    teamsApi.mini().then(setTeams).catch(() => setTeams([]));

    if (editWorkOrder) {
      setTitle(editWorkOrder.title);
      setDescription(editWorkOrder.description ?? '');
      setLocationId(editWorkOrder.locationId ? String(editWorkOrder.locationId) : '');
      setAssetId(editWorkOrder.assetId ? String(editWorkOrder.assetId) : '');
      setAssetStatus('');
      setDueDate(editWorkOrder.dueDate ? toLocalInput(editWorkOrder.dueDate) : '');
      setEstimatedStartDate(editWorkOrder.estimatedStartDate ? toLocalInput(editWorkOrder.estimatedStartDate) : '');
      setEstimatedDurationHours(
        editWorkOrder.estimatedDurationMinutes ? String(editWorkOrder.estimatedDurationMinutes / 60) : '',
      );
      setPriority(editWorkOrder.priority);
      setCategoryId(editWorkOrder.categoryId ? String(editWorkOrder.categoryId) : '');
      setVendorId(editWorkOrder.vendorId ? String(editWorkOrder.vendorId) : '');
      setTeamId(editWorkOrder.teamId ? String(editWorkOrder.teamId) : '');
      setPrimaryAssigneeId(editWorkOrder.primaryAssigneeId ? String(editWorkOrder.primaryAssigneeId) : '');
      setAdditionalAssigneeIds(editWorkOrder.assignees.map((a) => String(a.id)));
      setRequiresSignature(!!editWorkOrder.requiresSignature);
    }
  }, [open, editWorkOrder]);

  function toLocalInput(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setLocationId('');
    setAssetId('');
    setAssetStatus('');
    setDueDate('');
    setEstimatedStartDate('');
    setEstimatedDurationHours('');
    setPriority('NONE');
    setCategoryId('');
    setVendorId('');
    setTeamId('');
    setPrimaryAssigneeId('');
    setAdditionalAssigneeIds([]);
    setRequiresSignature(false);
    setTaskLabels([]);
    setImage(null);
    setFiles([]);
    setError(null);
  }

  function handleClose() {
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    resetForm();
    onClose();
  }

  function handleDiscardConfirm() {
    setDiscardOpen(false);
    setDirty(false);
    resetForm();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        categoryId: categoryId ? Number(categoryId) : undefined,
        locationId: locationId ? Number(locationId) : undefined,
        assetId: assetId ? Number(assetId) : undefined,
        assetStatus: assetStatus || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate).toISOString() : undefined,
        estimatedDurationMinutes: estimatedDurationHours ? Number(estimatedDurationHours) * 60 : undefined,
        requiresSignature,
        vendorId: vendorId ? Number(vendorId) : undefined,
        teamId: teamId ? Number(teamId) : undefined,
        primaryAssigneeId: primaryAssigneeId ? Number(primaryAssigneeId) : undefined,
        additionalAssigneeIds: additionalAssigneeIds.length > 0 ? additionalAssigneeIds.map(Number) : undefined,
        taskLabels: taskLabels.filter((l) => l.trim()).length > 0 ? taskLabels.filter((l) => l.trim()) : undefined,
      };
      if (isEditMode && editWorkOrder) {
        await workOrdersApi.update(editWorkOrder.id, payload);
      } else {
        const created = await workOrdersApi.create(payload);
        // La imagen y los archivos se suben una vez creada la orden,
        // porque el backend los recibe por un endpoint aparte (multipart).
        const toUpload = [...(image ? [image] : []), ...files];
        for (const file of toUpload) {
          try {
            await filesApi.upload(created.id, file);
          } catch {
            // Si falla un archivo, la orden ya quedo creada -- se avisa
            // sin deshacer todo el trabajo del usuario.
            setError('La orden se creó, pero no se pudieron subir todos los archivos.');
          }
        }
      }
      resetForm();
      setDirty(false);
      onCreated();
      onClose();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : `No se pudo ${isEditMode ? 'guardar' : 'crear'} la orden`;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 0.5 }}>
          {isEditMode ? 'Editar Orden de Trabajo' : 'Agregar Orden de Trabajo'}
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 400, mt: 0.5 }}>
            {isEditMode
              ? 'Actualiza los campos de esta Orden de Trabajo'
              : 'Complete los campos a continuación para crear una nueva Orden de Trabajo'}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.2, pt: 2.5 }} onChange={() => setDirty(true)}>
          {error && <Typography sx={{ color: 'error.main', fontSize: 13.5 }}>{error}</Typography>}

          <TextField
            label="Título"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />

          <TextField
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />

          <Autocomplete
            fullWidth
            options={locations}
            getOptionLabel={(loc) => loc.name}
            value={locations.find((l) => String(l.id) === locationId) ?? null}
            onChange={(_, value) => setLocationId(value ? String(value.id) : '')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Localización"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      <InputAdornment position="end"><SearchIcon fontSize="small" /></InputAdornment>
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          <Autocomplete
            fullWidth
            options={assets}
            getOptionLabel={(a) => a.name}
            value={assets.find((a) => String(a.id) === assetId) ?? null}
            onChange={(_, value) => setAssetId(value ? String(value.id) : '')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Activo"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      <InputAdornment position="end"><SearchIcon fontSize="small" /></InputAdornment>
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          {assetId && (
            <TextField
              select
              label="Estado del activo"
              value={assetStatus}
              onChange={(e) => setAssetStatus(e.target.value)}
              fullWidth
              helperText="Opcional: actualiza el estado del activo al crear la orden"
            >
              <MenuItem value="">— No cambiar —</MenuItem>
              {ASSET_STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Fecha de vencimiento"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Fecha de inicio prevista"
            type="datetime-local"
            value={estimatedStartDate}
            onChange={(e) => setEstimatedStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            label="Duración estimada en horas"
            type="number"
            value={estimatedDurationHours}
            onChange={(e) => setEstimatedDurationHours(e.target.value)}
            inputProps={{ min: 0, step: 0.5 }}
            fullWidth
          />

          <TextField
            select
            label="Prioridad"
            value={priority}
            onChange={(e) => setPriority(e.target.value as WorkOrderPriority)}
            fullWidth
          >
            {PRIORITY_ORDER.map((p) => (
              <MenuItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Categoría"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            fullWidth
          >
            <MenuItem value="">— Ninguna —</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Trabajador principal"
            value={primaryAssigneeId}
            onChange={(e) => setPrimaryAssigneeId(e.target.value)}
            fullWidth
          >
            <MenuItem value="">— Ninguno —</MenuItem>
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.fullName || user.email}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Trabajadores adicionales"
            value={additionalAssigneeIds}
            onChange={(e) => {
              const value = e.target.value;
              setAdditionalAssigneeIds(typeof value === 'string' ? value.split(',') : (value as string[]));
            }}
            SelectProps={{ multiple: true }}
            fullWidth
            helperText="Apoyo adicional, distinto del trabajador principal"
          >
            {users.map((user) => (
              <MenuItem key={user.id} value={String(user.id)}>
                {user.fullName || user.email}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Contratista"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            fullWidth
          >
            <MenuItem value="">— Ninguno —</MenuItem>
            {vendors.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                {v.companyName}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Equipo"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            fullWidth
            helperText="Asigna la orden a un equipo completo, además del trabajador principal"
          >
            <MenuItem value="">— Ninguno —</MenuItem>
            {teams.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>

          {/* Lista de verificación -- igual que el campo "tasks" del
              formulario real: se define AL crear la orden. */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Lista de verificación
            </Typography>
            {taskLabels.map((label, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={`Tarea ${i + 1}`}
                  value={label}
                  onChange={(e) => {
                    const next = [...taskLabels];
                    next[i] = e.target.value;
                    setTaskLabels(next);
                  }}
                />
                <IconButton size="small" onClick={() => setTaskLabels(taskLabels.filter((_, idx) => idx !== i))}>
                  <DeleteOutlineIcon fontSize="small" color="error" />
                </IconButton>
              </Box>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={() => setTaskLabels([...taskLabels, ''])}>
              Agregar tarea
            </Button>
          </Box>

          {/* Imagen principal y archivos adjuntos -- igual que los campos
              "image" y "files" del formulario real. Se suben despues de
              crear la orden, porque el backend los recibe por separado. */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Imagen
            </Typography>
            <Button component="label" variant="outlined" size="small">
              {image ? image.name : 'Seleccionar imagen'}
              <input type="file" accept="image/*" hidden onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
            </Button>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Archivos
            </Typography>
            <Button component="label" variant="outlined" size="small">
              {files.length ? `${files.length} archivo(s)` : 'Seleccionar archivos'}
              <input type="file" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            </Button>
          </Box>

          <FormControlLabel
            control={
              <Switch checked={requiresSignature} onChange={(e) => setRequiresSignature(e.target.checked)} />
            }
            label="Firma requerida"
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? (isEditMode ? 'Guardando…' : 'Creando…') : isEditMode ? 'Guardar cambios' : 'Crear'}
          </Button>
        </DialogActions>
      </Box>
      <ConfirmDialog
        open={discardOpen}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={handleDiscardConfirm}
        confirmText="Descartar cambios"
        question="¿Descartar cambios no guardados? Si sales ahora, perderás los cambios no guardados"
      />
    </Dialog>
  );
}
