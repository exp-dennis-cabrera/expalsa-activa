import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { TitleProvider } from './context/TitleContext';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import App from './App';
import { theme } from './theme';

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <TitleProvider>
          <App />
        </TitleProvider>
      </ThemeProvider>
    </React.StrictMode>,
  );
}

// Empaquetar la fuente (arriba) solo garantiza que la regla @font-face este
// declarada -- el navegador sigue sin descargar el archivo real hasta que
// algo en pantalla la necesite. Como nada se ha pintado todavia en el primer
// render, MUI mide el ancho del "notch" del borde con la fuente de reserva
// del sistema, y ese calculo nunca se vuelve a hacer solo. document.fonts.load()
// fuerza la descarga real (sin depender de que algo la "pida" primero) y
// esperamos esa promesa antes de montar React, para que MUI mida siempre con
// la fuente correcta desde el primer pintado.
Promise.all([
  document.fonts.load('400 1em Inter'),
  document.fonts.load('500 1em Inter'),
  document.fonts.load('600 1em Inter'),
  document.fonts.load('700 1em Inter'),
])
  .catch(() => {
    // Si algo falla (navegador viejo sin soporte, fuente no encontrada),
    // no bloqueamos la app -- se pinta con la fuente de reserva.
  })
  .finally(renderApp);
