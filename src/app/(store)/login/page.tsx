import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { safeInternalPath } from "@/lib/utils";
type SearchParams = Promise<Record<string,string|string[]|undefined>>;
export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in", robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) { const p=await searchParams; const next=Array.isArray(p.next)?p.next[0]:p.next; return <section className="mx-auto grid min-h-[70vh] max-w-[1120px] items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-12"><div><span className="eyebrow">Your ZELNO account</span><h1 className="mt-4 font-display text-5xl sm:text-6xl">Good to see you.</h1><p className="mt-5 max-w-md text-sm leading-7 text-muted">Sign in to revisit your orders and save your details for next time.</p><Link href="/shop" className="mt-6 inline-block text-xs underline underline-offset-4">Or continue as a guest</Link></div><div className="bg-paper p-6 sm:p-9"><LoginForm nextPath={safeInternalPath(typeof next==="string"?next:null)} /></div></section>; }
