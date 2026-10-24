"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageCircle, Save, Settings } from "lucide-react";
import { toast } from "sonner";
import { resolveWhatsAppAdminSettings, type WhatsAppAdminSettings } from "@/lib/whatsapp-admin-settings";

export function AdminWhatsAppOrders({ initial, isPublic }: { initial: WhatsAppAdminSettings | null; isPublic: boolean }) {
  const router = useRouter();
  const [settings, setSettings] = useState(() => initial ? resolveWhatsAppAdminSettings(initial) : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/whatsapp-orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not save the WhatsApp settings.");
      toast.success("WhatsApp settings saved.");
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not save the WhatsApp settings.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  if (!settings) return <div className="space-y-6"><header><span className="eyebrow">Dedicated channel</span><h1 className="mt-2 font-display text-4xl sm:text-5xl">WhatsApp Settings</h1></header><section className="border border-line bg-paper p-6 sm:p-8" role="status"><h2 className="font-display text-2xl">No store configuration found</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Create the base store configuration before enabling WhatsApp ordering. Your existing order data will remain unchanged.</p><Link href="/admin/settings" className="button-primary mt-6"><Settings size={15} aria-hidden="true" />Open Store settings</Link></section></div>;

  return <div className="space-y-8">
    <header className="flex flex-wrap items-start justify-between gap-5"><div><span className="eyebrow">Dedicated channel</span><h1 className="mt-2 font-display text-4xl sm:text-5xl">WhatsApp Settings</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Manage the free click-to-chat ordering channel. Customers are redirected to WhatsApp and must press Send manually.</p></div><div className="flex items-center gap-2 border border-olive/30 bg-[#eef0e7] px-3 py-2 text-[10px] font-semibold uppercase tracking-[.12em] text-olive"><MessageCircle size={15} aria-hidden />No API or token required</div></header>
    <form onSubmit={save} className="space-y-6 border border-olive/30 bg-[#eef0e7] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-olive/20 pb-5"><label className="flex items-center gap-3 text-sm"><input type="checkbox" className="accent-olive" checked={settings.whatsapp_enabled} onChange={(event) => setSettings({ ...settings, whatsapp_enabled: event.target.checked })} /><span><strong className="block">Enable WhatsApp ordering</strong><small className="text-xs text-muted">Buttons disappear from the storefront when this is off.</small></span></label><span className={`text-[10px] font-semibold uppercase tracking-[.14em] ${isPublic ? "text-olive" : "text-muted"}`}>{isPublic ? "Public setting" : "Private setting"}</span></div>
      <div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">WhatsApp business number</span><input required={settings.whatsapp_enabled || settings.whatsapp_support_enabled} inputMode="tel" placeholder="+91 98765 43210" className="field-control" value={settings.whatsapp_number} onChange={(event) => setSettings({ ...settings, whatsapp_number: event.target.value })} aria-describedby="whatsapp-number-help" /><small id="whatsapp-number-help" className="mt-1 block text-xs text-muted">Include country code. It is stored as digits only, for example 919876543210.</small></label><label className="flex items-center gap-3 border border-line bg-paper px-4"><input type="checkbox" className="accent-olive" checked={settings.whatsapp_product_enabled} onChange={(event) => setSettings({ ...settings, whatsapp_product_enabled: event.target.checked })} /><span><strong className="block text-sm">Product detail button</strong><small className="text-xs text-muted">Show Buy via WhatsApp on product pages.</small></span></label><label className="flex items-center gap-3 border border-line bg-paper px-4"><input type="checkbox" className="accent-olive" checked={settings.whatsapp_cart_enabled} onChange={(event) => setSettings({ ...settings, whatsapp_cart_enabled: event.target.checked })} /><span><strong className="block text-sm">Cart button</strong><small className="text-xs text-muted">Show Order via WhatsApp on the cart.</small></span></label><label className="flex items-center gap-3 border border-line bg-paper px-4"><input type="checkbox" className="accent-olive" checked={settings.whatsapp_checkout_enabled} onChange={(event) => setSettings({ ...settings, whatsapp_checkout_enabled: event.target.checked })} /><span><strong className="block text-sm">Checkout button</strong><small className="text-xs text-muted">Show the additional action on standard checkout.</small></span></label></div>
      <section className="space-y-4 border-t border-olive/20 pt-5" aria-labelledby="floating-support-heading"><div><span className="eyebrow">Storefront support</span><h2 id="floating-support-heading" className="mt-2 font-display text-2xl">Floating WhatsApp Support</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Give visitors a direct way to ask for help without creating an order request.</p></div><label className="flex items-start gap-3 border border-line bg-paper px-4 py-4"><input type="checkbox" className="mt-1 accent-olive" checked={settings.whatsapp_support_enabled} onChange={(event) => setSettings({ ...settings, whatsapp_support_enabled: event.target.checked })} /><span><strong className="block text-sm">Enable floating WhatsApp support button</strong><small className="text-xs text-muted">Shows a WhatsApp chat button at the bottom-right of all public store pages.</small></span></label><label className="block"><span className="field-label">Default support message</span><input required={settings.whatsapp_support_enabled} maxLength={240} className="field-control" value={settings.whatsapp_support_message} onChange={(event) => setSettings({ ...settings, whatsapp_support_message: event.target.value })} /><small className="mt-1 block text-xs text-muted">Used when a visitor clicks the floating support button.</small></label></section>
      <div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">Product button label</span><input maxLength={80} className="field-control" value={settings.whatsapp_product_button_label} onChange={(event) => setSettings({ ...settings, whatsapp_product_button_label: event.target.value })} /></label><label><span className="field-label">Cart / checkout button label</span><input maxLength={80} className="field-control" value={settings.whatsapp_order_button_label} onChange={(event) => setSettings({ ...settings, whatsapp_order_button_label: event.target.value })} /></label><label className="sm:col-span-2"><span className="field-label">Short message introduction</span><textarea maxLength={240} rows={3} className="field-control" value={settings.whatsapp_message_intro} onChange={(event) => setSettings({ ...settings, whatsapp_message_intro: event.target.value })} /><small className="mt-1 block text-xs text-muted">Plain text only. HTML is never rendered.</small></label></div>
      {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</p>}
      <p className="border-t border-olive/20 pt-4 text-xs leading-6 text-muted">The order request is saved first. Stock is reduced only after an admin confirms the WhatsApp order.</p>
      <div className="flex justify-end border-t border-olive/20 pt-5"><button disabled={busy} className="button-primary"><Save size={14} />{busy ? "Savingâ€¦" : "Save WhatsApp settings"}</button></div>
    </form>
  </div>;
}


