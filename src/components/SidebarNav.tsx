"use client";

import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/navigation";
import { useCan } from "@/hooks/use-permissions";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  isMobile?: boolean;
  onLinkClick?: () => void;
}

export function SidebarNav({ className, onLinkClick, ...props }: SidebarNavProps) {
  const { can, cargandoPermisos } = useCan();

  if (cargandoPermisos) {
    return (
      <div className="flex items-center px-3 py-2 text-sm text-sidebar-foreground/60">
        Cargando menú...
      </div>
    );
  }

  const visibleNavItems = navItems.filter((item) => can(item.permission));

  return (
    <nav className={cn("flex flex-col space-y-0.5", className)} {...props}>
      {visibleNavItems.length > 0 ? (
        visibleNavItems.map((item) => {
          const Icono = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  // barra indicadora a la izquierda, solo visible en el activo
                  "before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2",
                  "before:rounded-r-full before:bg-sidebar-primary before:transition-opacity",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground before:opacity-100"
                    : "text-sidebar-foreground/70 before:opacity-0 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )
              }
              onClick={onLinkClick}
            >
              {({ isActive }) => (
                <>
                  <Icono
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                    )}
                  />
                  {item.title}
                </>
              )}
            </NavLink>
          );
        })
      ) : (
        <div className="flex items-center px-3 py-2 text-sm text-sidebar-foreground/60">
          No hay secciones disponibles con tus permisos.
        </div>
      )}
    </nav>
  );
}
