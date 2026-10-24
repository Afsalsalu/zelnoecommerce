export type SavedAddress = {
  id: string;
  label: string;
  full_name: string;
  email: string;
  phone: string;
  address_line: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  last_used_at: string | null;
  created_at: string;
};

export type CheckoutAddressInput = {
  name: string;
  email: string;
  phone: string;
  addressLine: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
};

export type SavedAddressOrder = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: unknown;
  placed_at: string;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizePhone(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function timestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : 0;
}

export function sortSavedAddresses(addresses: SavedAddress[]): SavedAddress[] {
  return [...addresses].sort((left, right) => {
    const lastUsedDifference = timestamp(right.last_used_at) - timestamp(left.last_used_at);
    if (lastUsedDifference !== 0) return lastUsedDifference;
    const createdDifference = timestamp(right.created_at) - timestamp(left.created_at);
    if (createdDifference !== 0) return createdDifference;
    return Number(right.is_default) - Number(left.is_default);
  });
}

export function checkoutValuesFromAddress(address: SavedAddress): CheckoutAddressInput {
  return {
    name: address.full_name,
    email: address.email,
    phone: address.phone,
    addressLine: address.address_line,
    area: address.area,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
  };
}

export function checkoutAddressPayload(input: CheckoutAddressInput) {
  return {
    full_name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    address_line: input.addressLine.trim(),
    area: input.area.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: input.pincode.trim(),
  };
}

export function sameCheckoutAddress(left: CheckoutAddressInput, right: CheckoutAddressInput): boolean {
  return normalizeText(left.name) === normalizeText(right.name)
    && normalizeText(left.email) === normalizeText(right.email)
    && normalizePhone(left.phone) === normalizePhone(right.phone)
    && normalizeText(left.addressLine) === normalizeText(right.addressLine)
    && normalizeText(left.area) === normalizeText(right.area)
    && normalizeText(left.city) === normalizeText(right.city)
    && normalizeText(left.state) === normalizeText(right.state)
    && normalizeText(left.pincode) === normalizeText(right.pincode);
}

export function shouldSaveCheckoutAddress(orderSucceeded: boolean): boolean {
  return orderSucceeded;
}

export function shouldShowSavedAddresses(isAuthenticated: boolean, addressCount: number): boolean {
  return isAuthenticated && addressCount > 0;
}

export function visibleSavedAddresses(addresses: SavedAddress[], expanded: boolean): SavedAddress[] {
  return expanded ? [...addresses] : addresses.slice(0, 1);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function savedAddressFromOrder(order: SavedAddressOrder, fallbackEmail = ""): SavedAddress | null {
  const shipping = order.shipping_address && typeof order.shipping_address === "object" && !Array.isArray(order.shipping_address)
    ? order.shipping_address as Record<string, unknown>
    : {};
  const address: SavedAddress = {
    id: `order-${order.id}`,
    label: "Previous order",
    full_name: stringValue(order.customer_name),
    email: stringValue(order.customer_email) || fallbackEmail,
    phone: stringValue(order.customer_phone),
    address_line: stringValue(shipping.address_line),
    area: stringValue(shipping.area),
    city: stringValue(shipping.city),
    state: stringValue(shipping.state),
    pincode: stringValue(shipping.pincode),
    is_default: false,
    last_used_at: order.placed_at || null,
    created_at: order.placed_at,
  };
  if (address.full_name.length < 2 || !address.email.includes("@") || address.phone.length < 8 || address.address_line.length < 2 || address.area.length < 2 || address.city.length < 2 || address.state.length < 2 || !/^\d{6}$/.test(address.pincode)) return null;
  return address;
}

export function mergeSavedAddresses(addresses: SavedAddress[], orders: SavedAddressOrder[], fallbackEmail = ""): SavedAddress[] {
  const merged = [...addresses];
  for (const order of orders) {
    const candidate = savedAddressFromOrder(order, fallbackEmail);
    if (!candidate) continue;
    const duplicateIndex = merged.findIndex((address) => sameCheckoutAddress(checkoutValuesFromAddress(address), checkoutValuesFromAddress(candidate)));
    if (duplicateIndex === -1) {
      merged.push(candidate);
      continue;
    }
    const existing = merged[duplicateIndex];
    const existingTime = timestamp(existing.last_used_at);
    const orderTime = timestamp(candidate.last_used_at);
    if (orderTime > existingTime) merged[duplicateIndex] = { ...existing, last_used_at: candidate.last_used_at };
  }
  return sortSavedAddresses(merged);
}

export function checkoutUserMatchesAccount(accountUserId: string | null | undefined, checkoutUserId: string | null | undefined): boolean {
  return Boolean(accountUserId && checkoutUserId && accountUserId === checkoutUserId);
}

export function addressBelongsToUser(addressUserId: string, currentUserId: string): boolean {
  return Boolean(addressUserId && currentUserId && addressUserId === currentUserId);
}
