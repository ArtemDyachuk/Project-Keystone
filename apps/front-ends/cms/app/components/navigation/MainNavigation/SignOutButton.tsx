"use client";

import { Button } from "@keystone/ui";
import { signOutUser } from "../../../../lib/auth-client";

export function SignOutButton() {
  const handleSignOut = async () => {
    const success = await signOutUser();
    if (success) {
      window.location.href = "/login";
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSignOut}
    >
      Sign Out
    </Button>
  );
}
