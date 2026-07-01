import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const toolKinds = [
  "compress-image",
  "resize-image",
  "crop-image",
  "png-jpeg",
  "jpeg-png",
  "remove-background",
  "rotate-image",
  "png-webp",
  "jpeg-webp",
  "png-ico",
  "docx-pdf",
  "pdf-docx",
  "pdf-pptx",
  "jpg-pdf"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    ...toolKinds.map((kind) => ({
      url: `${siteUrl}/tools/${kind}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8
    }))
  ];
}
