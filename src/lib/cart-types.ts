export type CartLine = {
  productId: string;
  variantId: string | null;
  slug: string;
  title: string;
  variantName: string;
  unitPrice: number; // Display hint only; checkout always re-prices on the server.
  imageUrl: string | null;
  quantity: number;
};
