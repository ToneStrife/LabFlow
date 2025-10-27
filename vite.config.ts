import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Alias CRÍTICO para resolver el error de crypto.getRandomValues
      crypto: "crypto-browserify",
    },
  },
  // Set base path for GitHub Pages deployment
  base: mode === 'production' ? '/labflow-test-tone/' : '/',
}));