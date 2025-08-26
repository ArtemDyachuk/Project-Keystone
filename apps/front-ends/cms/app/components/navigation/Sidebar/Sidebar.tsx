import { getSidebarState } from "@/lib/auth-cookies";
import { getCurrentUserServer } from "@/lib/sessions/server";
import { UserServiceClient } from "@/app/services/user.service";
import { SidebarClient } from "./SidebarClient";

interface SidebarProps {
  className?: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

// Navigation items - defined outside component for better performance
const allNavigationItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/tenants", label: "Tenants", icon: "🏢" },
  { href: "/corporations", label: "Corporations", icon: "🏢" },
  { href: "/users", label: "Users", icon: "👥" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export async function Sidebar({ className }: SidebarProps) {
  // Get initial state from server-side cookies
  const isCollapsed = await getSidebarState();

  // Get current user using the working function from dashboard
  const user = await getCurrentUserServer();

  // Filter navigation items based on user permissions
  const navigationItems = user ? allNavigationItems.filter(item => {
    switch (item.href) {
      case "/dashboard":
        return true; // Dashboard is always accessible
      case "/tenants":
        return UserServiceClient.canAccessTenants(user);
      case "/corporations":
        return UserServiceClient.canAccessCorporations(user);
      case "/users":
        return UserServiceClient.canAccessUsers(user);
      case "/settings":
        return UserServiceClient.canAccessSettings(user);
      default:
        return false;
    }
  }) : [
    { href: "/dashboard", label: "Dashboard", icon: "📊" }
  ];

  return (
    <SidebarClient
      initialCollapsed={isCollapsed}
      navigationItems={navigationItems}
      className={className}
    />
  );
}
