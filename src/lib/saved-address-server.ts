import "server-only";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import { supabaseErrorDetails } from "@/lib/whatsapp-order-errors";
import {
  checkoutAddressPayload,
  checkoutValuesFromAddress,
  mergeSavedAddresses,
  sameCheckoutAddress,
  type CheckoutAddressInput,
  type SavedAddress,
  type SavedAddressOrder,
} from "@/lib/saved-addresses";

const extendedAddressSelect = "id,label,full_name,email,phone,address_line,area,city,state,pincode,is_default,last_used_at,created_at,updated_at";
const legacyAddressSelect = "id,label,full_name,phone,address_line,area,city,state,pincode,is_default,created_at,updated_at";
const orderAddressSelect = "id,customer_name,customer_email,customer_phone,shipping_address,placed_at";
const sessionOrderAddressSelect = "id,customer_name,shipping_address,placed_at";

type AddressRow = {
  id: string;
  label?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  is_default?: boolean | null;
  last_used_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SavedAddressLoadResult = {
  addresses: SavedAddress[];
  error: boolean;
};

export function logSavedAddressError(phase: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  const details = supabaseErrorDetails(error);
  const diagnostic = [
    `code=${details.code || "unknown"}`,
    `message=${details.message || "unknown"}`,
    `details=${details.details || "none"}`,
    `hint=${details.hint || "none"}`,
  ].join(" | ");
  // Address reads have a safe UI fallback; keep diagnostics visible without making
  // Next's development overlay treat this recoverable condition as a blocking error.
  console.warn(`[checkout-address] ${phase} | ${diagnostic}`);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function mapAddressRow(row: AddressRow, fallbackEmail: string): SavedAddress | null {
  const address: SavedAddress = {
    id: text(row.id),
    label: text(row.label) || "Home",
    full_name: text(row.full_name),
    email: text(row.email) || fallbackEmail,
    phone: text(row.phone),
    address_line: text(row.address_line),
    area: text(row.area),
    city: text(row.city),
    state: text(row.state),
    pincode: text(row.pincode),
    is_default: Boolean(row.is_default),
    last_used_at: text(row.last_used_at) || text(row.updated_at) || null,
    created_at: text(row.created_at),
  };
  if (!address.id || address.full_name.length < 2 || address.phone.length < 8 || address.address_line.length < 2 || address.area.length < 2 || address.city.length < 2 || address.state.length < 2 || !/^\d{6}$/.test(address.pincode)) return null;
  return address;
}

async function readOrders(client: Awaited<ReturnType<typeof createServerSupabase>>, userId: string, fallbackEmail: string) {
  // The authenticated browser role is intentionally not granted customer_email/customer_phone
  // on orders. Read the complete contact snapshot only on the server, scoped to the id returned
  // by auth.getUser(), never to a browser-supplied user id.
  try {
    const admin = createServiceSupabase();
    const privateResult = await admin.from("orders").select(orderAddressSelect).eq("user_id", userId).order("placed_at", { ascending: false }).limit(50);
    if (!privateResult.error) return { orders: (privateResult.data ?? []) as SavedAddressOrder[], failed: false };
    logSavedAddressError("loading own order addresses with server client", privateResult.error);
  } catch (error) {
    logSavedAddressError("loading own order addresses with server client", error);
  }

  // If the server role is unavailable, use only columns allowed to the authenticated role.
  // The profile phone and auth email keep valid legacy order addresses usable without widening
  // the orders table grant.
  const [{ data: profile }, result] = await Promise.all([
    client.from("profiles").select("phone").eq("id", userId).maybeSingle(),
    client.from("orders").select(sessionOrderAddressSelect).eq("user_id", userId).order("placed_at", { ascending: false }).limit(50),
  ]);
  if (!result.error) {
    const profilePhone = text(profile?.phone);
    const orders = ((result.data ?? []) as Array<Omit<SavedAddressOrder, "customer_email" | "customer_phone"> & { shipping_address?: unknown }>).map((order) => ({
      ...order,
      customer_email: fallbackEmail,
      customer_phone: profilePhone || text((order.shipping_address as Record<string, unknown> | null)?.phone),
    }));
    return { orders, failed: false };
  }
  logSavedAddressError("loading own order addresses with session client", result.error);
  return { orders: [] as SavedAddressOrder[], failed: true };
}

export async function getSavedAddressesForCheckout(userId: string, userEmail = ""): Promise<SavedAddressLoadResult> {
  const client = await createServerSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user || user.id !== userId) {
    logSavedAddressError("authenticated owner changed before address load", new Error("Authenticated checkout user did not match the address owner."));
    return { addresses: [], error: true };
  }
  let rows: AddressRow[] = [];
  let addressReadFailed = false;

  const extended = await client.from("addresses").select(extendedAddressSelect).eq("user_id", userId).order("last_used_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  if (!extended.error) {
    rows = (extended.data ?? []) as AddressRow[];
  } else {
    logSavedAddressError("loading saved addresses with checkout fields", extended.error);
    const legacy = await client.from("addresses").select(legacyAddressSelect).eq("user_id", userId).order("updated_at", { ascending: false }).order("created_at", { ascending: false });
    if (!legacy.error) rows = (legacy.data ?? []) as AddressRow[];
    else {
      addressReadFailed = true;
      logSavedAddressError("loading saved addresses with legacy fields", legacy.error);
    }
  }

  const { orders, failed: ordersReadFailed } = await readOrders(client, userId, userEmail);
  const saved = rows.map((row) => mapAddressRow(row, userEmail)).filter((address): address is SavedAddress => Boolean(address));
  const addresses = mergeSavedAddresses(saved, orders, userEmail);
  return { addresses, error: addresses.length === 0 && (addressReadFailed || ordersReadFailed) };
}

async function recordUsingLegacyAddressTable(client: Awaited<ReturnType<typeof createServerSupabase>>, input: CheckoutAddressInput, userId: string) {
  const { data, error } = await client.from("addresses").select(legacyAddressSelect).eq("user_id", userId);
  if (error) {
    logSavedAddressError("legacy saved-address lookup after checkout", error);
    return;
  }
  const existing = ((data ?? []) as AddressRow[])
    .map((row) => mapAddressRow(row, input.email))
    .find((address) => address && sameCheckoutAddress(checkoutValuesFromAddress(address), input));
  if (existing) {
    const { error: updateError } = await client.from("addresses").update({ updated_at: new Date().toISOString() }).eq("id", existing.id).eq("user_id", userId);
    if (updateError) logSavedAddressError("legacy saved-address update after checkout", updateError);
    return;
  }
  const { error: insertError } = await client.from("addresses").insert({
    user_id: userId,
    label: "Checkout",
    full_name: input.name.trim(),
    phone: input.phone.trim(),
    address_line: input.addressLine.trim(),
    area: input.area.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: input.pincode.trim(),
    is_default: (data ?? []).length === 0,
  });
  if (insertError) logSavedAddressError("legacy saved-address insert after checkout", insertError);
}

export async function recordCheckoutAddressAfterSuccess(input: CheckoutAddressInput, userId: string | null) {
  if (!userId) return;
  try {
    const client = await createServerSupabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user || user.id !== userId) {
      logSavedAddressError("authenticated owner changed before address save", new Error("Authenticated checkout user did not match the order user."));
      return;
    }
    const { error } = await client.rpc("record_checkout_address", { p_address: checkoutAddressPayload(input) });
    if (!error) return;
    logSavedAddressError("recording saved address with checkout RPC", error);
    await recordUsingLegacyAddressTable(client, input, userId);
  } catch (error) {
    logSavedAddressError("recording saved address", error);
  }
}
