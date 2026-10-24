"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatPrice } from "@/lib/format";
import { PackageSearch } from "lucide-react";
import { z } from "zod";

const schema = z.object({ orderNumber: z.string().trim().min(12).max(40), contact: z.string().trim().min(5).max(254) });
type Values = z.infer<typeof schema>;
type Result = { order: { order_number: string; order_status: string; order_source?: string; whatsapp_status?: string | null; payment_status: string; payment_method: string; total: number; placed_at: string; tracking_courier: string | null; tracking_number: string | null }; items: { product_title_snapshot: string; quantity: number; line_total: number }[]; history: { next_status: string; created_at: string }[] };

export function OrderTracker() {
  const [result, setResult] = useState<Result | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { orderNumber: "", contact: "" } });
  async function submit(values: Values) {
    setResult(null);
    try {
      const response = await fetch("/api/orders/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "We couldn't find this order."); setResult(body as Result);
    } catch (error) { setError("root", { message: error instanceof Error ? error.message : "We couldn't find this order." }); }
  }
  return <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr]"><form onSubmit={handleSubmit(submit)} className="h-fit space-y-5 bg-paper p-6 sm:p-8"><label className="block"><span className="field-label">Order number</span><input className="field-control" autoComplete="off" placeholder="ZK-20261017-…" {...register("orderNumber")} />{errors.orderNumber && <span className="mt-1 block text-xs text-red-700">Enter the complete order number.</span>}</label><label className="block"><span className="field-label">Checkout email or phone</span><input className="field-control" autoComplete="email" {...register("contact")} />{errors.contact && <span className="mt-1 block text-xs text-red-700">Enter the email or phone used for the order.</span>}</label>{errors.root && <p role="alert" className="text-sm text-red-700">{errors.root.message}</p>}<button className="button-primary w-full" disabled={isSubmitting}><PackageSearch size={15} aria-hidden="true" />{isSubmitting ? "Looking…" : "Find my order"}</button></form>{result ? <section className="border border-line bg-paper p-6 sm:p-8"><span className="eyebrow">Order {result.order.order_number}</span><h2 className="mt-3 font-display text-3xl capitalize">{(result.order.whatsapp_status || result.order.order_status).replaceAll("_", " ")}</h2><p className="mt-2 text-sm text-muted">Placed {new Date(result.order.placed_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })} · {result.order.order_source === "whatsapp" ? "WhatsApp request" : `Payment ${result.order.payment_status.replaceAll("_", " ")}`}</p>{result.order.order_source === "whatsapp" && result.order.whatsapp_status === "awaiting_whatsapp_confirmation" && <p className="mt-3 border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Your request is saved. Please press Send in WhatsApp; the store will confirm availability next.</p>}{result.order.tracking_courier && <p className="mt-3 text-sm">{result.order.tracking_courier}: {result.order.tracking_number}</p>}<div className="mt-6 divide-y divide-line border-y border-line">{result.items.map((item, index) => <div key={index} className="flex justify-between gap-4 py-3 text-sm"><span className="text-muted">{item.product_title_snapshot} × {item.quantity}</span><span>{formatPrice(Number(item.line_total))}</span></div>)}</div><p className="mt-5 flex justify-between font-semibold"><span>Total</span><span>{formatPrice(Number(result.order.total))}</span></p>{result.history.length > 0 && <ol className="mt-7 border-l border-line pl-5">{result.history.map((entry, index) => <li key={index} className="relative pb-5 text-sm"><span className="absolute -left-[25px] top-1 size-2 rounded-full bg-olive" /><p className="font-medium capitalize">{entry.next_status.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted">{new Date(entry.created_at).toLocaleString("en-IN")}</p></li>)}</ol>}</section> : <div className="grid min-h-64 place-items-center border border-dashed border-line px-6 text-center text-sm leading-7 text-muted">Your order status and timeline will appear here. To protect your details, we&apos;ll ask for the order number and checkout contact.</div>}</div>;
}
