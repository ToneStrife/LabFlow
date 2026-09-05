import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { nodePolyfills } from 'vite-plugin-node-polyfills'; // Importar el plugin

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    dyadComponentTagger(), 
    react(),
    // Usar el plugin de polyfills para asegurar que 'crypto' y otros módulos de Node funcionen
    nodePolyfills(), 
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Eliminamos el alias manual 'crypto' ya que el plugin lo maneja
    },
  },
  // Set base path for GitHub Pages deployment
  base: mode === 'production' ? '/LabFlow/' : '/',

  build: {
    // Sin manualChunks a mano: separar las librerias por nombre rompia el orden
    // de evaluacion entre trozos (el editor tocaba React antes de que existiera)
    // y la app se quedaba en blanco en produccion. El troceado sale ya de la
    // carga perezosa de las paginas, que Rollup resuelve con el orden correcto.
    chunkSizeWarningLimit: 900,
  },
  
  // Inyectar variables de entorno en el Service Worker estático
  define: {
    // Inyectar variables de Firebase como constantes globales para que el Service Worker las lea directamente
    'VITE_FIREBASE_API_KEY': JSON.stringify(process.env.VITE_FIREBASE_API_KEY),
    'VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN),
    'VITE_FIREBASE_PROJECT_ID': JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID),
    'VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.VITE_FIREBASE_STORAGE_BUCKET),
    'VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    'VITE_FIREBASE_APP_ID': JSON.stringify(process.env.VITE_FIREBASE_APP_ID),
    'VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(process.env.VITE_FIREBASE_MEASUREMENT_ID),
    // NUEVO: Clave de Gemini
    'VITE_GEMINI_API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY),
  },
}));