"use client";
import { RefreshCw } from "lucide-react";

export default function WhatsAppOrdersError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="border border-red-200 bg-red-50 p-6 sm:p-8" role="alert"><span className="eyebrow text-red-800">Could not load settings</span><h1 className="mt-2 font-display text-3xl text-red-950">WhatsApp Settings is unavailable</h1><p className="mt-3 max-w-xl text-sm leading-6 text-red-900">The existing store configuration could not be loaded. No order or WhatsApp data was changed.</p><button type="button" className="button-primary mt-6" onClick={() => reset()}><RefreshCw size={15} aria-hidden="true" />Try again</button></section>;
}
