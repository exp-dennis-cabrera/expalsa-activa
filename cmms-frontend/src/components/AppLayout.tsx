import { useEffect, useState } from 'react';
import { useTitle } from '../context/TitleContext';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Chip,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/LogoutRounded';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import MenuIcon from '@mui/icons-material/MenuRounded';
import ExpandLessIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import AssignmentTwoToneIcon from '@mui/icons-material/AssignmentTwoTone';
import EventRepeatTwoToneIcon from '@mui/icons-material/EventRepeatTwoTone';
import InsertChartTwoToneIcon from '@mui/icons-material/InsertChartTwoTone';
import CalendarMonthTwoToneIcon from '@mui/icons-material/CalendarMonthTwoTone';
import MoveToInboxTwoToneIcon from '@mui/icons-material/MoveToInboxTwoTone';
import Inventory2TwoToneIcon from '@mui/icons-material/Inventory2TwoTone';
import SpeedTwoToneIcon from '@mui/icons-material/SpeedTwoTone';
import PlaceTwoToneIcon from '@mui/icons-material/PlaceTwoTone';
import BuildTwoToneIcon from '@mui/icons-material/BuildTwoTone';
import GroupsTwoToneIcon from '@mui/icons-material/GroupsTwoTone';
import CategoryTwoToneIcon from '@mui/icons-material/CategoryTwoTone';
import SettingsTwoToneIcon from '@mui/icons-material/SettingsTwoTone';
import AcUnitTwoToneIcon from '@mui/icons-material/AcUnitTwoTone';
import type { SvgIconComponent } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import type { PermissionEntity } from '../api/me';
import { workOrdersApi } from '../api/workOrders';
import { ROLE_LABELS } from '../constants';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';

const SIDEBAR_WIDTH = 248;

interface NavChild {
  label: string;
  path?: string;
  comingSoon?: boolean;
}

interface NavItem {
  label: string;
  path?: string;
  icon: SvgIconComponent;
  comingSoon?: boolean;
  children?: NavChild[];
  // Igual que el real: cada entrada declara que permiso de VISTA necesita.
  // Si el rol del usuario no lo tiene, la entrada no se muestra.
  permission?: PermissionEntity;
  allowedRoles?: string[];
}

// Lista plana, sin encabezados de seccion -- mismo estilo que el sidebar real.
const NAV_ITEMS: NavItem[] = [
  { label: 'Órdenes de trabajo', path: '/app/work-orders', icon: AssignmentTwoToneIcon, permission: 'WORK_ORDERS' },
  { label: 'Planificador', path: '/app/planner', icon: CalendarMonthTwoToneIcon, permission: 'WORK_ORDERS' },
  { label: 'Mantenimiento preventivo', path: '/app/preventive-maintenance', icon: EventRepeatTwoToneIcon, permission: 'PREVENTIVE_MAINTENANCES' },
  { label: 'Estadística', path: '/app/analytics', icon: InsertChartTwoToneIcon, permission: 'ANALYTICS' },
  { label: 'Solicitudes', path: '/app/requests', icon: MoveToInboxTwoToneIcon, permission: 'REQUESTS' },
  { label: 'Activos', path: '/app/assets', icon: Inventory2TwoToneIcon, permission: 'ASSETS' },
  { label: 'Medidores', path: '/app/meters', icon: SpeedTwoToneIcon, permission: 'METERS' },
  { label: 'Monitoreo de hielo', path: '/app/ot/ice', icon: AcUnitTwoToneIcon, allowedRoles: ['ADMIN', 'LIMITED_ADMIN'] },
  { label: 'Ubicaciones', path: '/app/locations', icon: PlaceTwoToneIcon, permission: 'LOCATIONS' },
  { label: 'Repuestos / Inventario', icon: BuildTwoToneIcon, comingSoon: true, permission: 'PARTS_AND_MULTIPARTS' },
  { label: 'Personas y equipos', icon: GroupsTwoToneIcon, path: '/app/people-teams', permission: 'PEOPLE_AND_TEAMS' },
  { label: 'Categorías', path: '/app/categories', icon: CategoryTwoToneIcon, permission: 'CATEGORIES' },
  { label: 'Ajustes', path: '/app/settings', icon: SettingsTwoToneIcon, permission: 'SETTINGS' },
];

/**
 * El layout ya no recibe children ni title.
 *
 * Ahora es el elemento PADRE de las rutas privadas (igual que
 * ExtendedSidebarLayout en Atlas): se monta una sola vez y la pagina activa
 * se dibuja en el <Outlet />. Eso mantiene vivos el menu, el perfil, los
 * permisos, las notificaciones y el WebSocket al navegar entre modulos.
 *
 * El titulo se deduce de la ruta activa, que ya conocemos por NAV_ITEMS.
 */
interface Props {}

// Oculta la barra de scroll visualmente sin quitar la capacidad de hacer scroll.
const hiddenScrollbarSx = {
  '&::-webkit-scrollbar': { width: 0, height: 0, background: 'transparent' },
  scrollbarWidth: 'none' as const,
  msOverflowStyle: 'none' as const,
};

