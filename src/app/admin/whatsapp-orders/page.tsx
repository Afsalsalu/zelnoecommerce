import { requireAdmin } from "@/lib/auth";
import { AdminWhatsAppOrders } from "@/components/admin-whatsapp-orders";
import { resolveWhatsAppAdminSettings } from "@/lib/whatsapp-admin-settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "WhatsApp Settings", robots: { index: false, follow: false } };

export default async function WhatsAppOrdersPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("site_settings").select("value,is_public").eq("setting_key", "store").maybeSingle();
  if (error) throw new Error("Could not load WhatsApp settings.");
  const value = data?.value && typeof data.value === "object" && !Array.isArray(data.value) ? data.value : null;
  return <AdminWhatsAppOrders initial={value ? resolveWhatsAppAdminSettings(value) : null} isPublic={data?.is_public ?? true} />;
}
