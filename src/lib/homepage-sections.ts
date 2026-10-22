export type HomepageSectionTemplate = {
  section_key: string;
  label: string;
  title: string;
  content: Record<string, unknown>;
};

export const HOMEPAGE_SECTION_TEMPLATES: HomepageSectionTemplate[] = [
  {
    section_key: "hero",
    label: "Hero banner",
    title: "A considered home, made for everyday living.",
    content: { description: "Introduce the store with an active hero banner." },
  },
  {
    section_key: "featured_collections",
    label: "Category grid",
    title: "Shop by category",
    content: { description: "Explore the considered edit by category." },
  },
  {
    section_key: "featured_products",
    label: "Featured products / product grid",
    title: "Made for everyday living",
    content: {
      description: "A selection of products currently available in the store.",
      mode: "latest",
      cta_label: "Shop all",
      cta_href: "/shop",
    },
  },
  {
    section_key: "trust_points",
    label: "Trust points",
    title: "The ZELNO standard",
    content: {
      items: [
        { icon: "badge-check", title: "Thoughtfully chosen", text: "Essentials selected for everyday living." },
        { icon: "lock-keyhole", title: "Secure checkout", text: "Simple, protected payment options." },
        { icon: "message-circle", title: "Here to help", text: "A real team behind every order." },
        { icon: "package-check", title: "Carefully packed", text: "Orders prepared with attention." },
      ],
    },
  },
  {
    section_key: "testimonials",
    label: "Testimonials",
    title: "Loved in real homes",
    content: { description: "Notes from customers who have welcomed ZELNO into their homes." },
  },
  {
    section_key: "faq_preview",
    label: "FAQ",
    title: "Questions, answered",
    content: { description: "Find clear answers before you place an order.", cta_label: "Contact us", cta_href: "/contact" },
  },
  {
    section_key: "offer_banners",
    label: "Offer Banners",
    title: "Offers worth considering",
    content: { description: "A considered offer, available for a limited time." },
  },
  {
    section_key: "brand_logo_marquee",
    label: "Brand Logo Marquee",
    title: "Brands we admire",
    content: { description: "A considered edit from brands we trust." },
  },
];

const DEFAULT_SECTION_KEYS = ["hero", "featured_collections", "featured_products", "trust_points", "testimonials", "faq_preview"];

export const HOMEPAGE_DEFAULT_SECTIONS = HOMEPAGE_SECTION_TEMPLATES.filter((template) => DEFAULT_SECTION_KEYS.includes(template.section_key)).map(({ section_key, title, content }, sort_order) => ({
  section_key,
  title,
  content,
  sort_order,
  is_visible: true,
}));
