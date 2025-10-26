"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, User, LogOut } from "lucide-react";
import { SidebarNav } from "./SidebarNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { MadeWithDyad } from "./made-with-dyad";
import { useSession } from "./SessionContextProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getFullName } from "@/hooks/use-profiles";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const { profile, logout } = useSession();

  const handleLinkClick = () => {
    if (isMobile) {
      setIsSheetOpen(false);
    }
  };

  const userFullName = getFullName(profile);
  const userInitials = userFullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar for desktop */}
      {!isMobile && (
        <aside className="w-64 border-r bg-sidebar p-4 flex flex-col shadow-lg">
          <div className="mb-8 mt-2">
            <Link to="/dashboard" className="text-2xl font-extrabold text-sidebar-primary-foreground tracking-tight">
              LabFlow
            </Link>
          </div>
          <SidebarNav className="flex-grow" />
          <MadeWithDyad />
        </aside>
      )}

      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="sticky top-0 z-40 w-full border-b bg-card shadow-sm p-4 flex items-center justify-between">
          {isMobile && (
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4 flex flex-col bg-sidebar">
                <div className="mb-8 mt-2">
                  <Link to="/dashboard" className="text-2xl font-extrabold text-sidebar-primary-foreground tracking-tight" onClick={handleLinkClick}>
                    LabFlow
                  </Link>
                </div>
                <SidebarNav className="flex-grow" onLinkClick={handleLinkClick} />
                <MadeWithDyad />
              </SheetContent>
            </Sheet>
          )}
          
          <h1 className="text-xl font-semibold text-gray-700 dark:text-gray-300 hidden sm:block">Gestión de Pedidos de Laboratorio</h1>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">{userInitials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userFullName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleLinkClick()}>
                <Link to="/profile" className="flex items-center w-full">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;