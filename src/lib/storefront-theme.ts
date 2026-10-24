import { z } from "zod";

export const storefrontThemeSchema = z.enum(["white", "pure-white", "black", "white-black", "black-white"]);
export type StorefrontTheme = z.infer<typeof storefrontThemeSchema>;

export const DEFAULT_STOREFRONT_THEME: StorefrontTheme = "white";

export const STOREFRONT_THEME_OPTIONS: Array<{
  value: StorefrontTheme;
  label: string;
  description: string;
}> = [
  { value: "white", label: "Default", description: "Light ivory surfaces with charcoal type." },
  { value: "pure-white", label: "Pure White", description: "Pure white surfaces with crisp charcoal type." },
  { value: "black", label: "Black", description: "A near-black storefront with light type." },
  { value: "white-black", label: "White & Black", description: "Light-led with dark sections and CTAs." },
  { value: "black-white", label: "Black & White", description: "Dark-led with bright cards for contrast." },
];

export function resolveStorefrontTheme(value: unknown): StorefrontTheme {
  const parsed = storefrontThemeSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_STOREFRONT_THEME;
}
