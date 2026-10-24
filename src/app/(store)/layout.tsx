import type { Metadata } from "next";
import { FloatingWhatsAppSupport } from "@/components/floating-whatsapp-support";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StorefrontMobileBottomNav } from "@/components/storefront-mobile-bottom-nav";
import { CustomerLoginRequirementsProvider } from "@/components/customer-login-requirements-provider";
import { getServerCustomerLoginRequirements } from "@/lib/customer-login-requirements-server";
import { getAnnouncement, getFooterSettings, getNavigation, getStoreSettings } from "@/lib/store";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  const title = settings.seo_title || settings.store_name || "ZELNO Kitchen";
  const description = settings.seo_description || settings.tagline || "Thoughtfully selected essentials for a better everyday home.";
  const origin = process.env.NEXT_PUBLIC_SITE_URL;

  return {
    metadataBase: origin ? new URL(origin) : undefined,
    title: { default: title, template: `%s | ${settings.store_name || "ZELNO Kitchen"}` },
    description,
    openGraph: {
      type: "website",
      siteName: settings.store_name || "ZELNO Kitchen",
      title,
      description,
      images: settings.logo_url ? [settings.logo_url] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: settings.logo_url ? [settings.logo_url] : undefined },
    robots: { index: true, follow: true },
  };
}

export default async function StoreLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, navigation, footer, announcement, customerLoginRequirements] = await Promise.all([
    getStoreSettings(),
    getNavigation(),
    getFooterSettings(),
    getAnnouncement(),
    getServerCustomerLoginRequirements(),
  ]);

  return (
    <CustomerLoginRequirementsProvider initial={customerLoginRequirements}>
      <StorefrontMobileBottomNav>
      <SiteHeader settings={settings} navigation={navigation} announcement={announcement} />
      <main id="main-content" className="min-h-[65vh]">
        {children}
      </main>
      <SiteFooter settings={settings} footer={footer} />
      <FloatingWhatsAppSupport settings={settings} />
      </StorefrontMobileBottomNav>
    </CustomerLoginRequirementsProvider>
  );
}
