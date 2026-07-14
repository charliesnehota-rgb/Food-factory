import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app";
  const now = new Date();
  return [
    { url: `${site}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    // Brandy záměrně chybí — restaurace se indexují až na vlastních
    // doménách; na sdílené doméně zůstávají skryté (viz middleware.ts).
    { url: `${site}/obchodni-podminky`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site}/ochrana-osobnich-udaju`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
