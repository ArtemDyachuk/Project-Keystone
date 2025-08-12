"use server";

import { redirect } from "next/navigation";
import { getCognitoConfig, CognitoAuthClient } from "@keystone/auth";
import { setAuthCookiesInAction } from "../../../lib/auth-cookies";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectUrl = formData.get("redirect") as string || "/";

  try {
    const config = await getCognitoConfig();
    const authClient = new CognitoAuthClient(config);

    const tokens = await authClient.signIn({
      email,
      password,
    });

    // Set auth cookies and redirect
    await setAuthCookiesInAction(tokens);

    // Use redirect() function for server actions
    redirect(redirectUrl);
  } catch (error) {
    // Redirect back to login with error
    const errorMessage = error instanceof Error ? error.message : "Login failed";
    redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
  }
}
