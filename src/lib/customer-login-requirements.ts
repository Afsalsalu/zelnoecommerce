import { z } from "zod";

export const customerLoginRequirementsSchema = z.object({
  require_login_wishlist: z.boolean(),
  require_login_cart: z.boolean(),
  require_login_checkout: z.boolean(),
  require_login_buy_now: z.boolean(),
  require_login_whatsapp: z.boolean(),
}).strict();

export type CustomerLoginRequirements = z.infer<typeof customerLoginRequirementsSchema>;
export type CustomerAction = "wishlist" | "cart" | "checkout" | "buy-now" | "whatsapp";

export const DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS: CustomerLoginRequirements = {
  require_login_wishlist: false,
  require_login_cart: false,
  require_login_checkout: false,
  require_login_buy_now: false,
  require_login_whatsapp: false,
};

export function resolveCustomerLoginRequirements(value: unknown): CustomerLoginRequirements {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS;
  const candidate = value as Record<string, unknown>;
  return {
    require_login_wishlist: candidate.require_login_wishlist === true,
    require_login_cart: candidate.require_login_cart === true,
    require_login_checkout: candidate.require_login_checkout === true,
    require_login_buy_now: candidate.require_login_buy_now === true,
    require_login_whatsapp: candidate.require_login_whatsapp === true,
  };
}

export function customerActionRequiresLogin(action: CustomerAction, authenticated: boolean, requirements: CustomerLoginRequirements) {
  if (authenticated) return false;
  if (action === "wishlist") return requirements.require_login_wishlist;
  if (action === "cart") return requirements.require_login_cart;
  if (action === "checkout") return requirements.require_login_checkout;
  if (action === "buy-now") return requirements.require_login_buy_now || requirements.require_login_checkout;
  return requirements.require_login_whatsapp;
}
