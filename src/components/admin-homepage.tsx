"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Save, Settings, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { CloudinaryUpload } from "@/components/cloudinary-upload";
import type { HeroBannerSchemaStatus } from "@/lib/admin-banner-schema";
import { validateHeroBannerDraft, type HeroBannerDraft, type HeroBannerField, type HeroBannerFieldErrors } from "@/lib/admin-banner-validation";
import { heroOverlayStyle, normalizeHeroOverlaySettings } from "@/lib/hero-overlay";
import { HOMEPAGE_SECTION_TEMPLATES } from "@/lib/homepage-sections";
import type { HomepageBanner, HomepageBrand, HomepageSection } from "@/lib/types";

type FAQ = { id: string; question: string; answer: string; sort_order: number; is_published: boolean };
type Testimonial = { id: string; customer_name: string; quote: string; rating: number; sort_order: number; is_approved: boolean };
type Data = { sections: HomepageSection[]; banners: HomepageBanner[]; brands: HomepageBrand[]; faqs: FAQ[]; testimonials: Testimonial[] };
type Entity = "section" | "banner" | "brand" | "faq" | "testimonial";
type SectionTemplate = (typeof HOMEPAGE_SECTION_TEMPLATES)[number];
const input = "field-control";

class ContentSaveError extends Error {
  field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "ContentSaveError";
    this.field = field;
  }
}

async function save(entity: Entity, id: string | undefined, data: unknown) {
  const response = await fetch("/api/admin/content", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity, id, data }) });
  const result = await response.json() as { error?: string; field?: string };
  if (!response.ok) throw new ContentSaveError(result.error || "Could not save content.", result.field);
}

async function remove(entity: Entity, id: string) {
  if (!confirm("Remove this content item?")) return;
  const response = await fetch("/api/admin/content", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity, id }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not remove content.");
}

