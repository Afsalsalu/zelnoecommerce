import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { CartProvider } from "@/components/cart-provider";
import "./globals.css";

export const viewport: Viewport = { themeColor: "#f7f5f0", colorScheme: "light" };
export const metadata: Metadata = {
  title: { default: "ZELNO Kitchen", template: "%s | ZELNO Kitchen" },
  description: "Thoughtfully selected essentials for a better everyday home.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="min-h-screen bg-ivory text-ink antialiased"><CartProvider>{children}<Toaster position="bottom-right" richColors closeButton /></CartProvider></body></html>;
}
