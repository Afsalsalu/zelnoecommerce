import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  CircleX,
  Clock3,
  CreditCard,
  LoaderCircle,
  MapPin,
  MessageCircle,
  PackageCheck,
  PackageSearch,
  RotateCcw,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { CopyOrderIdButton } from "@/components/copy-order-id-button";
import { formatPrice } from "@/lib/format";
import { requireCustomer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

type Params = Promise<{ orderNumber: string }>;

type OrderItem = {
  product_title_snapshot: string;
  variant_snapshot: { name?: string } | null;
  quantity: number;
  image_url_snapshot: string | null;
  line_total: number;
};

type StatusPresentation = {
  Icon: LucideIcon;
  pillClassName: string;
};

function statusPresentation(status: string): StatusPresentation {
  const pillClasses: Record<string, string> = {
    new: "border-line bg-sand text-muted",
    confirmed: "border-olive/25 bg-[#eef0e7] text-olive",
    packed: "border-olive/25 bg-[#eef0e7] text-olive",
    shipped: "border-line bg-paper text-ink",
    delivered: "border-olive/25 bg-[#eef0e7] text-olive",
    cancelled: "border-red-200 bg-red-50 text-red-700",
    returned: "border-amber-200 bg-amber-50 text-amber-800",
    refunded: "border-amber-200 bg-amber-50 text-amber-800",
    awaiting_whatsapp_confirmation: "border-amber-200 bg-amber-50 text-amber-800",
    processing: "border-line bg-sand text-muted",
  };

  let Icon = Clock3;
  switch (status) {
    case "confirmed":
      Icon = BadgeCheck;
      break;
    case "packed":
      Icon = PackageCheck;
      break;
    case "shipped":
      Icon = Truck;
      break;
    case "delivered":
      Icon = CheckCircle2;
      break;
    case "cancelled":
      Icon = CircleX;
      break;
    case "returned":
    case "refunded":
      Icon = RotateCcw;
      break;
    case "awaiting_whatsapp_confirmation":
      Icon = MessageCircle;
      break;
    case "processing":
      Icon = LoaderCircle;
      break;
  }

  return { Icon, pillClassName: pillClasses[status] || "border-line bg-sand text-muted" };
}

function displayStatus(status: string) {
  return status.replaceAll("_", " ");
}

function displayPaymentMethod(method: string) {
  return method === "cod" ? "Cash on delivery" : method;
}

function displayDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function displayDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AccountOrderPage({ params }: { params: Params }) {
  if (!isSupabaseConfigured) redirect("/login");

  const { orderNumber } = await params;
  const user = await requireCustomer();
  const supabase = await createServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("id,order_number,customer_name,order_status,order_source,whatsapp_status,payment_status,payment_method,subtotal,discount_total,shipping_total,total,shipping_address,tracking_courier,tracking_number,placed_at")
    .eq("order_number", orderNumber.toUpperCase())
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) notFound();

  const [{ data: items }, { data: history }] = await Promise.all([
    supabase
      .from("order_items")
      .select("product_title_snapshot,sku_snapshot,variant_snapshot,unit_price,quantity,image_url_snapshot,line_total")
      .eq("order_id", order.id),
    supabase
      .from("customer_order_status_history")
      .select("next_status,created_at,note")
      .eq("order_id", order.id)
      .order("created_at"),
  ]);

  const orderItems = (items ?? []) as OrderItem[];
  const address = order.shipping_address as Record<string, string | null>;
  const status = order.order_source === "whatsapp" && order.whatsapp_status ? order.whatsapp_status : order.order_status;
  const statusDisplay = statusPresentation(status);
  const StatusIcon = statusDisplay.Icon;
  const addressLines = [
    order.customer_name,
    address?.address_line,
    address?.area,
    [address?.city, address?.state, address?.pincode].filter(Boolean).join(", "),
  ].filter(Boolean);
  const discountTotal = Number(order.discount_total);
  const PaymentIcon = order.payment_method === "cod" ? Banknote : CreditCard;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 pb-28 sm:px-8 sm:py-12 sm:pb-32 lg:px-12 lg:py-16 lg:pb-20">
      <Link href="/account" className="inline-flex min-h-10 items-center gap-1.5 text-xs text-muted underline underline-offset-4 focus-visible:text-olive">
        <ArrowLeft size={14} aria-hidden="true" />
        Back to your account
      </Link>

      <header className="mt-7 border-b border-line pb-7">
        <span className="eyebrow">ORDER DETAILS</span>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${statusDisplay.pillClassName}`}>
            <StatusIcon size={14} strokeWidth={1.8} aria-hidden="true" />
            {displayStatus(status)}
          </span>
          <time dateTime={order.placed_at} className="text-xs text-muted">{displayDate(order.placed_at)}</time>
        </div>
        <div className="mt-4 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="shrink-0 uppercase tracking-[.12em]">Order ID</span>
          <span className="min-w-0 break-all font-medium text-ink">{order.order_number}</span>
          <CopyOrderIdButton orderNumber={order.order_number} />
        </div>
        {order.order_source === "whatsapp" && order.whatsapp_status === "awaiting_whatsapp_confirmation" && (
          <p className="mt-4 border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            Your request is saved. Please press Send in WhatsApp; the store will confirm availability next.
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/track-order" className="button-secondary min-h-10 px-4">
            <PackageSearch size={15} aria-hidden="true" />
            Track order
          </Link>
        </div>
      </header>

      <div className="grid gap-10 py-8 lg:grid-cols-[1.15fr_.85fr] lg:gap-12">
        <div className="min-w-0">
          <section aria-labelledby="order-items-heading">
            <h2 id="order-items-heading" className="mb-4 font-display text-2xl">Items</h2>
            {orderItems.length ? (
              <div className="divide-y divide-line border-y border-line">
                {orderItems.map((item, index) => {
                  const variantName = item.variant_snapshot?.name?.trim();
                  const hasVariant = Boolean(variantName && variantName.toLowerCase() !== "standard");

                  return (
                    <div key={`${item.product_title_snapshot}-${index}`} className="grid grid-cols-[4.25rem_minmax(0,1fr)_auto] items-center gap-3 py-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:gap-4">
                      <div className="relative aspect-square overflow-hidden rounded-md bg-sand">
                        {item.image_url_snapshot ? (
                          <Image src={item.image_url_snapshot} alt={item.product_title_snapshot} fill sizes="(max-width: 640px) 68px, 80px" className="object-cover" />
                        ) : (
                          <span className="absolute inset-0 grid place-items-center px-1 text-center text-[9px] uppercase tracking-[.12em] text-muted">Image coming soon</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.product_title_snapshot}</p>
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted">
                          {hasVariant && <span>Size: {variantName}</span>}
                          <span>Qty: {item.quantity}</span>
                        </div>
                      </div>
                      <span className="whitespace-nowrap text-right text-sm font-medium">{formatPrice(Number(item.line_total))}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="border-y border-line py-6 text-sm text-muted">No item details are available for this order.</p>
            )}
          </section>

          <section aria-labelledby="order-summary-heading" className="mt-7">
            <h2 id="order-summary-heading" className="sr-only">Order summary</h2>
            <dl className="ml-auto max-w-sm space-y-3 border-t border-line pt-5 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted">Subtotal</dt><dd>{formatPrice(Number(order.subtotal))}</dd></div>
              {discountTotal > 0 && <div className="flex justify-between gap-4"><dt className="text-muted">Discount</dt><dd>-{formatPrice(discountTotal)}</dd></div>}
              <div className="flex justify-between gap-4"><dt className="text-muted">Shipping</dt><dd>{formatPrice(Number(order.shipping_total))}</dd></div>
              <div className="flex justify-between gap-4 border-t border-line pt-3 font-semibold"><dt>Total</dt><dd>{formatPrice(Number(order.total))}</dd></div>
            </dl>
          </section>
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="border border-line bg-paper p-5 sm:p-6" aria-labelledby="delivery-heading">
            <div className="flex items-center gap-2">
              <MapPin size={17} className="text-olive" aria-hidden="true" />
              <h2 id="delivery-heading" className="font-display text-2xl">Delivery address</h2>
            </div>
            <address className="mt-4 space-y-1 text-sm leading-6 text-muted not-italic">
              {addressLines.map((line, index) => <span key={`${line}-${index}`} className="block">{line}</span>)}
            </address>
          </section>

          <section className="border border-line bg-paper p-5 sm:p-6" aria-labelledby="payment-heading">
            <div className="flex items-center gap-2">
              <PaymentIcon size={17} className="text-olive" aria-hidden="true" />
              <h2 id="payment-heading" className="font-display text-2xl">Payment</h2>
            </div>
            <p className="mt-4 text-sm capitalize text-muted">
              {displayPaymentMethod(order.payment_method)} · {displayStatus(order.payment_status)}
            </p>
          </section>

          {(order.tracking_courier || order.tracking_number) && (
            <section className="border border-line bg-paper p-5 sm:p-6" aria-labelledby="shipment-heading">
              <h2 id="shipment-heading" className="font-display text-2xl">Shipment</h2>
              <p className="mt-3 text-sm text-muted">{[order.tracking_courier, order.tracking_number].filter(Boolean).join(": ")}</p>
            </section>
          )}

          {history?.length ? (
            <section className="border border-line bg-paper p-5 sm:p-6" aria-labelledby="timeline-heading">
              <h2 id="timeline-heading" className="font-display text-2xl">Order timeline</h2>
              <ol className="mt-5 space-y-5 border-l border-line pl-5">
                {history.map((entry, index) => {
                  const timelineStatus = statusPresentation(entry.next_status);
                  const TimelineIcon = timelineStatus.Icon;

                  return (
                    <li key={`${entry.created_at}-${index}`} className="relative">
                      <span className={`absolute -left-[34px] top-0.5 grid size-7 place-items-center rounded-full border bg-paper ${timelineStatus.pillClassName}`}>
                        <TimelineIcon size={14} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <p className="text-sm font-medium capitalize">{displayStatus(entry.next_status)}</p>
                      <time dateTime={entry.created_at} className="mt-1 block text-xs text-muted">{displayDateTime(entry.created_at)}</time>
                      {entry.note?.trim() && <p className="mt-2 text-xs leading-5 text-muted">{entry.note}</p>}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
