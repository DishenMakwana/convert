import type { Metadata } from "next";
import ConvertApp from "@/components/ConvertApp";

const tools: Record<string, { title: string; description: string }> = {
  "compress-image": {
    title: "Compress Image Online",
    description: "Compress JPG, PNG, SVG, and GIF images online while keeping visual quality."
  },
  "resize-image": {
    title: "Resize Image Online",
    description: "Resize JPG, PNG, SVG, and GIF images by exact pixel dimensions."
  },
  "crop-image": {
    title: "Crop Image Online",
    description: "Crop JPG, PNG, and GIF images with a precise visual crop tool."
  },
  "png-jpeg": {
    title: "PNG to JPG Converter",
    description: "Convert PNG images to JPG online in a fast browser-based workflow."
  },
  "jpeg-png": {
    title: "JPG to PNG Converter",
    description: "Convert JPG and JPEG images to PNG online."
  },
  "remove-background": {
    title: "Remove Background Online",
    description: "Remove complex photo backgrounds with Node-based AI matting and export transparent PNG cutouts."
  },
  "rotate-image": {
    title: "Rotate Image Online",
    description: "Rotate JPG, PNG, and GIF images by 90, 180, or 270 degrees."
  },
  "png-webp": {
    title: "PNG to WEBP Converter",
    description: "Convert PNG images to compact WEBP files online."
  },
  "jpeg-webp": {
    title: "JPEG to WEBP Converter",
    description: "Convert JPG and JPEG images to WEBP for smaller image files."
  },
  "png-ico": {
    title: "PNG to ICO Converter",
    description: "Create ICO favicon and app icon files from PNG images."
  },
  "docx-pdf": {
    title: "DOCX to PDF Converter",
    description: "Convert Word DOCX files to PDF placeholders for quick export workflows."
  },
  "pdf-docx": {
    title: "PDF to DOCX Converter",
    description: "Convert PDF files to DOCX placeholders for document workflow demos."
  },
  "pdf-pptx": {
    title: "PDF to PPTX Converter",
    description: "Convert PDF files to PPTX placeholders for presentation workflow demos."
  },
  "jpg-pdf": {
    title: "Image to PDF Converter",
    description: "Convert JPG, JPEG, PNG, and HEIC images into a single PDF document."
  },
  "merge-pdf": {
    title: "Merge PDF Online",
    description: "Combine and merge multiple PDF documents into a single PDF file online."
  },
  "compress-pdf": {
    title: "Compress PDF Online",
    description: "Reduce the file size of your PDF documents while maintaining the best possible quality."
  }
};

interface ToolPageProps {
  params: Promise<{
    kind: string;
  }>;
}

export function generateStaticParams() {
  return Object.keys(tools).map((kind) => ({ kind }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { kind } = await params;
  const tool = tools[kind] ?? tools["compress-image"];
  const url = `/tools/${kind}`;

  return {
    title: tool.title,
    description: tool.description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title: `${tool.title} | Convert`,
      description: tool.description,
      url,
      type: "website",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${tool.title} by Convert`
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: `${tool.title} | Convert`,
      description: tool.description,
      images: ["/opengraph-image"]
    }
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { kind } = await params;

  return <ConvertApp initialKind={kind} showToolPanel />;
}
