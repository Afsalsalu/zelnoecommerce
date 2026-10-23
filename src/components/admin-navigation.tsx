"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ClipboardList, FileText, House, Inbox, LayoutDashboard, Menu, MessageCircle, Package, Settings, Tags, TicketPercent, Users, X } from "lucide-react";

type AdminNavigationIcon = "layout-dashboard" | "package" | "tags" | "clipboard-list" | "users" | "ticket-percent" | "house" | "file-text" | "settings" | "message-circle" | "inbox";
type AdminNavigationModule = {
  slug: string;
  label: string;
  icon: AdminNavigationIcon;
};

type AdminNavigationProps = {
  modules: readonly AdminNavigationModule[];
};

const navigationLinkClass =
  "flex min-h-10 items-center gap-3 rounded-sm px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[.11em] transition-colors";

const navigationIcons = {
  "layout-dashboard": LayoutDashboard,
  package: Package,
  tags: Tags,
  "clipboard-list": ClipboardList,
  users: Users,
  "ticket-percent": TicketPercent,
  house: House,
  "file-text": FileText,
  settings: Settings,
  "message-circle": MessageCircle,
  inbox: Inbox,
} as const;

function isCurrentPath(pathname: string | null, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname?.startsWith(`${href}/`);
}

export function AdminNavigation({ modules }: AdminNavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const items = [
    { href: "/admin", label: "Overview", icon: "layout-dashboard" as const },
    ...modules.map(({ slug, label, icon }) => ({ href: `/admin/${slug}`, label, icon })),
  ];

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const renderLinks = (onNavigate?: () => void) =>
    items.map(({ href, label, icon }) => {
      const active = isCurrentPath(pathname, href);

      return (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
          className={`${navigationLinkClass} ${
            active
              ? "bg-sand text-ink"
              : "text-muted hover:bg-sand/70 hover:text-ink"
          }`}
        >
          {(() => { const Icon = navigationIcons[icon]; return <Icon aria-hidden size={15} strokeWidth={1.5} className={active ? "text-olive" : "text-muted"} />; })()}
          <span>{label}</span>
        </Link>
      );
    });

  const brandFooter = (
    <div className="border-t border-line p-4">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid size-8 place-items-center border border-olive/50 font-display text-sm text-olive"
        >
          Z
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-ink">
            ZELNO · Studio
          </p>
          <p className="mt-1 text-[10px] text-muted">Store operations</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-16 z-30 hidden w-[220px] flex-col border-r border-line bg-ivory lg:flex">
        <nav
          aria-label="Admin navigation"
          className="min-h-0 flex-1 overflow-y-auto p-4"
        >
          <div className="space-y-1">{renderLinks()}</div>
        </nav>
        {brandFooter}
      </aside>

      <div className="border-b border-line bg-ivory px-4 py-3 lg:hidden">
        <button
          type="button"
          aria-controls="admin-mobile-navigation"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close admin navigation" : "Open admin navigation"}
          className="flex min-h-10 w-full items-center justify-between gap-3 rounded-sm border border-line px-3 text-left text-[10px] font-semibold uppercase tracking-[.14em] text-ink transition-colors hover:bg-sand"
          onClick={() => setIsOpen(true)}
        >
          <span className="flex items-center gap-3">
            <Menu aria-hidden size={16} strokeWidth={1.5} />
            <span>Admin navigation</span>
          </span>
          <span className="text-muted">
            {items.find((item) => isCurrentPath(pathname, item.href))?.label}
          </span>
        </button>
      </div>

      {isOpen ? (
        <div
          id="admin-mobile-navigation"
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
        >
          <button
            type="button"
            aria-label="Close admin navigation"
            className="absolute inset-0 bg-ink/30"
            onClick={() => setIsOpen(false)}
          />
          <aside className="relative flex h-full w-[min(86vw,320px)] flex-col bg-ivory shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid size-8 place-items-center border border-olive/50 font-display text-olive"
                >
                  Z
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[.2em]">
                  ZELNO · Studio
                </span>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close admin navigation"
                className="grid size-9 place-items-center rounded-sm text-muted transition-colors hover:bg-sand hover:text-ink"
                onClick={() => setIsOpen(false)}
              >
                <X aria-hidden size={18} strokeWidth={1.5} />
              </button>
            </div>
            <nav
              aria-label="Admin navigation"
              className="min-h-0 flex-1 overflow-y-auto p-4"
            >
              <div className="space-y-1">{renderLinks(() => setIsOpen(false))}</div>
            </nav>
            {brandFooter}
          </aside>
        </div>
      ) : null}
    </>
  );
}
