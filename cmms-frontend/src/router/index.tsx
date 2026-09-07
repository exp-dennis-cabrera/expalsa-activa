import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';

import SuspenseLoader from '../components/SuspenseLoader';
import AppLayout from '../components/AppLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import IceLivePage from '../pages/IceLivePage';

/**
 * Enrutamiento copiado de router/index.tsx y router/app.tsx de Atlas CMMS
 * (commit 44069b69).
 *
 * Se mantienen el envoltorio Loader, la ruta padre "app" con el layout
 * dentro del guardian de autenticacion, la redireccion de raiz y el
 * comodin final. Solo se listan los modulos que existen en esta app: las
 * rutas de Atlas para repuestos, ordenes de compra, proveedores, tableros
 * de proyecto y planos apuntarian a componentes inexistentes.
 */
const Loader = (Component: React.ComponentType<any>) => (props: any) =>
  (
    <Suspense fallback={<SuspenseLoader />}>
      <Component {...props} />
    </Suspense>
  );

// --- Publicas ---
const Login = Loader(lazy(() => import('../pages/LoginPage')));
const ForgotPassword = Loader(lazy(() => import('../pages/ForgotPasswordPage')));
const ResetPassword = Loader(lazy(() => import('../pages/ResetPasswordPage')));
const VerifyEmail = Loader(lazy(() => import('../pages/VerifyEmailPage')));
const AcceptInvite = Loader(lazy(() => import('../pages/AcceptInvitePage')));

// --- Privadas ---
const WorkOrders = Loader(lazy(() => import('../pages/WorkOrdersPage')));
const Planner = Loader(lazy(() => import('../pages/PlanificadorPage')));
const PreventiveMaintenance = Loader(lazy(() => import('../pages/PreventiveMaintenancePage')));
const Requests = Loader(lazy(() => import('../pages/RequestsPage')));
const Meters = Loader(lazy(() => import('../pages/MetersPage')));
const Assets = Loader(lazy(() => import('../pages/AssetsPage')));
const AssetDetails = Loader(lazy(() => import('../pages/AssetDetailsPage')));
const Categories = Loader(lazy(() => import('../pages/CategoriesPage')));
const Locations = Loader(lazy(() => import('../pages/LocationsPage')));
const Analytics = Loader(lazy(() => import('../pages/AnalyticsPage')));
const PeopleAndTeams = Loader(lazy(() => import('../pages/PeopleAndTeamsPage')));
const Settings = Loader(lazy(() => import('../pages/AjustesPage')));
const Profile = Loader(lazy(() => import('../pages/ProfilePage')));

/** Hijas de /app -- se dibujan en el <Outlet /> del layout. */
const appRoutes: RouteObject[] = [
  { path: '', element: <Navigate to="work-orders" replace /> },
  { path: 'work-orders', element: <WorkOrders /> },
  { path: 'planner', element: <Planner /> },
  { path: 'preventive-maintenance', element: <PreventiveMaintenance /> },
  { path: 'requests', element: <Requests /> },
  { path: 'meters', element: <Meters /> },
  { path: 'assets', element: <Assets /> },
  // Detalle en pantalla completa, igual que el real (/app/assets/{id}).
  { path: 'assets/:id', element: <AssetDetails /> },
  { path: 'categories', element: <Categories /> },
  { path: 'locations', element: <Locations /> },
  { path: 'analytics', element: <Analytics /> },
  { path: 'people-teams', element: <PeopleAndTeams /> },
  { path: 'settings', element: <Settings /> },
  { path: 'ot/ice', element: <IceLivePage /> },
  { path: 'profile', element: <Profile /> },
];

const routes: RouteObject[] = [
  { path: 'login', element: <Login /> },
  { path: 'forgot-password', element: <ForgotPassword /> },
  { path: 'reset-password', element: <ResetPassword /> },
  { path: 'verify-email', element: <VerifyEmail /> },
  { path: 'accept-invite', element: <AcceptInvite /> },
  {
    path: 'app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: appRoutes,
  },
  { path: '', element: <Navigate to={'/app/work-orders'} replace /> },
  { path: '*', element: <Navigate to={'/app/work-orders'} replace /> },
];

export default routes;
