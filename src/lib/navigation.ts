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
  roles: Profile["role"][];
}

const TODOS: Profile["role"][] = ["Requester", "Account Manager", "Admin"];
const SOLO_ADMIN: Profile["role"][] = ["Admin"];

/**
 * Secciones de la aplicacion. Vive fuera de SidebarNav porque la cabecera
 * tambien lo necesita: de aqui saca el titulo de la pagina actual, en vez de
 * repetir el nombre de la app en todas las pantallas.
 */
export const navItems: NavItem[] = [
  { title: "Panel de Control", href: "/dashboard", icon: ShoppingCart, roles: TODOS },
  { title: "Proveedores", href: "/vendors", icon: Users, roles: SOLO_ADMIN },
  { title: "Inventario", href: "/inventory", icon: Warehouse, roles: TODOS },
  { title: "Documentos", href: "/documents", icon: FolderOpen, roles: TODOS },
  { title: "Gastos", href: "/expenditures", icon: DollarSign, roles: SOLO_ADMIN },
  { title: "Admin", href: "/admin", icon: Shield, roles: SOLO_ADMIN },
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
