"use client";

import { ServerAuthForm } from "../../components/authentication/ServerAuthForm";
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const alreadyLoggedInRef = useRef<boolean>(false);

  useEffect(() => {
    if (!loading && alreadyLoggedInRef.current === undefined) {
      alreadyLoggedInRef.current = !!user;

      if (user) {
        // The user was already logged in, so we can redirect them immediately
        router.replace('/dashboard');
      }
    }
  }, [loading, user, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return <ServerAuthForm mode="signin" />;
}
