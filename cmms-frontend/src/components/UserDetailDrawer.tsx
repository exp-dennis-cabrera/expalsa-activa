import { Drawer, Box, Avatar, Typography, Divider, Tabs, Tab } from '@mui/material';
import { useState } from 'react';
import { ROLE_LABELS } from '../constants';
import type { UserSummary } from '../types';

interface Props {
  user: UserSummary | null;
  onClose: () => void;
}

// Copia fiel de UserDetailsDrawer.tsx real: Drawer lateral (no un Dialog,
// a diferencia del detalle de Equipos), avatar con inicial, pestañas
// Resumen/Actividad. La pestaña Actividad se simplifica honestamente --
// el real muestra un gráfico de órdenes creadas/completadas en las
// últimas 2 semanas, que requeriría un endpoint de analítica que no
// construimos todavía.
export default function UserDetailDrawer({ user, onClose }: Props) {
  const [tab, setTab] = useState<'overview' | 'activity'>('overview');

  if (!user) return null;

  const fields: { label: string; value: string | number | null | undefined }[] = [
    { label: 'ID', value: user.id },
    { label: 'Nombre completo', value: user.fullName },
    { label: 'Correo', value: user.email },
    { label: 'Teléfono', value: user.phone },
    { label: 'Puesto', value: user.jobTitle },
    { label: 'Rol', value: user.roleName ? ROLE_LABELS[user.roleName] ?? user.roleName : null },
    { label: 'Tarifa por hora', value: user.hourlyRate != null ? `$${user.hourlyRate.toFixed(2)}` : null },
  ];

  return (
    <Drawer anchor="right" open={!!user} onClose={onClose}>
      <Box sx={{ height: '100%', width: { xs: 340, lg: 400 }, overflowY: 'auto' }}>
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Typography variant="subtitle2">Detalle de la persona</Typography>
        </Box>
        <Divider sx={{ my: 1 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Avatar
            variant="rounded"
            sx={{
              mx: 'auto',
              my: 2,
              width: 64,
              height: 64,
              fontSize: 28,
              bgcolor: 'primary.light',
              color: 'primary.main',
            }}
          >
            {user.fullName.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h3" noWrap gutterBottom>
            {user.fullName}
          </Typography>
        </Box>
        <Divider sx={{ my: 3 }} />

        <Box sx={{ bgcolor: 'action.hover', '& .MuiTabs-flexContainer': { justifyContent: 'center' } }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" textColor="primary" indicatorColor="primary">
            <Tab label="Resumen" value="overview" />
            <Tab label="Actividad" value="activity" />
          </Tabs>
        </Box>
        <Divider sx={{ my: 1 }} />

        {tab === 'overview' &&
          fields.map(({ label, value }) =>
            value ? (
              <Box key={label}>
                <Box sx={{ mt: 1, px: 3 }}>
                  <Typography component="span" variant="subtitle2">
                    {label}
                  </Typography>
                  <Typography variant="h5">{value}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
              </Box>
            ) : null,
          )}

        {tab === 'activity' && (
          <Box sx={{ mt: 3, px: 3, textAlign: 'center' }}>
            <Typography sx={{ color: 'text.secondary' }}>
              La actividad de esta persona (órdenes creadas/completadas en los últimos 14 días) todavía no está disponible.
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
