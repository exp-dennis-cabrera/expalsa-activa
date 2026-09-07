import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, IconButton, Stack, Link } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import AttachFileIcon from '@mui/icons-material/AttachFileRounded';
import { filesApi } from '../api/files';
import type { FileAttachment } from '../types';
import { ApiRequestError } from '../api/client';
import { canDeleteWorkOrder } from '../constants';
import { useAuth } from '../context/AuthContext';

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function WorkOrderFilesSection({ workOrderId }: { workOrderId: number }) {
  const { role } = useAuth();
  const canDelete = canDeleteWorkOrder(role);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setFiles(await filesApi.list(workOrderId));
    } catch {
      setFiles([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId]);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await filesApi.upload(workOrderId, file);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo subir el archivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(fileId: number) {
    try {
      await filesApi.delete(workOrderId, fileId);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar');
    }
  }

  return (
    <Box sx={{ mt: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Archivos
      </Typography>

      {files.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          No hay ningún archivo adjunto a esta Orden de Trabajo.
        </Typography>
      )}

      {files.map((f) => (
        <Stack key={f.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.5 }}>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
            <AttachFileIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Link href={f.downloadUrl} target="_blank" rel="noopener" underline="hover" variant="body2" noWrap>
              {f.fileName}
            </Link>
            <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
              {formatSize(f.sizeBytes)}
            </Typography>
          </Stack>
          {canDelete && (
            <IconButton size="small" onClick={() => handleDelete(f.id)}>
              <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
            </IconButton>
          )}
        </Stack>
      ))}

      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      )}

      <input ref={fileInputRef} type="file" hidden onChange={handleFileSelected} />
      <Button
        size="small"
        variant="outlined"
        sx={{ mt: 1 }}
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? 'Subiendo…' : 'Agregar archivo'}
      </Button>
    </Box>
  );
}
