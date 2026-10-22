export const ADMIN_MODULES = [
  { slug: "products", label: "Products", description: "Manage the product catalog and stock." },
  { slug: "categories", label: "Collections", description: "Organize collections and their order." },
  { slug: "orders", label: "Orders", description: "Review orders and update fulfillment." },
  { slug: "customers", label: "Customers", description: "Review customer records and history." },
  { slug: "coupons", label: "Coupons", description: "Manage discounts available at checkout." },
  { slug: "homepage", label: "Homepage", description: "Shape the storefront story and content." },
  { slug: "pages", label: "Content pages", description: "Review editable pages and FAQs." },
  { slug: "settings", label: "Store settings", description: "Review public and private configuration." },
  { slug: "inquiries", label: "Enquiries", description: "Review messages sent through the store." },
] as const;

export type AdminModuleSlug = (typeof ADMIN_MODULES)[number]["slug"];

export function getAdminModule(slug: string) {
  return ADMIN_MODULES.find((module) => module.slug === slug);
}
