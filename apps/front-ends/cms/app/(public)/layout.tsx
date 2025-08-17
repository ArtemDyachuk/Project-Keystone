import { PublicNavigation } from '../components/navigation';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNavigation />
      {children}
    </>
  );
}
