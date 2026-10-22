import Link from "next/link";
import { ArrowUpRight, Box, PackageCheck, ShoppingBag, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_MODULES } from "@/lib/admin-modules";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();
  const [
    { data: orders, count: orderCount },
    { data: products, count: productCount },
    { data: customers, count: customerCount },
    { data: recent },
    { data: lineItems },
    { data: lowStock },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id,total,payment_status,payment_method,order_status", { count: "exact" })
      .limit(2000),
    supabase
      .from("products")
      .select("id,title,slug,stock_quantity,status", { count: "exact" })
      .eq("status", "published"),
    supabase.from("profiles").select("id", { count: "exact" }),
    supabase
      .from("orders")
      .select("id,order_number,customer_name,order_status,payment_status,total,placed_at")
      .order("placed_at", { ascending: false })
      .limit(8),
    supabase.from("order_items").select("product_title_snapshot,quantity").limit(2000),
    supabase
      .from("products")
      .select("id,title,stock_quantity,slug")
      .eq("status", "published")
      .lte("stock_quantity", 5)
      .order("stock_quantity")
      .limit(8),
  ]);

  const revenue = (orders ?? []).reduce(
    (sum, order) =>
      sum +
      (order.payment_status === "paid" ||
      (order.payment_method === "cod" && order.order_status === "delivered")
        ? Number(order.total)
        : 0),
    0,
  );
  const counts = (orders ?? []).reduce(
    (out, order) => ({ ...out, [order.order_status]: (out[order.order_status] ?? 0) + 1 }),
    {} as Record<string, number>,
  );
  const tops = new Map<string, number>();
  for (const item of lineItems ?? []) {
    tops.set(item.product_title_snapshot, (tops.get(item.product_title_snapshot) ?? 0) + item.quantity);
  }
  const best = Array.from(tops, ([title, quantity]) => ({ title, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  const cards = [
    ["Sales recorded", formatPrice(revenue), "Paid online or COD delivered", ShoppingBag],
    ["Orders", String(orderCount ?? 0), `${counts.new ?? 0} new / ${counts.shipped ?? 0} shipped`, PackageCheck],
    ["Published products", String(productCount ?? 0), `${lowStock?.length ?? 0} low stock`, Box],
    ["Customers", String(customerCount ?? 0), "Customer profiles", Users],
  ] as const;

  return (
    <div>
      <header>
        <span className="eyebrow">Store operations</span>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Good morning.</h1>
        <p className="mt-3 text-sm text-muted">A clear view of what&apos;s happening across ZELNO.</p>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, note, Icon]) => (
          <article key={label} className="bg-paper p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">{label}</span>
              <Icon size={16} className="text-olive" />
            </div>
            <strong className="mt-4 block font-display text-3xl font-normal">{value}</strong>
            <span className="mt-2 block text-xs text-muted">{note}</span>
          </article>
        ))}
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="eyebrow">Admin modules</span>
            <h2 className="mt-2 font-display text-2xl">Manage the studio</h2>
          </div>
          <span className="text-xs text-muted">{ADMIN_MODULES.length} connected views</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ADMIN_MODULES.map(({ slug, label, description }) => (
            <Link
              key={slug}
              href={`/admin/${slug}`}
              className="group border border-line bg-paper p-5 transition-colors hover:bg-sand"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="eyebrow">ZELNO · Studio</span>
                  <h3 className="mt-2 font-display text-2xl">{label}</h3>
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-olive transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">{description}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.25fr_.75fr]">
        <section className="bg-paper p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Recent orders</h2>
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[.12em]">
              All orders <ArrowUpRight size={13} />
            </Link>
          </div>
          {recent?.length ? (
            <div className="mt-5 divide-y divide-line border-y border-line">
              {recent.map((order) => (
                <Link key={order.id} href="/admin/orders" className="flex flex-wrap items-center justify-between gap-2 py-4">
                  <span>
                    <strong className="block text-sm">{order.order_number}</strong>
                    <small className="text-xs text-muted">
                      {order.customer_name} · {new Date(order.placed_at).toLocaleDateString("en-IN")}
                    </small>
                  </span>
                  <span className="text-right">
                    <strong className="block text-sm">{formatPrice(Number(order.total))}</strong>
                    <small className="text-xs capitalize text-muted">{order.order_status}</small>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-5 border-y border-line py-8 text-sm text-muted">There are no orders yet.</p>
          )}
        </section>

        <div className="space-y-8">
          <section className="bg-paper p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Best-selling products</h2>
              <Link href="/admin/products" className="text-[10px] underline underline-offset-4">Manage</Link>
            </div>
            {best.length ? (
              <ol className="mt-4 divide-y divide-line">
                {best.map((item, index) => (
                  <li key={item.title} className="flex justify-between gap-3 py-3 text-sm">
                    <span><span className="mr-2 text-xs text-muted">0{index + 1}</span>{item.title}</span>
                    <span className="text-xs text-muted">{item.quantity} sold</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-muted">Product performance will appear after orders arrive.</p>
            )}
          </section>

          <section className="bg-paper p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Stock watch</h2>
              <Link href="/admin/products" className="text-[10px] underline underline-offset-4">Manage</Link>
            </div>
            {lowStock?.length ? (
              <ul className="mt-4 divide-y divide-line">
                {lowStock.map((product) => (
                  <li key={product.id} className="flex justify-between gap-3 py-3 text-sm">
                    <Link href="/admin/products" className="hover:underline">{product.title}</Link>
                    <span className={product.stock_quantity === 0 ? "text-red-700" : "text-muted"}>
                      {product.stock_quantity === 0 ? "Out of stock" : `${product.stock_quantity} left`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">No products at or below five in stock.</p>
            )}
          </section>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-2xl">Orders by status</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {["new", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned", "refunded"].map((status) => (
            <Link key={status} href="/admin/orders" className="border border-line bg-paper px-4 py-3 text-xs">
              <span className="block capitalize text-muted">{status}</span>
              <strong className="mt-1 block text-lg">{counts[status] ?? 0}</strong>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
