import { ContactForm } from "@/components/contact-form";
import { getSitePage, getStoreSettings } from "@/lib/store";
export const metadata = { title: "Contact", description: "Speak with the ZELNO team about a product or order." };
export default async function ContactPage() {
  const [page, settings] = await Promise.all([getSitePage("contact"), getStoreSettings()]);
  return <div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-20 lg:px-12 lg:py-20"><div><span className="eyebrow">We’re here to help</span><h1 className="mt-4 font-display text-5xl sm:text-6xl">{page?.title || "A note to ZELNO"}</h1><p className="mt-5 max-w-md whitespace-pre-line text-sm leading-7 text-muted">{page?.body || "Contact information will appear here when your Supabase content is connected."}</p>{settings.contact_email && <a className="mt-6 block text-sm underline underline-offset-4" href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>}{settings.contact_phone && <a className="mt-3 block text-sm underline underline-offset-4" href={`tel:${settings.contact_phone}`}>{settings.contact_phone}</a>}</div><div className="bg-paper p-5 sm:p-8"><ContactForm /></div></div>;
}
