import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import ErrorBoundary from "./components/ErrorBoundary.tsx"; // Import ErrorBoundary

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);