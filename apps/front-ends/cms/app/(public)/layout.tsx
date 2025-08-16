import { PublicNavigation } from '../components/navigation';
import { getCurrentUser } from "@/app/actions/user.actions";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user data server-side
  const userData = await getCurrentUser();

  return (
    <>
      <PublicNavigation user={userData} />
      {children}
    </>
  );
}
