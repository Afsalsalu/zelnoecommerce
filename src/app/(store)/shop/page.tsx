import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getCatalog } from "@/lib/store";

export const metadata = { title: "Shop", description: "Explore the considered ZELNO collection of everyday home essentials." };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const param = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
function buildUrl(values: Record<string, string | undefined>) { const query = new URLSearchParams(); Object.entries(values).forEach(([key, value]) => value && query.set(key, value)); return `/shop?${query.toString()}`; }
export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const values = await searchParams;
  const search = param(values.q) ?? "";
  const sort = param(values.sort) ?? "newest";
  const category = param(values.category) ?? "";
  const minPrice = Number(param(values.min) || "");
  const maxPrice = Number(param(values.max) || "");
  const available = param(values.available) === "true";
  const page = Math.max(1, Number(param(values.page) || 1) || 1);
  const result = await getCatalog({ search, sort, category, minPrice: Number.isFinite(minPrice) && minPrice > 0 ? minPrice : undefined, maxPrice: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : undefined, available, page, pageSize: 12 });
  const pages = Math.max(1, Math.ceil(result.total / 12));
  const filters = <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
    <label><span className="field-label">Category</span><select name="category" defaultValue={category} className="field-control"><option value="">All categories</option>{result.categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
    <label><span className="field-label">Min price (₹)</span><input name="min" inputMode="numeric" type="number" min="0" defaultValue={param(values.min)} className="field-control" placeholder="0" /></label>
    <label><span className="field-label">Max price (₹)</span><input name="max" inputMode="numeric" type="number" min="0" defaultValue={param(values.max)} className="field-control" placeholder="Any" /></label>
    <label><span className="field-label">Sort by</span><select name="sort" defaultValue={sort} className="field-control"><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="bestseller">Bestseller</option></select></label>
    <label className="flex items-center gap-2 self-end pb-4 text-xs"><input type="checkbox" name="available" value="true" defaultChecked={available} className="accent-olive" />In stock</label>
  </div>;
  return <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 sm:px-8 lg:px-12 lg:pt-16">
    <header className="mb-10 border-b border-line pb-8"><span className="eyebrow">A considered collection</span><h1 className="mt-3 font-display text-5xl sm:text-6xl">Shop all</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Thoughtfully selected essentials for a better everyday home.</p></header>
    <form action="/shop" method="get" className="mb-10 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Search products, tags, or categories</span><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" /><input name="q" defaultValue={search} className="field-control pl-11" type="search" placeholder="Search by product, tag or category" /></label><label className="flex items-center gap-2 sm:w-56"><span className="eyebrow whitespace-nowrap">Sort</span><select name="sort" defaultValue={sort} className="field-control"><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="bestseller">Bestseller</option></select></label><button className="button-primary"><Search size={15} />Search</button></div>
      <details className="border-y border-line py-3 sm:hidden"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-[.14em]"><SlidersHorizontal size={15} />Filters</summary><div className="pt-4">{filters}</div></details>
      <div className="hidden sm:block">{filters}</div>
      <div className="flex flex-wrap items-center gap-3"><button className="button-secondary min-h-10 px-4 py-2">Apply filters</button><Link href="/shop" className="text-xs text-muted underline underline-offset-4">Clear filters</Link></div>
    </form>
    {!result.configured && <div className="mb-8 border border-line bg-paper p-5 text-sm text-muted">Connect Supabase and apply the schema and demo seed to populate the editable catalogue.</div>}
    <div className="mb-5 flex items-center justify-between"><p className="text-xs text-muted">{result.total} {result.total === 1 ? "piece" : "pieces"}</p>{search && <p className="text-xs text-muted">Results for <span className="font-medium text-ink">“{search}”</span></p>}</div>
    {result.products.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">{result.products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="border-y border-line py-16 text-center"><span className="eyebrow">Nothing here just yet</span><h2 className="mt-3 font-display text-3xl">{search ? "No matching pieces found" : "The collection is taking shape"}</h2><p className="mt-3 text-sm text-muted">Try a different search or clear a filter.</p><Link href="/shop" className="button-secondary mt-6">Clear filters</Link></div>}
    {pages > 1 && <nav aria-label="Shop pages" className="mt-12 flex items-center justify-center gap-5 text-xs"><Link aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none text-muted/50" : "underline underline-offset-4"} href={buildUrl({ q: search, sort, category, min: param(values.min), max: param(values.max), available: available ? "true" : undefined, page: String(page - 1) })}>Previous</Link><span>Page {page} of {pages}</span><Link aria-disabled={page >= pages} className={page >= pages ? "pointer-events-none text-muted/50" : "underline underline-offset-4"} href={buildUrl({ q: search, sort, category, min: param(values.min), max: param(values.max), available: available ? "true" : undefined, page: String(page + 1) })}>Next</Link></nav>}
  </div>;
}
