import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";

export const metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return <section className="mx-auto flex min-h-[65vh] max-w-3xl items-center justify-center px-5 py-20 sm:px-8"><div className="w-full border border-line bg-paper px-6 py-14 text-center sm:px-12"><Heart size={24} strokeWidth={1.4} className="mx-auto text-olive" /><span className="eyebrow mt-5 block">Your saved edit</span><h1 className="mt-3 font-display text-4xl sm:text-5xl">Your wishlist is waiting.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted">Save pieces you love while you explore ZELNO. Your saved products will appear here.</p><Link href="/shop" className="button-primary mt-8">Explore products<ArrowRight size={15} /></Link></div></section>;
}
