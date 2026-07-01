import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Convert - Free Online Image Editor and File Converter",
    short_name: "Convert",
    description:
      "Free online image editing and file conversion tools for background removal, compression, resize, crop, rotate, PDF, Word, PowerPoint, JPG, PNG, WEBP, and ICO.",
    start_url: "/",
    display: "standalone",
    background_color: "#06080f",
    theme_color: "#06080f",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
