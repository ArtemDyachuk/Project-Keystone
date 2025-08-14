import { notFound } from "next/navigation";
import { TenantManagement } from "@/components/tenants";
import { TenantServiceClient } from "@/app/services";

interface TenantPageProps {
  params: {
    id: string;
  };
}

export default async function TenantPage({ params }: TenantPageProps) {
  const resolvedParams = await params;
  
  try {
    const tenant = await TenantServiceClient.getTenantById(resolvedParams.id);

    if (!tenant) {
      notFound();
    }

    return <TenantManagement tenant={tenant} />;
  } catch (error) {
    console.error("Failed to fetch tenant:", error);
    notFound();
  }
}
