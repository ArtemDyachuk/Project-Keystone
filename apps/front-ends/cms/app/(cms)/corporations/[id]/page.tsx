import { getCurrentUserServer } from "@/lib/sessions/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DeleteCorporationButton } from "@/app/components/corporations/DeleteCorporationButton";
import styles from "./page.module.css";

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

interface CorporationPageProps {
  params: Promise<{ id: string }>;
}

export default async function CorporationPage({ params }: CorporationPageProps) {
  const { id } = await params;

  // Get current user from server-side session
  const currentUser = await getCurrentUserServer();

  // If no user session, redirect to login
  if (!currentUser) {
    redirect("/login");
  }

  // Get corporation details from backend API
  let corporation = null;
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value || '';

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/corporations/${id}`, {
      method: "GET",
      headers: {
        Cookie: `session=${sessionId}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      corporation = data.corporation;
    }
  } catch (error) {
    console.error("Failed to fetch corporation:", error);
  }

  if (!corporation) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1>Corporation Not Found</h1>
          <p>The corporation you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/corporations" className={styles.backButton}>
            ← Back to Corporations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <Link href="/corporations" className={styles.breadcrumbLink}>
            ← Corporations
          </Link>
        </div>
        <h1>🏢 {corporation.name}</h1>
        <p>Manage corporation settings and information.</p>
      </div>

      <div className={styles.content}>
        <div className={styles.infoCard}>
          <h2>Corporation Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Name</label>
              <span>{corporation.name}</span>
            </div>
            <div className={styles.infoItem}>
              <label>ID</label>
              <span className={styles.monospace}>{corporation._id}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Tenant ID</label>
              <span className={styles.monospace}>{corporation.tenantId}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Created</label>
              <span>
                {corporation.createdAt
                  ? new Date(corporation.createdAt).toLocaleDateString()
                  : 'Unknown'
                }
              </span>
            </div>
            <div className={styles.infoItem}>
              <label>Last Updated</label>
              <span>
                {corporation.updatedAt
                  ? new Date(corporation.updatedAt).toLocaleDateString()
                  : 'Unknown'
                }
              </span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href={`/corporations/${id}/edit`} className={styles.editButton}>
            ✏️ Edit Corporation
          </Link>
          <DeleteCorporationButton
            corporationId={corporation._id}
            corporationName={corporation.name}
          />
        </div>
      </div>
    </div>
  );
}
