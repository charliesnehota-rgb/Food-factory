import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/ucet", "/checkout"] },
    sitemap: `${site}/sitemap.xml`,
  };
}
