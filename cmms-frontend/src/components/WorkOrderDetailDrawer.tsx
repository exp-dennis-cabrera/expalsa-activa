import {
  Drawer,
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Divider,
  Menu,
  MenuItem,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import { useEffect, useState } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfRounded';
import MoreVertIcon from '@mui/icons-material/MoreVertRounded';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import EmailTwoToneIcon from '@mui/icons-material/EmailTwoTone';
import ContentCopyTwoToneIcon from '@mui/icons-material/ContentCopyTwoTone';
import ArchiveTwoToneIcon from '@mui/icons-material/ArchiveTwoTone';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import type { TimeLogEntry, WorkOrder, WorkOrderStatus } from '../types';
import { workOrdersApi } from '../api/workOrders';
import { workOrderExtrasApi } from '../api/workOrderExtras';
import { ApiRequestError } from '../api/client';
import ConfirmDialog from './ConfirmDialog';
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS, STATUS_ORDER, canDeleteWorkOrder, canReopenWorkOrder, canCreateOrEditWorkOrder } from '../constants';
import { useAuth } from '../context/AuthContext';
import WorkOrderTimeSection from './WorkOrderTimeSection';
import WorkOrderCostsSection from './WorkOrderCostsSection';
import WorkOrderPartsSection from './WorkOrderPartsSection';
import WorkOrderFilesSection from './WorkOrderFilesSection';
import WorkOrderCommentsSection from './WorkOrderCommentsSection';
import WorkOrderLinksSection from './WorkOrderLinksSection';
import TaskChecklist from './TaskChecklist';
import CustomFieldValues from './CustomFieldValues';
import WorkOrderMaterialRequestsSection from './WorkOrderMaterialRequestsSection';
import WorkOrderTimerButton from './WorkOrderTimerButton';
import CreateWorkOrderDialog from './CreateWorkOrderDialog';

