import { Avatar, Box, Button, Dialog, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText: string;
  question: string;
}

// Mismo componente que usa Atlas real tanto para "descartar cambios sin
// guardar" como para confirmaciones de eliminar en distintos modulos.
export default function ConfirmDialog({ open, onCancel, onConfirm, confirmText, question }: Props) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth PaperProps={{ sx: { overflow: 'visible' } }}>
      <Box display="flex" alignItems="center" justifyContent="center" flexDirection="column" p={5}>
        <Avatar sx={{ bgcolor: '#fdeaea', color: 'error.main', width: 96, height: 96 }}>
          <CloseIcon sx={{ fontSize: 45 }} />
        </Avatar>
        <Typography align="center" sx={{ py: 4, px: 6 }} variant="h5">
          {question}
        </Typography>
        <Box>
          <Button variant="text" size="large" sx={{ mx: 1 }} onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" size="large" sx={{ mx: 1, px: 3 }} onClick={onConfirm}>
            {confirmText}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
