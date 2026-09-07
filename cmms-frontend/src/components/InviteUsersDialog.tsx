import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Chip,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { usersApi } from '../api/users';
import { rolesApi, type RoleResponse } from '../api/roles';
import { ApiRequestError } from '../api/client';
import { ROLE_LABELS } from '../constants';

interface InvitedResult {
  email: string;
  acceptUrl: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}

/**
 * Version adaptada del InviteUserDialog real de Atlas: como no tenemos
 * SMTP, en vez de mandar un email con link de invitacion, mostramos la
 * contrasena temporal generada para que el Admin la comparta manualmente.
 */
export default function InviteUsersDialog({ open, onClose, onInvited }: Props) {
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [roleId, setRoleId] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<InvitedResult[] | null>(null);

  useEffect(() => {
    if (open) {
      rolesApi.list().then(setRoles).catch(() => setRoles([]));
    }
  }, [open]);

  function addEmail() {
    const email = currentEmail.trim();
    if (!email) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Email inválido');
      return;
    }
    if (emails.includes(email)) {
      setError('Ese email ya está en la lista');
      return;
    }
    setEmails((prev) => [...prev, email]);
    setCurrentEmail('');
    setError(null);
  }

  function handleClose() {
    setEmails([]);
    setCurrentEmail('');
    setRoleId('');
    setResults(null);
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    if (emails.length === 0 || !roleId) return;
    setSubmitting(true);
    setError(null);
    try {
      const invited = await usersApi.invite(emails, Number(roleId));
      setResults(invited);
      onInvited();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo invitar a las personas');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invitar personas</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 3 }}>
        {results ? (
          <>
            <Alert severity="success">
              Se crearon {results.length} invitación{results.length === 1 ? '' : 'es'} pendiente{results.length === 1 ? '' : 's'}.
              Comparte estos links — la persona define su propia contraseña al aceptar.
            </Alert>
            {results.map((r) => (
              <Box key={r.email} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {r.email}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {r.acceptUrl}
                </Typography>
              </Box>
            ))}
          </>
        ) : (
          <>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Email"
              value={currentEmail}
              onChange={(e) => setCurrentEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addEmail();
                }
              }}
              helperText="Escribe un email y presiona Enter para agregarlo"
              fullWidth
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {emails.map((email) => (
                <Chip key={email} label={email} onDelete={() => setEmails((prev) => prev.filter((e) => e !== email))} />
              ))}
            </Box>
            <TextField select label="Rol" value={roleId} onChange={(e) => setRoleId(e.target.value)} fullWidth>
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {ROLE_LABELS[r.name] ?? r.name}
                </MenuItem>
              ))}
            </TextField>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          {results ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!results && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || emails.length === 0 || !roleId}
          >
            {submitting ? 'Invitando…' : `Invitar (${emails.length})`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
