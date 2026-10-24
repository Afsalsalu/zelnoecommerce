import type { HeroOverlayColor, HeroOverlayDirection } from "@/lib/hero-overlay";

export type HeroBannerDraft = {
  heading: string;
  description: string;
  cta_label: string;
  cta_href: string;
  desktop_image_url: string;
  mobile_image_url: string;
  image_alt: string;
  overlay_enabled: boolean;
  overlay_color: HeroOverlayColor;
  overlay_opacity: number;
  overlay_direction: HeroOverlayDirection;
  sort_order: number;
  is_active: boolean;
};

export type HeroBannerField = keyof HeroBannerDraft;
export type HeroBannerFieldErrors = Partial<Record<HeroBannerField, string>>;

function validUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateHeroBannerDraft(value: HeroBannerDraft): HeroBannerFieldErrors {
  const errors: HeroBannerFieldErrors = {};
  if (!value.heading.trim()) errors.heading = "Heading is required.";
  if (!value.cta_label.trim()) errors.cta_label = "Button label is required.";
  if (!value.cta_href.trim()) errors.cta_href = "Button path is required.";
  else if (!value.cta_href.startsWith("/") || value.cta_href.startsWith("//")) errors.cta_href = "Use a site-relative path such as /shop.";
  if (value.desktop_image_url && !validUrl(value.desktop_image_url)) errors.desktop_image_url = "Desktop image URL must be valid.";
  if (value.mobile_image_url && !validUrl(value.mobile_image_url)) errors.mobile_image_url = "Mobile image URL must be valid.";
  if (!Number.isInteger(value.sort_order)) errors.sort_order = "Display order must be a whole number.";
  if (!Number.isInteger(value.overlay_opacity) || value.overlay_opacity < 0 || value.overlay_opacity > 80) errors.overlay_opacity = "Opacity must be between 0% and 80%.";
  if (value.overlay_color !== "dark" && value.overlay_color !== "light") errors.overlay_color = "Choose a valid overlay color.";
  if (!["full", "bottom-to-top", "left-to-right", "right-to-left"].includes(value.overlay_direction)) errors.overlay_direction = "Choose a valid overlay direction.";
  return errors;
}
