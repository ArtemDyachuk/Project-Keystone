import { Tenant } from "../types";
import { TenantSwitcherClient } from "./TenantSwitcherClient";

interface TenantSwitcherProps {
  selectedTenant: Tenant | null;
  userTenants: Tenant[];
}

export function TenantSwitcher({ selectedTenant, userTenants }: TenantSwitcherProps) {
  return (
    <TenantSwitcherClient
      selectedTenant={selectedTenant}
      userTenants={userTenants}
    />
  );
}
