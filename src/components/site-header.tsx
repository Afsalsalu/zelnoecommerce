"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Heart, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useWishlist } from "@/components/wishlist-provider";
import { DEFAULT_NAVIGATION } from "@/lib/navigation";
import type { StoreSettings } from "@/lib/types";

type Announcement = { message: string; href?: string; linkLabel?: string } | null;

function isCurrentPath(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ settings, navigation, announcement }: { settings: StoreSettings; navigation: { label: string; href: string }[]; announcement: Announcement }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const { count } = useCart();
  const { count: wishlistCount } = useWishlist();
  const links = navigation.length ? navigation : DEFAULT_NAVIGATION;

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const focusTimer = window.requestAnimationFrame(() => {
      drawerRef.current?.querySelector<HTMLElement>("[data-mobile-drawer-close]")?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusableElements = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusableElements.length) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement;

      if (!drawerRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    };
  }, [open]);

  const accountActive = isCurrentPath("/account", pathname);
  const wishlistActive = isCurrentPath("/wishlist", pathname);
  const cartActive = isCurrentPath("/cart", pathname);
  const wishlistLabel = wishlistCount ? `Wishlist, ${wishlistCount} saved` : "Wishlist";
  const cartLabel = count ? `Shopping bag, ${count} items` : "Shopping bag";
  const activeLinkClass = (href: string) => isCurrentPath(href, pathname) ? "text-olive" : "text-ink/75";

  return <>
    {announcement && <div className="flex min-h-8 items-center justify-center bg-ink px-4 text-center text-[9px] font-medium uppercase tracking-[.16em] text-white sm:text-[10px]"><span>{announcement.message}</span>{announcement.href && announcement.linkLabel && <Link className="ml-2 hidden items-center gap-1 text-white/75 underline underline-offset-4 sm:inline-flex" href={announcement.href}>{announcement.linkLabel}<ArrowRight size={11} /></Link>}</div>}
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ivory/95 backdrop-blur-sm"><div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-12">
      <button ref={menuButtonRef} type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" title={open ? "Close navigation" : "Open navigation"} className="grid size-11 place-items-center lg:hidden" onClick={() => setOpen(!open)}>{open ? <X size={19} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}</button>
      <Link href="/" aria-label={`${settings.store_name || "ZELNO Kitchen"} home`} className="group flex items-center gap-2.5"><span aria-hidden className="grid size-9 place-items-center border border-olive/50 text-[14px] font-display leading-none text-olive">Z</span><span className="text-[13px] font-semibold uppercase tracking-[.24em]">{settings.store_name || "ZELNO"}</span></Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-9 lg:flex">{links.map((link) => <Link key={link.href} aria-current={isCurrentPath(link.href, pathname) ? "page" : undefined} className={`text-[10px] font-semibold uppercase tracking-[.15em] transition-colors hover:text-olive ${activeLinkClass(link.href)}`} href={link.href}>{link.label}</Link>)}</nav>
      <div className="flex items-center gap-1 sm:gap-3"><Link aria-label="Your account" title="Account" aria-current={accountActive ? "page" : undefined} className={`grid size-11 place-items-center transition-colors hover:text-olive ${accountActive ? "text-olive" : ""}`} href="/account"><UserRound size={19} strokeWidth={1.5} /></Link><Link aria-label={wishlistLabel} title="Wishlist" aria-current={wishlistActive ? "page" : undefined} className={`relative grid size-11 place-items-center transition-colors hover:text-olive ${wishlistActive ? "text-olive" : ""}`} href="/wishlist"><Heart size={19} strokeWidth={1.5} />{wishlistCount > 0 && <span className="absolute right-0.5 top-0.5 grid size-[17px] place-items-center rounded-full bg-olive text-[9px] font-semibold text-white">{wishlistCount > 99 ? "99+" : wishlistCount}</span>}</Link><Link aria-label={cartLabel} title="Cart" aria-current={cartActive ? "page" : undefined} className={`relative grid size-11 place-items-center transition-colors hover:text-olive ${cartActive ? "text-olive" : ""}`} href="/cart"><ShoppingBag size={19} strokeWidth={1.5} />{count > 0 && <span className="absolute right-0.5 top-0.5 grid size-[17px] place-items-center rounded-full bg-olive text-[9px] font-semibold text-white">{count > 99 ? "99+" : count}</span>}</Link></div>
    </div></header>
    <div className={`fixed inset-0 z-[60] overflow-hidden lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open} inert={!open}>
      <button type="button" aria-label="Close navigation" tabIndex={-1} className={`absolute inset-0 bg-ink/45 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
      <aside ref={drawerRef} id="mobile-navigation" role="dialog" aria-modal="true" aria-labelledby="mobile-navigation-title" className={`absolute inset-y-0 left-0 z-10 flex h-dvh w-[82vw] max-w-[360px] flex-col overflow-hidden bg-ivory shadow-[8px_0_30px_rgba(37,38,35,0.12)] transition-transform duration-300 ease-out will-change-transform ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[74px] shrink-0 items-center justify-between border-b border-line/80 px-5">
          <Link href="/" aria-label={`${settings.store_name || "ZELNO Kitchen"} home`} className="group flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <span aria-hidden className="grid size-9 place-items-center border border-olive/50 text-[14px] font-display leading-none text-olive">Z</span>
            <span id="mobile-navigation-title" className="text-[13px] font-semibold uppercase tracking-[.24em]">{settings.store_name || "ZELNO"}</span>
          </Link>
          <button type="button" data-mobile-drawer-close aria-label="Close navigation" title="Close navigation" className="grid size-11 shrink-0 place-items-center" onClick={() => setOpen(false)}><X size={19} strokeWidth={1.5} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <nav aria-label="Mobile navigation">
            {links.map((link) => <Link key={link.href} aria-current={isCurrentPath(link.href, pathname) ? "page" : undefined} onClick={() => setOpen(false)} className={`block border-b border-line py-4 text-[11px] font-semibold uppercase tracking-[.16em] transition-colors hover:text-olive ${activeLinkClass(link.href)}`} href={link.href}>{link.label}</Link>)}
          </nav>
          <div className="mt-2 grid grid-cols-3 gap-2 border-t border-line pt-3">
            <Link aria-current={accountActive ? "page" : undefined} onClick={() => setOpen(false)} className={`flex flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-[.12em] ${accountActive ? "text-olive" : "text-ink/75"}`} href="/account"><UserRound size={17} strokeWidth={1.5} /><span>Account</span></Link>
            <Link aria-current={wishlistActive ? "page" : undefined} onClick={() => setOpen(false)} className={`relative flex flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-[.12em] ${wishlistActive ? "text-olive" : "text-ink/75"}`} href="/wishlist"><Heart size={17} strokeWidth={1.5} /><span>Wishlist</span>{wishlistCount > 0 && <span className="absolute right-5 top-1 grid size-4 place-items-center rounded-full bg-olive text-[8px] font-semibold text-white">{wishlistCount > 99 ? "99+" : wishlistCount}</span>}</Link>
            <Link aria-current={cartActive ? "page" : undefined} onClick={() => setOpen(false)} className={`relative flex flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-[.12em] ${cartActive ? "text-olive" : "text-ink/75"}`} href="/cart"><ShoppingBag size={17} strokeWidth={1.5} /><span>Cart</span>{count > 0 && <span className="absolute right-5 top-1 grid size-4 place-items-center rounded-full bg-olive text-[8px] font-semibold text-white">{count > 99 ? "99+" : count}</span>}</Link>
          </div>
        </div>
      </aside>
    </div>
  </>;
}
