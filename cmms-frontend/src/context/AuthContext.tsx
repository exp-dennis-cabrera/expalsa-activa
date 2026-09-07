import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import { meApi, type MyProfile, type PermissionEntity } from '../api/me';
import { useDispatch } from '../store';
import { revertAll } from '../utils/redux';
import { abortAllRequests } from '../api/cancellableRequest';
import type { LoginRequest, RegisterRequest } from '../types';
import { decodeJwtPayload } from '../utils/jwt';

interface HasEditOrDeleteRecord {
  createdById?: number | null;
  assignedUserIds?: number[] | null;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  role: string | null;
  userId: number | null;
  /**
   * Perfil del usuario. Se pide UNA sola vez al iniciar y vive aca.
   *
   * Antes, el menu de usuario pedia /auth/me por su cuenta: eran dos
   * peticiones en paralelo al cargar, y el avatar mostraba "?" hasta que
   * la suya respondiera. Ahora lo toma de aqui.
   */
  profile: MyProfile | null;
  /** false mientras la peticion inicial esta en curso. */
  profileLoaded: boolean;
  login: (data: LoginRequest) => Promise<{ mfaRequired: boolean; mfaChallengeToken: string | null }>;
  verifyMfa: (challengeToken: string, code: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  acceptInvitation: (data: { email: string; password: string; firstName: string; lastName?: string; phone?: string }) => Promise<void>;
  logout: () => void;
  // Copia fiel de las 5 funciones de permiso reales (AuthContext.tsx: hasViewPermission, etc.)
  hasViewPermission: (entity: PermissionEntity) => boolean;
  hasViewOtherPermission: (entity: PermissionEntity) => boolean;
  hasCreatePermission: (entity: PermissionEntity) => boolean;
  hasEditPermission: (entity: PermissionEntity, record: HasEditOrDeleteRecord | null | undefined) => boolean;
  hasDeletePermission: (entity: PermissionEntity, record: HasEditOrDeleteRecord | null | undefined) => boolean;
  hasDeleteOtherPermission: (entity: PermissionEntity) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function hasSession(): boolean {
  // La sesion depende del refreshToken (dura 7 dias), no del accessToken
  // (dura 30 min y se espera que expire todo el tiempo -- eso lo maneja
  // el refresh silencioso en client.ts, no debe forzar un logout aqui).
  return !!localStorage.getItem('cmms_refresh_token');
}

function getPayloadFromStoredToken() {
  const token = localStorage.getItem('cmms_access_token');
  if (!token) return null;
  return decodeJwtPayload(token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(hasSession);
  const [role, setRole] = useState<string | null>(() => getPayloadFromStoredToken()?.role ?? null);
  const [userId, setUserId] = useState<number | null>(() => {
    const sub = getPayloadFromStoredToken()?.sub;
    return sub ? Number(sub) : null;
  });
  const reduxDispatch = useDispatch();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [createPermissions, setCreatePermissions] = useState<PermissionEntity[]>([]);
  const [viewPermissions, setViewPermissions] = useState<PermissionEntity[]>([]);
  const [viewOtherPermissions, setViewOtherPermissions] = useState<PermissionEntity[]>([]);
  const [editOtherPermissions, setEditOtherPermissions] = useState<PermissionEntity[]>([]);
  const [deleteOtherPermissions, setDeleteOtherPermissions] = useState<PermissionEntity[]>([]);

  async function loadPermissions() {
    try {
      const profile = await meApi.get();
      setProfile(profile);
      setCreatePermissions(profile.role?.createPermissions ?? []);
      setViewPermissions(profile.role?.viewPermissions ?? []);
      setViewOtherPermissions(profile.role?.viewOtherPermissions ?? []);
      setEditOtherPermissions(profile.role?.editOtherPermissions ?? []);
      setDeleteOtherPermissions(profile.role?.deleteOtherPermissions ?? []);
    } catch (err) {
      // Igual que el real (JWTAuthContext, catch del INITIALIZE): si no se
      // puede leer el perfil, se CIERRA LA SESION en vez de quedar
      // autenticado sin permisos.
      //
      // Sin esto, el usuario quedaba en un estado roto: menu lateral vacio
      // (todas las entradas se filtran por permiso) y avatar con "?" (no
      // hay nombre). Parecia un problema de permisos, pero en realidad era
      // que el perfil nunca cargo -- normalmente porque el token expiro.
      //
      // Un 401 lo maneja el refresco automatico de client.ts; si aun asi
      // falla, la sesion ya no sirve y hay que volver a entrar.
      console.error('No se pudo cargar el perfil, cerrando sesión:', err);
      logout();
    } finally {
      setProfileLoaded(true);
    }
  }

  useEffect(() => {
    function syncFromStorage() {
      setIsAuthenticated(hasSession());
      const payload = getPayloadFromStoredToken();
      setRole(payload?.role ?? null);
      setUserId(payload?.sub ? Number(payload.sub) : null);
    }
    window.addEventListener('cmms:tokens-refreshed', syncFromStorage);
    return () => window.removeEventListener('cmms:tokens-refreshed', syncFromStorage);
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadPermissions();
  }, [isAuthenticated]);

  function storeTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('cmms_access_token', accessToken);
    localStorage.setItem('cmms_refresh_token', refreshToken);
    setIsAuthenticated(true);
    const payload = decodeJwtPayload(accessToken);
    setRole(payload?.role ?? null);
    setUserId(payload?.sub ? Number(payload.sub) : null);
  }

  async function login(data: LoginRequest) {
    const response = await authApi.login(data);
    if (response.mfaRequired) {
      return { mfaRequired: true, mfaChallengeToken: response.mfaChallengeToken };
    }
    // Igual que loginInternal real: se limpia el store antes de entrar,
    // para no arrastrar datos del usuario anterior.
    reduxDispatch(revertAll());
    storeTokens(response.accessToken!, response.refreshToken!);
    return { mfaRequired: false, mfaChallengeToken: null };
  }

  async function verifyMfa(challengeToken: string, code: string) {
    const response = await authApi.verifyMfa(challengeToken, code);
    reduxDispatch(revertAll());
    storeTokens(response.accessToken!, response.refreshToken!);
  }

  async function register(data: RegisterRequest) {
    const response = await authApi.register(data);
    storeTokens(response.accessToken!, response.refreshToken!);
  }

  async function acceptInvitation(data: { email: string; password: string; firstName: string; lastName?: string; phone?: string }) {
    const response = await authApi.acceptInvitation(data);
    storeTokens(response.accessToken!, response.refreshToken!);
  }

  function logout() {
    abortAllRequests();
    reduxDispatch(revertAll());
    localStorage.removeItem('cmms_access_token');
    localStorage.removeItem('cmms_refresh_token');
    setIsAuthenticated(false);
    setRole(null);
    setUserId(null);
    setCreatePermissions([]);
    setViewPermissions([]);
    setViewOtherPermissions([]);
    setEditOtherPermissions([]);
    setDeleteOtherPermissions([]);
  }

  function hasViewPermission(entity: PermissionEntity) {
    return viewPermissions.includes(entity);
  }
  function hasViewOtherPermission(entity: PermissionEntity) {
    return viewOtherPermissions.includes(entity);
  }
  function hasCreatePermission(entity: PermissionEntity) {
    return createPermissions.includes(entity);
  }
  /** Igual regla exacta que el real: dueño del registro, o el rol tiene editOtherPermissions, o estoy asignado. */
  function hasEditPermission(entity: PermissionEntity, record: HasEditOrDeleteRecord | null | undefined) {
    if (!record) return false;
    if (record.createdById != null && record.createdById === userId) return true;
    if (editOtherPermissions.includes(entity)) return true;
    return !!record.assignedUserIds && userId != null && record.assignedUserIds.includes(userId);
  }
  /**
   * Permiso general de eliminar, sin referirse a un registro concreto.
   * Util para controles de pantalla (filtros, interruptores) que no
   * dependen de un elemento en particular.
   */
  function hasDeleteOtherPermission(entity: PermissionEntity) {
    return deleteOtherPermissions.includes(entity);
  }

  function hasDeletePermission(entity: PermissionEntity, record: HasEditOrDeleteRecord | null | undefined) {
    if (!record) return false;
    if (record.createdById != null && record.createdById === userId) return true;
    return deleteOtherPermissions.includes(entity);
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated, role, userId, profile, profileLoaded, login, verifyMfa, register, acceptInvitation, logout,
        hasViewPermission, hasViewOtherPermission, hasCreatePermission, hasEditPermission, hasDeletePermission,
        hasDeleteOtherPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
