import { getCurrentUserServer } from "@/lib/sessions/server";
import { redirect } from "next/navigation";
import { updateCorporation } from "@/app/actions/corporation.actions";
import { DeleteCorporationButton } from "@/app/components/corporations/DeleteCorporationButton";
import styles from "./page.module.css";

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

interface EditCorporationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCorporationPage({ params }: EditCorporationPageProps) {
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
          <a href="/corporations" className={styles.backButton}>
            ← Back to Corporations
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <a href="/corporations" className={styles.breadcrumbLink}>
            ← Corporations
          </a>
          <span className={styles.separator}>/</span>
          <a href={`/corporations/${id}`} className={styles.breadcrumbLink}>
            {corporation.name}
          </a>
        </div>
        <h1>✏️ Edit Corporation</h1>
        <p>Update corporation information and settings.</p>
      </div>

      <div className={styles.content}>
        <EditCorporationForm corporation={corporation} />
      </div>
    </div>
  );
}

interface Corporation {
  _id: string;
  name: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

function EditCorporationForm({ corporation }: { corporation: Corporation }) {
  return (
    <form action={updateCorporation} className={styles.form}>
      <input type="hidden" name="id" value={corporation._id} />

      <div className={styles.formCard}>
        <h2>Corporation Information</h2>

        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>
            Corporation Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={corporation.name}
            className={styles.input}
            required
            maxLength={100}
          />
          <p className={styles.helpText}>
            The display name for this corporation.
          </p>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Tenant ID</label>
          <div className={styles.readOnlyField}>
            {corporation.tenantId}
          </div>
          <p className={styles.helpText}>
            The tenant this corporation belongs to (read-only).
          </p>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Corporation ID</label>
          <div className={styles.readOnlyField}>
            {corporation._id}
          </div>
          <p className={styles.helpText}>
            Unique identifier for this corporation (read-only).
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.saveButton}>
          💾 Save Changes
        </button>
        <a href={`/corporations/${corporation._id}`} className={styles.cancelButton}>
          Cancel
        </a>
        <DeleteCorporationButton
          corporationId={corporation._id}
          corporationName={corporation.name}
        />
      </div>
    </form>
  );
}
