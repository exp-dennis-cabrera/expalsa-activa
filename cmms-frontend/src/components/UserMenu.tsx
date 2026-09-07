import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../constants';

export default function UserMenu() {
  const { role, logout, profile, profileLoaded } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  // El perfil ya lo trae el contexto: se pide UNA sola vez al iniciar.
  // Antes este componente pedia /auth/me por su cuenta -- dos peticiones en
  // paralelo al cargar, y el avatar en "?" hasta que la suya respondiera.

  function handleLogout() {
    setAnchorEl(null);
    logout();
    navigate('/login');
  }

  // Mientras el perfil carga se deja el avatar vacio: mostrar "?" hacia
  // parecer que algo fallo, cuando solo estaba en camino.
  const initial = profile?.firstName?.[0]?.toUpperCase() ?? (profileLoaded ? '?' : '');

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
        <Avatar src={profile?.avatarUrl ?? undefined} sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
          {initial}
        </Avatar>
      </IconButton>

      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { width: 260 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
          <Avatar src={profile?.avatarUrl ?? undefined} sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
            {initial}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {profile?.firstName ?? '—'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {role ? ROLE_LABELS[role] ?? role : ''}
            </Typography>
          </Box>
        </Box>
        <Divider />

        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            navigate('/app/profile');
          }}
        >
          <ListItemIcon>
            <PersonRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Mi cuenta</ListItemText>
        </MenuItem>

        <MenuItem disabled>
          <ListItemIcon>
            <BusinessRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Mi Empresa</ListItemText>
        </MenuItem>

        <MenuItem disabled>
          <ListItemIcon>
            <HelpRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Documentación</ListItemText>
        </MenuItem>

        <MenuItem disabled>
          <ListItemIcon>
            <PhoneIphoneRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Obtener aplicación móvil</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Desconexión</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
