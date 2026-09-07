import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Tabs,
  Tab,
  List,
  ListItemButton,
  ListItemText,
  Grid,
  Link as MuiLink,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Chip,
  Drawer,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditTwoTone';
import DeleteIcon from '@mui/icons-material/DeleteTwoTone';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/AddTwoTone';
import CreateLocationDialog from './CreateLocationDialog';
import ConfirmDialog from './ConfirmDialog';
import { locationsApi } from '../api/locations';
import type { LocationResponse, AssetResponse, WorkOrder, FileAttachment, FloorPlanEntry } from '../types';
import { ApiRequestError } from '../api/client';

const TABS = [
  { value: 'assets', label: 'Activos' },
  { value: 'files', label: 'Archivos' },
  { value: 'workOrders', label: 'Órdenes de trabajo' },
  { value: 'floorPlans', label: 'Planos de piso' },
  { value: 'people', label: 'Personas' },
];

interface Props {
  locationId: number | null;
  onClose: () => void;
  onChanged: () => void;
  allLocations: LocationResponse[];
}

// Igual mecanismo que el real: Drawer anchor="right" (no una pagina nueva),
// abierto/cerrado con open/onClose -- la lista sigue visible detras.
export default function LocationDetailDrawer({ locationId, onClose, onChanged, allLocations }: Props) {
  const [location, setLocation] = useState<LocationResponse | null>(null);
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlanEntry[]>([]);
  const [currentTab, setCurrentTab] = useState('assets');
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addFloorPlanOpen, setAddFloorPlanOpen] = useState(false);
  const [floorPlanName, setFloorPlanName] = useState('');
  const [floorPlanArea, setFloorPlanArea] = useState('');
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null);

  async function load() {
    if (!locationId) return;
    setError(null);
    try {
      const [loc, a, wo, f, fp] = await Promise.all([
        locationsApi.getById(locationId),
        locationsApi.getAssets(locationId),
        locationsApi.getWorkOrders(locationId),
        locationsApi.getFiles(locationId),
        locationsApi.getFloorPlans(locationId),
      ]);
      setLocation(loc);
      setAssets(a);
      setWorkOrders(wo);
      setFiles(f);
      setFloorPlans(fp);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo cargar la ubicación');
    }
  }

  useEffect(() => {
    if (locationId) {
      load();
      setCurrentTab('assets');
      // Igual que el real: actualiza la URL sin causar una navegacion real.
      window.history.replaceState(null, '', `/locations/${locationId}`);
    } else {
      window.history.replaceState(null, '', '/locations');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  async function handleCopy() {
    if (!location) return;
    try {
      const created = await locationsApi.create({
        name: `${location.name} (copia)`,
        address: location.address ?? undefined,
        parentLocationId: location.parentLocationId ?? undefined,
        assignedUserIds: location.assignedUsers.map((u) => u.id),
        vendorIds: location.vendors.map((v) => v.id),
        teamIds: location.teams.map((t) => t.id),
      });
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo copiar la ubicación');
    }
  }

  async function handleDelete() {
    if (!location) return;
    try {
      await locationsApi.delete(location.id);
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar la ubicación');
      setDeleteOpen(false);
    }
  }

  async function handleAddFloorPlan() {
    if (!floorPlanName.trim() || !location) return;
    try {
      let imageUrl: string | undefined;
      if (floorPlanFile) {
        const uploaded = await locationsApi.uploadFile(location.id, floorPlanFile);
        imageUrl = uploaded.downloadUrl;
      }
      const created = await locationsApi.createFloorPlan(location.id, floorPlanName.trim(), floorPlanArea ? Number(floorPlanArea) : undefined, imageUrl);
      setFloorPlans((prev) => [...prev, created]);
      setAddFloorPlanOpen(false);
      setFloorPlanName('');
      setFloorPlanArea('');
      setFloorPlanFile(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo agregar el plano');
    }
  }

  async function handleDeleteFloorPlan(floorPlanId: number) {
    try {
      await locationsApi.deleteFloorPlan(floorPlanId);
      setFloorPlans((prev) => prev.filter((fp) => fp.id !== floorPlanId));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar el plano');
    }
  }

  return (
    <Drawer anchor="right" open={!!locationId} onClose={onClose} PaperProps={{ sx: { width: { xs: '90%', sm: '70%', md: '50%' } } }}>
      {!location ? (
        <Box sx={{ p: 3 }}>{error ? <Typography color="error">{error}</Typography> : <Typography>Cargando…</Typography>}</Box>
      ) : (
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h4">{location.name}</Typography>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
                {location.address}
              </Typography>
            </Box>
            <Box>
              <IconButton onClick={() => setEditOpen(true)} sx={{ mr: 1 }}>
                <EditIcon color="primary" />
              </IconButton>
              <IconButton onClick={handleCopy} sx={{ mr: 1 }}>
                <ContentCopyIcon color="primary" />
              </IconButton>
              <IconButton onClick={() => setDeleteOpen(true)}>
                <DeleteIcon color="error" />
              </IconButton>
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {location.imageUrl && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <img src={location.imageUrl} style={{ borderRadius: 5, height: 200 }} alt={location.name} />
            </Box>
          )}

          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} variant="scrollable" scrollButtons="auto" textColor="primary" indicatorColor="primary" sx={{ mb: 2 }}>
            {TABS.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </Tabs>

          {currentTab === 'assets' && (
            <Box>
              {assets.length ? (
                <List sx={{ width: '100%' }}>
                  {assets.map((asset) => (
                    <ListItemButton key={asset.id} divider>
                      <ListItemText primary={asset.name} secondary={new Date(asset.createdAt).toLocaleDateString()} />
                    </ListItemButton>
                  ))}
                </List>
              ) : (
                <Stack direction="row" justifyContent="center" width="100%" sx={{ py: 4 }}>
                  <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                    No hay activos en esta ubicación.
                  </Typography>
                </Stack>
              )}
            </Box>
          )}

          {currentTab === 'files' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button component="label" startIcon={<AddIcon fontSize="small" />}>
                  Archivo
                  <input
                    type="file"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const uploaded = await locationsApi.uploadFile(location.id, file);
                        setFiles((prev) => [...prev, uploaded]);
                      } catch (err) {
                        setError(err instanceof ApiRequestError ? err.message : 'No se pudo subir el archivo');
                      }
                    }}
                  />
                </Button>
              </Box>
              {files.length ? (
                <List sx={{ width: '100%' }}>
                  {files.map((f) => (
                    <ListItemButton key={f.id} divider component="a" href={f.downloadUrl} target="_blank" rel="noreferrer">
                      <ListItemText primary={f.fileName} secondary={new Date(f.createdAt).toLocaleDateString()} />
                    </ListItemButton>
                  ))}
                </List>
              ) : (
                <Stack direction="row" justifyContent="center" width="100%" sx={{ py: 4 }}>
                  <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                    Sin archivos adjuntos.
                  </Typography>
                </Stack>
              )}
            </Box>
          )}

          {currentTab === 'workOrders' && (
            <Box>
              {workOrders.length ? (
                <List sx={{ width: '100%' }}>
                  {workOrders.map((wo) => (
                    <ListItemButton key={wo.id} divider>
                      <ListItemText primary={wo.title} secondary={`#${wo.id} · ${wo.status}`} />
                    </ListItemButton>
                  ))}
                </List>
              ) : (
                <Stack direction="row" justifyContent="center" width="100%" sx={{ py: 4 }}>
                  <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                    Sin órdenes de trabajo para esta ubicación.
                  </Typography>
                </Stack>
              )}
            </Box>
          )}

          {currentTab === 'floorPlans' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button startIcon={<AddIcon fontSize="small" />} onClick={() => setAddFloorPlanOpen(true)}>
                  Plano de piso
                </Button>
              </Box>
              {floorPlans.length ? (
                <Grid container spacing={2}>
                  {floorPlans.map((fp) => (
                    <Grid item xs={12} sm={6} md={4} key={fp.id}>
                      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                        {fp.imageUrl && <img src={fp.imageUrl} style={{ width: '100%', borderRadius: 4 }} alt={fp.name} />}
                        <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 600 }}>
                          {fp.name}
                        </Typography>
                        {fp.area != null && (
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {fp.area} m²
                          </Typography>
                        )}
                        <IconButton size="small" onClick={() => handleDeleteFloorPlan(fp.id)} sx={{ mt: 1 }}>
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Stack direction="row" justifyContent="center" width="100%" sx={{ py: 4 }}>
                  <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                    Sin planos de piso todavía.
                  </Typography>
                </Stack>
              )}
            </Box>
          )}

          {currentTab === 'people' && (
            <Grid container spacing={3}>
              {location.assignedUsers.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                    Asignado a
                  </Typography>
                  {location.assignedUsers.map((u) => (
                    <Box key={u.id} sx={{ mb: 0.5 }}>
                      <MuiLink href={`/people?id=${u.id}`} variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {u.name}
                      </MuiLink>
                    </Box>
                  ))}
                </Grid>
              )}
              {location.teams.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                    Equipos asignados
                  </Typography>
                  {location.teams.map((t) => (
                    <Box key={t.id} sx={{ mb: 0.5 }}>
                      <MuiLink href={`/teams?id=${t.id}`} variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t.name}
                      </MuiLink>
                    </Box>
                  ))}
                </Grid>
              )}
              {location.vendors.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                    Proveedores asignados
                  </Typography>
                  {location.vendors.map((v) => (
                    <Box key={v.id} sx={{ mb: 0.5 }}>
                      <Chip label={v.name} size="small" />
                    </Box>
                  ))}
                </Grid>
              )}
              {location.assignedUsers.length === 0 && location.teams.length === 0 && location.vendors.length === 0 && (
                <Grid item xs={12}>
                  <Stack direction="row" justifyContent="center" width="100%" sx={{ py: 4 }}>
                    <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                      Sin personas, equipos ni proveedores asignados.
                    </Typography>
                  </Stack>
                </Grid>
              )}
            </Grid>
          )}
        </Box>
      )}

      {location && (
        <>
          <CreateLocationDialog open={editOpen} editLocation={location} allLocations={allLocations} onClose={() => setEditOpen(false)} onSaved={() => { load(); onChanged(); }} />
          <ConfirmDialog
            open={deleteOpen}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={handleDelete}
            confirmText="Eliminar"
            question={`¿Eliminar la ubicación "${location.name}"? Esta acción no se puede deshacer.`}
          />
          <Dialog open={addFloorPlanOpen} onClose={() => setAddFloorPlanOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Agregar plano de piso</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }}>
              <TextField label="Nombre" value={floorPlanName} onChange={(e) => setFloorPlanName(e.target.value)} required fullWidth autoFocus />
              <TextField label="Área (m²)" type="number" value={floorPlanArea} onChange={(e) => setFloorPlanArea(e.target.value)} fullWidth />
              <Button component="label" variant="outlined">
                {floorPlanFile ? floorPlanFile.name : 'Subir imagen'}
                <input type="file" accept="image/*" hidden onChange={(e) => setFloorPlanFile(e.target.files?.[0] ?? null)} />
              </Button>
              <Button variant="contained" onClick={handleAddFloorPlan} disabled={!floorPlanName.trim()}>
                Agregar
              </Button>
            </DialogContent>
          </Dialog>
        </>
      )}
    </Drawer>
  );
}
