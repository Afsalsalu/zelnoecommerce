"use client";

import Link from "next/link";
import { ArrowRight, Heart, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProductCard } from "@/components/product-card";
import { useWishlist } from "@/components/wishlist-provider";
import { wishlistEntryKey } from "@/lib/wishlist";

function UnavailableWishlistCard({ item, onRemove }: { item: ReturnType<typeof useWishlist>["items"][number]; onRemove: (key: string) => Promise<void> }) {
  const key = wishlistEntryKey(item);
  async function remove() {
    try { await onRemove(key); toast.success("Removed from your wishlist"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "We couldn't remove that item."); }
  }
  return <article className="flex min-h-64 flex-col justify-between border border-line bg-paper p-6"><div><div className="grid size-11 place-items-center bg-ivory text-muted"><Heart size={18} strokeWidth={1.4} /></div><p className="mt-7 text-[10px] font-semibold uppercase tracking-[.16em] text-muted">Unavailable</p><h2 className="mt-2 font-display text-2xl">This product is no longer available.</h2><p className="mt-3 text-sm leading-6 text-muted">You can safely remove it from your saved list.</p></div><button type="button" onClick={remove} className="mt-8 inline-flex items-center gap-2 self-start text-[10px] font-semibold uppercase tracking-[.14em] text-ink transition-colors hover:text-olive"><Trash2 size={14} strokeWidth={1.5} />Remove</button></article>;
}

export function WishlistPageContent() {
  const { items, count, loading, error, remove, refresh } = useWishlist();

  if (loading && !items.length) return <section className="mx-auto flex min-h-[65vh] max-w-3xl items-center justify-center px-5 py-20 sm:px-8"><div className="w-full border border-line bg-paper px-6 py-14 text-center sm:px-12"><span className="eyebrow">Your saved edit</span><h1 className="mt-3 font-display text-4xl sm:text-5xl">Loading your wishlist.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted">We're bringing your saved products back.</p></div></section>;

  if (error && !items.length) return <section className="mx-auto flex min-h-[65vh] max-w-3xl items-center justify-center px-5 py-20 sm:px-8"><div className="w-full border border-line bg-paper px-6 py-14 text-center sm:px-12"><Heart size={24} strokeWidth={1.4} className="mx-auto text-olive" /><span className="eyebrow mt-5 block">Your saved edit</span><h1 className="mt-3 font-display text-4xl sm:text-5xl">Your wishlist could not load.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted">{error}</p><button type="button" onClick={() => void refresh()} className="button-primary mt-8"><RefreshCw size={15} aria-hidden="true" />Try again</button></div></section>;

  if (!count) return <section className="mx-auto flex min-h-[65vh] max-w-3xl items-center justify-center px-5 py-20 sm:px-8"><div className="w-full border border-line bg-paper px-6 py-14 text-center sm:px-12"><Heart size={24} strokeWidth={1.4} className="mx-auto text-olive" /><span className="eyebrow mt-5 block">Your saved edit</span><h1 className="mt-3 font-display text-4xl sm:text-5xl">Your wishlist is waiting.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted">Save pieces you love while you explore ZELNO. Your saved products will appear here.</p><Link href="/shop" className="button-primary mt-8">Explore products<ArrowRight size={15} /></Link></div></section>;

  return <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"><div className="flex flex-wrap items-end justify-between gap-5"><div><span className="eyebrow">Your saved edit</span><h1 className="mt-3 font-display text-4xl sm:text-5xl">Wishlist</h1><p className="mt-3 text-sm text-muted">{count} saved {count === 1 ? "piece" : "pieces"}.</p></div><Link href="/shop" className="button-secondary">Continue exploring<ArrowRight size={15} /></Link></div>{error && <div role="status" className="mt-8 border border-amber-900/20 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>}<div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">{items.map((item) => item.product ? <ProductCard key={item.id ?? wishlistEntryKey(item)} product={item.product} quickAdd /> : <UnavailableWishlistCard key={item.id ?? wishlistEntryKey(item)} item={item} onRemove={remove} />)}</div></section>;
}
