import type { ApiError } from '../types';
import { decodeJwtPayload } from '../utils/jwt';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Tiempo maximo de espera. Sin esto, una peticion que no responde deja el
 * indicador de carga girando para siempre.
 */
const TIMEOUT_MS = 15000;
/** El refresco es critico y debe fallar rapido: si no responde, hay que ir al login. */
const REFRESH_TIMEOUT_MS = 10000;

/** Origen del fallo, para poder mostrar un mensaje util y decidir si reintentar. */
export type ApiErrorKind = 'network' | 'timeout' | 'auth' | 'validation' | 'server' | 'unknown';

export class ApiRequestError extends Error {
  status: number;
  /** Se agrega sin romper nada: los 46 archivos que ya usan ApiRequestError siguen igual. */
  kind: ApiErrorKind;

  constructor(status: number, message: string, kind: ApiErrorKind = 'unknown') {
    super(message);
    this.status = status;
    this.kind = kind;
  }
}

/** Clasifica la respuesta para dar un mensaje comprensible. */
function kindFromStatus(status: number): ApiErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 400 || status === 422) return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
}

/**
 * fetch con tiempo maximo de espera.
 *
 * Si el llamador ya trae su propia señal de cancelacion (una busqueda que se
 * reemplaza por otra), se respeta: cualquiera de las dos puede abortar.
 */
async function fetchConTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const señalExterna = options.signal;
  if (señalExterna) {
    if (señalExterna.aborted) controller.abort();
    else señalExterna.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    // Si el llamador cancelo a proposito, se propaga tal cual para que
    // cancellableFetch lo reconozca y no lo trate como error.
    if (señalExterna?.aborted) throw err;
    if ((err as { name?: string })?.name === 'AbortError') {
      throw new ApiRequestError(0, 'La solicitud tardó demasiado. Revisa tu conexión.', 'timeout');
    }
    throw new ApiRequestError(0, 'No se pudo conectar con el servidor.', 'network');
  } finally {
    clearTimeout(timer);
  }
}

function getAccessToken(): string | null {
  return localStorage.getItem('cmms_access_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('cmms_refresh_token');
}

function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('cmms_access_token', accessToken);
  localStorage.setItem('cmms_refresh_token', refreshToken);
  // AuthContext escucha este evento para actualizar el rol en memoria
  // cuando el refresh silencioso ocurre (localStorage no dispara 'storage'
  // en la misma pestaña que lo escribe).
  window.dispatchEvent(new CustomEvent('cmms:tokens-refreshed'));
}

function clearSessionAndRedirect() {
  localStorage.removeItem('cmms_access_token');
  localStorage.removeItem('cmms_refresh_token');
  window.location.href = '/login';
}

