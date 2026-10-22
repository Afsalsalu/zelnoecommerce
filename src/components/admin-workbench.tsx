import Link from "next/link";
import { ArrowUpRight, ClipboardList, FileText, Mail, Settings2, Users } from "lucide-react";

type RecordValue = Record<string, unknown>;
type WorkbenchRow = { key: string; label: string; detail: string; meta: string };

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRows(value: unknown): RecordValue[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function text(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function makeRows(module: string, data: unknown): WorkbenchRow[] {
  if (module === "customers" && isRecord(data)) {
    const profiles = asRows(data.profiles);
    const orders = asRows(data.orders);
    const addresses = asRows(data.addresses);
    return profiles.map((profile, index) => {
      const id = text(profile.id, `customer-${index}`);
      const customerOrders = orders.filter((order) => order.user_id === profile.id);
      const address = addresses.find((item) => item.user_id === profile.id);
      const name = text(profile.full_name, "Unnamed customer");
      const email = customerOrders[0] ? text(customerOrders[0].customer_email, "Email not available") : "Email not available";
      const location = address ? [text(address.city, ""), text(address.state, "")].filter(Boolean).join(", ") : "No saved address";
      return { key: id, label: name, detail: email, meta: `${countLabel(customerOrders.length, "order")} · ${location}` };
    });
  }

  if (module === "pages" && isRecord(data)) {
    return asRows(data.pages).map((page, index) => ({
      key: text(page.id, `page-${index}`),
      label: text(page.title, "Untitled page"),
      detail: `/${text(page.slug, "unpublished")}`,
      meta: page.is_published === true ? "Published" : "Draft",
    }));
  }

  const rows = asRows(data);
  if (module === "settings") {
    return rows.map((setting, index) => ({
      key: text(setting.id, `setting-${index}`),
      label: text(setting.setting_key, "Unnamed setting"),
      detail: setting.value && isRecord(setting.value) ? "Structured store configuration" : "No value saved",
      meta: setting.is_public === true ? "Public" : "Private",
    }));
  }

  if (module === "inquiries") {
    return rows.map((inquiry, index) => ({
      key: text(inquiry.id, `inquiry-${index}`),
      label: text(inquiry.subject, "Untitled enquiry"),
      detail: `${text(inquiry.name, "Unknown sender")} · ${text(inquiry.email, "No email")}`,
      meta: text(inquiry.status, "new"),
    }));
  }

  return rows.map((row, index) => ({
    key: text(row.id, `${module}-${index}`),
    label: text(row.title ?? row.name ?? row.code ?? row.setting_key, "Untitled item"),
    detail: text(row.slug ?? row.description ?? row.email, "Stored record"),
    meta: text(row.status ?? row.is_active ?? row.is_published, "Ready"),
  }));
}

function moduleIcon(module: string) {
  if (module === "customers") return Users;
  if (module === "pages") return FileText;
  if (module === "inquiries") return Mail;
  if (module === "settings") return Settings2;
  return ClipboardList;
}

export function AdminWorkbench({ module, title, data }: { module: string; title: string; data: unknown }) {
  const rows = makeRows(module, data);
  const Icon = moduleIcon(module);
  const note = module === "customers"
    ? "Customer records are shown from the profiles, order, and address data already available to this dashboard."
    : "This read-only workbench keeps the module usable while its dedicated editor is being prepared.";

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Store operations</span>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{note}</p>
        </div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[.13em] underline underline-offset-4">
          Dashboard <ArrowUpRight size={13} />
        </Link>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <article className="bg-paper p-5"><span className="eyebrow">Records</span><strong className="mt-3 block font-display text-3xl font-normal">{rows.length}</strong><span className="mt-1 block text-xs text-muted">Loaded for this view</span></article>
        <article className="bg-paper p-5"><Icon size={17} className="text-olive" /><strong className="mt-3 block font-display text-2xl font-normal">{title}</strong><span className="mt-1 block text-xs text-muted">Protected admin area</span></article>
        <article className="bg-paper p-5"><span className="eyebrow">Next step</span><strong className="mt-3 block font-display text-2xl font-normal">Connect editor</strong><span className="mt-1 block text-xs text-muted">No storefront data is changed here.</span></article>
      </section>

      <section className="mt-8 bg-paper p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
          <div><h2 className="font-display text-2xl">{rows.length ? "Latest records" : "Nothing here yet"}</h2><p className="mt-1 text-xs text-muted">{rows.length ? "A safe summary of the records returned by Supabase." : "This view will populate after real store data is connected."}</p></div>
          <span className="grid size-9 place-items-center border border-line text-muted" aria-hidden><Icon size={16} /></span>
        </div>
        {rows.length ? <div className="divide-y divide-line">{rows.map((row) => <article key={row.key} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><h3 className="truncate text-sm font-medium">{row.label}</h3><p className="mt-1 truncate text-xs text-muted">{row.detail}</p></div><span className="text-right text-[10px] uppercase tracking-[.12em] text-muted">{row.meta}</span></article>)}</div> : <div className="grid min-h-40 place-items-center py-10 text-center"><div><p className="text-sm text-muted">No records are available for this module.</p><p className="mt-2 text-xs text-muted">Add content through the connected Supabase project when you are ready.</p></div></div>}
      </section>
    </div>
  );
}
