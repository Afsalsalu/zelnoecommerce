import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
export default function NotFound() { return <section className="mx-auto grid min-h-[55vh] max-w-3xl place-items-center px-5 py-16 text-center"><div><span className="eyebrow">A little off the path</span><h1 className="mt-4 font-display text-5xl">We canâ€™t find that page.</h1><p className="mt-4 text-sm leading-7 text-muted">The link may have moved, or the page is no longer available.</p><div className="mt-7 flex justify-center gap-3"><Link href="/" className="button-primary"><ArrowLeft size={15} aria-hidden="true" />Back home</Link><Link href="/shop" className="button-secondary"><ArrowRight size={15} aria-hidden="true" />Explore the shop</Link></div></div></section>; }


