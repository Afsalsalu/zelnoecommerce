"use client";
import { useState } from "react";
import { toast } from "sonner";
export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not subscribe right now.");
      setEmail(""); toast.success("You're on the list. Thank you.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not subscribe right now."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="storefront-newsletter-form flex w-full max-w-md flex-col gap-2 sm:min-w-[320px] sm:flex-row"><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" className="min-h-12 flex-1 border px-4 text-sm outline-none" type="email" autoComplete="email" required maxLength={254} placeholder="Your email address" value={email} onChange={(event) => setEmail(event.target.value)} /><button className="min-h-12 px-5 text-[10px] font-semibold uppercase tracking-[.15em]" disabled={busy}>{busy ? "Joining…" : "Sign me up"}</button></form>;
}
