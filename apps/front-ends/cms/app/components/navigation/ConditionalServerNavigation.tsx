import { headers } from "next/headers";
import { MainNavigation } from "./MainNavigation/MainNavigation";

export async function ConditionalServerNavigation() {
  const headersList = await headers();
  const isAuthPage = headersList.get("x-is-auth-page") === "true";

  if (isAuthPage) {
    return null;
  }

  return <MainNavigation />;
}
