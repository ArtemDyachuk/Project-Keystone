"use client";

import { useCurrentUser } from "@/app/hooks/useCurrentUser";
import { RBACService } from "@/app/services/rbac.service";

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export function PermissionGuard({ 
  permission, 
  children, 
  fallback = null,
  showFallback = true
}: PermissionGuardProps) {
  const user = useCurrentUser();
  
  if (!user) {
    return showFallback ? fallback : null;
  }

  // Global:Admin has access to everything
  if (user.roles.includes("Global:Admin")) {
    return <>{children}</>;
  }

  const hasPermission = RBACService.hasPermission(user, permission);
  
  if (hasPermission) {
    return <>{children}</>;
  }

  return showFallback ? fallback : null;
}
