import Link from "next/link";
import { ArrowLeft, ArrowRight, PackageSearch } from "lucide-react";
import { CustomerOrderCard, type CustomerOrderItem } from "@/components/customer-order-card";
import { requireCustomer } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your orders", robots: { index: false, follow: false } };

export default async function AccountOrdersPage() {
  const user = await requireCustomer();
  const supabase = await createServerSupabase();
  const { data: orders } = await supabase
    .from("orders")
    .select("id,order_number,order_status,order_source,whatsapp_status,placed_at,order_items(product_title_snapshot,variant_snapshot,quantity,image_url_snapshot)")
    .eq("user_id", user.id)
    .order("placed_at", { ascending: false });

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
      <Link href="/account" className="inline-flex items-center gap-1.5 text-xs text-muted underline underline-offset-4">
        <ArrowLeft size={14} aria-hidden="true" />
        Your account
      </Link>
      <header className="mt-7 border-b border-line pb-7">
        <span className="eyebrow">Your ZELNO account</span>
        <h1 className="mt-3 font-display text-5xl">Your orders.</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-muted">A record of the pieces you have brought home.</p>
      </header>

      {orders?.length ? (
        <div className="mt-8 divide-y divide-line border-y border-line">
          {orders.map((order) => {
            const status = order.order_source === "whatsapp" && order.whatsapp_status ? order.whatsapp_status : order.order_status;
            const items = (order.order_items ?? []) as CustomerOrderItem[];

            return (
              <CustomerOrderCard
                key={order.id}
                href={"/account/orders/" + encodeURIComponent(order.order_number)}
                orderNumber={order.order_number}
                status={status}
                items={items}
              />
            );
          })}
        </div>
      ) : (
        <div className="mt-8 border-y border-line py-12 text-center">
          <PackageSearch size={24} strokeWidth={1.5} className="mx-auto text-olive" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted">Your order history will appear here.</p>
          <Link href="/shop" className="button-secondary mt-6">
            Explore the shop
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
