"use client";

// import { LoginOrSignupDiscoveryForm } from "../../components/authentication/StytchLoginForm/StytchLoginForm";

// export default async function LoginPage({
//   searchParams,
// }: {
//   searchParams: Promise<{ redirect?: string }>;
// }) {
//   // const params = await searchParams;
//   // const redirectUrl = params.redirect || "/dashboard";

//   return (
//     <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
//       <LoginOrSignupDiscoveryForm />
//     </div>
//   );
// }

// pages/authenticate.jsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStytchMember } from '@stytch/nextjs/b2b';

import { LoginOrSignupDiscoveryForm } from "../../components/authentication/StytchLoginForm/StytchLoginForm";

export default function Authenticate() {
  const { member, isInitialized } = useStytchMember();
  const router = useRouter();

  console.log("member", member, isInitialized);

  useEffect(() => {
    if (isInitialized && member) {
      // Redirect the user to an authenticated page if they are already logged in
      router.replace("/dashboard");
    }
  }, [member, isInitialized, router]);

  return <LoginOrSignupDiscoveryForm />;
}