export default function AppLayout(_: Props) {
  const { logout, role, hasViewPermission } = useAuth();
  // Igual que el real: insignia roja con las ordenes urgentes (vencen en
  // <=2 dias y siguen abiertas) junto a "Ordenes de trabajo" en el menu.
  const [urgentCount, setUrgentCount] = useState(0);

  useEffect(() => {
    if (!hasViewPermission('WORK_ORDERS')) return;
    workOrdersApi.urgentCount()
      .then((r) => setUrgentCount(r.count))
      .catch(() => setUrgentCount(0));
  }, [hasViewPermission]);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  // Una pantalla de detalle puede fijar su propio titulo (el nombre del
  // activo, por ejemplo); si no lo hace, se deduce del menu.
  const { title: tituloDePagina } = useTitle();

  const tituloDeRuta =
    NAV_ITEMS.find((i) => i.path === location.pathname)?.label ??
    NAV_ITEMS.flatMap((i) => i.children ?? []).find((c) => c.path === location.pathname)?.label ??
    '';

  const activeParent = NAV_ITEMS.find((item) =>
    item.children?.some((c) => c.path === location.pathname),
  )?.label;
  const [expanded, setExpanded] = useState<string | null>(activeParent ?? null);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function handleNavigate(path?: string) {
    if (!path) return;
    navigate(path);
    if (isMobile) setMobileOpen(false);
  }

  function toggleExpand(label: string) {
    setExpanded((prev) => (prev === label ? null : label));
  }

  const itemSx = (active: boolean) => ({
    borderRadius: 1.5,
    mb: 0.5,
    color: active ? '#fff' : '#c9d1e6',
    '&.Mui-selected': {
      bgcolor: 'primary.main',
      '&:hover': { bgcolor: 'primary.dark' },
    },
    '&.Mui-disabled': {
      color: '#565f7c',
      opacity: 1,
    },
  });

  const sidebarContent = (
    <>
      <Toolbar sx={{ px: 2.5, py: 2.5, minHeight: 'auto !important' }}>
        <Box
          sx={{
            bgcolor: '#fff',
            borderRadius: 2,
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <Box
            component="img"
            src="/branding/logo.png"
            alt="Expalsa"
            sx={{ height: 44, width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
          />
        </Box>
      </Toolbar>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, ...hiddenScrollbarSx }}>
        <List disablePadding>
          {NAV_ITEMS
            .filter((item) => (item.permission ? hasViewPermission(item.permission) : true))
            .filter((item) =>
              item.allowedRoles
                ? !!role && item.allowedRoles.includes(role)
                : true
            )
            .map((item) => {
            const Icon = item.icon;
            if (item.children) {
              const isOpen = expanded === item.label;
              const hasActiveChild = item.children.some((c) => c.path === location.pathname);
              return (
                <Box key={item.label}>
                  <ListItemButton onClick={() => toggleExpand(item.label)} sx={itemSx(hasActiveChild)}>
                    <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                      <Icon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontSize: 13.5, fontWeight: hasActiveChild ? 700 : 500 }}
                    />
                    {isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  </ListItemButton>
                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    <List disablePadding sx={{ pl: 2.2 }}>
                      {item.children.map((child) => {
                        const active = child.path === location.pathname;
                        return (
                          <ListItemButton
                            key={child.label}
                            disabled={child.comingSoon}
                            selected={active}
                            onClick={() => handleNavigate(child.path)}
                            sx={itemSx(active)}
                          >
                            <ListItemText
                              primary={child.label}
                              primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 700 : 500 }}
                            />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Collapse>
                </Box>
              );
            }

            const active = item.path === location.pathname;
            return (
              <ListItemButton
                key={item.label}
                disabled={item.comingSoon}
                selected={active}
                onClick={() => handleNavigate(item.path)}
                sx={itemSx(active)}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13.5, fontWeight: active ? 700 : 500 }} />
                {item.path === '/work-orders' && urgentCount > 0 && (
                  <Chip
                    label={urgentCount}
                    size="small"
                    color="error"
                    sx={{ height: 20, minWidth: 20, fontSize: 11, fontWeight: 700 }}
                  />
                )}
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Box sx={{ p: 2 }}>
        {role && (
          <Typography variant="caption" sx={{ display: 'block', color: '#7280a0', mb: 1, textAlign: 'center' }}>
            Sesión: {ROLE_LABELS[role] ?? role}
          </Typography>
        )}
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            color: '#c9d1e6',
            borderColor: '#3a4468',
            '&:hover': { borderColor: 'primary.main', color: '#fff' },
          }}
        >
          Cerrar sesión
        </Button>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Movil: drawer temporal que se superpone y se cierra al navegar o tocar afuera */}
      <Drawer
        variant="temporary"
        open={isMobile && mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          [`& .MuiDrawer-paper`]: {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'secondary.main',
            color: '#c9d1e6',
            border: 'none',
          },
        }}
      >
        {sidebarContent}
      </Drawer>

      {/* Escritorio: sidebar fijo, siempre visible */}
      <Drawer
        variant="permanent"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          [`& .MuiDrawer-paper`]: {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'secondary.main',
            color: '#c9d1e6',
            border: 'none',
          },
        }}
      >
        {sidebarContent}
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: { xs: 1.5, md: 2 },
            py: 1.2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, md: 1.5 }}>
            <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { xs: 'inline-flex', md: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <IconButton onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
            {(tituloDePagina ?? tituloDeRuta) && (
              <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 18, md: 24 } }} noWrap>
                {tituloDePagina ?? tituloDeRuta}
              </Typography>
            )}
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <NotificationBell />
            <UserMenu />
          </Stack>
        </Box>

        <Box component="main" sx={{ flex: 1, px: { xs: 2, md: 5 }, py: { xs: 2, md: 4 }, minWidth: 0, overflowX: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
