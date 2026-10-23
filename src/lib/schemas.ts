import { z } from "zod";

export const emailSchema = z.string().trim().email("Enter a valid email address.").max(254);
export const phoneSchema = z.string().trim().regex(/^[+0-9 ()-]{8,20}$/, "Enter a valid phone number.");
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(8, "Use at least 8 characters.") });
export const registerSchema = loginSchema.extend({ fullName: z.string().trim().min(2).max(120), phone: phoneSchema.optional().or(z.literal("")) });
export const contactSchema = z.object({ name: z.string().trim().min(2).max(120), email: emailSchema, phone: z.string().trim().max(20).optional().or(z.literal("")), subject: z.string().trim().min(3).max(180), message: z.string().trim().min(10).max(5000) });
export const cartLineSchema = z.object({ productId: z.string().uuid(), variantId: z.string().uuid().nullable(), quantity: z.number().int().min(1).max(99) });
export const checkoutSchema = z.object({
  name: z.string().trim().min(2).max(120), email: emailSchema, phone: phoneSchema,
  addressLine: z.string().trim().min(2).max(240), area: z.string().trim().min(2).max(160),
  city: z.string().trim().min(2).max(120), state: z.string().trim().min(2).max(120),
  pincode: z.string().regex(/^[0-9]{6}$/, "Enter a valid 6-digit pincode."),
  notes: z.string().trim().max(1000).optional().default(""),
  shippingMethod: z.string().trim().min(2).max(40).default("standard"),
  paymentMethod: z.enum(["cod", "razorpay"]), couponCode: z.string().trim().max(40).optional().default(""),
  items: z.array(cartLineSchema).min(1).max(40),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const whatsappOrderSchema = checkoutSchema.omit({ paymentMethod: true }).extend({
  requestKey: z.string().uuid(),
});
export type WhatsAppOrderInput = z.infer<typeof whatsappOrderSchema>;
