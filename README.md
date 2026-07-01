# Convert

Convert is a free online image editor and file conversion app built with Next.js. It provides a collection of common image and document tools in one interface, with a product-ready dark UI, SEO metadata, social sharing images, app icons, sitemap, robots file, and PWA manifest.

## Features

### Image tools

- **Compress Image**  
  Compress JPG, PNG, SVG, and GIF files while keeping visual quality.

- **Resize Image**  
  Resize JPG, PNG, SVG, and GIF files by custom pixel dimensions.

- **Crop Image**  
  Crop JPG, PNG, and GIF images with an interactive crop area.

- **Remove Background**  
  Remove complex image backgrounds from JPG, JPEG, and PNG files using Node-based AI matting. Exports transparent PNG cutouts.

- **Rotate Image**  
  Rotate JPG, PNG, and GIF images by 90, 180, or 270 degrees.

### Image conversion

- **PNG to JPG**  
  Convert PNG images into JPG files.

- **JPG to PNG**  
  Convert JPG and JPEG images into PNG files.

- **PNG to WEBP**  
  Convert PNG images into compact WEBP files.

- **JPEG to WEBP**  
  Convert JPG and JPEG images into WEBP files for smaller output size.

- **PNG to ICO**  
  Create ICO files from PNG images for favicons and app icons.

### Document conversion

- **Image to PDF**  
  Convert JPG, JPEG, PNG, and HEIC images into a single PDF document.

- **DOCX to PDF**  
  Generate PDF output from DOCX files for quick document workflows.

- **PDF to DOCX**  
  Generate DOCX output from PDF files.

- **PDF to PPTX**  
  Generate PPTX output from PDF files.

## Product and SEO support

- App metadata for search engines.
- Per-tool SEO titles and descriptions.
- Open Graph and Twitter card metadata.
- Dynamic social preview image.
- Browser favicon and app icons.
- Apple touch icon.
- Web app manifest.
- Sitemap at `/sitemap.xml`.
- Robots file at `/robots.txt`.
- JSON-LD `WebApplication` structured data.

## Tech stack

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Motion**
- **Lucide React**
- **jsPDF**
- **JSZip**
- **@imgly/background-removal-node**

## Local setup

### Prerequisites

- Node.js `24.18.0`
- Yarn `1.22.22`

The project includes Volta settings in `package.json`, so Volta users will automatically use the expected Node and Yarn versions.

### Install dependencies

```bash
yarn install
```

### Run development server

```bash
yarn dev
```

Open:

```text
http://localhost:3000
```

### Build for production

```bash
yarn build
```

### Run production build locally

```bash
yarn start
```

## Environment variables

Set this in production so canonical URLs, sitemap URLs, Open Graph URLs, and structured data point to the deployed domain:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

If this is not set, the app uses `VERCEL_URL` when available, then falls back to `http://localhost:3000`.

## Background removal deployment notes

The background removal route runs on the Node.js runtime:

```text
/api/remove-background
```

It uses `@imgly/background-removal-node`, ONNX runtime, Sharp, and the small model for better serverless compatibility. The Next config includes file tracing rules so Vercel bundles the required model and native runtime files.

Relevant files:

- `src/app/api/remove-background/route.ts`
- `next.config.ts`

## Project structure

```text
src/app
  api/remove-background     Background removal API route
  tools/[kind]              Individual tool pages with SEO metadata
  layout.tsx                Global metadata, icons, JSON-LD
  manifest.ts               Web app manifest
  opengraph-image.tsx       Social preview image
  robots.ts                 Robots file
  sitemap.ts                Sitemap

src/components
  ConvertApp.tsx            Main app shell and tool registry
  converters/               Individual converter tools
  converters/shared/        Shared converter utilities and types

public
  favicon and app icon assets
```

## Useful commands

```bash
yarn dev      # Start local development server
yarn build    # Create production build
yarn start    # Run production build
```

## License note

This project uses `@imgly/background-removal-node` for background removal. Check the package license before using this app commercially.
