import { cloneElement, useEffect, useRef, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  alpha,
  IconButton,
  Badge,
  Popover,
  Typography,
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  CircularProgress,
  useTheme,
} from '@mui/material';
import NotificationsActiveTwoToneIcon from '@mui/icons-material/NotificationsActiveTwoTone';
import NotificationsNoneTwoToneIcon from '@mui/icons-material/NotificationsNoneTwoTone';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentTwoToneIcon from '@mui/icons-material/AssignmentTwoTone';
import MoveToInboxTwoToneIcon from '@mui/icons-material/MoveToInboxTwoTone';
import Inventory2TwoToneIcon from '@mui/icons-material/Inventory2TwoTone';
import LocationOnTwoToneIcon from '@mui/icons-material/LocationOnTwoTone';
import HandymanTwoToneIcon from '@mui/icons-material/HandymanTwoTone';
import SpeedTwoToneIcon from '@mui/icons-material/SpeedTwoTone';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptTwoToneIcon from '@mui/icons-material/ReceiptTwoTone';
import { notificationsApi } from '../api/notifications';
import type { AppNotification, NotificationType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useRealtimeSubscription } from '../realtime/RealtimeContext';
import { useDispatch, useSelector } from '../store';
import { getNotifications, addNotification, editNotification } from '../slices/notification';


// Copia fiel de notificationIcons real: un icono distinto por cada tipo
// de recurso, para reconocer de un vistazo de que es la notificacion.
const NOTIFICATION_ICONS: Record<NotificationType, ReactElement> = {
  ASSET: <Inventory2TwoToneIcon />,
  LOCATION: <LocationOnTwoToneIcon />,
  METER: <SpeedTwoToneIcon />,
  PART: <HandymanTwoToneIcon />,
  REQUEST: <MoveToInboxTwoToneIcon />,
  TEAM: <PeopleIcon />,
  WORK_ORDER: <AssignmentTwoToneIcon />,
  INFO: <NotificationsNoneTwoToneIcon />,
  PURCHASE_ORDER: <ReceiptTwoToneIcon />,
};

