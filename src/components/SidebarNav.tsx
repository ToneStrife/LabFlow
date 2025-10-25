"use client";

import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Package, ShoppingCart, Users, User, Briefcase, UserCog, Warehouse, Loader2, MailOpen } from "lucide-react"; // Importar MailOpen
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/SessionContextProvider";
import { Profile as UserProfileType } from "@/hooks/use-profiles";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  isMobile?: boolean;
  onLinkClick?: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: JSX.Element;
  roles: UserProfileType['role'][];
}

const navItems: NavItem[] = [
  {
    title: "Panel de Control",
    href: "/dashboard",
    icon: <ShoppingCart className="mr-2 h-4 w-4" />,
    roles: ["Requester", "Account Manager", "Admin"],
  },
  {
    title: "Nueva Solicitud",
    href: "/new-request",
    icon: <Package className="mr-2 h-4 w-4" />,
    roles: ["Requester", "Account Manager", "Admin"],
  },
  {
    title: "Proveedores",
    href: "/vendors",
    icon: <Users className="mr-2 h-4 w-4" />,
    roles: ["Account Manager", "Admin"],
  },
  {
    title: "Usuarios",
    href: "/users",
    icon: <UserCog className="mr-2 h-4 w-4" />,
    roles: ["Admin"],
  },
  {
    title: "Inventario",
    href: "/inventory",
    icon: <Warehouse className="mr-2 h-4 w-4" />,
    roles: ["Account Manager", "Admin"],
  },
  {
    title: "Plantillas", // Nuevo elemento de navegación
    href: "/email-templates",
    icon: <MailOpen className="mr-2 h-4 w-4" />,
    roles: ["Admin"], // Solo visible para administradores
  },
  {
    title: "Perfil",
    href: "/profile",
    icon: <User className="mr-2 h-4 w-4" />,
    roles: ["Requester", "Account Manager", "Admin"],
  },
];

export function SidebarNav({ className, isMobile, onLinkClick, ...props }: SidebarNavProps) {
  const { profile, loading: sessionLoading } = useSession();
  const userRole = profile?.role;

  const visibleNavItems = navItems.filter(item => userRole && item.roles.includes(userRole));

  return (
    <nav
      className={cn(
        "flex flex-col space-y-1",
        className
      )}
      {...props}
    >
      {sessionLoading ? (
        <div className="flex items-center px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando navegación...
        </div>
      ) : visibleNavItems.length > 0 ? (
        visibleNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground"
              )
            }
            onClick={onLinkClick}
          >
            {item.icon}
            {item.title}
          </NavLink>
        ))
      ) : (
        <div className="flex items-center px-3 py-2 text-sm text-muted-foreground">
          No hay elementos de navegación disponibles para tu rol.
        </div>
      )}
    </nav>
  );
}