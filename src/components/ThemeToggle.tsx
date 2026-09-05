"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const OPCIONES = [
  { valor: "light", etiqueta: "Claro", icono: Sun },
  { valor: "dark", etiqueta: "Oscuro", icono: Moon },
  { valor: "system", etiqueta: "Segun el sistema", icono: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [montado, setMontado] = React.useState(false);

  // next-themes no sabe el tema real hasta que el componente esta en el
  // navegador; sin esto el icono parpadea al cargar.
  React.useEffect(() => setMontado(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0" title="Cambiar tema">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {OPCIONES.map(({ valor, etiqueta, icono: Icono }) => (
          <DropdownMenuItem
            key={valor}
            onClick={() => setTheme(valor)}
            className="flex items-center gap-2"
          >
            <Icono className="h-4 w-4" />
            <span className="flex-1">{etiqueta}</span>
            <Check
              className={cn(
                "h-4 w-4",
                montado && theme === valor ? "opacity-100" : "opacity-0"
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeToggle;
