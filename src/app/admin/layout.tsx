import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { AdminNavigation } from "@/components/admin-navigation";
import { ADMIN_MODULES } from "@/lib/admin-modules";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f1efe8]">
      <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-line bg-ivory">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span aria-hidden className="grid size-8 place-items-center border border-olive/50 font-display text-olive">Z</span>
            <span className="text-[11px] font-semibold uppercase tracking-[.2em]">ZELNO Â· Studio</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs underline underline-offset-4"><ExternalLink size={14} aria-hidden="true" />View storefront</Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="min-h-screen pt-16">
        <AdminNavigation modules={ADMIN_MODULES} />
        <main className="min-w-0 px-4 py-7 sm:px-7 lg:ml-[220px] lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}


