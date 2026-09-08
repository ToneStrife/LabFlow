import {
  ShoppingCart,
  FolderOpen,
  Users,
  User,
  Warehouse,
  Shield,
  DollarSign,
  type LucideIcon,
} from "lucide-react";
import { Profile } from "@/data/types";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Permiso que hace falta para verlo. Sin permiso, lo ve todo el mundo. */
  permission?: string;
}

/**
 * Secciones de la aplicacion. Vive fuera de SidebarNav porque la cabecera
 * tambien lo necesita: de aqui saca el titulo de la pagina actual, en vez de
 * repetir el nombre de la app en todas las pantallas.
 */
export const navItems: NavItem[] = [
  { title: "Panel de Control", href: "/dashboard", icon: ShoppingCart },
  { title: "Proveedores", href: "/vendors", icon: Users, permission: "vendors.view" },
  { title: "Inventario", href: "/inventory", icon: Warehouse, permission: "inventory.view" },
  { title: "Documentos", href: "/documents", icon: FolderOpen, permission: "documents.view" },
  { title: "Gastos", href: "/expenditures", icon: DollarSign, permission: "expenditures.view" },
  { title: "Admin", href: "/admin", icon: Shield, permission: "users.manage" },
];

/** Paginas que no salen en el menu pero si necesitan titulo en la cabecera. */
const TITULOS_EXTRA: Record<string, string> = {
  // La accion vive en la cabecera, disponible desde cualquier pantalla, asi que
  // no repite sitio en el menu lateral.
  "/new-request": "Nueva solicitud",
  "/profile": "Perfil",
  "/login": "Acceso",
  "/reset-password": "Restablecer contraseña",
};

export const getPageTitle = (pathname: string): string => {
  if (pathname.startsWith("/requests/")) return "Detalle de solicitud";
  const item = navItems.find((i) => i.href === pathname);
  if (item) return item.title;
  return TITULOS_EXTRA[pathname] ?? "LabFlow";
};

export const ROL_ETIQUETA: Record<Profile["role"], string> = {
  Requester: "Solicitante",
  "Account Manager": "Gerente de cuenta",
  Admin: "Administrador",
};