interface Props {
  workOrder: WorkOrder | null;
  onClose: () => void;
  onChanged: () => void;
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

/**
 * Copia fiel de BasicField real: si el campo no tiene valor, NO se dibuja.
 *
 *   if (value && ...) { return (...) } else return null;
 *
 * Antes se mostraban todos los campos con un guion, y el detalle quedaba
 * lleno de filas vacias.
 */
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value || value === '—') return null;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.3 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function WorkOrderDetailDrawer({ workOrder, onClose, onChanged }: Props) {
  const { role } = useAuth();
  const canDelete = canDeleteWorkOrder(role);
  const canReopen = canReopenWorkOrder(role);

  const [tab, setTab] = useState<'details' | 'comments'>('details');

  // Al abrir OTRA orden se vuelve a Detalles. Antes quedaba pegada la
  // pestaña de Comentarios de la orden anterior.
  useEffect(() => {
    setTab('details');
  }, [workOrder?.id]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [optionsMenuAnchor, setOptionsMenuAnchor] = useState<HTMLElement | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ question: string; confirmText: string; onConfirm: () => void } | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>([]);
  const canEdit = canCreateOrEditWorkOrder(role);

  // Unica fuente de verdad para el tiempo de esta orden -- tanto el boton
  // de timer como la lista de tiempo leen de aqui, evitando el bug de
  // desincronizacion (equivalente a lo que Atlas resuelve con Redux).
  async function loadTimeLogs() {
    if (!workOrder) return;
    try {
      setTimeLogs(await workOrderExtrasApi.listTimeLogs(workOrder.id));
    } catch {
      setTimeLogs([]);
    }
  }

  useEffect(() => {
    loadTimeLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrder?.id]);

  async function applyStatusChange(status: WorkOrderStatus) {
    if (!workOrder) return;
    setUpdating(true);
    setStatusError(null);
    try {
      await workOrdersApi.updateStatus(workOrder.id, status);
      onChanged();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'No se pudo cambiar el estado';
      setStatusError(message);
    } finally {
      setUpdating(false);
    }
  }

  function handleStatusChange(status: WorkOrderStatus) {
    setAnchorEl(null);
    if (status === 'COMPLETED') {
      setConfirmComplete(true);
      return;
    }
    applyStatusChange(status);
  }

  async function handleConfirmComplete() {
    setConfirmComplete(false);
    await applyStatusChange('COMPLETED');
  }

  async function handleTimeReload() {
    await loadTimeLogs();
    onChanged();
  }

  function handleDelete() {
    if (!workOrder) return;
    setConfirmState({
      question: '¿Eliminar esta orden de trabajo? Esta acción no se puede deshacer.',
      confirmText: 'Borrar',
      onConfirm: () => doDelete(),
    });
  }

  async function doDelete() {
    if (!workOrder) return;
    setUpdating(true);
    setStatusError(null);
    try {
      await workOrdersApi.delete(workOrder.id);
      onChanged();
      onClose();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'No se pudo eliminar la orden';
      setStatusError(message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDownloadReport() {
    if (!workOrder) return;
    setOptionsMenuAnchor(null);
    setDownloadingReport(true);
    setStatusError(null);
    try {
      await workOrdersApi.downloadReport(workOrder.id);
    } catch {
      setStatusError('No se pudo generar el reporte PDF');
    } finally {
      setDownloadingReport(false);
    }
  }

  function handleArchive() {
    if (!workOrder) return;
    setOptionsMenuAnchor(null);
    setConfirmState({
      question: `¿Archivar "${workOrder.title}"? Podrás encontrarla más tarde, pero desaparecerá del listado.`,
      confirmText: 'Archivar',
      onConfirm: () => doArchive(),
    });
  }

  async function doArchive() {
    if (!workOrder) return;
    setUpdating(true);
    setStatusError(null);
    try {
      await workOrdersApi.archive(workOrder.id);
      onChanged();
      onClose();
    } catch (err) {
      setStatusError(err instanceof ApiRequestError ? err.message : 'No se pudo archivar la orden');
    } finally {
      setUpdating(false);
    }
  }

  async function handleCopy() {
    if (!workOrder) return;
    setOptionsMenuAnchor(null);
    setUpdating(true);
    setStatusError(null);
    try {
      await workOrdersApi.copy(workOrder.id);
      onChanged();
      setStatusSuccess('Se creó una copia de esta orden.');
    } catch (err) {
      setStatusError(err instanceof ApiRequestError ? err.message : 'No se pudo copiar la orden');
    } finally {
      setUpdating(false);
    }
  }

  async function handleEmailContractor() {
    if (!workOrder) return;
    setOptionsMenuAnchor(null);
    setUpdating(true);
    setStatusError(null);
    try {
      await workOrdersApi.emailContractor(workOrder.id);
      setStatusSuccess('Correo enviado al contratista.');
    } catch (err) {
      setStatusError(err instanceof ApiRequestError ? err.message : 'No se pudo enviar el correo al contratista');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Drawer
      anchor="right"
      open={!!workOrder}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '90%', sm: '70%', md: '50%' } } }}
    >
      {workOrder && (
        <Box>
          <Box
            sx={{
              px: 3,
              py: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
              <IconButton size="small" onClick={onClose} sx={{ ml: -1, mr: 1 }}>
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              {/* Igual que el real: prioridad, titulo y descripcion viven en
                  el encabezado, no dentro de una pestaña -- asi siguen
                  visibles aunque cambies a Comentarios. */}
              <Box sx={{ minWidth: 0 }}>
                {workOrder.priority !== 'NONE' && (
                  <Chip
                    label={`${PRIORITY_LABELS[workOrder.priority].toUpperCase()} PRIORIDAD`}
                    size="small"
                    sx={{
                      bgcolor: PRIORITY_COLORS[workOrder.priority].bg,
                      color: PRIORITY_COLORS[workOrder.priority].text,
                      mb: 1,
                    }}
                  />
                )}
                <Typography variant="h2">{workOrder.title}</Typography>
                {workOrder.description && (
                  <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                    {workOrder.description}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box sx={{ flexShrink: 0 }}>
              {canEdit && (
                <IconButton size="small" onClick={(e) => setOptionsMenuAnchor(e.currentTarget)}>
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              )}
              {canEdit && (
                <IconButton size="small" onClick={() => setEditDialogOpen(true)} sx={{ color: 'primary.main' }}>
                  <EditTwoToneIcon fontSize="small" />
                </IconButton>
              )}
              {canDelete && (
                <IconButton size="small" onClick={handleDelete} disabled={updating} sx={{ color: 'error.main' }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}

              <Menu anchorEl={optionsMenuAnchor} open={!!optionsMenuAnchor} onClose={() => setOptionsMenuAnchor(null)}>
                <MenuItem onClick={() => setOptionsMenuAnchor(null)}>
                  <ListItemIcon><LinkTwoToneIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Vincular</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleDownloadReport} disabled={downloadingReport}>
                  <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Reporte en PDF</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleEmailContractor}>
                  <ListItemIcon><EmailTwoToneIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Enviar correo a contratistas</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleCopy}>
                  <ListItemIcon><ContentCopyTwoToneIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Copiar orden de trabajo</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleArchive}>
                  <ListItemIcon><ArchiveTwoToneIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Archivo</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          </Box>

          {statusSuccess && (
            <Box sx={{ px: 3, pt: 1.5 }}>
              <Alert severity="success" onClose={() => setStatusSuccess(null)}>
                {statusSuccess}
              </Alert>
            </Box>
          )}

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Tab value="details" label="Detalles" />
            <Tab value="comments" label={`Comentarios${commentsCount > 0 ? ` (${commentsCount})` : ''}`} />
          </Tabs>

          {tab === 'details' && (
            <Box sx={{ p: 3 }}>
              {/* Igual que el real: la imagen de la orden se muestra
                  destacada y centrada, y al hacer clic se abre en grande. */}
              {workOrder.imageUrl && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <img
                    src={workOrder.imageUrl}
                    alt={workOrder.title}
                    style={{ borderRadius: 5, height: 250, cursor: 'pointer' }}
                    onClick={() => window.open(workOrder.imageUrl!, '_blank')}
                  />
                </Box>
              )}

              {statusError && (
                <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setStatusError(null)}>
                  {statusError}
                </Alert>
              )}

              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2.5, mb: 3 }}>
                <Button
                  variant="contained"
                  disabled={updating}
                  endIcon={<ExpandMoreIcon />}
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{
                    bgcolor: STATUS_COLORS[workOrder.status],
                    '&:hover': { bgcolor: STATUS_COLORS[workOrder.status], opacity: 0.9 },
                  }}
                >
                  {STATUS_LABELS[workOrder.status]}
                </Button>
                <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
                  {STATUS_ORDER.filter((status) => status !== 'OPEN' || canReopen).map((status) => (
                    <MenuItem key={status} onClick={() => handleStatusChange(status)}>
                      {STATUS_LABELS[status]}
                    </MenuItem>
                  ))}
                </Menu>

                <WorkOrderTimerButton workOrder={workOrder} timeLogs={timeLogs} onReload={handleTimeReload} />
              </Stack>

              <Divider />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2.5,
                  py: 2.5,
                }}
              >
                {/* Mismo orden que detailsFieldsToRender() en el WorkOrderDetails.tsx real de Atlas */}
                <Field label="ID" value={`WO${String(workOrder.id).padStart(6, '0')}`} />
                <Field label="Fecha de vencimiento" value={formatDateTime(workOrder.dueDate)} />
                <Field label="Fecha de inicio prevista" value={formatDateTime(workOrder.estimatedStartDate)} />
                <Field
                  label="Duración estimada"
                  value={workOrder.estimatedDurationMinutes ? `${(workOrder.estimatedDurationMinutes / 60).toFixed(1)}h` : '—'}
                />
                <Field label="Categoría" value={workOrder.categoryName ?? '—'} />
                <Field label="Localización" value={workOrder.locationName ?? '—'} />
                <Field label="Activo" value={workOrder.assetName ?? '—'} />
                <Field label="Contratista" value={workOrder.vendorName ?? '—'} />
                <Field label="Equipo" value={workOrder.teamName ?? '—'} />
                <Field label="Fecha de creación" value={formatDateTime(workOrder.createdAt)} />
                <Field label="Trabajador principal" value={workOrder.primaryAssigneeName ?? '—'} />
                <Field label="Creado por" value={workOrder.createdByName ?? '—'} />
                <Field
                  label="Trabajadores adicionales"
                  value={workOrder.assignees.length > 0 ? workOrder.assignees.map((a) => a.fullName).join(', ') : '—'}
                />
                <Field label="Firma requerida" value={workOrder.requiresSignature ? 'Sí' : 'No'} />
                <Field label="Última actualización" value={formatDateTime(workOrder.updatedAt)} />
              </Box>

              <Divider />

              {/* Orden del detalle real (WorkOrderDetails.tsx): las Tareas
                  van PRIMERO, luego Tiempo (TimeSection) y despues Costos
                  (CostSection). */}
              <Divider sx={{ mt: 2.5, mb: 1.5 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                Tareas
              </Typography>
              <TaskChecklist entityType="work-orders" entityId={workOrder.id} isTemplate={false} />

              <WorkOrderTimeSection workOrderId={workOrder.id} timeLogs={timeLogs} onReload={loadTimeLogs} />
              <WorkOrderCostsSection workOrderId={workOrder.id} />
              <WorkOrderPartsSection workOrderId={workOrder.id} />
              <WorkOrderFilesSection workOrderId={workOrder.id} />

              <Divider sx={{ mt: 2.5, mb: 1.5 }} />
              <WorkOrderMaterialRequestsSection workOrderId={workOrder.id} />

              <Divider sx={{ mt: 2.5, mb: 1.5 }} />
              <CustomFieldValues entityType="WORK_ORDER" targetType="work-order" entityId={workOrder.id} />

              <Divider sx={{ mt: 2.5 }} />
              <WorkOrderLinksSection workOrderId={workOrder.id} />

            </Box>
          )}

          {tab === 'comments' && (
            <Box sx={{ p: 3 }}>
              <WorkOrderCommentsSection workOrderId={workOrder.id} onCountChange={setCommentsCount} />
            </Box>
          )}
        </Box>
      )}

      <Dialog open={confirmComplete} onClose={() => setConfirmComplete(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Completar orden de trabajo</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            ¿Confirmas que "{workOrder?.title}" está completa? Se registrará la fecha de finalización
            y se notificará al creador y al trabajador principal.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmComplete(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" color="success" onClick={handleConfirmComplete}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <CreateWorkOrderDialog
        open={editDialogOpen}
        editWorkOrder={workOrder}
        onClose={() => setEditDialogOpen(false)}
        onCreated={() => {
          onChanged();
          setEditDialogOpen(false);
        }}
      />

      <ConfirmDialog
        open={!!confirmState}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          confirmState?.onConfirm();
          setConfirmState(null);
        }}
        confirmText={confirmState?.confirmText ?? 'Borrar'}
        question={confirmState?.question ?? ''}
      />
    </Drawer>
  );
}
