import { PublicNavigation } from '../components/navigation';
import { getCurrentUserServer } from '@/lib/sessions/server';
import type { UserData } from '@/lib/auth-utils';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch current user from server-side session (for navigation)
  const sessionUser = await getCurrentUserServer();

  // Map to the shape expected by PublicNavigation (it uses displayName/email)
  const userForNav: UserData | null = sessionUser
    ? {
      sub: sessionUser.uid,
      email: sessionUser.email,
      displayName: sessionUser.displayName || undefined,
    }
    : null;

  return (
    <>
      <PublicNavigation user={userForNav} />
      {children}
    </>
  );
}
