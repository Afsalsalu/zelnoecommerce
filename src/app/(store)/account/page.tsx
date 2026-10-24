import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, PackageSearch } from "lucide-react";
import { requireCustomer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { AccountProfileForm } from "@/components/account-profile-form";
import { AccountAddresses } from "@/components/account-addresses";
import { LogoutButton } from "@/components/logout-button";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  if (!isSupabaseConfigured) redirect("/login?next=/account");
  const user = await requireCustomer();
  const supabase = await createServerSupabase();
  const [{ data: profile }, { data: orders }, { data: addresses }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,phone").eq("id", user.id).maybeSingle(),
    supabase.from("orders").select("id,order_number,order_status,order_source,whatsapp_status,payment_status,total,placed_at").eq("user_id", user.id).order("placed_at", { ascending: false }).limit(10),
    supabase.from("addresses").select("id,label,full_name,phone,address_line,area,city,state,pincode,is_default").eq("user_id", user.id).order("is_default", { ascending: false }),
  ]);
  return <div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16"><div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-7"><div><span className="eyebrow">Your ZELNO account</span><h1 className="mt-3 font-display text-5xl">Hello, {profile?.full_name?.split(" ")[0] || "there"}.</h1><p className="mt-2 text-sm text-muted">{user.email}</p></div><LogoutButton /></div><div className="mt-10 grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div className="space-y-10"><section><h2 className="mb-5 font-display text-3xl">Your details</h2><AccountProfileForm fullName={profile?.full_name || ""} phone={profile?.phone || ""} /></section><section><h2 className="mb-5 font-display text-3xl">Saved addresses</h2><AccountAddresses addresses={addresses ?? []} /></section></div><section><div className="mb-5 flex items-center justify-between gap-3"><h2 className="font-display text-3xl">Recent orders</h2><Link className="inline-flex items-center gap-1.5 text-xs underline underline-offset-4" href="/track-order"><PackageSearch size={14} aria-hidden="true" />Track an order</Link></div>{orders?.length ? <div className="divide-y divide-line border-y border-line">{orders.map((order) => { const status = order.order_source === "whatsapp" && order.whatsapp_status ? order.whatsapp_status : order.order_status; return <Link key={order.id} href={`/account/orders/${encodeURIComponent(order.order_number)}`} className="flex flex-wrap items-center justify-between gap-3 py-5 hover:bg-paper/50"><div><span className="font-medium">{order.order_number}</span><p className="mt-1 text-xs capitalize text-muted">{status.replaceAll("_", " ")} Â· {new Date(order.placed_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</p></div><span className="text-sm">{formatPrice(Number(order.total))}</span></Link>; })}</div> : <div className="border-y border-line py-10"><p className="text-sm text-muted">Your order history will appear here.</p><Link href="/shop" className="mt-4 inline-flex items-center gap-1.5 text-xs underline underline-offset-4"><ArrowRight size={14} aria-hidden="true" />Explore the shop</Link></div>}</section></div></div>;
}


