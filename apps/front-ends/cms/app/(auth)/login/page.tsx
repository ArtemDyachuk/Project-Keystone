import { LoginForm } from "../../components/authentication/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; tenantId?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = params.returnTo || params.redirect || "/dashboard";
  const gipTenantId = params.tenantId;

  return <LoginForm redirectUrl={redirectUrl} gipTenantId={gipTenantId} />;
}
