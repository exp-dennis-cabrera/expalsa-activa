import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Mismo mecanismo que el setTitle real: una pantalla de detalle fija su
 * propio titulo (el nombre del activo, por ejemplo), en vez de deducirlo
 * de la ruta -- que no funciona para rutas con id.
 */
interface TitleContextValue {
  title: string | null;
  setTitle: (title: string | null) => void;
}

const TitleContext = createContext<TitleContextValue>({
  title: null,
  setTitle: () => {},
});

export function TitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  return <TitleContext.Provider value={{ title, setTitle }}>{children}</TitleContext.Provider>;
}

export function useTitle() {
  return useContext(TitleContext);
}

/**
 * Atajo para las pantallas: fija el titulo al montar y lo limpia al salir,
 * para que no quede pegado al volver al listado.
 */
export function usePageTitle(title: string | null | undefined) {
  const { setTitle } = useTitle();
  useEffect(() => {
    setTitle(title ?? null);
    return () => setTitle(null);
  }, [title, setTitle]);
}
