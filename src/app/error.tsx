"use client";
import { useEffect } from "react";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { if (error.digest) console.error("Storefront render error", error.digest); }, [error]);
  return <section className="mx-auto grid min-h-[55vh] max-w-3xl place-items-center px-5 py-16 text-center"><div><span className="eyebrow">A small pause</span><h1 className="mt-4 font-display text-5xl">We couldn’t load that.</h1><p className="mt-4 text-sm leading-7 text-muted">Please try again. Your order and account details remain protected.</p><button onClick={() => reset()} className="button-primary mt-7">Try again</button></div></section>;
}
