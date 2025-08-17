import { getUserById } from "@/app/actions/user.actions";
import Link from "next/link";
import { UserDetailClient } from "./UserDetailClient";
import styles from "./page.module.css";

interface UserDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;
  let user;
  let error;

  try {
    user = await getUserById(id);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load user";
    console.error("Error loading user:", err);
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/users" className={styles.backButton}>
            ← Back to Users
          </Link>
          <h1 className={styles.title}>User Details</h1>
        </div>
        <div className={styles.error}>
          <h2>❌ Error Loading User</h2>
          <p>{error}</p>
          <p>The user may not exist or you may not have permission to view them.</p>
          <Link href="/users" className={styles.button}>
            Return to Users List
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/users" className={styles.backButton}>
            ← Back to Users
          </Link>
          <h1 className={styles.title}>User Details</h1>
        </div>
        <div className={styles.error}>
          <h2>User Not Found</h2>
          <p>The user you're looking for could not be found.</p>
          <Link href="/users" className={styles.button}>
            Return to Users List
          </Link>
        </div>
      </div>
    );
  }

  return <UserDetailClient initialUser={user} />;
}
