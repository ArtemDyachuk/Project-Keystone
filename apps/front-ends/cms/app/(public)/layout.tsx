import { MainNavigation } from '../components/navigation/MainNavigation/MainNavigation';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MainNavigation />
      {children}
    </>
  );
}