// Evita que multiples requests en paralelo disparen multiples refresh a la vez:
// todas comparten la misma promesa en curso.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new ApiRequestError(401, 'No hay sesión activa');
  }

  refreshPromise = (async () => {
    try {
      const response = await fetchConTimeout(
        `${API_BASE_URL}/auth/refresh`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        },
        REFRESH_TIMEOUT_MS,
      );

      if (!response.ok) {
        throw new ApiRequestError(response.status, 'No se pudo renovar la sesión');
      }

      const data = await response.json();
      storeTokens(data.accessToken, data.refreshToken);
      return data.accessToken as string;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}


/*
 * Un reconnect realtime no debe reutilizar deliberadamente un
 * access token a punto de vencer.
 *
 * 60 segundos de margen evita una carrera:
 * token válido al abrir socket -> vencido durante STOMP CONNECT.
 */
const REALTIME_TOKEN_MIN_TTL_MS = 60_000;


/**
 * Credencial para STOMP.
 *
 * - Reutiliza el access token si todavía tiene vida suficiente.
 * - Comparte refreshPromise con todo el cliente REST.
 * - Un 401/403 del refresh invalida la sesión.
 * - Un fallo transitorio de red NO borra la sesión: devuelve el
 *   token actual y deja que STOMP/backoff vuelva a intentarlo.
 *
 * Nunca se escribe el token en URL ni en logs.
 */
export async function getRealtimeAccessToken(
  forceRefresh = false,
): Promise<string> {

  const currentToken = getAccessToken();

  if (!forceRefresh && currentToken) {
    const payload = decodeJwtPayload(currentToken);

    const ttlMs =
      payload?.exp
        ? payload.exp * 1000 - Date.now()
        : 0;

    if (ttlMs > REALTIME_TOKEN_MIN_TTL_MS) {
      return currentToken;
    }
  }

  try {
    return await refreshAccessToken();
  } catch (error) {

    /*
     * Refresh token inválido/vencido:
     * fail closed.
     */
    if (
      error instanceof ApiRequestError &&
      (error.status === 401 || error.status === 403)
    ) {
      clearSessionAndRedirect();
      return '';
    }

    /*
     * Caída temporal de red/backend.
     *
     * No hacemos logout por un problema transitorio.
     * Si el token ya venció, Spring rechazará CONNECT y
     * el backoff hará un nuevo intento posteriormente.
     */
    return currentToken ?? '';
  }
}


/**
 * Wrapper sobre fetch que:
 * - agrega el header Authorization automaticamente si hay token
 * - parsea JSON de la respuesta
 * - convierte errores del backend (ApiError) en excepciones tipadas
 * - si recibe 401, intenta renovar el token UNA vez (silencioso) y reintenta
 *   la misma request; solo si eso tambien falla, cierra sesion y va a login.
 *   Esto evita que el usuario pierda la sesion solo porque paso tiempo
 *   (laptop suspendida, pestaña inactiva, etc).
 */
async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const token = getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetchConTimeout(`${API_BASE_URL}${path}`, { ...options, headers }, TIMEOUT_MS);

  // Rutas de autenticacion que NO deben intentar refrescar el token: si
  // login o refresh dan 401, reintentar no tiene sentido.
  //
  // OJO: la exclusion debe ser por ruta exacta, no por prefijo "/auth/".
  // Antes se excluia todo /auth/*, y eso dejaba fuera a /auth/me -- que SI
  // es una ruta normal que necesita refresco. Resultado: al expirar el
  // token, el perfil fallaba sin reintentar, y el usuario quedaba con el
  // menu lateral vacio y el avatar en "?" en vez de renovar la sesion.
  const RUTAS_SIN_REFRESCO = [
    '/auth/login', '/auth/register', '/auth/refresh', '/auth/mfa/verify',
    '/auth/accept-invitation', '/auth/forgot-password', '/auth/reset-password',
    '/auth/verify-email',
  ];
  const esRutaDeAutenticacion = RUTAS_SIN_REFRESCO.some((r) => path.startsWith(r));

  if (response.status === 401 && !isRetry && !esRutaDeAutenticacion) {
    try {
      await refreshAccessToken();
      return request<T>(path, options, true);
    } catch {
      clearSessionAndRedirect();
      throw new ApiRequestError(401, 'Sesión expirada', 'auth');
    }
  }

  if (response.status === 401) {
    clearSessionAndRedirect();
    throw new ApiRequestError(401, 'Sesión expirada', 'auth');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = data as ApiError | null;
    throw new ApiRequestError(
      response.status,
      error?.message ?? 'Error inesperado',
      kindFromStatus(response.status),
    );
  }

  return data as T;
}

/**
 * Los 4 metodos aceptan una señal de cancelacion OPCIONAL. Es opcional a
 * proposito: los 70 archivos que ya llaman api.get(ruta) siguen funcionando
 * sin cambios, y los listados con buscador pueden pasar la señal para que
 * una busqueda nueva cancele la anterior.
 *
 * Las mutaciones (POST/PATCH/PUT/DELETE) NUNCA se reintentan solas: repetir
 * un POST podria crear el registro dos veces. El unico reintento automatico
 * es el de request() tras renovar el token, y ocurre una sola vez.
 */
export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, signal }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, signal }),
  delete: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'DELETE', signal }),
};

/**
 * Copia fiel de getErrorMessage de Atlas: saca el mensaje legible de un
 * error, venga del backend o de la red.
 */
export function getErrorMessage(error: unknown, defaultMessage = 'Ocurrió un error'): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error) return error.message || defaultMessage;
  return defaultMessage;
}

/**
 * Upload multipart: NO se puede usar request() porque este fuerza
 * Content-Type: application/json. El navegador debe fijar el Content-Type
 * (multipart/form-data con boundary) automaticamente al enviar FormData.
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new ApiRequestError(response.status, 'No se pudo generar la exportación');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function uploadFile<T>(path: string, file: File, isRetry = false): Promise<T> {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (response.status === 401 && !isRetry) {
    try {
      await refreshAccessToken();
      return uploadFile<T>(path, file, true);
    } catch {
      clearSessionAndRedirect();
      throw new ApiRequestError(401, 'Sesión expirada');
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = data as ApiError | null;
    throw new ApiRequestError(response.status, error?.message ?? 'Error subiendo el archivo');
  }

  return data as T;
}
