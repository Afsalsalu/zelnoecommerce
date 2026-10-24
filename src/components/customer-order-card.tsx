"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  CircleX,
  Clock3,
  Copy,
  LoaderCircle,
  MessageCircle,
  PackageCheck,
  RotateCcw,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

export type CustomerOrderItem = {
  product_title_snapshot: string;
  variant_snapshot: { name?: string } | null;
  quantity: number;
  image_url_snapshot: string | null;
};

type CustomerOrderCardProps = {
  href: string;
  orderNumber: string;
  status: string;
  items: CustomerOrderItem[];
};

function statusPresentation(status: string): { Icon: LucideIcon; className: string } {
  switch (status) {
    case "confirmed":
      return { Icon: BadgeCheck, className: "text-muted" };
    case "packed":
      return { Icon: PackageCheck, className: "text-muted" };
    case "shipped":
      return { Icon: Truck, className: "text-muted" };
    case "delivered":
      return { Icon: CheckCircle2, className: "text-muted" };
    case "cancelled":
      return { Icon: CircleX, className: "text-muted" };
    case "returned":
    case "refunded":
      return { Icon: RotateCcw, className: "text-muted" };
    case "awaiting_whatsapp_confirmation":
      return { Icon: MessageCircle, className: "text-muted" };
    case "processing":
      return { Icon: LoaderCircle, className: "text-muted" };
    default:
      return { Icon: Clock3, className: "text-muted" };
  }
}

function copyWithFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

function CopyOrderIdButton({ orderNumber }: { orderNumber: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  async function copyOrderId() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(orderNumber);
      } else if (!copyWithFallback(orderNumber)) {
        throw new Error("Clipboard copy failed");
      }

      setCopied(true);
      toast.success("Order ID copied");
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
      toast.error("We couldn't copy the order ID. Please copy it manually.");
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Copy order ID"
        title="Copy order ID"
        onClick={copyOrderId}
        className="pointer-events-auto grid size-7 shrink-0 place-items-center text-muted transition-colors hover:text-olive focus-visible:text-olive"
      >
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      </button>
      {copied && <span role="status" aria-live="polite" className="text-[10px] text-olive">Order ID copied</span>}
    </>
  );
}

export function CustomerOrderCard({ href, orderNumber, status, items }: CustomerOrderCardProps) {
  const firstItem = items[0];
  const { Icon: StatusIcon, className: statusClassName } = statusPresentation(status);
  const additionalItemCount = Math.max(items.length - 1, 0);
  const variantName = firstItem?.variant_snapshot?.name?.trim();
  const hasVariant = Boolean(variantName && variantName.toLowerCase() !== "standard");

  return (
    <article className="border-b border-line first:border-t">
      <Link href={href} aria-label={`View order ${orderNumber}`} className="absolute inset-0 z-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-olive" />
      <div className="pointer-events-none relative z-[1] grid grid-cols-[4.25rem_minmax(0,1fr)] gap-4 p-4 transition-colors hover:bg-paper/50 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-5 sm:p-5">
        <div className="relative aspect-square overflow-hidden rounded-md bg-sand">
          {firstItem?.image_url_snapshot ? (
            <Image src={firstItem.image_url_snapshot} alt={firstItem.product_title_snapshot} fill sizes="(max-width: 640px) 68px, 88px" className="object-cover" />
          ) : (
            <span className="absolute inset-0 grid place-items-center px-1 text-center text-[9px] uppercase tracking-[.12em] text-muted">Image coming soon</span>
          )}
          {additionalItemCount > 0 && <span className="absolute bottom-1 left-1 rounded-sm bg-ink/80 px-1.5 py-1 text-[9px] font-medium text-white">+{additionalItemCount} items</span>}
        </div>

        <div className="min-w-0">
          <div className="block min-w-0">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium capitalize ${statusClassName}`}>
              <StatusIcon size={14} strokeWidth={1.8} aria-hidden="true" />
              {status.replaceAll("_", " ")}
            </span>
            <p className="mt-2 truncate text-sm font-medium sm:text-base">
              {firstItem?.product_title_snapshot || "Product details unavailable"}
              {additionalItemCount > 0 && <span className="font-normal text-muted"> + {additionalItemCount} more items</span>}
            </p>
            {firstItem && <p className="mt-1 text-xs text-muted">{hasVariant ? `Size: ${variantName} · ` : ""}Qty: {firstItem.quantity}</p>}
          </div>

          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted">
            <span className="min-w-0 flex-1 truncate" title={orderNumber}>{orderNumber}</span>
            <CopyOrderIdButton orderNumber={orderNumber} />
          </div>
        </div>
      </div>
    </article>
  );
}
