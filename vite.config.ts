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
  base: mode === 'production' ? '/labflow-test-tone/' : '/',
}));