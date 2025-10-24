"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { SidebarNav } from "./SidebarNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { MadeWithDyad } from "./made-with-dyad";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const handleLinkClick = () => {
    if (isMobile) {
      setIsSheetOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar for desktop */}
      {!isMobile && (
        <aside className="w-64 border-r bg-sidebar p-4 flex flex-col">
          <div className="mb-6">
            <Link to="/dashboard" className="text-2xl font-bold text-sidebar-primary-foreground">
              Pedidos de Laboratorio
            </Link>
          </div>
          <SidebarNav className="flex-grow" />
          <MadeWithDyad />
        </aside>
      )}

      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="sticky top-0 z-40 w-full border-b bg-background p-4 flex items-center justify-between lg:justify-end">
          {isMobile && (
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4 flex flex-col">
                <div className="mb-6">
                  <Link to="/dashboard" className="text-2xl font-bold text-sidebar-primary-foreground" onClick={handleLinkClick}>
                    Pedidos de Laboratorio
                  </Link>
                </div>
                <SidebarNav className="flex-grow" onLinkClick={handleLinkClick} />
                <MadeWithDyad />
              </SheetContent>
            </Sheet>
          )}
          <h1 className="text-xl font-semibold">Gestión de Pedidos de Laboratorio</h1>
          {/* User/Profile Placeholder - can add later */}
          {/* <Avatar className="h-8 w-8">
            <AvatarFallback>JD</AvatarFallback>
          </Avatar> */}
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;