"use client";

import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { paiseToRupeesInput, rupeesToPaise } from "@/lib/money";
import { normalizeNavigation, type NavigationLink } from "@/lib/navigation";

type SettingRow = { id: string; setting_key: string; value: unknown; is_public: boolean };
type Value = Record<string, unknown>;
type SocialLinks = Record<string, string>;
type StoreDraft = {
  store_name: string; tagline: string; currency: string; logo_url: string;
  contact_email: string; contact_phone: string; whatsapp_number: string;
  shipping_fee: string; free_shipping_minimum: string; cod_enabled: boolean;
  delivery_estimate: string; return_summary: string; seo_title: string; seo_description: string; social_links: SocialLinks;
};
type FooterDraft = { description: string; newsletter_enabled: boolean; social_links: SocialLinks };

function asValue(value: unknown): Value {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Value : {};
}
function text(value: Value, key: string) { return typeof value[key] === "string" ? value[key] as string : ""; }
function bool(value: Value, key: string, fallback = false) { return typeof value[key] === "boolean" ? value[key] as boolean : fallback; }
function links(value: unknown): NavigationLink[] { return normalizeNavigation(value); }
function socialLinks(value: unknown): SocialLinks { return value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value as Value).filter(([, item]) => typeof item === "string")) as SocialLinks : {}; }

function findSetting(settings: SettingRow[], key: string) { return settings.find((setting) => setting.setting_key === key); }

