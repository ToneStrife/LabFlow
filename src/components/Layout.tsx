"use client";

import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, User, LogOut, Loader2, FlaskConical, PlusCircle, ChevronsUpDown } from "lucide-react";
import { SidebarNav } from "./SidebarNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSession } from "./SessionContextProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getFullName } from "@/hooks/use-profiles";
import { ThemeToggle } from "./ThemeToggle";
import { getPageTitle, ROL_ETIQUETA } from "@/lib/navigation";

interface LayoutProps {
  children: React.ReactNode;
}

/** Marca de la barra lateral. */
const Marca: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <Link to="/dashboard" className="group flex items-center gap-2.5" onClick={onClick}>
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-white shadow-sm transition-transform group-hover:scale-105">
      <FlaskConical className="h-5 w-5" />
    </span>
    <span className="flex min-w-0 flex-col leading-none">
      <span className="text-xl font-extrabold tracking-tight text-sidebar-foreground">LabFlow</span>
      <span className="mt-1 truncate text-[11px] font-medium text-sidebar-foreground/60">
        Solicitudes de laboratorio
      </span>
    </span>
  </Link>
);

/**
 * Bloque de usuario al pie de la barra lateral. Antes "Perfil" era un elemento
 * mas del menu, perdido entre las secciones de trabajo, y quien habia iniciado
 * sesion solo se veia pasando el raton por un avatar de la cabecera.
 */
const BloqueUsuario: React.FC<{ onLinkClick?: () => void }> = ({ onLinkClick }) => {
  const { profile, logout } = useSession();
  if (!profile) {
    return (
      <div className="flex items-center gap-2 px-2 py-2 text-sm text-sidebar-foreground/60">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
      </div>
    );
  }

  const nombre = getFullName(profile);
  const iniciales = nombre.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-sidebar-accent">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-sidebar-primary text-xs text-white">{iniciales}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-sidebar-foreground">{nombre}</span>
            <span className="truncate text-[11px] text-sidebar-foreground/60">
              {ROL_ETIQUETA[profile.role] ?? profile.role}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{nombre}</p>
            <p className="text-xs leading-none text-muted-foreground">{profile.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild onClick={onLinkClick}>
          <Link to="/profile" className="flex w-full items-center">
            <User className="mr-2 h-4 w-4" /> Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const { profile } = useSession();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLinkClick = () => {
    if (isMobile) setIsSheetOpen(false);
  };

  const shouldRenderNav = !!profile;
  const tituloPagina = getPageTitle(location.pathname);

  const contenidoBarraLateral = (enSheet: boolean) => (
    <>
      <div className={enSheet ? "mb-6 mt-1 px-1" : "mb-6 mt-1 px-3"}>
        <Marca onClick={enSheet ? handleLinkClick : undefined} />
      </div>
      {shouldRenderNav ? (
        <SidebarNav
          className={enSheet ? "flex-1 overflow-y-auto" : "flex-1 overflow-y-auto px-3"}
          onLinkClick={enSheet ? handleLinkClick : undefined}
        />
      ) : (
        <div className="flex flex-1 items-start px-3 py-2 text-sm text-sidebar-foreground/60">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando navegación...
        </div>
      )}
      <div className={enSheet ? "mt-4 border-t border-sidebar-border pt-3" : "mt-4 border-t border-sidebar-border p-3"}>
        <BloqueUsuario onLinkClick={enSheet ? handleLinkClick : undefined} />
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {!isMobile && (
        <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-4">
          {contenidoBarraLateral(false)}
        </aside>
      )}

      {/* clip en vez de hidden: corta igual el desbordamiento horizontal del
          móvil, pero sin crear un contenedor de scroll, que es lo que dejaba
          inservible el position:sticky de los pies de formulario. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        {/* Cabecera: antes repetia el nombre de la app, que ya esta en la barra
            lateral. Ahora dice en que pagina estas y ofrece la accion principal
            desde cualquier pantalla. */}
        <header className="sticky top-0 z-40 flex h-14 w-full min-w-0 items-center gap-2 border-b bg-card/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/70 sm:px-6">
          {isMobile && (
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-64 flex-col bg-sidebar p-4">
                {contenidoBarraLateral(true)}
              </SheetContent>
            </Sheet>
          )}

          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground sm:text-base">
            {tituloPagina}
          </h1>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {/* En la propia pantalla de nueva solicitud el botón no lleva
                a ningún sitio, así que no se muestra. */}
            {shouldRenderNav && location.pathname !== "/new-request" && (
              <Button
                size="sm"
                onClick={() => navigate("/new-request")}
                className="h-8"
                title="Nueva solicitud"
              >
                <PlusCircle className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Nueva solicitud</span>
              </Button>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1 bg-canvas p-4 pb-[env(safe-area-inset-bottom,0px)] sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
