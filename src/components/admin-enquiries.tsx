"use client";

import { useMemo, useState } from "react";
import { Check, Mail, Search, X } from "lucide-react";
import { toast } from "sonner";

type EnquiryStatus = "new" | "read" | "replied";
type Enquiry = { id: string; name: string; email: string; phone: string; subject: string; message: string; status: EnquiryStatus; created_at: string; updated_at?: string };
const statuses: Array<"all" | EnquiryStatus> = ["all", "new", "read", "replied"];

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function AdminEnquiries({ enquiries: initial }: { enquiries: Enquiry[] }) {
  const [enquiries, setEnquiries] = useState(initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | EnquiryStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const selected = enquiries.find((enquiry) => enquiry.id === selectedId) || null;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return enquiries.filter((enquiry) => {
      const matchesTerm = !term || `${enquiry.name} ${enquiry.email} ${enquiry.phone} ${enquiry.subject} ${enquiry.message}`.toLowerCase().includes(term);
      return matchesTerm && (filter === "all" || enquiry.status === filter);
    });
  }, [enquiries, query, filter]);

  async function updateStatus(enquiry: Enquiry, status: EnquiryStatus) {
    if (status === enquiry.status) return;
    setBusy(enquiry.id);
    try {
      const response = await fetch("/api/admin/content", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity: "enquiry", id: enquiry.id, data: { status } }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not update this enquiry.");
      setEnquiries((current) => current.map((item) => item.id === enquiry.id ? { ...item, status } : item));
      toast.success("Enquiry status updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this enquiry.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <header><span className="eyebrow">Inbox</span><h1 className="mt-2 font-display text-4xl sm:text-5xl">Enquiries</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Review messages sent through the storefront contact form. Status changes are internal only; no email is sent from this screen.</p></header>
      <div className="my-7 grid gap-3 sm:grid-cols-[1fr_180px]"><label className="relative block"><span className="sr-only">Search enquiries</span><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="field-control pl-9" placeholder="Search name, email, phone, subject" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label><span className="sr-only">Filter enquiries</span><select className="field-control" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>{statuses.map((status) => <option key={status} value={status}>{status === "all" ? "All statuses" : status}</option>)}</select></label></div>

      <section className="overflow-hidden border border-line bg-paper"><div className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-6"><div><span className="eyebrow">Messages</span><p className="mt-1 text-xs text-muted">{filtered.length} of {enquiries.length} shown</p></div><Mail size={17} className="text-olive" /></div>{filtered.length ? <div className="divide-y divide-line">{filtered.map((enquiry) => <button key={enquiry.id} type="button" onClick={() => setSelectedId(enquiry.id)} className="grid w-full gap-2 px-4 py-5 text-left transition-colors hover:bg-sand sm:grid-cols-[1fr_1.3fr_150px_100px] sm:items-center sm:px-6"><span className="min-w-0"><strong className="block truncate text-sm">{enquiry.subject || "Untitled enquiry"}</strong><small className="mt-1 block truncate text-xs text-muted">{enquiry.name} · {enquiry.email}</small></span><span className="line-clamp-2 text-xs leading-5 text-muted">{enquiry.message}</span><span className="text-xs text-muted">{dateLabel(enquiry.created_at)}</span><span className={`text-[10px] font-semibold uppercase tracking-[.13em] ${enquiry.status === "new" ? "text-olive" : "text-muted"}`}>{enquiry.status}</span></button>)}</div> : <div className="grid min-h-48 place-items-center px-5 py-12 text-center"><div><Mail size={20} className="mx-auto text-muted" /><p className="mt-3 text-sm text-muted">No enquiries match this view.</p></div></div>}</section>

      {selected && <div role="dialog" aria-modal="true" aria-labelledby="enquiry-title" className="fixed inset-0 z-50 overflow-auto bg-ink/45 p-3 sm:p-6"><div className="ml-auto min-h-full w-full max-w-2xl bg-ivory p-5 sm:p-8"><header className="flex items-start justify-between gap-4 border-b border-line pb-5"><div><span className="eyebrow">Enquiry detail</span><h2 id="enquiry-title" className="mt-1 font-display text-3xl">{selected.subject || "Untitled enquiry"}</h2><p className="mt-2 text-xs text-muted">Received {dateLabel(selected.created_at)}</p></div><button onClick={() => setSelectedId(null)} aria-label="Close enquiry" className="grid size-10 place-items-center"><X /></button></header><div className="space-y-6 py-6"><div className="grid gap-3 border-b border-line pb-6 sm:grid-cols-3"><div><span className="field-label">Name</span><p className="mt-1 text-sm">{selected.name}</p></div><div><span className="field-label">Email</span><a className="mt-1 block break-all text-sm underline underline-offset-4" href={`mailto:${selected.email}`}>{selected.email}</a></div><div><span className="field-label">Phone</span><p className="mt-1 text-sm">{selected.phone || "Not provided"}</p></div></div><div><span className="field-label">Message</span><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted">{selected.message}</p></div><div className="border-t border-line pt-6"><span className="field-label">Internal status</span><div className="mt-3 flex flex-wrap gap-2">{statuses.filter((status): status is EnquiryStatus => status !== "all").map((status) => <button key={status} type="button" disabled={busy === selected.id} onClick={() => void updateStatus(selected, status)} className={`min-h-10 border px-3 text-[10px] font-semibold uppercase tracking-[.13em] ${selected.status === status ? "border-olive bg-olive text-white" : "border-line bg-paper text-ink"}`}>{selected.status === status && <Check size={13} />}{status}</button>)}</div><p className="mt-3 text-xs text-muted">Available statuses are limited to the existing database enum: new, read, and replied.</p></div></div></div></div>}
    </div>
  );
}
