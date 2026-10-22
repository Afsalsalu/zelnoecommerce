export type NavigationLink = { label: string; href: string };

export const DEFAULT_NAVIGATION: NavigationLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Categories", href: "/collections" },
  { label: "Products", href: "/shop" },
];

const DEFAULT_BY_PATH = new Map(DEFAULT_NAVIGATION.map((link) => [link.href, link]));
const DEFAULT_BY_LABEL = new Map(DEFAULT_NAVIGATION.map((link) => [link.label.toLowerCase(), link]));
DEFAULT_BY_LABEL.set("category", DEFAULT_NAVIGATION[2]);

function normalizedDefault(label: string, href: string) {
  return DEFAULT_BY_PATH.get(href) || DEFAULT_BY_LABEL.get(label.toLowerCase());
}

export function normalizeNavigation(value: unknown): NavigationLink[] {
  const defaults = DEFAULT_NAVIGATION.map((link) => ({ ...link }));
  const saved = Array.isArray(value) ? value : [];
  const byPath = new Map<string, NavigationLink>();
  const byDefaultPath = new Map(DEFAULT_NAVIGATION.map((link) => [link.href, { ...link }]));

  for (const item of saved) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as { label?: unknown; href?: unknown };
    if (typeof candidate.label !== "string" || typeof candidate.href !== "string") continue;
    const label = candidate.label.trim();
    const rawHref = candidate.href.trim();
    if (!label || !rawHref || !rawHref.startsWith("/") || rawHref.startsWith("//")) continue;
    const href = rawHref === "/collections/" ? "/collections" : rawHref;
    const knownDefault = normalizedDefault(label, href);
    if (knownDefault) {
      byDefaultPath.set(knownDefault.href, { ...knownDefault });
      continue;
    }
    if (!byPath.has(href)) byPath.set(href, { label: label.toLowerCase() === "category" ? "Categories" : label, href });
  }

  return [
    ...defaults.map((link) => byDefaultPath.get(link.href) || link),
    ...[...byPath.entries()].filter(([href]) => !DEFAULT_BY_PATH.has(href)).map(([, link]) => link),
  ];
}
