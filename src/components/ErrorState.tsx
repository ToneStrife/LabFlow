import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  /** Qué no se ha podido cargar: "las solicitudes", "el inventario"… */
  que: string;
  error?: Error | null;
  className?: string;
}

/**
 * Lo que se ve cuando una lista no carga. Antes era una línea roja con el
 * mensaje técnico y nada más; aquí se explica y se puede reintentar sin
 * recargar la página (vuelve a pedir lo que haya fallado en pantalla).
 */
const ErrorState: React.FC<ErrorStateProps> = ({ que, error, className }) => {
  const queryClient = useQueryClient();
  const [reintentando, setReintentando] = React.useState(false);

  const reintentar = async () => {
    setReintentando(true);
    try {
      await queryClient.refetchQueries({
        type: "active",
        predicate: (query) => query.state.status === "error",
      });
    } finally {
      setReintentando(false);
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800",
        "dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium">No se pudo cargar {que}.</p>
          {error?.message && <p className="mt-0.5 break-words text-xs opacity-80">{error.message}</p>}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={reintentar} disabled={reintentando} className="shrink-0 bg-background">
        <RotateCw className={cn("mr-2 h-4 w-4", reintentando && "animate-spin")} /> Reintentar
      </Button>
    </div>
  );
};

export default ErrorState;
