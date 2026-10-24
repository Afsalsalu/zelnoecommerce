export type HeroOverlayColor = "dark" | "light";
export type HeroOverlayDirection = "full" | "bottom-to-top" | "left-to-right" | "right-to-left";

export type HeroOverlaySettings = {
  overlay_enabled: boolean;
  overlay_color: HeroOverlayColor;
  overlay_opacity: number;
  overlay_direction: HeroOverlayDirection;
};

export const HERO_OVERLAY_DEFAULTS: HeroOverlaySettings = {
  overlay_enabled: true,
  overlay_color: "dark",
  overlay_opacity: 35,
  overlay_direction: "bottom-to-top",
};

const overlayDirections = new Set<HeroOverlayDirection>(["full", "bottom-to-top", "left-to-right", "right-to-left"]);

export function normalizeHeroOverlaySettings(input?: Partial<HeroOverlaySettings> | null): HeroOverlaySettings {
  const opacity = Number(input?.overlay_opacity);
  const direction = input?.overlay_direction;

  return {
    overlay_enabled: typeof input?.overlay_enabled === "boolean" ? input.overlay_enabled : HERO_OVERLAY_DEFAULTS.overlay_enabled,
    overlay_color: input?.overlay_color === "light" ? "light" : HERO_OVERLAY_DEFAULTS.overlay_color,
    overlay_opacity: Number.isFinite(opacity) ? Math.min(80, Math.max(0, Math.round(opacity))) : HERO_OVERLAY_DEFAULTS.overlay_opacity,
    overlay_direction: direction && overlayDirections.has(direction) ? direction : HERO_OVERLAY_DEFAULTS.overlay_direction,
  };
}

export function heroOverlayStyle(input?: Partial<HeroOverlaySettings> | null): { backgroundColor?: string; backgroundImage?: string } {
  const settings = normalizeHeroOverlaySettings(input);
  if (!settings.overlay_enabled || settings.overlay_opacity === 0) return {};

  const color = settings.overlay_color === "light" ? "255, 255, 255" : "0, 0, 0";
  const fill = `rgba(${color}, ${settings.overlay_opacity / 100})`;
  if (settings.overlay_direction === "full") return { backgroundColor: fill };

  const direction = settings.overlay_direction === "bottom-to-top"
    ? "to top"
    : settings.overlay_direction === "left-to-right"
      ? "to right"
      : "to left";
  return { backgroundImage: `linear-gradient(${direction}, ${fill}, transparent)` };
}