export function AdminSettings({ settings }: { settings: SettingRow[] }) {
  const storeRecord = findSetting(settings, "store");
  const footerRecord = findSetting(settings, "footer");
  const navigationRecord = findSetting(settings, "navigation");
  const storeValue = asValue(storeRecord?.value);
  const footerValue = asValue(footerRecord?.value);
  const navigationValue = asValue(navigationRecord?.value);
  const initialStore = useMemo<StoreDraft>(() => ({
    store_name: text(storeValue, "store_name"),
    tagline: text(storeValue, "tagline"),
    currency: text(storeValue, "currency") || "INR",
    logo_url: text(storeValue, "logo_url"),
    contact_email: text(storeValue, "contact_email"),
    contact_phone: text(storeValue, "contact_phone"),
    whatsapp_number: text(storeValue, "whatsapp_number"),
    shipping_fee: String(paiseToRupeesInput(typeof storeValue.shipping_fee === "number" ? storeValue.shipping_fee : 0)),
    free_shipping_minimum: String(paiseToRupeesInput(typeof storeValue.free_shipping_minimum === "number" ? storeValue.free_shipping_minimum : 0)),
    cod_enabled: bool(storeValue, "cod_enabled", true),
    delivery_estimate: text(storeValue, "delivery_estimate"),
    return_summary: text(storeValue, "return_summary"),
    seo_title: text(storeValue, "seo_title"),
    seo_description: text(storeValue, "seo_description"),
    social_links: socialLinks(storeValue.social_links),
  }), [storeRecord?.id]);
  const [store, setStore] = useState(initialStore);
  const [footer, setFooter] = useState<FooterDraft>({ description: text(footerValue, "description"), newsletter_enabled: bool(footerValue, "newsletter_enabled"), social_links: socialLinks(footerValue.social_links) });
  const [navigation, setNavigation] = useState<NavigationLink[]>(links(navigationValue.links));
  const [publicFlags, setPublicFlags] = useState({ store: storeRecord?.is_public ?? true, footer: footerRecord?.is_public ?? true, navigation: navigationRecord?.is_public ?? true });
  const [busy, setBusy] = useState<string | null>(null);

  async function save(key: "store" | "footer" | "navigation", value: Value) {
    setBusy(key);
    try {
      const response = await fetch("/api/admin/content", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity: "setting", data: { setting_key: key, value, is_public: publicFlags[key] } }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not save settings.");
      toast.success(`${key[0].toUpperCase()}${key.slice(1)} settings saved.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings.");
    } finally {
      setBusy(null);
    }
  }

  async function saveStore(event: React.FormEvent) {
    event.preventDefault();
    try {
      await save("store", {
        store_name: store.store_name.trim(), tagline: store.tagline.trim(), currency: store.currency.trim().toUpperCase(), logo_url: store.logo_url.trim(),
        contact_email: store.contact_email.trim(), contact_phone: store.contact_phone.trim(), whatsapp_number: store.whatsapp_number.trim(),
        shipping_fee: rupeesToPaise(store.shipping_fee || "0", "Shipping fee"), free_shipping_minimum: rupeesToPaise(store.free_shipping_minimum || "0", "Free shipping minimum"), cod_enabled: store.cod_enabled,
        delivery_estimate: store.delivery_estimate.trim(), return_summary: store.return_summary.trim(), seo_title: store.seo_title.trim(), seo_description: store.seo_description.trim(), social_links: Object.fromEntries(socialRows(store.social_links).filter(([, value]) => value.trim())),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check the store settings.");
    }
  }

  const updateSocial = (key: string, value: string, set: (value: SocialLinks) => void, current: SocialLinks) => set({ ...current, [key]: value });
  const socialRows = (current: SocialLinks) => Object.entries(current);

  return (
    <div className="space-y-8">
      <header><span className="eyebrow">Configuration</span><h1 className="mt-2 font-display text-4xl sm:text-5xl">Store settings</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Manage the public store configuration already supported by ZELNO. Service credentials and payment or upload secrets are never shown here.</p></header>

      <form onSubmit={saveStore} className="space-y-6 border border-line bg-paper p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4"><div><span className="eyebrow">Brand & store identity</span><h2 className="mt-1 font-display text-2xl">Store profile</h2></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-olive" checked={publicFlags.store} onChange={(event) => setPublicFlags((old) => ({ ...old, store: event.target.checked }))} />Public setting</label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">Store name</span><input required className="field-control" value={store.store_name} onChange={(event) => setStore({ ...store, store_name: event.target.value })} /></label><label><span className="field-label">Currency</span><input maxLength={3} className="field-control" value={store.currency} onChange={(event) => setStore({ ...store, currency: event.target.value })} /></label><label className="sm:col-span-2"><span className="field-label">Tagline</span><input className="field-control" value={store.tagline} onChange={(event) => setStore({ ...store, tagline: event.target.value })} /></label><label className="sm:col-span-2"><span className="field-label">Logo URL</span><input type="url" className="field-control" value={store.logo_url} onChange={(event) => setStore({ ...store, logo_url: event.target.value })} /></label></div>
        <div><span className="eyebrow">Contact</span><div className="mt-3 grid gap-4 sm:grid-cols-3"><label><span className="field-label">Email</span><input type="email" className="field-control" value={store.contact_email} onChange={(event) => setStore({ ...store, contact_email: event.target.value })} /></label><label><span className="field-label">Phone</span><input className="field-control" value={store.contact_phone} onChange={(event) => setStore({ ...store, contact_phone: event.target.value })} /></label><label><span className="field-label">WhatsApp number</span><input className="field-control" value={store.whatsapp_number} onChange={(event) => setStore({ ...store, whatsapp_number: event.target.value })} /></label></div></div>
        <div><span className="eyebrow">Shipping, COD & order expectations</span><div className="mt-3 grid gap-4 sm:grid-cols-2"><label><span className="field-label">Shipping fee (₹)</span><input type="number" min="0" step="0.01" className="field-control" value={store.shipping_fee} onChange={(event) => setStore({ ...store, shipping_fee: event.target.value })} /></label><label><span className="field-label">Free shipping minimum (₹)</span><input type="number" min="0" step="0.01" className="field-control" value={store.free_shipping_minimum} onChange={(event) => setStore({ ...store, free_shipping_minimum: event.target.value })} /></label><label><span className="field-label">Delivery estimate</span><input className="field-control" value={store.delivery_estimate} onChange={(event) => setStore({ ...store, delivery_estimate: event.target.value })} /></label><label><span className="field-label">Returns summary</span><input className="field-control" value={store.return_summary} onChange={(event) => setStore({ ...store, return_summary: event.target.value })} /></label></div><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-olive" checked={store.cod_enabled} onChange={(event) => setStore({ ...store, cod_enabled: event.target.checked })} />Cash on delivery is available</label></div>
        <div><span className="eyebrow">SEO defaults</span><div className="mt-3 grid gap-4 sm:grid-cols-2"><label><span className="field-label">Default SEO title</span><input maxLength={180} className="field-control" value={store.seo_title} onChange={(event) => setStore({ ...store, seo_title: event.target.value })} /></label><label><span className="field-label">Default SEO description</span><textarea maxLength={320} rows={3} className="field-control" value={store.seo_description} onChange={(event) => setStore({ ...store, seo_description: event.target.value })} /></label></div></div>
        <div className="flex justify-end border-t border-line pt-5"><button disabled={busy === "store"} className="button-primary"><Save size={14} />{busy === "store" ? "Saving…" : "Save store settings"}</button></div>
      </form>

      <form onSubmit={(event) => { event.preventDefault(); void save("footer", { description: footer.description.trim(), newsletter_enabled: footer.newsletter_enabled, social_links: Object.fromEntries(socialRows(footer.social_links).filter(([, value]) => value.trim())) }); }} className="space-y-6 border border-line bg-paper p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4"><div><span className="eyebrow">Footer</span><h2 className="mt-1 font-display text-2xl">Footer & social links</h2></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-olive" checked={publicFlags.footer} onChange={(event) => setPublicFlags((old) => ({ ...old, footer: event.target.checked }))} />Public setting</label></div>
        <label className="block"><span className="field-label">Footer description</span><textarea rows={4} className="field-control" value={footer.description} onChange={(event) => setFooter({ ...footer, description: event.target.value })} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-olive" checked={footer.newsletter_enabled} onChange={(event) => setFooter({ ...footer, newsletter_enabled: event.target.checked })} />Show newsletter signup</label>
        <div><div className="flex items-center justify-between gap-3"><div><span className="eyebrow">Social links</span><p className="mt-1 text-xs text-muted">Use HTTPS links only.</p></div><button type="button" className="button-secondary min-h-9 px-3" onClick={() => setFooter({ ...footer, social_links: { ...footer.social_links, instagram: footer.social_links.instagram || "" } })}><Plus size={13} />Add link</button></div><div className="mt-3 space-y-3">{socialRows(footer.social_links).map(([key, value]) => <div key={key} className="grid gap-2 sm:grid-cols-[160px_1fr_auto]"><input aria-label="Social network" className="field-control" value={key} onChange={(event) => { const next = { ...footer.social_links }; delete next[key]; next[event.target.value] = value; setFooter({ ...footer, social_links: next }); }} /><input aria-label={`${key} URL`} type="url" className="field-control" placeholder="https://…" value={value} onChange={(event) => updateSocial(key, event.target.value, (next) => setFooter({ ...footer, social_links: next }), footer.social_links)} /><button type="button" aria-label={`Remove ${key} link`} className="grid size-10 place-items-center text-red-700" onClick={() => { const next = { ...footer.social_links }; delete next[key]; setFooter({ ...footer, social_links: next }); }}><Trash2 size={14} /></button></div>)}</div></div>
        <div className="flex justify-end border-t border-line pt-5"><button disabled={busy === "footer"} className="button-primary"><Save size={14} />{busy === "footer" ? "Saving…" : "Save footer settings"}</button></div>
      </form>

      <form onSubmit={(event) => { event.preventDefault(); void save("navigation", { links: navigation.filter((link) => link.label.trim() && link.href.trim()).map((link) => ({ label: link.label.trim(), href: link.href.trim() })) }); }} className="space-y-6 border border-line bg-paper p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4"><div><span className="eyebrow">Navigation</span><h2 className="mt-1 font-display text-2xl">Storefront links</h2></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-olive" checked={publicFlags.navigation} onChange={(event) => setPublicFlags((old) => ({ ...old, navigation: event.target.checked }))} />Public setting</label></div>
        <p className="text-sm leading-6 text-muted">Only site-relative paths such as <code>/shop</code> are accepted. Missing links are ignored when saved.</p>
        <div className="space-y-3">{navigation.map((link, index) => <div key={`${index}-${link.label}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input aria-label="Navigation label" className="field-control" value={link.label} placeholder="Label" onChange={(event) => setNavigation(navigation.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} /><input aria-label="Navigation path" className="field-control" value={link.href} placeholder="/shop" onChange={(event) => setNavigation(navigation.map((item, i) => i === index ? { ...item, href: event.target.value } : item))} /><button type="button" aria-label="Remove navigation link" className="grid size-10 place-items-center text-red-700" onClick={() => setNavigation(navigation.filter((_, i) => i !== index))}><Trash2 size={14} /></button></div>)}</div>
        <button type="button" className="button-secondary min-h-9 px-3" onClick={() => setNavigation([...navigation, { label: "", href: "/" }])}><Plus size={13} />Add navigation link</button>
        <div className="flex justify-end border-t border-line pt-5"><button disabled={busy === "navigation"} className="button-primary"><Save size={14} />{busy === "navigation" ? "Saving…" : "Save navigation"}</button></div>
      </form>
    </div>
  );
}
