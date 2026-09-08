// Primero de todo: leer el fragmento de la URL antes de que supabase-js lo
// consuma y lo limpie. De ahi salen los enlaces de invitacion y de
// restablecer contrasena.
import "./lib/auth-hash";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

createRoot(document.getElementById("root")!).render(<App />);
