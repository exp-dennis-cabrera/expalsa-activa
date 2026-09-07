import { useEffect, useState } from 'react';
import { Box, Typography, Button, IconButton, Stack, Avatar, useTheme } from '@mui/material';
import { MentionsTextField } from '@jackstenglein/mui-mentions';
import AttachFileTwoToneIcon from '@mui/icons-material/AttachFileTwoTone';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useDispatch, useSelector } from '../store';
import { getUsersMini } from '../slices/user';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import { workOrderExtrasApi } from '../api/workOrderExtras';
import { filesApi } from '../api/files';
import type { WorkOrderComment } from '../types';
import { ApiRequestError } from '../api/client';
import { useAuth } from '../context/AuthContext';

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'justo ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

/** Formato del getFormattedDate real: 24/07/26 15:36 */
function formatCommentDate(valor: string): string {
  const d = new Date(valor);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${dos(d.getFullYear() % 100)} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export default function WorkOrderCommentsSection({
  workOrderId,
  onCountChange,
}: {
  workOrderId: number;
  /** Igual que commentsCount real: el drawer lo usa para el contador de la pestaña. */
  onCountChange?: (count: number) => void;
}) {
  const { userId, role } = useAuth();
  const [comments, setComments] = useState<WorkOrderComment[]>([]);
  const [content, setContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  // El texto sin el formato de mencion, para validar que no este vacio.
  const [plainTextContent, setPlainTextContent] = useState('');
  const theme = useTheme();
  const dispatch = useDispatch();
  const { usersMini } = useSelector((state) => state.users);

  // Los usuarios alimentan la lista que aparece al escribir @.
  useEffect(() => {
    if (usersMini.length === 0) dispatch(getUsersMini());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const lista = await workOrderExtrasApi.listComments(workOrderId);
      setComments(lista);
      onCountChange?.(lista.length);
    } catch {
      setComments([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId]);

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      // Mismo flujo que el real: primero se suben los archivos y despues
      // se crea el comentario con los ids ya obtenidos.
      let fileIds: number[] | undefined;
      if (pendingFiles.length > 0) {
        const subidos = await Promise.all(
          pendingFiles.map((f) => filesApi.upload(workOrderId, f)),
        );
        fileIds = subidos.map((f) => f.id);
      }
      await workOrderExtrasApi.addComment(workOrderId, content.trim(), fileIds);
      setContent('');
      setPlainTextContent('');
      setPendingFiles([]);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo agregar el comentario');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: number) {
    try {
      await workOrderExtrasApi.deleteComment(workOrderId, commentId);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar');
    }
  }

  return (
    <Box sx={{ mt: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Comentarios
      </Typography>

      {comments.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          Aún no hay comentarios en esta orden.
        </Typography>
      )}

      {/* Estructura del CommentsSection real: primero el campo de texto,
          debajo la fila con adjuntar y publicar, y al final la lista. */}
      <Box sx={{ mb: 3 }}>
        {/* Copia fiel del MentionsTextField real: al escribir @ se
            despliega la lista de usuarios. La mencion se guarda como
            "@[Nombre](user:5)" y el backend notifica al mencionado. */}
        <MentionsTextField
          fullWidth
          multiline
          minRows={3}
          maxRows={6}
          placeholder="Añadir comentario"
          value={content}
          onChange={(newValue: string, newPlainText: string) => {
            setContent(newValue);
            setPlainTextContent(newPlainText);
          }}
          dataSources={[
            {
              trigger: '@',
              markup: '@[__display__](user:__id__)',
              data: async (query: string) =>
                usersMini
                  .filter((u) => u.fullName.toLowerCase().includes(query.toLowerCase()))
                  .map((u) => ({ id: u.id.toString(), display: u.fullName })),
              appendSpaceOnAdd: true,
              allowSpaceInQuery: true,
            },
          ]}
          slotProps={{ suggestionsOverlay: { popper: { sx: { zIndex: 99999 } } } }}
          highlightColor={theme.palette.primary.main}
          highlightTextColor
          sx={{ mb: 2 }}
        />
        <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1} sx={{ mt: 1 }}>
          <IconButton component="label" size="small">
            <AttachFileTwoToneIcon fontSize="small" />
            <input
              hidden
              type="file"
              multiple
              onChange={(e) => setPendingFiles(Array.from(e.target.files ?? []))}
            />
          </IconButton>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={(!plainTextContent.trim() && pendingFiles.length === 0) || submitting}
          >
            Publicar comentario
          </Button>
        </Stack>
        {pendingFiles.length > 0 && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {pendingFiles.length} archivo(s) adjunto(s)
          </Typography>
        )}
      </Box>

      <Stack spacing={1.5} sx={{ mb: 1.5 }}>
        {comments.map((c) => {
          // Igual que CommentItem real: los comentarios de sistema (cambios
          // de estado) no se pueden borrar ni editar.
          const isSystem = !!c.system;
          const canDelete = !isSystem && (c.authorId === userId || role === 'ADMIN');
          // Copia de CommentWrapper real: cada comentario en su propio
          // rectangulo con borde y fondo blanco.
          return (
            <Box
              key={c.id}
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                gap: 1.5,
                alignItems: 'flex-start',
              }}
            >
              <Avatar sx={{ width: 36, height: 36, fontSize: 14, bgcolor: 'primary.main' }}>
                {c.authorName?.[0]?.toUpperCase() ?? '?'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                  {/* Nombre y fecha en LINEAS SEPARADAS, y la fecha con
                      formato completo -- no "hace 1 dia". */}
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {c.authorName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatCommentDate(c.createdAt)}
                    </Typography>
                  </Box>
                  {canDelete && (
                    <IconButton size="small" onClick={() => handleDelete(c.id)}>
                      <DeleteOutlineIcon fontSize="inherit" sx={{ color: 'error.main' }} />
                    </IconButton>
                  )}
                </Stack>
                <Typography variant="body2">{c.content}</Typography>

                {/* Adjuntos del comentario, igual que el real: nombre con
                    icono y enlace para abrirlos. */}
                {!!c.files?.length && (
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {c.files!.map((f) => (
                      <Box
                        key={f.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          p: 1,
                          borderRadius: 1,
                          bgcolor: 'background.default',
                        }}
                      >
                        <InsertDriveFileIcon color="error" fontSize="small" />
                        <Typography
                          variant="caption"
                          component="a"
                          href={f.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                        >
                          {f.fileName}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>
          );
        })}
      </Stack>

      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mb: 1 }}>
          {error}
        </Typography>
      )}

    </Box>
  );
}
