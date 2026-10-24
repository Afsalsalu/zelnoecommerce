import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import type { StoreSettings } from "@/lib/types";

type FooterData = { description?: string; social_links?: Record<string, string>; newsletter_enabled?: boolean };
const policies = [["Shipping policy", "/shipping-policy"], ["Returns & refunds", "/return-refund-policy"], ["Privacy", "/privacy-policy"], ["Terms", "/terms-conditions"]];
export function SiteFooter({ settings, footer }: { settings: StoreSettings; footer: FooterData }) {
  return (
    <footer className="storefront-footer mt-24 border-t border-line">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_.8fr_.8fr] lg:px-12 lg:py-20">
        <div className="max-w-sm">
          <Link href="/" className="inline-flex items-center gap-2.5"><span aria-hidden className="grid size-9 place-items-center border border-olive/50 font-display text-[14px] text-olive">Z</span><span className="text-[12px] font-semibold uppercase tracking-[.24em]">{settings.store_name || "ZELNO"}</span></Link>
          <p className="mt-5 max-w-xs text-sm leading-7 text-muted">{footer.description || settings.tagline || "Thoughtfully selected essentials for a better everyday home."}</p>
          {settings.contact_email && <a className="mt-5 inline-flex items-center gap-1 text-sm underline underline-offset-4" href={`mailto:${settings.contact_email}`}>{settings.contact_email}<ArrowUpRight size={14} /></a>}
          {settings.whatsapp_number && <a className="mt-3 inline-flex items-center gap-1.5 text-sm underline underline-offset-4" href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={14} aria-hidden="true" />WhatsApp us ↗</a>}
        </div>
        <div>
          <h2 className="eyebrow">Explore</h2>
          <div className="mt-5 flex flex-col items-start gap-3 text-sm text-muted">
            <Link className="hover:text-ink" href="/shop">Shop all</Link><Link className="hover:text-ink" href="/about">Our story</Link><Link className="hover:text-ink" href="/contact">Contact</Link><Link className="hover:text-ink" href="/track-order">Track an order</Link>
          </div>
        </div>
        <div>
          <h2 className="eyebrow">The details</h2>
          <div className="mt-5 flex flex-col items-start gap-3 text-sm text-muted">
            {policies.map(([label, href]) => <Link key={href} className="hover:text-ink" href={href}>{label}</Link>)}
            {Object.entries(footer.social_links ?? settings.social_links ?? {}).filter(([, href]) => typeof href === "string" && href.startsWith("https://")).map(([name, href]) => <a key={name} className="capitalize hover:text-ink" href={href} target="_blank" rel="noreferrer">{name} ↗</a>)}
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 border-t border-line px-5 py-5 text-[10px] tracking-[.05em] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <span>© {new Date().getFullYear()} {settings.store_name || "ZELNO Kitchen"}. Thoughtfully, always.</span><span>Made for everyday living.</span>
      </div>
    </footer>
  );
}
