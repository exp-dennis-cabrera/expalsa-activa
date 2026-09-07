import { useState } from 'react';
import { Tabs, Tab, Typography, Box } from '@mui/material';
import ShiftsSettingsTab from '../components/ShiftsSettingsTab';
import IntegrationsSettingsTab from '../components/IntegrationsSettingsTab';
import MailSettingsTab from '../components/MailSettingsTab';
import GeneralSettingsTab from '../components/GeneralSettingsTab';
import CustomFieldsSettingsTab from '../components/CustomFieldsSettingsTab';
import RolesTab from '../components/RolesTab';
import { useAuth } from '../context/AuthContext';

// Mismo patron de tabs que SettingsLayout.tsx real de Atlas
// (General, Features, Roles, Checklists, Integrations) -- nosotros
// arrancamos con General, Roles, Correo y Campos personalizados.
// Igual que el real: solo entra quien tenga viewPermissions de SETTINGS.
export default function AjustesPage() {
  const [tab, setTab] = useState<'general' | 'roles' | 'shifts' | 'integrations' | 'mail' | 'customFields'>('general');
  // El permiso ya lo conoce el contexto: no hace falta volver a pedir
  // /auth/me solo para leer una casilla.
  const { hasViewPermission, profileLoaded } = useAuth();
  const hasAccess = profileLoaded ? hasViewPermission('SETTINGS') : null;

  if (hasAccess === null) {
    return (
      <>
        <Typography sx={{ color: 'text.secondary' }}>Cargando…</Typography>
      </>
    );
  }

  if (!hasAccess) {
    return (
      <>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>
            No tienes acceso a los Ajustes.
          </Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab value="general" label="General" />
        <Tab value="roles" label="Roles" />
        <Tab value="shifts" label="Turnos" />
        <Tab value="integrations" label="Integraciones" />
        <Tab value="mail" label="Correo" />
        <Tab value="customFields" label="Campos personalizados" />
      </Tabs>

      {tab === 'general' && <GeneralSettingsTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'shifts' && <ShiftsSettingsTab />}
      {tab === 'integrations' && <IntegrationsSettingsTab />}
      {tab === 'mail' && <MailSettingsTab />}
      {tab === 'customFields' && <CustomFieldsSettingsTab />}
    </>
  );
}
