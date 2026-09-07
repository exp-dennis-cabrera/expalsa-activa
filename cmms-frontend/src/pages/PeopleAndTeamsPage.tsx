import { useState } from 'react';
import { Box, Tabs, Tab, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import PersonAddIcon from '@mui/icons-material/PersonAddRounded';
import PeopleTab from '../components/PeopleTab';
import TeamsTab from '../components/TeamsTab';

// Copia fiel de PeopleAndTeams/index.tsx real: un solo modulo con 2
// pestanas (Personas/Equipos), con un boton "+" que cambia de accion
// segun cual este activa.
export default function PeopleAndTeamsPage() {
  const [tab, setTab] = useState<'people' | 'teams'>('people');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab value="people" label="Personas" />
          <Tab value="teams" label="Equipos" />
        </Tabs>
        {tab === 'people' ? (
          <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setInviteOpen(true)}>
            Invitar personas
          </Button>
        ) : (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateTeamOpen(true)}>
            Equipo
          </Button>
        )}
      </Box>

      {tab === 'people' ? (
        <PeopleTab inviteOpen={inviteOpen} onInviteClose={() => setInviteOpen(false)} />
      ) : (
        <TeamsTab createOpen={createTeamOpen} onCreateClose={() => setCreateTeamOpen(false)} />
      )}
    </>
  );
}
