import { BrowserRouter, useRoutes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { AuthProvider } from './context/AuthContext';
import { RealtimeProvider } from './realtime/RealtimeContext';
import store from './store';
import routes from './router';

/**
 * Antes este archivo importaba las 17 paginas de golpe, asi que todo el
 * codigo viajaba en un solo bundle. Ahora las rutas viven en src/router y
 * cada pagina se descarga solo cuando se visita (React.lazy + Suspense),
 * igual que en Atlas.
 */
function AppRoutes() {
  return useRoutes(routes);
}

export default function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <RealtimeProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </RealtimeProvider>
      </AuthProvider>
    </Provider>
  );
}
