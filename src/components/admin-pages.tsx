"use client";

import { useMemo, useState, type FormEvent } from "react";
import { FileText, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { SitePage } from "@/lib/types";
import { slugify } from "@/lib/utils";

type Draft = {
  id?: string;
  title: string;
  slug: string;
  body: string;
  seo_title: string;
  seo_description: string;
  is_published: boolean;
};

type ApiError = { error?: string; field?: string };

const emptyDraft = (): Draft => ({ title: "", slug: "", body: "", seo_title: "", seo_description: "", is_published: false });

function fromPage(page: SitePage): Draft {
  return { id: page.id, title: page.title, slug: page.slug, body: page.body, seo_title: page.seo_title || "", seo_description: page.seo_description || "", is_published: page.is_published };
}

export function AdminPages({ pages: initial }: { pages: SitePage[] }) {
  const [pages, setPages] = useState(initial);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return pages.filter((page) => {
      const matchesTerm = !term || `${page.title} ${page.slug} ${page.body}`.toLowerCase().includes(term);
      const matchesStatus = status === "all" || (status === "published" ? page.is_published : !page.is_published);
      return matchesTerm && matchesStatus;
    });
  }, [pages, query, status]);

  function open(page?: SitePage) {
    setFieldError(null);
    setDraft(page ? fromPage(page) : emptyDraft());
  }

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    if (fieldError?.field === key) setFieldError(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    setFieldError(null);
    let handledFieldError = false;
    const payload = {
      id: draft.id,
      title: draft.title.trim(),
      slug: slugify(draft.slug || draft.title),
      body: draft.body,
      seo_title: draft.seo_title.trim() || null,
      seo_description: draft.seo_description.trim() || null,
      is_published: draft.is_published,
    };
    try {
      const response = await fetch("/api/admin/content", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity: "page", id: draft.id, data: payload }) });
      const body = await response.json() as ApiError;
      if (!response.ok) {
        const message = body.error || "Could not save this page.";
        if (body.field) {
          handledFieldError = true;
          setFieldError({ field: body.field, message });
        }
        throw new Error(message);
      }
      toast.success(draft.id ? "Page updated." : "Page created.");
      location.reload();
    } catch (error) {
      if (!handledFieldError) toast.error(error instanceof Error ? error.message : "Could not save this page.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(page: SitePage) {
    if (!confirm(`Delete “${page.title}”? This cannot be undone.`)) return;
    try {
      const response = await fetch("/api/admin/content", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity: "page", id: page.id }) });
      const body = await response.json() as ApiError;
      if (!response.ok) throw new Error(body.error || "Could not delete this page.");
      setPages((current) => current.filter((item) => item.id !== page.id));
      toast.success("Page deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this page.");
    }
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><span className="eyebrow">Publishing</span><h1 className="mt-2 font-display text-4xl sm:text-5xl">Content pages</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Create safe plain-text pages for the existing public slug routes. Published pages are visible to shoppers.</p></div>
        <button onClick={() => open()} className="button-primary min-h-10 px-4"><Plus size={14} />New page</button>
      </header>

      <div className="my-7 grid gap-3 sm:grid-cols-[1fr_180px]">
        <label className="relative block"><span className="sr-only">Search pages</span><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="field-control pl-9" placeholder="Search title, slug, or content" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label><span className="sr-only">Filter pages</span><select className="field-control" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Drafts</option></select></label>
      </div>

      <section className="overflow-hidden border border-line bg-paper">
        <div className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-6"><div><span className="eyebrow">Pages</span><p className="mt-1 text-xs text-muted">{filtered.length} of {pages.length} shown</p></div><FileText size={17} className="text-olive" /></div>
        {filtered.length ? <div className="divide-y divide-line">{filtered.map((page) => <article key={page.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6"><div className="min-w-0"><h2 className="truncate font-display text-2xl">{page.title}</h2><p className="mt-1 truncate text-xs text-muted">/{page.slug}</p><p className="mt-2 line-clamp-2 max-w-2xl whitespace-pre-line text-xs leading-5 text-muted">{page.body || "No body content yet."}</p></div><div className="flex shrink-0 items-center gap-2"><span className={`text-[10px] font-semibold uppercase tracking-[.13em] ${page.is_published ? "text-olive" : "text-muted"}`}>{page.is_published ? "Published" : "Draft"}</span><button title="Edit page" onClick={() => open(page)} className="grid size-9 place-items-center border border-line"><Pencil size={14} /></button><button title="Delete page" onClick={() => remove(page)} className="grid size-9 place-items-center border border-line text-red-700"><Trash2 size={14} /></button></div></article>)}</div> : <div className="grid min-h-48 place-items-center px-5 py-12 text-center"><div><FileText size={20} className="mx-auto text-muted" /><p className="mt-3 text-sm text-muted">No pages match this view.</p><button onClick={() => open()} className="button-secondary mt-4">Create a page</button></div></div>}
      </section>

      {draft && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 overflow-auto bg-ink/45 p-3 sm:p-6"><div className="mx-auto max-w-4xl bg-ivory"><header className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-7"><div><span className="eyebrow">Page editor</span><h2 className="mt-1 font-display text-2xl">{draft.id ? "Edit page" : "New page"}</h2></div><button onClick={() => setDraft(null)} aria-label="Close page editor" className="grid size-10 place-items-center"><X /></button></header><form onSubmit={save} className="space-y-6 p-4 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">Title</span><input required maxLength={180} className="field-control" value={draft.title} onChange={(event) => patch("title", event.target.value)} />{fieldError?.field === "title" && <small className="mt-1 block text-xs text-red-700">{fieldError.message}</small>}</label><label><span className="field-label">Slug</span><input required maxLength={120} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="field-control" value={draft.slug} onChange={(event) => patch("slug", event.target.value)} placeholder="shipping-policy" />{fieldError?.field === "slug" && <small className="mt-1 block text-xs text-red-700">{fieldError.message}</small>}</label></div>
        <label className="block"><span className="field-label">Page body</span><textarea required={false} maxLength={30000} rows={16} className="field-control min-h-72" value={draft.body} onChange={(event) => patch("body", event.target.value)} /><small className="mt-1 block text-[10px] text-muted">Plain text only. Line breaks are preserved on the public page; HTML and scripts are not accepted.</small>{fieldError?.field === "body" && <small className="mt-1 block text-xs text-red-700">{fieldError.message}</small>}</label>
        <div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">SEO title</span><input maxLength={180} className="field-control" value={draft.seo_title} onChange={(event) => patch("seo_title", event.target.value)} />{fieldError?.field === "seo_title" && <small className="mt-1 block text-xs text-red-700">{fieldError.message}</small>}</label><label><span className="field-label">SEO description</span><textarea maxLength={320} rows={3} className="field-control" value={draft.seo_description} onChange={(event) => patch("seo_description", event.target.value)} />{fieldError?.field === "seo_description" && <small className="mt-1 block text-xs text-red-700">{fieldError.message}</small>}</label></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-olive" checked={draft.is_published} onChange={(event) => patch("is_published", event.target.checked)} />Publish this page</label>
        <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5"><button type="button" className="button-secondary" onClick={() => setDraft(null)}>Cancel</button><button disabled={busy} className="button-primary">{busy ? "Saving…" : draft.id ? "Save page" : "Create page"}</button></div>
      </form></div></div>}
    </div>
  );
}
