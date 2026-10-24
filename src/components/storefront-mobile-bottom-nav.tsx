"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, PackageSearch, Store } from "lucide-react";

type StorefrontMobileBottomNavProps = {
  children: React.ReactNode;
};

const tabs = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/shop", label: "Shop", Icon: Store },
  { href: "/collections", label: "Categories", Icon: LayoutGrid },
  { href: "/account/orders", label: "Orders", Icon: PackageSearch },
] as const;

const hiddenPathPrefixes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/checkout",
  "/order-success",
  "/track-order",
];

function isCurrentPath(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function isHiddenPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/") || hiddenPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

export function StorefrontMobileBottomNav({ children }: StorefrontMobileBottomNavProps) {
  const pathname = usePathname() || "/";

  if (isHiddenPath(pathname)) return <>{children}</>;

  return (
    <>
      {children}
      <div aria-hidden="true" className="md:hidden" style={{ height: "calc(4rem + env(safe-area-inset-bottom))" }} />
      <nav
        aria-label="Storefront mobile navigation"
        className="storefront-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid min-h-16 grid-cols-4">
          {tabs.map(({ href, label, Icon }) => {
            const active = isCurrentPath(href, pathname);

            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium leading-none transition-colors focus-visible:relative focus-visible:z-10 ${active ? "text-olive" : "text-ink/70 hover:text-olive"}`}
              >
                <Icon aria-hidden="true" size={20} strokeWidth={1.7} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
