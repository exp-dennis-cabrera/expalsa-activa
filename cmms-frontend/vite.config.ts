import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  // sockjs-client espera la variable global "global" (existe en Node, no en el navegador).
  // Vite no la provee por defecto como si lo hacia Create React App -- la mapeamos a globalThis.
  define: {
    global: 'globalThis',
  },
});
