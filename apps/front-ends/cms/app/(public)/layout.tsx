import { PublicNavigation } from '../components/navigation';
import { getUserDataFromJWT } from "@/lib/auth/utils";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user data server-side
  const userData = await getUserDataFromJWT();

  return (
    <>
      <PublicNavigation user={userData} />
      {children}
    </>
  );
}
