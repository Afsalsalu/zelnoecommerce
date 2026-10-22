import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { requireCustomer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

type Params = Promise<{ orderNumber: string }>;

export default async function AccountOrderPage({ params }: { params: Params }) {
  if (!isSupabaseConfigured) redirect("/login");
  const { orderNumber } = await params;
  const user = await requireCustomer();
  const supabase = await createServerSupabase();
  const { data: order } = await supabase.from("orders").select("id,order_number,customer_name,order_status,payment_status,payment_method,subtotal,discount_total,shipping_total,total,shipping_address,tracking_courier,tracking_number,placed_at").eq("order_number", orderNumber.toUpperCase()).eq("user_id", user.id).maybeSingle();
  if (!order) notFound();
  const [{ data: items }, { data: history }] = await Promise.all([
    supabase.from("order_items").select("product_title_snapshot,sku_snapshot,variant_snapshot,unit_price,quantity,image_url_snapshot,line_total").eq("order_id", order.id),
    supabase.from("customer_order_status_history").select("next_status,created_at").eq("order_id", order.id).order("created_at"),
  ]);
  const address = order.shipping_address as Record<string, string>;
  return <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 lg:px-12 lg:py-16"><Link href="/account" className="text-xs text-muted underline underline-offset-4">← Your account</Link><header className="mt-7 border-b border-line pb-7"><span className="eyebrow">Order details</span><h1 className="mt-3 font-display text-4xl sm:text-5xl">{order.order_number}</h1><p className="mt-2 text-sm capitalize text-muted">{order.order_status.replaceAll("_", " ")} · {new Date(order.placed_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p></header><div className="grid gap-10 py-8 lg:grid-cols-[1.3fr_.7fr]"><section><h2 className="mb-4 font-display text-2xl">Items</h2><div className="divide-y divide-line border-y border-line">{(items ?? []).map((item, index) => <div key={index} className="flex justify-between gap-4 py-4 text-sm"><span>{item.product_title_snapshot} × {item.quantity}<span className="mt-1 block text-xs text-muted">{item.sku_snapshot}</span></span><span>{formatPrice(Number(item.line_total))}</span></div>)}</div><dl className="ml-auto mt-5 max-w-sm space-y-3 text-sm"><div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatPrice(Number(order.subtotal))}</dd></div><div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>−{formatPrice(Number(order.discount_total))}</dd></div><div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{formatPrice(Number(order.shipping_total))}</dd></div><div className="flex justify-between border-t border-line pt-3 font-semibold"><dt>Total</dt><dd>{formatPrice(Number(order.total))}</dd></div></dl></section><aside className="space-y-7"><div><h2 className="mb-3 font-display text-2xl">Delivery address</h2><p className="text-sm leading-7 text-muted">{order.customer_name}<br />{address?.address_line}, {address?.area}<br />{address?.city}, {address?.state} {address?.pincode}</p></div><div><h2 className="mb-3 font-display text-2xl">Payment</h2><p className="text-sm capitalize text-muted">{order.payment_method} · {order.payment_status.replaceAll("_", " ")}</p></div>{order.tracking_courier && <div><h2 className="mb-3 font-display text-2xl">Shipment</h2><p className="text-sm">{order.tracking_courier}: {order.tracking_number}</p></div>}<div><h2 className="mb-3 font-display text-2xl">Order timeline</h2><ol className="border-l border-line pl-5">{(history ?? []).map((entry, index) => <li key={index} className="relative pb-5 text-sm"><span className="absolute -left-[25px] top-1 size-2 rounded-full bg-olive" /><p className="font-medium capitalize">{entry.next_status.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted">{new Date(entry.created_at).toLocaleString("en-IN")}</p></li>)}</ol></div></aside></div></div>;
}
