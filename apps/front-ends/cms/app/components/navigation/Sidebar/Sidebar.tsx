import { getSidebarState } from "@/lib/auth-cookies";
import { getCurrentUserServer } from "@/lib/sessions/server";
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
  { href: "/system", label: "System", icon: "🛠" },
  { href: "/documentation", label: "Documentation", icon: "📚" },
];

export async function Sidebar({ className }: SidebarProps) {
  // Get initial state from server-side cookies
  const isCollapsed = await getSidebarState();

  // Get current user using the working function from dashboard
  const user = await getCurrentUserServer();

  // Filter navigation items based on user permissions and roles
  const navigationItems = user ? allNavigationItems.filter(item => {
    switch (item.href) {
      case "/dashboard":
        return true; // Dashboard is always accessible
      case "/tenants":
        // Show Tenants link to anyone with any Tenant role (Tenant:Owner, Tenant:Admin, Tenant:Reader)
        return user.roles.some(role => role.startsWith("Tenant:"));
      case "/corporations":
        // Show Corporations link to anyone with any Tenant role (same as tenants for now)
        return user.roles.some(role => role.startsWith("Tenant:"));
      case "/users":
        // Show Users link to:
        // - Anyone with any User role (User:Admin, User:Reader, etc.)
        // - Tenant owners and admins (they manage users in their tenant)
        // - Global admins and readers (they can access everything)
        return user.roles.some(role =>
          role.startsWith("User:") ||
          (role.startsWith("Tenant:") && (role.includes("Admin") || role.includes("Owner"))) ||
          role.startsWith("Global:")
        );
      case "/settings":
        // Show Settings to Tenant admins and owners, Global admins
        return user.roles.some(role =>
          role.startsWith("Tenant:") && (role.includes("Admin") || role.includes("Owner")) ||
          role === "Global:Admin"
        );
      case "/system":
        // Show System link to Global admins and readers
        return user.roles.some(role => role.startsWith("Global:"));
      case "/documentation":
        // Show Documentation to Global admins and readers
        return user.roles.some(role => role.startsWith("Global:"));
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
