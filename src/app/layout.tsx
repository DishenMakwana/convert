import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const siteName = "Convert";
const siteDescription =
  "Convert is a free online toolkit for image editing and file conversion, including background removal, image compression, resize, crop, rotate, PDF, Word, PowerPoint, PNG, JPG, WEBP, and ICO tools.";
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: siteName,
  url: siteUrl,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  description: siteDescription,
  creator: {
    "@type": "Person",
    name: "Dishen Makwana"
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD"
  },
  featureList: [
    "AI background removal",
    "Image compression",
    "Image resizing",
    "Image cropping",
    "Image rotation",
    "PNG, JPG, WEBP, ICO conversion",
    "PDF, Word, and PowerPoint conversion"
  ]
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: "Convert - Free Online Image Editor and File Converter",
    template: "%s | Convert"
  },
  description: siteDescription,
  keywords: [
    "free image editor",
    "online file converter",
    "remove background",
    "compress image",
    "resize image",
    "crop image",
    "rotate image",
    "jpg to png",
    "png to jpg",
    "png to webp",
    "jpg to pdf",
    "pdf converter",
    "word to pdf",
    "pptx converter"
  ],
  authors: [{ name: "Dishen Makwana" }],
  creator: "Dishen Makwana",
  publisher: "Convert",
  category: "Productivity",
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" }
    ],
    shortcut: "/favicon.svg",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-icon.svg", type: "image/svg+xml" }
    ]
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: "/",
    siteName,
    title: "Convert - Free Online Image Editor and File Converter",
    description: siteDescription,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Convert online image editor and file converter"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Convert - Free Online Image Editor and File Converter",
    description: siteDescription,
    images: ["/opengraph-image"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
