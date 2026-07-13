import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://food-factory-zeta.vercel.app";
  const now = new Date();
  return [
    { url: `${site}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/sunny-side`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${site}/dumply`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${site}/smash`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${site}/obchodni-podminky`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site}/ochrana-osobnich-udaju`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
