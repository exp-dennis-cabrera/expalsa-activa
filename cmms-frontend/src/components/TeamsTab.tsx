import { useEffect, useState } from 'react';
import { Box, Typography, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper, Alert, TextField, InputAdornment, AvatarGroup, Avatar, Tooltip, TablePagination } from '@mui/material';
import SearchIcon from '@mui/icons-material/SearchRounded';
import CreateTeamDialog from './CreateTeamDialog';
import TeamDetailDialog from './TeamDetailDialog';
import ConfirmDialog from './ConfirmDialog';
import { teamsApi } from '../api/teams';
import type { TeamResponse } from '../types';
import { ApiRequestError } from '../api/client';
import { useDispatch, useSelector } from '../store';
import { getTeams } from '../slices/team';

interface Props {
  createOpen: boolean;
  onCreateClose: () => void;
}

// Copia fiel de Teams.tsx real: tabla con Nombre/Descripción/Personas
// (avatares), buscador (solo si hay al menos 1 equipo), click en fila abre
// el Dialog de detalle centrado (no un panel lateral).
export default function TeamsTab({ createOpen, onCreateClose }: Props) {
  const dispatch = useDispatch();
  const { teams: teamsPage, loadingGet } = useSelector((state) => state.teams);
  const teams = teamsPage.content;
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamResponse | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<TeamResponse | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      dispatch(getTeams({ page, size: pageSize, search: search || undefined }));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudieron cargar los equipos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search]);

  async function handleDelete() {
    if (!deletingTeam) return;
    try {
      await teamsApi.delete(deletingTeam.id);
      setDeletingTeam(null);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar el equipo');
      setDeletingTeam(null);
    }
  }

  return (
    <Box sx={{ width: '100%' }}>
      <CreateTeamDialog open={createOpen} onClose={onCreateClose} onCreated={load} />
      <TeamDetailDialog
        open={!!selectedTeam}
        team={selectedTeam}
        onClose={() => setSelectedTeam(null)}
        onSaved={load}
        onRequestDelete={(team) => setDeletingTeam(team)}
      />
      <ConfirmDialog
        open={!!deletingTeam}
        onCancel={() => setDeletingTeam(null)}
        onConfirm={handleDelete}
        confirmText="Eliminar"
        question={`¿Eliminar el equipo "${deletingTeam?.name}"? Esta acción no se puede deshacer.`}
      />

      {Boolean(teams.length) && (
        <Box sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="Buscar…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && teams.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography sx={{ color: 'text.secondary' }}>No hay equipos todavía. Crea el primero arriba.</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre del equipo</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Personas en el equipo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id} hover onClick={() => setSelectedTeam(team)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{team.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{team.description ?? '—'}</TableCell>
                  <TableCell>
                    <AvatarGroup max={4} sx={{ justifyContent: 'flex-start' }}>
                      {team.members.map((m) => (
                        <Tooltip key={m.id} title={m.fullName}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>{m.fullName.charAt(0).toUpperCase()}</Avatar>
                        </Tooltip>
                      ))}
                    </AvatarGroup>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={totalElements}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="Filas por página"
          />
        </TableContainer>
      )}
    </Box>
  );
}
