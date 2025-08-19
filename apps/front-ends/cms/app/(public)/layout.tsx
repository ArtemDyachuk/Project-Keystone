import { PublicNavigation } from '../components/navigation';
import { getCurrentUserServer } from '@/lib/sessions/server';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch current user from server-side session (for navigation)
  const sessionUser = await getCurrentUserServer();

  // Map to the shape expected by PublicNavigation (it uses displayName/email)
  const userForNav = sessionUser
    ? ({
      email: sessionUser.email,
      displayName: sessionUser.displayName,
    } as any)
    : null;

  return (
    <>
      <PublicNavigation user={userForNav} />
      {children}
    </>
  );
}
