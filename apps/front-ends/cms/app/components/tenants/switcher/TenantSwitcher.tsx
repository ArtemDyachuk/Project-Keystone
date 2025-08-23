import { Corporation } from "../../corporations/types";
import { TenantSwitcherClient } from "./TenantSwitcherClient";

interface TenantSwitcherProps {
  selectedCorporation: Corporation | null;
  userCorporations: Corporation[];
}

export function TenantSwitcher({ selectedCorporation, userCorporations }: TenantSwitcherProps) {
  return (
    <TenantSwitcherClient
      selectedCorporation={selectedCorporation}
      userCorporations={userCorporations}
    />
  );
}