function SectionEditor({ section, onClose, onSaved }: { section: HomepageSection; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(section.title);
  const [content, setContent] = useState<Record<string, unknown>>(section.content || {});
  const [visible, setVisible] = useState(section.is_visible);
  const [busy, setBusy] = useState(false);
  const items = Array.isArray(content.items) ? content.items as { icon?: string; title?: string; text?: string }[] : [];
  const setString = (key: string, value: string) => setContent((current) => ({ ...current, [key]: value }));
  const changeItem = (index: number, key: "icon" | "title" | "text", value: string) => setContent((current) => ({ ...current, items: items.map((item, i) => i === index ? { ...item, [key]: value } : item) }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await save("section", section.id, { section_key: section.section_key, title, content, sort_order: section.sort_order, is_visible: visible });
      toast.success("Homepage section saved.");
      onSaved();
      onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save section."); }
    finally { setBusy(false); }
  }

  const strings = Object.entries(content).filter(([key, value]) => key !== "mode" && typeof value === "string");
  return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-ink/40 p-3 sm:p-6"><form onSubmit={submit} className="w-full max-w-2xl space-y-4 bg-ivory p-5 sm:p-8"><header className="flex items-center justify-between"><div><span className="eyebrow">Homepage section</span><h3 className="mt-1 font-display text-2xl">{section.section_key.replaceAll("_", " ")}</h3></div><button type="button" aria-label="Close" onClick={onClose}><X /></button></header><label><span className="field-label">Section heading</span><input className={input} value={title} onChange={(event) => setTitle(event.target.value)} /></label>{section.section_key === "featured_products" && <label><span className="field-label">Product selection</span><select className={input} value={typeof content.mode === "string" ? content.mode : "latest"} onChange={(event) => setString("mode", event.target.value)}><option value="latest">Latest published products</option><option value="featured">Featured products</option></select></label>}{strings.map(([key, value]) => <label key={key} className="block"><span className="field-label">{key.replaceAll("_", " ")}</span>{key.includes("description") || key === "message" ? <textarea rows={3} className={input} value={value as string} onChange={(event) => setString(key, event.target.value)} /> : <input className={input} value={value as string} onChange={(event) => setString(key, event.target.value)} />}</label>)}
    {Array.isArray(content.items) && <fieldset className="space-y-3 border-t border-line pt-4"><legend className="font-display text-xl">{section.section_key === "trust_points" ? "Trust points" : "Section items"}</legend>{items.map((item, index) => <div key={index} className="grid gap-2 border border-line bg-paper p-3 sm:grid-cols-3"><label><span className="field-label">Icon</span><select className={input} value={item.icon || "badge-check"} onChange={(event) => changeItem(index, "icon", event.target.value)}><option value="badge-check">Quality checked</option><option value="lock-keyhole">Secure payment</option><option value="message-circle">Support</option><option value="package-check">Carefully packed</option></select></label><label><span className="field-label">Title</span><input className={input} value={item.title || ""} onChange={(event) => changeItem(index, "title", event.target.value)} /></label><label><span className="field-label">Description</span><input className={input} value={item.text || ""} onChange={(event) => changeItem(index, "text", event.target.value)} /></label><button type="button" onClick={() => setContent((current) => ({ ...current, items: items.filter((_, i) => i !== index) }))} className="inline-flex items-center gap-1.5 text-left text-xs text-red-700"><Trash2 size={13} aria-hidden="true" />Remove point</button></div>)}<button type="button" className="button-secondary min-h-9 px-3" onClick={() => setContent((current) => ({ ...current, items: [...items, { icon: "badge-check", title: "", text: "" }] }))}><Plus size={13} />Add point</button></fieldset>}
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-olive" checked={visible} onChange={(event) => setVisible(event.target.checked)} />Show this section on the storefront</label><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="button-secondary"><X size={14} aria-hidden="true" />Cancel</button><button className="button-primary" disabled={busy}><Save size={14} aria-hidden="true" />{busy ? "Saving..." : "Save section"}</button></div></form></div>;
}

function LegacyBannerEditor({ banner, onClose, onSaved }: { banner: Partial<HomepageBanner>; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState(() => ({ id: banner.id, heading: banner.heading || "", description: banner.description || "", cta_label: banner.cta_label || "", cta_href: banner.cta_href || "/shop", desktop_image_url: banner.desktop_image_url || "", mobile_image_url: banner.mobile_image_url || "", image_alt: banner.image_alt || "", is_active: banner.is_active ?? true, sort_order: banner.sort_order ?? 0, ...normalizeHeroOverlaySettings(banner) }));
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof value, next: string | boolean | number) => setValue((current) => ({ ...current, [key]: next }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try { await save("banner", value.id, { ...value, desktop_image_url: value.desktop_image_url || null, mobile_image_url: value.mobile_image_url || null, sort_order: Number(value.sort_order) }); toast.success("Hero banner saved."); onSaved(); onClose(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save banner."); }
    finally { setBusy(false); }
  }
  return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-ink/40 p-3 sm:p-6"><form onSubmit={submit} className="w-full max-w-2xl space-y-4 bg-ivory p-5 sm:p-8"><header className="flex items-center justify-between"><div><span className="eyebrow">Storefront hero</span><h3 className="mt-1 font-display text-2xl">{value.id ? "Edit banner" : "New banner"}</h3></div><button type="button" aria-label="Close" onClick={onClose}><X /></button></header><label><span className="field-label">Heading</span><input required className={input} value={value.heading} onChange={(event) => set("heading", event.target.value)} /></label><label><span className="field-label">Description</span><textarea rows={3} className={input} value={value.description} onChange={(event) => set("description", event.target.value)} /></label><div className="grid gap-3 sm:grid-cols-2"><label><span className="field-label">Button label</span><input className={input} value={value.cta_label} onChange={(event) => set("cta_label", event.target.value)} /></label><label><span className="field-label">Button path</span><input className={input} value={value.cta_href} onChange={(event) => set("cta_href", event.target.value)} /></label></div><div className="grid gap-4 sm:grid-cols-2">{(["desktop_image_url", "mobile_image_url"] as const).map((key) => <div key={key} className="space-y-2"><label><span className="field-label">{key === "desktop_image_url" ? "Desktop" : "Mobile"} image URL</span><input className={input} value={value[key]} onChange={(event) => set(key, event.target.value)} /></label><CloudinaryUpload onUploaded={(asset) => set(key, asset.url)} />{value[key] && <div className="relative aspect-[16/7] overflow-hidden bg-sand"><Image src={value[key]} alt="" fill sizes="500px" className="object-cover" /></div>}</div>)}</div><fieldset className="space-y-4 border-t border-line pt-4"><legend className="font-display text-xl">Image overlay / shadow</legend><label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-olive" checked={value.overlay_enabled} onChange={(event) => set("overlay_enabled", event.target.checked)} />Enable image overlay</label><div className="grid gap-3 sm:grid-cols-2"><label><span className="field-label">Overlay color</span><select className={input} value={value.overlay_color} onChange={(event) => set("overlay_color", event.target.value)}><option value="dark">Black / dark</option><option value="light">White / light</option></select></label><label><span className="field-label">Overlay direction</span><select className={input} value={value.overlay_direction} onChange={(event) => set("overlay_direction", event.target.value)}><option value="full">Full image</option><option value="bottom-to-top">Bottom to top gradient</option><option value="left-to-right">Left to right gradient</option><option value="right-to-left">Right to left gradient</option></select></label></div><label className="block"><span className="field-label flex items-center justify-between"><span>Overlay opacity</span><span>{value.overlay_opacity}%</span></span><input type="range" min={0} max={80} step={1} className="mt-2 w-full accent-olive" value={value.overlay_opacity} onChange={(event) => set("overlay_opacity", Math.min(80, Math.max(0, Number(event.target.value))))} aria-label={`Overlay opacity ${value.overlay_opacity}%`} /></label><div className="space-y-2"><span className="field-label">Live preview</span><div className="relative aspect-[16/7] overflow-hidden bg-sand">{(value.desktop_image_url || value.mobile_image_url) ? <Image src={value.desktop_image_url || value.mobile_image_url} alt="" fill sizes="600px" className="object-cover" /> : <div className="absolute inset-0 bg-gradient-to-br from-sand to-paper" />}<div aria-hidden="true" className="absolute inset-0" style={heroOverlayStyle(value)} /><div className="relative z-[1] flex h-full flex-col justify-center p-5 text-ink"><span className="text-[9px] font-semibold uppercase tracking-[.18em]">ZELNO</span><strong className="mt-2 max-w-sm font-display text-2xl leading-none">{value.heading || "Hero heading"}</strong><span className="mt-3 inline-flex w-fit bg-ink px-3 py-2 text-[9px] font-semibold uppercase tracking-[.12em] text-white">{value.cta_label || "Explore"}</span></div></div><p className="text-[10px] leading-5 text-muted">This preview updates as you adjust the overlay settings.</p></div></fieldset><label><span className="field-label">Image alt text</span><input className={input} value={value.image_alt} onChange={(event) => set("image_alt", event.target.value)} /></label><label><span className="field-label">Display order</span><input type="number" className={input} value={value.sort_order} onChange={(event) => set("sort_order", Number(event.target.value))} /></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-olive" checked={value.is_active} onChange={(event) => set("is_active", event.target.checked)} />Active</label><div className="flex justify-end gap-2"><button type="button" className="button-secondary" onClick={onClose}><X size={14} aria-hidden="true" />Cancel</button><button className="button-primary" disabled={busy}><Save size={14} aria-hidden="true" />{busy ? "Saving..." : "Save banner"}</button></div></form></div>;
}

type BannerEditorValue = HeroBannerDraft & { id?: string };

function BannerEditor({ banner, onClose, onSaved }: { banner: Partial<HomepageBanner>; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState<BannerEditorValue>(() => ({
    id: banner.id,
    heading: banner.heading || "",
    description: banner.description || "",
    cta_label: banner.cta_label || "",
    cta_href: banner.cta_href || "/shop",
    desktop_image_url: banner.desktop_image_url || "",
    mobile_image_url: banner.mobile_image_url || "",
    image_alt: banner.image_alt || "",
    is_active: banner.is_active ?? true,
    sort_order: banner.sort_order ?? 0,
    ...normalizeHeroOverlaySettings(banner),
  }));
  const [errors, setErrors] = useState<HeroBannerFieldErrors>({});
  const [busy, setBusy] = useState(false);
  const fieldRefs = useRef<Partial<Record<HeroBannerField, HTMLElement | null>>>({});

  function set<K extends keyof BannerEditorValue>(key: K, next: BannerEditorValue[K]) {
    setValue((current) => ({ ...current, [key]: next }));
    setErrors((current) => current[key as HeroBannerField] ? { ...current, [key]: undefined } : current);
  }

  function focusField(field: HeroBannerField) {
    window.requestAnimationFrame(() => {
      const element = fieldRefs.current[field];
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.focus();
    });
  }

  function showErrors(next: HeroBannerFieldErrors) {
    setErrors(next);
    const first = Object.keys(next)[0] as HeroBannerField | undefined;
    if (first) focusField(first);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateHeroBannerDraft(value);
    if (Object.keys(nextErrors).length) {
      showErrors(nextErrors);
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await save("banner", value.id, { ...value, desktop_image_url: value.desktop_image_url || null, mobile_image_url: value.mobile_image_url || null, sort_order: Number(value.sort_order) });
      toast.success(value.id ? "Hero banner updated." : "Hero banner created.");
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ContentSaveError && error.field) {
        const field = error.field as HeroBannerField;
        if (field in value) {
          showErrors({ [field]: error.message });
          return;
        }
      }
      toast.error(error instanceof Error ? error.message : "Could not save hero banner.");
    } finally {
      setBusy(false);
    }
  }

  const error = (field: HeroBannerField) => errors[field] ? <small className="mt-1 block text-xs text-red-700">{errors[field]}</small> : null;
  const ref = (field: HeroBannerField) => (element: HTMLElement | null) => { fieldRefs.current[field] = element; };
  const invalid = (field: HeroBannerField) => errors[field] ? true : undefined;

  return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-ink/40 p-3 sm:p-6"><form onSubmit={submit} className="w-full max-w-2xl space-y-4 bg-ivory p-5 sm:p-8"><header className="flex items-center justify-between"><div><span className="eyebrow">Storefront hero</span><h3 className="mt-1 font-display text-2xl">{value.id ? "Edit banner" : "New banner"}</h3></div><button type="button" aria-label="Close" onClick={onClose}><X /></button></header><label><span className="field-label">Heading</span><input ref={ref("heading")} required className={input} aria-invalid={invalid("heading")} value={value.heading} onChange={(event) => set("heading", event.target.value)} />{error("heading")}</label><label><span className="field-label">Description</span><textarea ref={ref("description")} rows={3} className={input} aria-invalid={invalid("description")} value={value.description} onChange={(event) => set("description", event.target.value)} />{error("description")}</label><div className="grid gap-3 sm:grid-cols-2"><label><span className="field-label">Button label</span><input ref={ref("cta_label")} required className={input} aria-invalid={invalid("cta_label")} value={value.cta_label} onChange={(event) => set("cta_label", event.target.value)} />{error("cta_label")}</label><label><span className="field-label">Button path</span><input ref={ref("cta_href")} required className={input} aria-invalid={invalid("cta_href")} value={value.cta_href} onChange={(event) => set("cta_href", event.target.value)} />{error("cta_href")}</label></div><div className="grid gap-4 sm:grid-cols-2">{(["desktop_image_url", "mobile_image_url"] as const).map((key) => <div key={key} className="space-y-2"><label><span className="field-label">{key === "desktop_image_url" ? "Desktop" : "Mobile"} image URL</span><input ref={ref(key)} className={input} aria-invalid={invalid(key)} value={value[key]} onChange={(event) => set(key, event.target.value)} />{error(key)}</label><CloudinaryUpload onUploaded={(asset) => set(key, asset.url)} />{value[key] && <div className="relative aspect-[16/7] overflow-hidden bg-sand"><Image src={value[key]} alt="" fill sizes="500px" className="object-cover" /></div>}</div>)}</div><fieldset className="space-y-4 border-t border-line pt-4"><legend className="font-display text-xl">Image overlay / shadow</legend><label className="flex items-center gap-2 text-xs"><input ref={ref("overlay_enabled")} type="checkbox" className="accent-olive" checked={value.overlay_enabled} onChange={(event) => set("overlay_enabled", event.target.checked)} />Enable image overlay</label><div className="grid gap-3 sm:grid-cols-2"><label><span className="field-label">Overlay color</span><select ref={ref("overlay_color")} className={input} aria-invalid={invalid("overlay_color")} value={value.overlay_color} onChange={(event) => set("overlay_color", event.target.value as BannerEditorValue["overlay_color"])}><option value="dark">Black / dark</option><option value="light">White / light</option></select>{error("overlay_color")}</label><label><span className="field-label">Overlay direction</span><select ref={ref("overlay_direction")} className={input} aria-invalid={invalid("overlay_direction")} value={value.overlay_direction} onChange={(event) => set("overlay_direction", event.target.value as BannerEditorValue["overlay_direction"])}><option value="full">Full image</option><option value="bottom-to-top">Bottom to top gradient</option><option value="left-to-right">Left to right gradient</option><option value="right-to-left">Right to left gradient</option></select>{error("overlay_direction")}</label></div><label className="block"><span className="field-label flex items-center justify-between"><span>Overlay opacity</span><span>{value.overlay_opacity}%</span></span><input ref={ref("overlay_opacity")} type="range" min={0} max={80} step={1} className="mt-2 w-full accent-olive" aria-invalid={invalid("overlay_opacity")} value={value.overlay_opacity} onChange={(event) => set("overlay_opacity", Math.min(80, Math.max(0, Number(event.target.value))))} aria-label={`Overlay opacity ${value.overlay_opacity}%`} />{error("overlay_opacity")}</label><div className="space-y-2"><span className="field-label">Live preview</span><div className="relative aspect-[16/7] overflow-hidden bg-sand">{(value.desktop_image_url || value.mobile_image_url) ? <Image src={value.desktop_image_url || value.mobile_image_url} alt="" fill sizes="600px" className="object-cover" /> : <div className="absolute inset-0 bg-gradient-to-br from-sand to-paper" />}<div aria-hidden="true" className="absolute inset-0" style={heroOverlayStyle(value)} /><div className="relative z-[1] flex h-full flex-col justify-center p-5 text-ink"><span className="text-[9px] font-semibold uppercase tracking-[.18em]">ZELNO</span><strong className="mt-2 max-w-sm font-display text-2xl leading-none">{value.heading || "Hero heading"}</strong><span className="mt-3 inline-flex w-fit bg-ink px-3 py-2 text-[9px] font-semibold uppercase tracking-[.12em] text-white">{value.cta_label || "Explore"}</span></div></div><p className="text-[10px] leading-5 text-muted">This preview updates as you adjust the overlay settings.</p></div></fieldset><label><span className="field-label">Image alt text <span className="text-muted">(optional)</span></span><input ref={ref("image_alt")} className={input} aria-invalid={invalid("image_alt")} value={value.image_alt} onChange={(event) => set("image_alt", event.target.value)} />{error("image_alt")}</label><label><span className="field-label">Display order</span><input ref={ref("sort_order")} type="number" className={input} aria-invalid={invalid("sort_order")} value={value.sort_order} onChange={(event) => set("sort_order", Number(event.target.value))} />{error("sort_order")}</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-olive" checked={value.is_active} onChange={(event) => setValue((current) => ({ ...current, is_active: event.target.checked }))} />Active</label><div className="flex justify-end gap-2"><button type="button" className="button-secondary" onClick={onClose}><X size={14} aria-hidden="true" />Cancel</button><button className="button-primary" disabled={busy}><Save size={14} aria-hidden="true" />{busy ? "Saving..." : "Save banner"}</button></div></form></div>;
}

function toLocalDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function OfferBannerEditor({ banner, onClose, onSaved }: { banner: Partial<HomepageBanner>; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState({ id: banner.id, offer_badge: banner.offer_badge || "", heading: banner.heading || "", description: banner.description || "", cta_label: banner.cta_label || "", cta_href: banner.cta_href || "/shop", desktop_image_url: banner.desktop_image_url || "", mobile_image_url: banner.mobile_image_url || "", image_alt: banner.image_alt || "", alignment: banner.alignment || "left", starts_at: toLocalDateTime(banner.starts_at), ends_at: toLocalDateTime(banner.ends_at), is_active: banner.is_active ?? true, sort_order: banner.sort_order ?? 0 });
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof value, next: string | boolean | number) => setValue((current) => ({ ...current, [key]: next }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.desktop_image_url) { toast.error("Add a desktop offer image before saving."); return; }
    setBusy(true);
    try { await save("banner", value.id, { banner_type: "offer", offer_badge: value.offer_badge.trim() || null, heading: value.heading, description: value.description, cta_label: value.cta_label, cta_href: value.cta_href, desktop_image_url: value.desktop_image_url, mobile_image_url: value.mobile_image_url || null, image_alt: value.image_alt, alignment: value.alignment, starts_at: toIsoDate(value.starts_at), ends_at: toIsoDate(value.ends_at), sort_order: Number(value.sort_order), is_active: value.is_active }); toast.success("Offer banner saved."); onSaved(); onClose(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save offer banner."); }
    finally { setBusy(false); }
  }
  return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-ink/40 p-3 sm:p-6"><form onSubmit={submit} className="w-full max-w-3xl space-y-4 bg-ivory p-5 sm:p-8"><header className="flex items-center justify-between"><div><span className="eyebrow">Offer Banners</span><h3 className="mt-1 font-display text-2xl">{value.id ? "Edit offer banner" : "New offer banner"}</h3></div><button type="button" aria-label="Close" onClick={onClose}><X /></button></header><div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">Offer badge</span><input className={input} value={value.offer_badge} onChange={(event) => set("offer_badge", event.target.value)} placeholder="UP TO 40% OFF" /></label><label><span className="field-label">Text / image alignment</span><select className={input} value={value.alignment} onChange={(event) => set("alignment", event.target.value)}><option value="left">Image left, text right</option><option value="right">Image right, text left</option></select></label></div><label><span className="field-label">Offer title</span><input required className={input} value={value.heading} onChange={(event) => set("heading", event.target.value)} /></label><label><span className="field-label">Short description</span><textarea rows={3} className={input} value={value.description} onChange={(event) => set("description", event.target.value)} /></label><div className="grid gap-3 sm:grid-cols-2"><label><span className="field-label">CTA button text</span><input required className={input} value={value.cta_label} onChange={(event) => set("cta_label", event.target.value)} /></label><label><span className="field-label">CTA internal URL</span><input required className={input} value={value.cta_href} onChange={(event) => set("cta_href", event.target.value)} placeholder="/shop" /></label></div><div className="grid gap-4 sm:grid-cols-2">{(["desktop_image_url", "mobile_image_url"] as const).map((key) => <div key={key} className="space-y-2"><label><span className="field-label">{key === "desktop_image_url" ? "Desktop offer image" : "Optional mobile offer image"}</span><input required={key === "desktop_image_url"} className={input} value={value[key]} onChange={(event) => set(key, event.target.value)} /></label><CloudinaryUpload onUploaded={(asset) => set(key, asset.url)} />{value[key] && <div className="relative aspect-[16/9] overflow-hidden bg-sand"><Image src={value[key]} alt="" fill sizes="500px" className="object-contain" /></div>}</div>)}</div><label><span className="field-label">Image alt text</span><input required className={input} value={value.image_alt} onChange={(event) => set("image_alt", event.target.value)} /></label><div className="grid gap-3 sm:grid-cols-3"><label><span className="field-label">Start date (optional)</span><input type="datetime-local" className={input} value={value.starts_at} onChange={(event) => set("starts_at", event.target.value)} /></label><label><span className="field-label">End date (optional)</span><input type="datetime-local" className={input} value={value.ends_at} onChange={(event) => set("ends_at", event.target.value)} /></label><label><span className="field-label">Display order</span><input type="number" className={input} value={value.sort_order} onChange={(event) => set("sort_order", Number(event.target.value))} /></label></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-olive" checked={value.is_active} onChange={(event) => set("is_active", event.target.checked)} />Active</label><p className="text-xs leading-5 text-muted">CTA URLs must be internal site paths such as <code>/shop</code> or <code>/collections/slug</code>.</p><div className="flex justify-end gap-2"><button type="button" className="button-secondary" onClick={onClose}><X size={14} aria-hidden="true" />Cancel</button><button className="button-primary" disabled={busy}><Save size={14} aria-hidden="true" />{busy ? "Saving..." : "Save offer banner"}</button></div></form></div>;
}

function offerPayload(item: HomepageBanner, sortOrder = item.sort_order) {
  return { banner_type: "offer", offer_badge: item.offer_badge || null, heading: item.heading, description: item.description, cta_label: item.cta_label, cta_href: item.cta_href, desktop_image_url: item.desktop_image_url, mobile_image_url: item.mobile_image_url, image_alt: item.image_alt, alignment: item.alignment || "left", starts_at: item.starts_at || null, ends_at: item.ends_at || null, sort_order: sortOrder, is_active: item.is_active };
}

function OfferBannerManager({ banners }: { banners: HomepageBanner[] }) {
  const [items, setItems] = useState([...banners].sort((a, b) => a.sort_order - b.sort_order));
  const [draft, setDraft] = useState<Partial<HomepageBanner> | null>(null);
  async function move(index: number, step: number) {
    const next = [...items]; const target = index + step;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const ordered = next.map((item, order) => ({ ...item, sort_order: order })); setItems(ordered);
    try { await Promise.all(ordered.map((item) => save("banner", item.id, offerPayload(item)))); toast.success("Offer order updated."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save offer order."); }
  }
  async function deleteItem(item: HomepageBanner) { try { await remove("banner", item.id); setItems((current) => current.filter((value) => value.id !== item.id)); toast.success("Offer banner removed."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove offer banner."); } }
  return <section className="mt-5"><header className="flex flex-wrap items-end justify-between gap-3"><div><span className="eyebrow">Promotional content</span><h3 className="font-display text-2xl">Offer Banners</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-muted">Create scheduled promotional cards for the optional homepage offer section. Nothing is published until the section is added and a banner is active.</p></div><button onClick={() => setDraft({ banner_type: "offer", alignment: "left", is_active: true, sort_order: items.length })} className="button-primary min-h-10 px-4"><Plus size={14} />Add offer banner</button></header>{draft && <OfferBannerEditor banner={draft} onClose={() => setDraft(null)} onSaved={() => location.reload()} />}<div className="mt-5 space-y-4">{items.map((item, index) => <article key={item.id} className="grid gap-4 border border-line bg-paper p-4 sm:grid-cols-[180px_1fr_auto]"><div className="relative aspect-[16/9] overflow-hidden bg-sand">{item.desktop_image_url && <Image src={item.desktop_image_url} alt={item.image_alt} fill sizes="180px" className="object-contain" />}</div><div><div className="flex flex-wrap gap-2"><span className="eyebrow">{item.is_active ? "Active" : "Inactive"}</span>{item.offer_badge && <span className="text-[10px] uppercase tracking-[.12em] text-olive">{item.offer_badge}</span>}</div><h4 className="mt-1 font-display text-2xl">{item.heading}</h4><p className="mt-2 line-clamp-2 text-xs text-muted">{item.description}</p><p className="mt-2 text-[10px] text-muted">Image {item.alignment === "right" ? "right" : "left"} Â· Order {item.sort_order}{item.starts_at || item.ends_at ? " Â· Scheduled" : ""}</p></div><div className="flex flex-wrap gap-2 sm:flex-col"><div className="flex gap-1"><button title="Move up" aria-label="Move offer up" disabled={index === 0} onClick={() => move(index, -1)} className="grid size-9 place-items-center disabled:opacity-30"><ArrowUp size={14} /></button><button title="Move down" aria-label="Move offer down" disabled={index === items.length - 1} onClick={() => move(index, 1)} className="grid size-9 place-items-center disabled:opacity-30"><ArrowDown size={14} /></button></div><button onClick={() => setDraft(item)} className="button-secondary min-h-9 px-3"><Pencil size={13} />Edit</button><button onClick={() => deleteItem(item)} className="button-secondary min-h-9 px-3 text-red-700"><Trash2 size={13} />Delete</button></div></article>)}{!items.length && <p className="border-y border-line py-8 text-sm text-muted">No offer banners yet. Add one when you have real promotional content to publish.</p>}</div></section>;
}

function BrandEditor({ brand, onClose, onSaved }: { brand: Partial<HomepageBrand>; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState({ id: brand.id, name: brand.name || "", logo_url: brand.logo_url || "", destination_url: brand.destination_url || "", alt_text: brand.alt_text || "", is_active: brand.is_active ?? true, sort_order: brand.sort_order ?? 0 });
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof value, next: string | boolean | number) => setValue((current) => ({ ...current, [key]: next }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.logo_url) { toast.error("Upload a brand logo before saving."); return; }
    setBusy(true);
    try { await save("brand", value.id, { name: value.name, logo_url: value.logo_url, destination_url: value.destination_url.trim() || null, alt_text: value.alt_text, sort_order: Number(value.sort_order), is_active: value.is_active }); toast.success("Brand saved."); onSaved(); onClose(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save brand."); }
    finally { setBusy(false); }
  }
  return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-ink/40 p-3 sm:p-6"><form onSubmit={submit} className="w-full max-w-2xl space-y-4 bg-ivory p-5 sm:p-8"><header className="flex items-center justify-between"><div><span className="eyebrow">Brand Logo Marquee</span><h3 className="mt-1 font-display text-2xl">{value.id ? "Edit brand" : "New brand"}</h3></div><button type="button" aria-label="Close" onClick={onClose}><X /></button></header><label><span className="field-label">Brand name</span><input required className={input} value={value.name} onChange={(event) => set("name", event.target.value)} /></label><div className="space-y-2"><label><span className="field-label">Logo image URL</span><input required className={input} value={value.logo_url} onChange={(event) => set("logo_url", event.target.value)} placeholder="Upload with Cloudinary or paste a safe image URL" /></label><CloudinaryUpload onUploaded={(asset) => set("logo_url", asset.url)} />{value.logo_url && <div className="relative h-24 overflow-hidden bg-white"><Image src={value.logo_url} alt="" fill sizes="500px" className="object-contain p-5" /></div>}</div><div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">Destination URL (optional)</span><input className={input} value={value.destination_url} onChange={(event) => set("destination_url", event.target.value)} placeholder="/shop or https://example.com" /></label><label><span className="field-label">Alt text</span><input required className={input} value={value.alt_text} onChange={(event) => set("alt_text", event.target.value)} placeholder="Brand name logo" /></label></div><div className="grid gap-3 sm:grid-cols-2"><label><span className="field-label">Display order</span><input type="number" className={input} value={value.sort_order} onChange={(event) => set("sort_order", Number(event.target.value))} /></label><label className="flex items-end gap-2 pb-3 text-xs"><input type="checkbox" className="accent-olive" checked={value.is_active} onChange={(event) => set("is_active", event.target.checked)} />Active on the storefront</label></div><p className="text-xs leading-5 text-muted">Use a site path such as <code>/shop</code>, or an HTTPS URL if the logo should leave the storefront.</p><div className="flex justify-end gap-2"><button type="button" className="button-secondary" onClick={onClose}><X size={14} aria-hidden="true" />Cancel</button><button className="button-primary" disabled={busy}><Save size={14} aria-hidden="true" />{busy ? "Saving..." : "Save brand"}</button></div></form></div>;
}

function brandPayload(item: HomepageBrand, sortOrder = item.sort_order) {
  return { name: item.name, logo_url: item.logo_url, destination_url: item.destination_url || null, alt_text: item.alt_text, sort_order: sortOrder, is_active: item.is_active };
}

function BrandManager({ brands }: { brands: HomepageBrand[] }) {
  const [items, setItems] = useState([...brands].sort((a, b) => a.sort_order - b.sort_order));
  const [draft, setDraft] = useState<Partial<HomepageBrand> | null>(null);
  async function move(index: number, step: number) {
    const next = [...items]; const target = index + step;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const ordered = next.map((item, order) => ({ ...item, sort_order: order })); setItems(ordered);
    try { await Promise.all(ordered.map((item) => save("brand", item.id, brandPayload(item)))); toast.success("Brand order updated."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save brand order."); }
  }
  async function deleteItem(item: HomepageBrand) { try { await remove("brand", item.id); setItems((current) => current.filter((value) => value.id !== item.id)); toast.success("Brand removed."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove brand."); } }
  return <section className="mt-5"><header className="flex flex-wrap items-end justify-between gap-3"><div><span className="eyebrow">Curated partners</span><h3 className="font-display text-2xl">Brand logos</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-muted">Add real brand logos for the optional homepage marquee. Nothing is published until a brand is active and the section is visible.</p></div><button onClick={() => setDraft({ is_active: true, sort_order: items.length })} className="button-primary min-h-10 px-4"><Plus size={14} />Add brand</button></header>{draft && <BrandEditor brand={draft} onClose={() => setDraft(null)} onSaved={() => location.reload()} />}<div className="mt-5 space-y-4">{items.map((item, index) => <article key={item.id} className="grid gap-4 border border-line bg-paper p-4 sm:grid-cols-[180px_1fr_auto]"><div className="relative h-24 overflow-hidden bg-white"><Image src={item.logo_url} alt={item.alt_text} fill sizes="180px" className="object-contain p-5" /></div><div><div className="flex flex-wrap gap-2"><span className="eyebrow">{item.is_active ? "Active" : "Inactive"}</span>{item.destination_url && <span className="text-[10px] uppercase tracking-[.12em] text-olive">Linked</span>}</div><h4 className="mt-1 font-display text-2xl">{item.name}</h4><p className="mt-2 text-xs text-muted">Order {item.sort_order} Â· {item.alt_text}</p></div><div className="flex flex-wrap gap-2 sm:flex-col"><div className="flex gap-1"><button title="Move up" aria-label="Move brand up" disabled={index === 0} onClick={() => move(index, -1)} className="grid size-9 place-items-center disabled:opacity-30"><ArrowUp size={14} /></button><button title="Move down" aria-label="Move brand down" disabled={index === items.length - 1} onClick={() => move(index, 1)} className="grid size-9 place-items-center disabled:opacity-30"><ArrowDown size={14} /></button></div><button onClick={() => setDraft(item)} className="button-secondary min-h-9 px-3"><Pencil size={13} />Edit</button><button onClick={() => deleteItem(item)} className="button-secondary min-h-9 px-3 text-red-700"><Trash2 size={13} />Delete</button></div></article>)}{!items.length && <p className="border-y border-line py-8 text-sm text-muted">No brand logos yet. Add real brand content when it is ready to publish.</p>}</div></section>;
}

function FAQManager({ faqs }: { faqs: FAQ[] }) {
  const [items, setItems] = useState(faqs);
  const [draft, setDraft] = useState<Partial<FAQ> | null>(null);
  const [busy, setBusy] = useState(false);
  const edit = (item?: FAQ) => setDraft(item ? { ...item } : { question: "", answer: "", sort_order: items.length, is_published: true });
  async function submit(event: FormEvent) { event.preventDefault(); if (!draft) return; setBusy(true); try { await save("faq", draft.id, { question: draft.question, answer: draft.answer, sort_order: draft.sort_order ?? 0, is_published: draft.is_published ?? true }); toast.success("FAQ saved."); location.reload(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save FAQ."); } finally { setBusy(false); } }
  async function del(item: FAQ) { try { await remove("faq", item.id); setItems((current) => current.filter((value) => value.id !== item.id)); toast.success("FAQ removed."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove FAQ."); } }
  return <section><header className="flex items-end justify-between"><div><h3 className="font-display text-2xl">Frequently asked questions</h3><p className="mt-1 text-xs text-muted">Published answers may appear in the homepage preview.</p></div><button onClick={() => edit()} className="button-secondary min-h-9 px-3"><Plus size={13} />Add FAQ</button></header><div className="mt-4 divide-y divide-line border-y border-line">{items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="text-sm">{item.question} <small className="ml-2 text-muted">{item.is_published ? "Published" : "Hidden"}</small></span><span className="flex gap-2"><button onClick={() => edit(item)} className="text-xs underline">Edit</button><button onClick={() => del(item)} className="text-xs text-red-700 underline">Delete</button></span></div>)}</div>{draft && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"><form onSubmit={submit} className="w-full max-w-xl space-y-4 bg-ivory p-6"><h3 className="font-display text-2xl">{draft.id ? "Edit FAQ" : "New FAQ"}</h3><label><span className="field-label">Question</span><input className={input} required value={draft.question || ""} onChange={(event) => setDraft({ ...draft, question: event.target.value })} /></label><label><span className="field-label">Answer</span><textarea rows={5} className={input} required value={draft.answer || ""} onChange={(event) => setDraft({ ...draft, answer: event.target.value })} /></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-olive" checked={draft.is_published ?? true} onChange={(event) => setDraft({ ...draft, is_published: event.target.checked })} />Published</label><div className="flex justify-end gap-2"><button type="button" className="button-secondary" onClick={() => setDraft(null)}>Cancel</button><button disabled={busy} className="button-primary"><Save size={14} aria-hidden="true" />Save FAQ</button></div></form></div>}</section>;
}

function TestimonialManager({ testimonials }: { testimonials: Testimonial[] }) {
  const [items, setItems] = useState(testimonials);
  const [draft, setDraft] = useState<Partial<Testimonial> | null>(null);
  const edit = (item?: Testimonial) => setDraft(item ? { ...item } : { customer_name: "", quote: "", rating: 5, sort_order: items.length, is_approved: true });
  async function submit(event: FormEvent) { event.preventDefault(); if (!draft) return; try { await save("testimonial", draft.id, { customer_name: draft.customer_name, quote: draft.quote, rating: draft.rating ?? 5, sort_order: draft.sort_order ?? 0, is_approved: draft.is_approved ?? true }); toast.success("Testimonial saved."); location.reload(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save testimonial."); } }
  async function del(item: Testimonial) { try { await remove("testimonial", item.id); setItems((current) => current.filter((value) => value.id !== item.id)); toast.success("Testimonial removed."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove testimonial."); } }
  return <section><header className="flex items-end justify-between"><div><h3 className="font-display text-2xl">Customer notes</h3><p className="mt-1 text-xs text-muted">Approved notes may appear on the homepage.</p></div><button onClick={() => edit()} className="button-secondary min-h-9 px-3"><Plus size={13} />Add testimonial</button></header><div className="mt-4 divide-y divide-line border-y border-line">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><p className="max-w-xl line-clamp-1 text-sm">&quot;{item.quote}&quot; <small className="text-muted">- {item.customer_name} Â· {item.is_approved ? "Approved" : "Hidden"}</small></p><span className="flex gap-2"><button onClick={() => edit(item)} className="text-xs underline">Edit</button><button onClick={() => del(item)} className="text-xs text-red-700 underline">Delete</button></span></div>)}</div>{draft && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"><form onSubmit={submit} className="w-full max-w-xl space-y-4 bg-ivory p-6"><h3 className="font-display text-2xl">{draft.id ? "Edit testimonial" : "New testimonial"}</h3><label><span className="field-label">Customer name</span><input required className={input} value={draft.customer_name || ""} onChange={(event) => setDraft({ ...draft, customer_name: event.target.value })} /></label><label><span className="field-label">Quote</span><textarea rows={4} required className={input} value={draft.quote || ""} onChange={(event) => setDraft({ ...draft, quote: event.target.value })} /></label><label><span className="field-label">Rating</span><select className={input} value={draft.rating || 5} onChange={(event) => setDraft({ ...draft, rating: Number(event.target.value) })}>{[5, 4, 3, 2, 1].map((number) => <option key={number} value={number}>{number} stars</option>)}</select></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-olive" checked={draft.is_approved ?? true} onChange={(event) => setDraft({ ...draft, is_approved: event.target.checked })} />Approved for display</label><div className="flex justify-end gap-2"><button type="button" className="button-secondary" onClick={() => setDraft(null)}>Cancel</button><button className="button-primary"><Save size={14} aria-hidden="true" />Save testimonial</button></div></form></div>}</section>;
}

function SectionPicker({ sections, onClose, onCreated }: { sections: HomepageSection[]; onClose: () => void; onCreated: () => void }) {
  const [busy, setBusy] = useState(false);
  const existing = new Set(sections.map((section) => section.section_key));
  async function create(template: SectionTemplate) {
    setBusy(true);
    try { await save("section", undefined, { section_key: template.section_key, title: template.title, content: JSON.parse(JSON.stringify(template.content)), sort_order: sections.length, is_visible: true }); toast.success("Homepage section added."); onCreated(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not add section."); }
    finally { setBusy(false); }
  }
  return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"><div className="w-full max-w-2xl space-y-5 bg-ivory p-5 sm:p-8"><header className="flex items-center justify-between"><div><span className="eyebrow">Homepage sections</span><h3 className="mt-1 font-display text-2xl">Add a section</h3><p className="mt-2 text-sm text-muted">Choose a section type. Each supported section type is configured once.</p></div><button type="button" aria-label="Close" onClick={onClose}><X /></button></header><div className="grid gap-3 sm:grid-cols-2">{HOMEPAGE_SECTION_TEMPLATES.map((template) => { const alreadyAdded = existing.has(template.section_key); return <button key={template.section_key} type="button" disabled={busy || alreadyAdded} onClick={() => create(template)} className="border border-line bg-paper p-4 text-left transition hover:border-olive disabled:cursor-not-allowed disabled:opacity-50"><span className="eyebrow">{alreadyAdded ? "Already added" : "Available"}</span><span className="mt-2 block font-display text-xl">{template.label}</span><span className="mt-1 block text-xs text-muted">{template.title}</span></button>; })}</div><div className="flex justify-end"><button type="button" className="button-secondary" onClick={onClose}><X size={14} aria-hidden="true" />Cancel</button></div></div></div>;
}

export function AdminHomepage({ data, heroBannerSchema }: { data: Data; heroBannerSchema?: HeroBannerSchemaStatus }) {
  const [tab, setTab] = useState<"sections" | "banners" | "offers" | "brands" | "faq" | "testimonials">("sections");
  const [sections, setSections] = useState([...data.sections].sort((a, b) => a.sort_order - b.sort_order));
  const [banner, setBanner] = useState<Partial<HomepageBanner> | null>(null);
  const [section, setSection] = useState<HomepageSection | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const tabs = [["sections", "Homepage sections"], ["banners", "Hero banners"], ["offers", "Offer Banners"], ["brands", "Brands"], ["faq", "FAQs"], ["testimonials", "Testimonials"]] as const;

  async function initialize() {
    setInitializing(true);
    try {
      const response = await fetch("/api/admin/content", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity: "homepage_defaults", data: {} }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not initialize homepage defaults.");
      toast.success(result.created ? `Homepage initialized with ${result.created} sections.` : "Homepage defaults are already initialized.");
      location.reload();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not initialize homepage defaults."); }
    finally { setInitializing(false); }
  }

  async function move(index: number, step: number) {
    const next = [...sections]; const target = index + step;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const ordered = next.map((item, order) => ({ ...item, sort_order: order })); setSections(ordered);
    try { await Promise.all(ordered.map((item) => save("section", item.id, { section_key: item.section_key, title: item.title, content: item.content, sort_order: item.sort_order, is_visible: item.is_visible }))); toast.success("Homepage order updated."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save section order."); }
  }

  async function toggle(item: HomepageSection) {
    try { await save("section", item.id, { section_key: item.section_key, title: item.title, content: item.content, sort_order: item.sort_order, is_visible: !item.is_visible }); setSections((current) => current.map((value) => value.id === item.id ? { ...value, is_visible: !value.is_visible } : value)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not update visibility."); }
  }

  async function deleteBanner(item: HomepageBanner) { try { await remove("banner", item.id); toast.success("Banner removed."); location.reload(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove banner."); } }
  async function deleteSection(item: HomepageSection) { try { await remove("section", item.id); setSections((current) => current.filter((value) => value.id !== item.id)); toast.success("Section removed."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove section."); } }

  return <div>{showPicker && <SectionPicker sections={sections} onClose={() => setShowPicker(false)} onCreated={() => location.reload()} />}<header><span className="eyebrow">Storefront story</span><h2 className="mt-2 font-display text-3xl">Homepage content</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Everything here appears from editable store data. Changes are shown on the storefront after saving.</p></header><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setShowPicker(true)} className="button-primary min-h-10 px-4"><Plus size={14} />Add section</button><button onClick={initialize} disabled={initializing} className="button-secondary min-h-10 px-4"><Settings size={14} aria-hidden="true" />{initializing ? "Initializing..." : "Initialize homepage defaults"}</button></div><div className="mt-6 flex gap-1 overflow-auto border-b border-line">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`shrink-0 px-4 py-3 text-[10px] font-semibold uppercase tracking-[.13em] ${tab === key ? "border-b-2 border-olive text-ink" : "text-muted"}`}>{label}</button>)}</div>
    {tab === "sections" && <section className="mt-5 space-y-3">{section && <SectionEditor key={section.id} section={section} onClose={() => setSection(null)} onSaved={() => location.reload()} />}{sections.map((item, index) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 border border-line bg-paper p-4"><div className="flex min-w-0 items-center gap-3"><span className="grid size-8 shrink-0 place-items-center border border-line text-xs text-muted">{index + 1}</span><div><h3 className="font-medium">{item.title || item.section_key.replaceAll("_", " ")}</h3><p className="text-[10px] uppercase tracking-[.12em] text-muted">{item.section_key} Â· {item.is_visible ? "Visible" : "Hidden"}</p></div></div><div className="flex gap-1"><button title="Move up" aria-label="Move section up" disabled={index === 0} onClick={() => move(index, -1)} className="grid size-9 place-items-center"><ArrowUp size={14} /></button><button title="Move down" aria-label="Move section down" disabled={index === sections.length - 1} onClick={() => move(index, 1)} className="grid size-9 place-items-center"><ArrowDown size={14} /></button><button title={item.is_visible ? "Hide" : "Show"} onClick={() => toggle(item)} className="grid size-9 place-items-center">{item.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}</button><button onClick={() => setSection(item)} className="grid size-9 place-items-center"><Pencil size={14} /></button><button onClick={() => deleteSection(item)} className="grid size-9 place-items-center text-red-700"><Trash2 size={14} /></button></div></article>)}{!sections.length && <p className="border-y border-line py-8 text-sm text-muted">Add a section or initialize the homepage defaults to begin.</p>}</section>}
    {tab === "banners" && <section className="mt-5"><header className="flex justify-end"><button onClick={() => setBanner({})} className="button-primary min-h-10 px-4"><Plus size={14} />Add hero banner</button></header>{heroBannerSchema && !heroBannerSchema.ready && <div role="alert" className="mt-4 border border-amber-700/30 bg-amber-50 px-4 py-3 text-sm text-amber-950">{heroBannerSchema.message}</div>}{banner && <BannerEditor banner={banner} onClose={() => setBanner(null)} onSaved={() => location.reload()} />}<div className="mt-4 space-y-4">{data.banners.filter((item) => item.banner_type !== "offer").map((item) => <article key={item.id} className="grid gap-4 border border-line bg-paper p-4 sm:grid-cols-[180px_1fr_auto]"><div className="relative aspect-[16/9] bg-sand">{item.desktop_image_url && <Image src={item.desktop_image_url} alt={item.image_alt} fill sizes="180px" className="object-cover" />}</div><div><span className="eyebrow">{item.is_active ? "Active" : "Hidden"}</span><h3 className="mt-1 font-display text-2xl">{item.heading}</h3><p className="mt-2 line-clamp-2 text-xs text-muted">{item.description}</p><p className="mt-2 text-[10px] text-muted">{item.cta_label} â†’ {item.cta_href}</p></div><div className="flex gap-2 sm:flex-col"><button onClick={() => setBanner(item)} className="button-secondary min-h-9 px-3"><Pencil size={13} />Edit</button><button onClick={() => deleteBanner(item)} className="button-secondary min-h-9 px-3 text-red-700"><Trash2 size={13} />Delete</button></div></article>)}{!data.banners.filter((item) => item.banner_type !== "offer").length && <p className="border-y border-line py-8 text-sm text-muted">Add a hero banner to introduce your collection.</p>}</div></section>}
    {tab === "offers" && <OfferBannerManager banners={data.banners.filter((item) => item.banner_type === "offer")} />}
    {tab === "brands" && <BrandManager brands={data.brands} />}
    {tab === "faq" && <div className="mt-6"><FAQManager faqs={data.faqs} /></div>}{tab === "testimonials" && <div className="mt-6"><TestimonialManager testimonials={data.testimonials} /></div>}
  </div>;
}


