"use server";

import { setSidebarState } from "../../lib/auth-cookies";

/**
 * Server action to toggle sidebar collapsed state
 */
export async function toggleSidebarAction(isCollapsed: boolean) {
  await setSidebarState(isCollapsed);
}
