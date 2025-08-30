"use client";

import { useCurrentUser } from "@/app/hooks/useCurrentUser";
import { RBACService } from "@/app/services/rbac.service";

interface MultiplePermissionsGuardProps {
  permissions: string[];
  requireAll?: boolean; // true = all permissions required, false = any permission
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export function MultiplePermissionsGuard({ 
  permissions, 
  requireAll = false,
  children, 
  fallback = null,
  showFallback = true
}: MultiplePermissionsGuardProps) {
  const user = useCurrentUser();
  
  if (!user) {
    return showFallback ? fallback : null;
  }

  // Global:Admin has access to everything
  if (user.roles.includes("Global:Admin")) {
    return <>{children}</>;
  }

  let hasAccess = false;
  
  if (requireAll) {
    hasAccess = RBACService.hasAllPermissions(user, permissions);
  } else {
    hasAccess = RBACService.hasAnyPermission(user, permissions);
  }
  
  if (hasAccess) {
    return <>{children}</>;
  }

  return showFallback ? fallback : null;
}
