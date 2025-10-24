"use client";

import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Package, ShoppingCart, Users, User, Briefcase, UserCog, Warehouse } from "lucide-react"; // Import Warehouse icon
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/SessionContextProvider"; // Import useSession

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  isMobile?: boolean;
  onLinkClick?: () => void;
}

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <ShoppingCart className="mr-2 h-4 w-4" />,
    roles: ["Requester", "Account Manager", "Admin"],
  },
  {
    title: "New Request",
    href: "/new-request",
    icon: <Package className="mr-2 h-4 w-4" />,
    roles: ["Requester", "Account Manager", "Admin"],
  },
  {
    title: "Vendors",
    href: "/vendors",
    icon: <Users className="mr-2 h-4 w-4" />,
    roles: ["Account Manager", "Admin"], // Assuming vendors are managed by managers/admins
  },
  {
    title: "Customer Accounts", // Renamed to Customer Accounts for clarity, will be 'Users' in UI
    href: "/users", // Changed to /users
    icon: <Briefcase className="mr-2 h-4 w-4" />,
    roles: ["Admin"], // Only Admins can see/manage customer accounts
  },
  {
    title: "Account Managers",
    href: "/account-managers",
    icon: <UserCog className="mr-2 h-4 w-4" />,
    roles: ["Admin"], // Only Admins can see/manage account managers
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: <Warehouse className="mr-2 h-4 w-4" />,
    roles: ["Account Manager", "Admin"], // Assuming inventory is managed by managers/admins
  },
  {
    title: "Profile",
    href: "/profile",
    icon: <User className="mr-2 h-4 w-4" />,
    roles: ["Requester", "Account Manager", "Admin"],
  },
];

export function SidebarNav({ className, isMobile, onLinkClick, ...props }: SidebarNavProps) {
  const { profile } = useSession();
  const userRole = profile?.role;

  return (
    <nav
      className={cn(
        "flex flex-col space-y-1",
        className
      )}
      {...props}
    >
      {navItems.map((item) => {
        // Only render if userRole is defined and included in item.roles
        if (userRole && item.roles.includes(userRole)) {
          return (
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
              {item.title === "Customer Accounts" ? "Users" : item.title} {/* Display "Users" for Customer Accounts */}
            </NavLink>
          );
        }
        return null;
      })}
    </nav>
  );
}