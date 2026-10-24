"use client";

import Image from "next/image";
import { useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { CloudinaryUpload } from "@/components/cloudinary-upload";
import type { Category } from "@/lib/types";
import { slugify } from "@/lib/utils";

type Draft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  image_public_id: string;
  sort_order: number;
  is_active: boolean;
  featured_on_homepage: boolean;
};

const blank = (): Draft => ({
  name: "",
  slug: "",
  description: "",
  image_url: "",
  image_public_id: "",
  sort_order: 0,
  is_active: true,
  featured_on_homepage: false,
});

export function AdminCategories({ categories: initial }: { categories: Category[] }) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  function edit(item?: Category) {
    setDraft(item ? {
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      image_url: item.image_url || "",
      image_public_id: item.image_public_id || "",
      sort_order: item.sort_order,
      is_active: item.is_active,
      featured_on_homepage: item.featured_on_homepage,
    } : blank());
  }

  function changeImageUrl(image_url: string) {
    setDraft((current) => current ? {
      ...current,
      image_url,
      image_public_id: image_url === current.image_url ? current.image_public_id : "",
    } : current);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...draft,
          slug: slugify(draft.slug || draft.name),
          image_url: draft.image_url || null,
          image_public_id: draft.image_public_id || null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not save category.");
      toast.success("Category saved.");
      location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save category.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Category) {
    if (!confirm(`Delete â€œ${item.name}â€? Products will remain without a collection.`)) return;
    try {
      const response = await fetch("/api/admin/categories", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not delete category.");
      setItems((old) => old.filter((value) => value.id !== item.id));
      toast.success("Category removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove category.");
    }
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><span className="eyebrow">Collections</span><h2 className="mt-2 font-display text-3xl">Categories ({items.length})</h2></div>
        <button onClick={() => edit()} className="button-primary min-h-10 px-4"><Plus size={14} />Add category</button>
      </header>

      {draft && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-ink/40 p-4">
        <form onSubmit={save} className="w-full max-w-xl space-y-4 bg-ivory p-5 sm:p-8">
          <header className="flex items-center justify-between"><div><span className="eyebrow">Collection editor</span><h3 className="mt-1 font-display text-2xl">{draft.id ? "Edit category" : "New category"}</h3></div><button type="button" aria-label="Close" onClick={() => setDraft(null)}><X /></button></header>
          <label className="block"><span className="field-label">Name</span><input required className="field-control" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label className="block"><span className="field-label">Slug</span><input className="field-control" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} /></label>
          <label className="block"><span className="field-label">Description</span><textarea rows={3} className="field-control" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <div className="space-y-2">
            <label className="block"><span className="field-label">Collection image URL</span><input className="field-control" value={draft.image_url} onChange={(event) => changeImageUrl(event.target.value)} /></label>
            <div className="flex flex-wrap items-center gap-3">
              <CloudinaryUpload onUploaded={(asset) => setDraft((current) => current ? { ...current, image_url: asset.url, image_public_id: asset.publicId } : current)} />
              {draft.image_url && <button type="button" className="button-secondary min-h-9 px-3 text-red-700" onClick={() => setDraft((current) => current ? { ...current, image_url: "", image_public_id: "" } : current)}><Trash2 size={13} />Remove image</button>}
            </div>
            {draft.image_url && <div className="relative aspect-[3/1] overflow-hidden bg-sand"><Image src={draft.image_url} alt={draft.name} fill sizes="600px" className="object-cover" /></div>}
          </div>
          <label className="block"><span className="field-label">Sort order</span><input type="number" className="field-control" value={draft.sort_order} onChange={(event) => setDraft({ ...draft, sort_order: Number(event.target.value) })} /></label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-olive" checked={draft.is_active} onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })} />Active</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-olive" checked={draft.featured_on_homepage} onChange={(event) => setDraft({ ...draft, featured_on_homepage: event.target.checked })} />Featured on homepage</label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setDraft(null)} className="button-secondary"><X size={14} aria-hidden="true" />Cancel</button><button disabled={busy} className="button-primary"><Save size={14} aria-hidden="true" />{busy ? "Savingâ€¦" : "Save category"}</button></div>
        </form>
      </div>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <article key={item.id} className="border border-line bg-paper"><div className="relative aspect-[1.7] bg-sand">{item.image_url && <Image src={item.image_url} alt={item.name} fill sizes="(max-width:640px)100vw,33vw" className="object-cover" />}</div><div className="p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-display text-2xl">{item.name}</h3><span className="text-[9px] uppercase tracking-[.12em] text-muted">{item.is_active ? "Active" : "Hidden"}</span></div><p className="mt-2 line-clamp-2 text-xs leading-6 text-muted">{item.description}</p><div className="mt-4 flex gap-2"><button onClick={() => edit(item)} className="button-secondary min-h-9 px-3"><Pencil size={13} />Edit</button><button onClick={() => remove(item)} className="button-secondary min-h-9 px-3 text-red-700"><Trash2 size={13} />Delete</button></div></div></article>)}</div>
    </div>
  );
}


