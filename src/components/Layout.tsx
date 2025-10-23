"use client";

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, User as UserIcon } from "lucide-react"; // Import LogOut and UserIcon
import { SidebarNav } from "./SidebarNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { MadeWithDyad } from "./made-with-dyad";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "@/components/SessionContextProvider"; // Import useSession

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const { session, profile, signOut } = useSession(); // Use session, profile, and signOut
  const navigate = useNavigate();

  const handleLinkClick = () => {
    if (isMobile) {
      setIsSheetOpen(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const getFallback = () => {
    if (profile?.first_name && profile?.last_name) return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    if (profile?.first_name) return profile.first_name[0].toUpperCase();
    if (profile?.last_name) return profile.last_name[0].toUpperCase();
    return <UserIcon className="h-5 w-5" />;
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar for desktop */}
      {!isMobile && (
        <aside className="w-64 border-r bg-sidebar p-4 flex flex-col">
          <div className="mb-6">
            <Link to="/dashboard" className="text-2xl font-bold text-sidebar-primary-foreground">
              Lab Orders
            </Link>
          </div>
          <SidebarNav className="flex-grow" />
          <MadeWithDyad />
        </aside>
      )}

      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="sticky top-0 z-40 w-full border-b bg-background p-4 flex items-center justify-between">
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
                    Lab Orders
                  </Link>
                </div>
                <SidebarNav className="flex-grow" onLinkClick={handleLinkClick} />
                <MadeWithDyad />
              </SheetContent>
            </Sheet>
          )}
          <h1 className="text-xl font-semibold ml-auto lg:ml-0">Lab Order Management</h1>
          {/* User/Profile Dropdown */}
          {session && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-4">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} alt="User Avatar" />
                    <AvatarFallback>{getFallback()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.first_name || profile?.last_name ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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