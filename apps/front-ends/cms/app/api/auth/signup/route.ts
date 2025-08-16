import { NextRequest, NextResponse } from "next/server";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { getFirebaseAuth } from "../../../../lib/firebase-config";
import { getFirebaseAdminFirestore, getFirebaseAdminAuth } from "../../../../lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, lastName, password } = await request.json();

    if (!email || !firstName || !lastName || !password) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    // Create user with Firebase Auth
    const auth = getFirebaseAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update user profile
    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`.trim(),
    });

    // Send email verification using Firebase's built-in system
    await sendEmailVerification(user);

    // Store additional user data in Firestore
    try {
      const db = getFirebaseAdminFirestore();
      await db.collection("users").doc(user.uid).set({
        email,
        firstName,
        lastName,
        createdAt: new Date(),
        tenantIds: [],
        selectedTenantId: null,
        emailVerified: false,
      });

      // Set initial Firebase Custom Claims (empty tenant access)
      const adminAuth = getFirebaseAdminAuth();
      await adminAuth.setCustomUserClaims(user.uid, {
        tenantIds: [],
        tenantRoles: {},
        selectedTenantId: null,
      });

      console.log("✅ User data stored and custom claims set");
    } catch (firestoreError) {
      console.error("Failed to store user data in Firestore:", firestoreError);
      // Continue anyway - user is created in Auth
    }

    return NextResponse.json({
      success: true,
      userSub: user.uid,
      username: user.email,
      message: "User created successfully. Please check your email for verification."
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Signup failed" },
      { status: 400 }
    );
  }
}
