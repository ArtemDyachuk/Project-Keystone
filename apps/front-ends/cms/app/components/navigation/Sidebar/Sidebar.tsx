import { getSidebarState } from "@/lib/auth-cookies";
import { SidebarClient } from "./SidebarClient";

interface SidebarProps {
  className?: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navigationItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/tenants", label: "Tenants", icon: "🏢" },
];

export async function Sidebar({ className }: SidebarProps) {
  // Get initial state from server-side cookies
  const isCollapsed = await getSidebarState();

  return (
    <SidebarClient 
      initialCollapsed={isCollapsed}
      navigationItems={navigationItems}
      className={className}
    />
  );
}
