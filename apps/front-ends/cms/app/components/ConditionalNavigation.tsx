"use client";

import { usePathname } from "next/navigation";
import { MainNavigation } from "./navigation/MainNavigation/MainNavigation";

export function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Hide navigation on auth pages
  const isAuthPage = pathname.startsWith("/login") || 
                     pathname.startsWith("/signup") || 
                     pathname.startsWith("/forgot-password") || 
                     pathname.startsWith("/reset-password");

  if (isAuthPage) {
    return null;
  }

  return <MainNavigation />;
}
