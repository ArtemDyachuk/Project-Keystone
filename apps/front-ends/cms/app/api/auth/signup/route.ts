import { NextRequest, NextResponse } from "next/server";
import { createFirebaseAuthClient, makeUserSuperAdmin } from "@keystone/auth";

// Helper function to get user-friendly error messages
function getFirebaseErrorMessage(error: any): string {
  if (error?.code) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists. Please try signing in instead.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password is too weak. Please choose a stronger password (at least 6 characters).";
      case "auth/operation-not-allowed":
        return "Email/password sign up is not enabled. Please contact support.";
      default:
        return error.message || "An error occurred during sign up.";
    }
  }
  return error.message || "An error occurred during sign up.";
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    // Create user with Firebase Auth using the client
    const authClient = createFirebaseAuthClient();
    const userCredential = await authClient.signUp({
      email,
      password,
      firstName,
      lastName,
    });

    const user = userCredential.user;

    // Assign super admin role to new users by default
    try {
      await makeUserSuperAdmin(user.uid);
      console.log("✅ Assigned super admin role to new user:", user.email);
    } catch (roleError) {
      console.error("Failed to assign super admin role:", roleError);
      // Don't fail the signup, just log the error
    }

    console.log("✅ User signed up successfully:", user.email);

    return NextResponse.json({
      success: true,
      message: "Account created successfully! Please check your email to verify your account.",
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);

    const errorMessage = getFirebaseErrorMessage(error);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 }
    );
  }
}
