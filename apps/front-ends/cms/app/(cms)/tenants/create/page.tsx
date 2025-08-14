import { TenantCreate } from "@/components/tenants";

// Force dynamic rendering since TenantCreate uses server actions with cookies
export const dynamic = 'force-dynamic';

export default function TenantCreationPage() {
  return <TenantCreate />;
}
