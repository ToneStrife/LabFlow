"use client";

import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Package, ShoppingCart, Users, User } from "lucide-react"; // Import User icon
import { Button } from "@/components/ui/button";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  isMobile?: boolean;
  onLinkClick?: () => void;
}

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <ShoppingCart className="mr-2 h-4 w-4" />,
  },
  {
    title: "New Request",
    href: "/new-request",
    icon: <Package className="mr-2 h-4 w-4" />,
  },
  {
    title: "Vendors",
    href: "/vendors",
    icon: <Users className="mr-2 h-4 w-4" />,
  },
  {
    title: "Profile", // New Profile link
    href: "/profile",
    icon: <User className="mr-2 h-4 w-4" />,
  },
];

export function SidebarNav({ className, isMobile, onLinkClick, ...props }: SidebarNavProps) {
  return (
    <nav
      className={cn(
        "flex flex-col space-y-1",
        className
      )}
      {...props}
    >
      {navItems.map((item) => (
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
      ))}
    </nav>
  );
}