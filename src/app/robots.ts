import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api"] }], ...(site ? { sitemap: `${site.replace(/\/$/, "")}/sitemap.xml` } : {}) };
}
