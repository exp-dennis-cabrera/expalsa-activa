import { Typography, Paper } from '@mui/material';

export default function GeneralSettingsTab() {
  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 480 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Organización
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        La configuración general (nombre, zona horaria, moneda) todavía no tiene una pantalla
        propia — próximamente.
      </Typography>
    </Paper>
  );
}
