export const ADMIN_MODULES = [
  { slug: "products", label: "Products", description: "Manage the product catalog and stock.", icon: "package" },
  { slug: "categories", label: "Collections", description: "Organize collections and their order.", icon: "tags" },
  { slug: "orders", label: "Orders", description: "Review orders and update fulfillment.", icon: "clipboard-list" },
  { slug: "customers", label: "Customers", description: "Review customer records and history.", icon: "users" },
  { slug: "coupons", label: "Coupons", description: "Manage discounts available at checkout.", icon: "ticket-percent" },
  { slug: "homepage", label: "Homepage", description: "Shape the storefront story and content.", icon: "house" },
  { slug: "pages", label: "Content pages", description: "Review editable pages and FAQs.", icon: "file-text" },
  { slug: "settings", label: "Store settings", description: "Review public and private configuration.", icon: "settings" },
  { slug: "whatsapp-orders", label: "WhatsApp Settings", description: "Manage click-to-chat ordering settings.", icon: "message-circle" },
  { slug: "inquiries", label: "Enquiries", description: "Review messages sent through the store.", icon: "inbox" },
] as const;

export type AdminModuleSlug = (typeof ADMIN_MODULES)[number]["slug"];

export function getAdminModule(slug: string) {
  return ADMIN_MODULES.find((module) => module.slug === slug);
}
