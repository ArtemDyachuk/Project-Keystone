import { LoginForm } from "../../components/authentication/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = params.redirect || "/dashboard";

  return <LoginForm redirectUrl={redirectUrl} />;
}
