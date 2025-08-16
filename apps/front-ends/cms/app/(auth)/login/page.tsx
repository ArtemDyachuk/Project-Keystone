import { FirebaseLoginForm } from "../../components/authentication/FirebaseLoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = params.redirect || "/dashboard";

  return <FirebaseLoginForm redirectUrl={redirectUrl} />;
}
