import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  Alert, Paper, Stack, Tabs, Tab,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { apiKeysApi, type ApiKeyItem } from '../api/apiKeys';
import { ApiRequestError } from '../api/client';
import ConfirmDialog from './ConfirmDialog';

/**
 * Integraciones: llaves de API para que otro sistema (el ERP) consulte esta
 * aplicacion sin iniciar sesion con un usuario.
 *
 * El original tiene ademas Conectores ("proximamente") y Webhooks; ambos se
 * omiten aqui por decision del usuario.
 */
export default function IntegrationsSettingsTab() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  // El codigo recien creado. Se muestra UNA vez y no se puede recuperar.
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [aBorrar, setABorrar] = useState<ApiKeyItem | null>(null);

  function load() {
    setLoading(true);
    apiKeysApi
      .list()
      .then(setKeys)
      .catch((err) =>
        setError(err instanceof ApiRequestError ? err.message : 'No se pudieron cargar las llaves'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate() {
    if (!label.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const creada = await apiKeysApi.create(label.trim());
      setCreatedCode(creada.code);
      setLabel('');
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo crear la llave');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!aBorrar) return;
    try {
      await apiKeysApi.delete(aBorrar.id);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo revocar la llave');
    } finally {
      setABorrar(null);
    }
  }

  function cerrarDialogo() {
    setDialogOpen(false);
    setCreatedCode(null);
    setCopiado(false);
    setLabel('');
  }

  return (
    <Box sx={{ maxWidth: 900 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Las llaves permiten que otro sistema —por ejemplo el ERP— consulte esta aplicación sin
            iniciar sesión con un usuario. Heredan los permisos de quien las crea y no caducan:
            para retirarlas hay que revocarlas.
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button variant="contained" onClick={() => setDialogOpen(true)}>
              Crear llave
            </Button>
          </Stack>

          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Último uso</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ color: 'text.secondary' }}>
                      Cargando…
                    </TableCell>
                  </TableRow>
                ) : keys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ color: 'text.secondary' }}>
                      Todavía no hay llaves creadas.
                    </TableCell>
                  </TableRow>
                ) : (
                  keys.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell sx={{ fontWeight: 500 }}>{k.label}</TableCell>
                      <TableCell>{k.userName}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {k.lastUsed ? new Date(k.lastUsed).toLocaleString() : 'Nunca'}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => setABorrar(k)}>
                          <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
      </>

      <Dialog open={dialogOpen} onClose={cerrarDialogo} maxWidth="sm" fullWidth>
        <DialogTitle>{createdCode ? 'Llave creada' : 'Crear llave de API'}</DialogTitle>
        <DialogContent>
          {createdCode ? (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Copia este código ahora. Por seguridad no se guarda en claro, así que no vas a poder
                verlo de nuevo.
              </Alert>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  fullWidth
                  value={createdCode}
                  InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: 13 } }}
                />
                <IconButton
                  onClick={() => {
                    navigator.clipboard.writeText(createdCode);
                    setCopiado(true);
                  }}
                >
                  <ContentCopyIcon />
                </IconButton>
              </Stack>
              {copiado && (
                <Typography variant="caption" sx={{ color: 'success.main' }}>
                  Código copiado
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>
                Para usarla, el otro sistema debe enviarla en el encabezado <code>x-api-key</code>.
              </Typography>
            </>
          ) : (
            <TextField
              autoFocus
              fullWidth
              label="Nombre"
              placeholder="ERP — lectura de existencias"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              sx={{ mt: 1 }}
              helperText="Un nombre que te permita reconocer para qué es esta llave."
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarDialogo}>{createdCode ? 'Cerrar' : 'Cancelar'}</Button>
          {!createdCode && (
            <Button variant="contained" onClick={handleCreate} disabled={!label.trim() || creating}>
              {creating ? 'Creando…' : 'Crear'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!aBorrar}
        question={`¿Revocar "${aBorrar?.label}"? El sistema que la use dejará de tener acceso de inmediato.`}
        confirmText="Revocar"
        onConfirm={handleDelete}
        onCancel={() => setABorrar(null)}
      />
    </Box>
  );
}
