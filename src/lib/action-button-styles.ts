import type { CSSProperties } from "react";

export const ACTION_BUTTON_STYLE_KEYS = ["add_to_bag", "buy_now", "buy_via_whatsapp"] as const;
export type ActionButtonStyleKey = (typeof ACTION_BUTTON_STYLE_KEYS)[number];

export type ActionButtonStyle = {
  background: string;
  text: string;
  hover: string;
};

export type ActionButtonStyles = Record<ActionButtonStyleKey, ActionButtonStyle>;

export const ACTION_BUTTON_LABELS: Record<ActionButtonStyleKey, string> = {
  add_to_bag: "Add to Bag",
  buy_now: "Buy Now",
  buy_via_whatsapp: "Buy via WhatsApp",
};

export const DEFAULT_ACTION_BUTTON_STYLES: ActionButtonStyles = {
  add_to_bag: { background: "#242520", text: "#FFFFFF", hover: "#111210" },
  buy_now: { background: "#6B7050", text: "#FFFFFF", hover: "#555A3F" },
  buy_via_whatsapp: { background: "#1F5E47", text: "#FFFFFF", hover: "#174634" },
};

export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
export const ACTION_BUTTON_CONTRAST_RATIO = 4.5;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(color: string) {
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

export function contrastRatio(foreground: string, background: string) {
  if (!isHexColor(foreground) || !isHexColor(background)) return 0;
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function normalizeColor(value: string) {
  return value.toUpperCase();
}

export function actionButtonStyleError(style: unknown, label: string): string | null {
  if (!style || typeof style !== "object" || Array.isArray(style)) return `${label}: enter all three colours.`;
  const value = style as Partial<ActionButtonStyle>;
  if (!isHexColor(value.background)) return `${label}: background colour must be a 6-digit hex value such as #1F5E47.`;
  if (!isHexColor(value.text)) return `${label}: text/icon colour must be a 6-digit hex value such as #FFFFFF.`;
  if (!isHexColor(value.hover)) return `${label}: hover background colour must be a 6-digit hex value such as #174634.`;
  if (contrastRatio(value.text, value.background) < ACTION_BUTTON_CONTRAST_RATIO) return `${label}: text/icon colour needs at least 4.5:1 contrast against the background.`;
  if (contrastRatio(value.text, value.hover) < ACTION_BUTTON_CONTRAST_RATIO) return `${label}: text/icon colour needs at least 4.5:1 contrast against the hover background.`;
  return null;
}

export function validateActionButtonStyles(value: unknown): { valid: true; data: ActionButtonStyles } | { valid: false; message: string; field?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, message: "Product Action Button Styles must include all three button styles." };
  const source = value as Partial<Record<ActionButtonStyleKey, unknown>>;
  const normalized = {} as ActionButtonStyles;
  for (const key of ACTION_BUTTON_STYLE_KEYS) {
    const error = actionButtonStyleError(source[key], ACTION_BUTTON_LABELS[key]);
    if (error) return { valid: false, message: error, field: key };
    const style = source[key] as ActionButtonStyle;
    normalized[key] = { background: normalizeColor(style.background), text: normalizeColor(style.text), hover: normalizeColor(style.hover) };
  }
  return { valid: true, data: normalized };
}

export function resolveActionButtonStyles(value: unknown): ActionButtonStyles {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<Record<ActionButtonStyleKey, unknown>> : {};
  return Object.fromEntries(ACTION_BUTTON_STYLE_KEYS.map((key) => {
    const candidate = source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) ? source[key] as Partial<ActionButtonStyle> : {};
    const fallback = DEFAULT_ACTION_BUTTON_STYLES[key];
    return [key, {
      background: isHexColor(candidate.background) ? normalizeColor(candidate.background) : fallback.background,
      text: isHexColor(candidate.text) ? normalizeColor(candidate.text) : fallback.text,
      hover: isHexColor(candidate.hover) ? normalizeColor(candidate.hover) : fallback.hover,
    }];
  })) as ActionButtonStyles;
}

export type ActionButtonCssVariables = CSSProperties & {
  "--action-button-background": string;
  "--action-button-text": string;
  "--action-button-hover": string;
};

export function actionButtonCssVariables(style: ActionButtonStyle): ActionButtonCssVariables {
  return {
    "--action-button-background": style.background,
    "--action-button-text": style.text,
    "--action-button-hover": style.hover,
  };
}