// Igual que el real: cada tipo sabe a que pantalla navegar.
function getResourceUrl(type: NotificationType, id: number | null): string | null {
  if (id == null) return null;
  switch (type) {
    case 'ASSET':
      return `/app/assets?open=${id}`;
    case 'REQUEST':
      return `/app/requests?open=${id}`;
    case 'WORK_ORDER':
      // Igual que getWorkOrderUrl real: /app/work-orders/{id}.
      return `/app/work-orders?open=${id}`;
    case 'METER':
      return `/app/meters?open=${id}`;
    case 'LOCATION':
      return `/app/locations/${id}`;
    case 'TEAM':
      return `/app/people-teams?tab=teams&open=${id}`;
    case 'PART':
    case 'PURCHASE_ORDER':
    case 'INFO':
    default:
      return null;
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { userId, profile } = useAuth();
  const ref = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setOpen] = useState(false);
  // Las notificaciones viven en el store, igual que en Atlas.
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.notifications.notifications.content);
  const [loading, setLoading] = useState(false);

  // El contador sale del backend, no de las notificaciones descargadas:
  // con 40 sin leer y solo 25 en pantalla, antes mostraba "25".
  const [unseenCount, setUnseenCount] = useState(0);

  function refreshUnreadCount() {
    notificationsApi
      .unreadCount()
      .then((r) => setUnseenCount(r.count))
      .catch(() => {});
  }

  async function loadInitial() {
    setLoading(true);
    try {
      await dispatch(getNotifications(0, 25));
    } catch {
      // silencioso: no bloquear la interfaz si falla la carga inicial
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitial();
  }, []);

  /*
   * Una subscription lógica.
   *
   * El transporte, JWT, heartbeat y reconexión
   * pertenecen exclusivamente a RealtimeProvider.
   */
  useRealtimeSubscription(
    userId && profile?.email
      ? `/user/${profile.email}/notifications`
      : null,

    (message) => {
      try {
        const notification =
          JSON.parse(
            message.body
          ) as AppNotification;

        dispatch(
          addNotification(
            notification
          )
        );
      } catch {
        /*
         * Frame inválido:
         * no derribar la conexión global.
         */
      }
    },

    !!userId &&
      !!profile?.email
  );

  // Contador real al montar, y cada vez que llega una notificacion nueva.
  useEffect(refreshUnreadCount, [notifications.length]);

  async function handleNotificationClick(notification: AppNotification) {
    const url = getResourceUrl(notification.notificationType, notification.resourceId);
    if (!notification.seen) {
      try {
        await notificationsApi.markAsRead(notification.id);
        dispatch(editNotification(notification.id, { ...notification, seen: true }));
        refreshUnreadCount();
      } catch {
        // Si falla marcarla como leida NO se bloquea la navegacion: lo que
        // el usuario quiere es abrir el recurso, no cambiar un indicador.
      }
    }
    setOpen(false);
    if (url) navigate(url);
  }

  async function handleMarkAllRead() {
    await notificationsApi.markAllAsRead();
    dispatch(getNotifications(0, 25));
    refreshUnreadCount();
  }

  return (
    <>
      <Tooltip arrow title="Notificaciones">
        <Badge
          variant="dot"
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={
            unseenCount
              ? {
                  '.MuiBadge-badge': {
                    background: theme.palette.success.main,
                    animation: 'cmms-pulse 1s infinite',
                  },
                  '@keyframes cmms-pulse': {
                    '0%': { transform: 'scale(0.9)', opacity: 1 },
                    '50%': { transform: 'scale(1.2)', opacity: 0.7 },
                    '100%': { transform: 'scale(0.9)', opacity: 1 },
                  },
                }
              : {}
          }
        >
          <IconButton
            ref={ref}
            color="primary"
            onClick={() => setOpen(true)}
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              background: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              '&:hover': { background: alpha(theme.palette.primary.main, 0.2) },
            }}
          >
            <NotificationsActiveTwoToneIcon fontSize="small" />
          </IconButton>
        </Badge>
      </Tooltip>

      <Popover
        disableScrollLock
        anchorEl={ref.current}
        onClose={() => setOpen(false)}
        open={isOpen}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box minWidth={440} maxWidth={440} p={1}>
          {/* Encabezado decorado, igual que el real: fondo oscuro con una
              capa verde encima y el texto centrado. */}
          <Box
            mb={1}
            sx={{
              position: 'relative',
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, #1c2333 100%)`,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                opacity: 0.3,
                background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, transparent 100%)`,
              }}
            />
            <Box sx={{ position: 'relative', zIndex: 2, py: 3 }}>
              <Typography textAlign="center" sx={{ pb: 0.5, color: '#fff' }} variant="h4">
                Notificaciones
              </Typography>
              <Typography textAlign="center" variant="subtitle2" sx={{ color: alpha('#fff', 0.7) }}>
                Tienes{' '}
                <Box component="span" sx={{ color: theme.palette.success.light, fontWeight: 700 }}>
                  {unseenCount}
                </Box>{' '}
                mensajes nuevos
              </Typography>
            </Box>
          </Box>
          {unseenCount > 0 && (
            <Button onClick={handleMarkAllRead} startIcon={<CheckCircleOutlineIcon />}>
              Marcar todas como vistas
            </Button>
          )}
        </Box>
        <Divider />

        {notifications.length > 0 ? (
          <Box sx={{ height: 220, overflowY: 'auto', position: 'relative' }}>
            {loading && (
              <CircularProgress sx={{ position: 'absolute', zIndex: 10, left: '45%', top: '45%' }} />
            )}
            <List sx={{ position: 'relative' }}>
              {notifications.map((notification) => (
                <ListItemButton
                  selected={!notification.seen}
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <ListItemIcon>
                    {cloneElement(NOTIFICATION_ICONS[notification.notificationType] ?? NOTIFICATION_ICONS.INFO, {
                      color: notification.seen ? undefined : 'primary',
                    })}
                  </ListItemIcon>
                  <ListItemText
                    primary={notification.title}
                    secondary={
                      <>
                        {notification.message && (
                          <Box component="span" sx={{ display: 'block' }}>
                            {notification.message}
                          </Box>
                        )}
                        {formatDate(notification.createdAt)}
                      </>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center', minWidth: 440 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No tienes notificaciones.
            </Typography>
          </Box>
        )}
        <Divider />
      </Popover>
    </>
  );
}
