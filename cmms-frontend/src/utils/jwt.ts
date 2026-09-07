interface JwtPayload {
  sub: string;
  organizationId: number;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Decodifica el payload de un JWT (base64url) sin validar la firma --
 * la validacion real siempre ocurre en el backend. Esto es solo para
 * adaptar la UI (mostrar/ocultar botones) segun el rol del usuario.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
