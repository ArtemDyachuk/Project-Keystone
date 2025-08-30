"use client";

import { useCurrentUser } from "@/app/hooks/useCurrentUser";
import { RBACService } from "@/app/services/rbac.service";

interface RoleGuardProps {
  role?: string;           // Exact role match (e.g., "User:Admin")
  pattern?: string;        // Pattern match (e.g., "User:*" or "*:Admin")
  category?: string;       // Category match (e.g., "User" matches User:Admin, User:Reader, etc.)
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export function RoleGuard({ 
  role, 
  pattern,
  category,
  children, 
  fallback = null,
  showFallback = true
}: RoleGuardProps) {
  const user = useCurrentUser();
  
  if (!user) {
    return showFallback ? fallback : null;
  }

  // Global:Admin has access to everything
  if (user.roles.includes("Global:Admin")) {
    return <>{children}</>;
  }

  let hasAccess = false;
  
  if (role) {
    // Exact role match
    hasAccess = RBACService.hasRole(user, role);
  } else if (pattern) {
    // Pattern matching (e.g., "User:*" matches User:Admin, User:Reader, etc.)
    const patternRegex = new RegExp(pattern.replace(/\*/g, '.*'));
    hasAccess = user.roles.some(userRole => patternRegex.test(userRole));
  } else if (category) {
    // Category matching (e.g., "User" matches any role starting with "User:")
    hasAccess = user.roles.some(userRole => userRole.startsWith(category + ':'));
  } else {
    // No role criteria specified
    hasAccess = false;
  }
  
  if (hasAccess) {
    return <>{children}</>;
  }

  return showFallback ? fallback : null;
}
