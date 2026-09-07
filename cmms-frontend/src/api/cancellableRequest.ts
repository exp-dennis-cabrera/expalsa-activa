/**
 * Cancelacion de peticiones con AbortController.
 *
 * Copia fiel de utils/cancellableRequest.ts de Atlas CMMS (commit 44069b69).
 * Se mantiene la misma estructura, los mismos nombres y la misma logica; solo
 * cambia que aca no depende de Redux (el dispatch se agregara en la fase 3).
 */

interface CancellableRequest {
  abort: () => void;
  signal: AbortSignal | null;
}

/**
 * Un controlador por clave. Al pedir uno nuevo con la misma clave, la
 * peticion anterior se cancela: eso evita que la respuesta lenta de una
 * busqueda vieja pise el resultado de la ultima.
 */
const controllers = new Map<string, AbortController>();

export function createCancellableRequest(key: string): CancellableRequest {
  controllers.get(key)?.abort();

  const controller = new AbortController();
  controllers.set(key, controller);

  return {
    abort: () => controller.abort(),
    signal: controller.signal,
  };
}

/** true si el error viene de una peticion cancelada, no de un fallo real. */
export function isAbortError(error: unknown): boolean {
  return (error as { name?: string })?.name === 'AbortError';
}

/**
 * Ejecuta una peticion cancelable y maneja el indicador de carga.
 *
 * El detalle importante (igual que el real): si la peticion fue CANCELADA,
 * no se apaga el indicador. Significa que ya hay otra peticion en curso que
 * lo va a apagar ella -- si lo apagaramos aca, el cargador parpadearia con
 * cada letra que se escribe en un buscador.
 */
export async function cancellableFetch<T>(
  key: string,
  apiCall: (signal: AbortSignal) => Promise<T>,
  onSuccess: (data: T) => void,
  setLoading?: (loading: boolean) => void,
): Promise<void> {
  const { signal } = createCancellableRequest(key);
  let isCancelled = false;
  try {
    setLoading?.(true);
    const data = await apiCall(signal!);
    onSuccess(data);
  } catch (error) {
    if (isAbortError(error)) {
      isCancelled = true;
      return;
    }
    throw error;
  } finally {
    if (!isCancelled) {
      setLoading?.(false);
    }
  }
}

/** Cancela todas las peticiones en vuelo. Se usa al cerrar sesion. */
export function abortAllRequests(): void {
  controllers.forEach((c) => c.abort());
  controllers.clear();
}
