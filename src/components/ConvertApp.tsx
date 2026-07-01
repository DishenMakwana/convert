"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Archive,
  ArrowLeft,
  BadgeIcon,
  Crop,
  FileArchive,
  FileImage,
  FileText,
  Image,
  Layers,
  Menu,
  Presentation,
  RotateCw,
  ScanLine,
  Scissors,
  Shrink,
  Sparkles,
  Wand2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import CompressImageTool from "./converters/CompressImageTool";
import CropImageTool from "./converters/CropImageTool";
import DocxToPdfConverter from "./converters/DocxToPdfConverter";
import JpegToPngConverter from "./converters/JpegToPngConverter";
import JpegToWebpConverter from "./converters/JpegToWebpConverter";
import PdfToDocxConverter from "./converters/PdfToDocxConverter";
import PdfToPptxConverter from "./converters/PdfToPptxConverter";
import PngToIcoConverter from "./converters/PngToIcoConverter";
import PngToJpegConverter from "./converters/PngToJpegConverter";
import PngToWebpConverter from "./converters/PngToWebpConverter";
import RemoveBackgroundTool from "./converters/RemoveBackgroundTool";
import ResizeImageTool from "./converters/ResizeImageTool";
import RotateImageTool from "./converters/RotateImageTool";
import JpgToPdfConverter from "./converters/JpgToPdfConverter";
import type { ConverterConfig } from "./converters/shared/types";

/* ═══════════════════ Converter Registry ═══════════════════ */

const converters: ConverterConfig[] = [
  {
    kind: "compress-image",
    title: "Compress IMAGE",
    description: "Compress JPG, PNG, SVG, and GIF while saving space and maintaining quality.",
    category: "Optimize",
    accent: "bg-emerald-500",
    Icon: Shrink,
    fromLabel: "Compress",
    toLabel: "IMAGE",
    accept: ".jpg,.jpeg,.png,.svg,.gif",
    outputExt: "jpg",
    multiple: true
  },
  {
    kind: "resize-image",
    title: "Resize IMAGE",
    description: "Define new dimensions by pixel and resize JPG, PNG, SVG, and GIF images in bulk.",
    category: "Edit",
    accent: "bg-cyan-500",
    Icon: ScanLine,
    fromLabel: "Resize",
    toLabel: "IMAGE",
    accept: ".jpg,.jpeg,.png,.svg,.gif",
    outputExt: "png",
    multiple: true
  },
  {
    kind: "crop-image",
    title: "Crop IMAGE",
    description: "Crop JPG, PNG, or GIF by defining a rectangle in pixels.",
    category: "Edit",
    accent: "bg-sky-500",
    Icon: Crop,
    fromLabel: "Crop",
    toLabel: "IMAGE",
    accept: ".jpg,.jpeg,.png,.gif",
    outputExt: "png",
    multiple: false
  },
  {
    kind: "png-jpeg",
    title: "PNG to JPG",
    description: "Turn PNG images into JPG in bulk with a simple local converter.",
    category: "Convert",
    accent: "bg-amber-500",
    Icon: Image,
    fromLabel: "PNG",
    toLabel: "JPG",
    accept: ".png",
    outputExt: "jpeg",
    multiple: true
  },
  {
    kind: "jpeg-png",
    title: "JPG to PNG",
    description: "Turn JPG images to PNG. Choose several JPGs and export them at once.",
    category: "Convert",
    accent: "bg-orange-500",
    Icon: FileImage,
    fromLabel: "JPEG",
    toLabel: "PNG",
    accept: ".jpeg,.jpg",
    outputExt: "png",
    multiple: true
  },
  {
    kind: "remove-background",
    title: "Remove Background",
    description: "Remove complex image backgrounds with Node-based AI matting.",
    category: "Edit",
    accent: "bg-lime-500",
    Icon: Scissors,
    fromLabel: "Remove",
    toLabel: "BG",
    accept: ".jpg,.jpeg,.png",
    outputExt: "png",
    multiple: false
  },
  {
    kind: "rotate-image",
    title: "Rotate IMAGE",
    description: "Rotate JPG, PNG, or GIF images by 90, 180, or 270 degrees.",
    category: "Edit",
    accent: "bg-blue-500",
    Icon: RotateCw,
    fromLabel: "Rotate",
    toLabel: "IMAGE",
    accept: ".jpg,.jpeg,.png,.gif",
    outputExt: "png",
    multiple: true
  },
  {
    kind: "png-webp",
    title: "PNG to WEBP",
    description: "Convert PNG images into compact WEBP files and download all as ZIP.",
    category: "Convert",
    accent: "bg-teal-500",
    Icon: Layers,
    fromLabel: "PNG",
    toLabel: "WEBP",
    accept: ".png",
    outputExt: "webp",
    multiple: true
  },
  {
    kind: "jpeg-webp",
    title: "JPEG to WEBP",
    description: "Convert JPG images to WEBP for smaller files with good visual quality.",
    category: "Convert",
    accent: "bg-yellow-500",
    Icon: Archive,
    fromLabel: "JPEG",
    toLabel: "WEBP",
    accept: ".jpeg,.jpg",
    outputExt: "webp",
    multiple: true
  },
  {
    kind: "png-ico",
    title: "PNG to ICO",
    description: "Create ICO files from PNG images for app icons and favicons.",
    category: "Create",
    accent: "bg-indigo-500",
    Icon: BadgeIcon,
    fromLabel: "PNG",
    toLabel: "ICO",
    accept: ".png",
    outputExt: "ico",
    multiple: true
  },
  {
    kind: "docx-pdf",
    title: "DOCX to PDF",
    description: "Create a PDF placeholder from DOCX files for quick client-side export flows.",
    category: "Convert",
    accent: "bg-purple-500",
    Icon: FileText,
    fromLabel: "DOCX",
    toLabel: "PDF",
    accept: ".docx",
    outputExt: "pdf",
    multiple: true
  },
  {
    kind: "pdf-docx",
    title: "PDF to DOCX",
    description: "Generate DOCX placeholders from PDF files for bulk workflow demos.",
    category: "Convert",
    accent: "bg-violet-500",
    Icon: FileArchive,
    fromLabel: "PDF",
    toLabel: "DOCX",
    accept: ".pdf",
    outputExt: "docx",
    multiple: true
  },
  {
    kind: "pdf-pptx",
    title: "PDF to PPTX",
    description: "Generate PPTX placeholders from PDF files in a private local workflow.",
    category: "Convert",
    accent: "bg-fuchsia-500",
    Icon: Presentation,
    fromLabel: "PDF",
    toLabel: "PPTX",
    accept: ".pdf",
    outputExt: "pptx",
    multiple: true
  },
  {
    kind: "jpg-pdf",
    title: "Image to PDF",
    description: "Convert JPG, JPEG, PNG, and HEIC images to a single PDF document.",
    category: "Convert",
    accent: "bg-red-500",
    Icon: FileText,
    fromLabel: "Image",
    toLabel: "PDF",
    accept: ".jpg,.jpeg,.png,.heic",
    outputExt: "pdf",
    multiple: true
  }
];

const categories = ["All", "Optimize", "Create", "Edit", "Convert"] as const;

/* Exactly 5 header nav links */
const primaryNavKinds = [
  "compress-image",
  "resize-image",
  "crop-image",
  "png-jpeg",
  "png-webp"
] as const;

/* ═══════════════════ Render Helper ═══════════════════ */

function renderConverter(config: ConverterConfig): React.ReactElement {
  switch (config.kind) {
    case "docx-pdf":
      return <DocxToPdfConverter config={config} />;
    case "pdf-docx":
      return <PdfToDocxConverter config={config} />;
    case "pdf-pptx":
      return <PdfToPptxConverter config={config} />;
    case "jpeg-png":
      return <JpegToPngConverter config={config} />;
    case "jpeg-webp":
      return <JpegToWebpConverter config={config} />;
    case "png-jpeg":
      return <PngToJpegConverter config={config} />;
    case "png-webp":
      return <PngToWebpConverter config={config} />;
    case "png-ico":
      return <PngToIcoConverter config={config} />;
    case "crop-image":
      return <CropImageTool config={config} />;
    case "compress-image":
      return <CompressImageTool config={config} />;
    case "resize-image":
      return <ResizeImageTool config={config} />;
    case "remove-background":
      return <RemoveBackgroundTool config={config} />;
    case "rotate-image":
      return <RotateImageTool config={config} />;
    case "jpg-pdf":
      return <JpgToPdfConverter config={config} />;
  }
}

/* ═══════════════════ App Header ═══════════════════ */

interface ConvertAppProps {
  initialKind?: string;
  showToolPanel?: boolean;
}

function AppHeader({ activeKind }: { activeKind?: string }): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = converters.filter((c) =>
    primaryNavKinds.includes(c.kind as (typeof primaryNavKinds)[number])
  );

  // Close menu on route change / escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/[.06] bg-[#06080f]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1920px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-white sm:text-3xl" href="/">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D4FF] text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-5 w-5 fill-white" />
            </span>
            <span>Convert</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1.5 md:flex">
            {navItems.map((item) => {
              const isActive = activeKind === item.kind;
              return (
                <Link
                  className={`nav-pill shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? "nav-pill-active"
                      : "border-white/[.06] text-zinc-400 hover:border-white/15 hover:bg-white/[.04] hover:text-zinc-200"
                  }`}
                  href={`/tools/${item.kind}`}
                  key={item.kind}
                >
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/[.06] bg-white/[.03] text-zinc-300 transition hover:bg-white/[.06] md:hidden"
            onClick={() => setMenuOpen(true)}
            type="button"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`mobile-menu-overlay ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Mobile Drawer */}
      <div className={`mobile-menu-drawer ${menuOpen ? "open" : ""}`}>
        <div className="flex items-center justify-between border-b border-white/[.06] px-5 py-4">
          <span className="text-lg font-black text-white">Tools</span>
          <button
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/[.06] text-zinc-400 transition hover:bg-white/[.06] hover:text-white"
            onClick={() => setMenuOpen(false)}
            type="button"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => {
            const Icon = item.Icon;
            const isActive = activeKind === item.kind;
            return (
              <Link
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-indigo-500/10 text-white"
                    : "text-zinc-400 hover:bg-white/[.04] hover:text-zinc-200"
                }`}
                href={`/tools/${item.kind}`}
                key={item.kind}
                onClick={() => setMenuOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
          <div className="my-3 h-px bg-white/[.06]" />
          <Link
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-400 hover:bg-white/[.04] hover:text-zinc-200"
            href="/"
            onClick={() => setMenuOpen(false)}
          >
            <Wand2 className="h-4 w-4" />
            All Tools
          </Link>
        </nav>
      </div>
    </>
  );
}

/* ═══════════════════ ConvertApp ═══════════════════ */

function ConvertApp({ initialKind, showToolPanel = false }: ConvertAppProps): React.ReactElement {
  const initialIndex = Math.max(
    0,
    converters.findIndex((c) => c.kind === initialKind)
  );
  const [activeIndex] = useState(initialIndex);
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("All");
  const activeConverter = converters[activeIndex] ?? converters[0];

  const filteredConverters = useMemo(
    () => (activeCategory === "All" ? converters : converters.filter((c) => c.category === activeCategory)),
    [activeCategory]
  );

  /* ─── Tool Panel View (individual tool page) ─── */
  if (showToolPanel) {
    return (
      <main className="relative min-h-screen text-zinc-100">
        <div className="mesh-bg" />
        <div className="grid-pattern" />
        <AppHeader activeKind={activeConverter.kind} />

        <div className="mx-auto max-w-[1920px] px-4 py-5 sm:px-6 lg:px-10">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center justify-between gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-white/[.06] bg-white/[.03] px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:border-white/15 hover:bg-white/[.06] hover:text-white"
              href="/"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">All tools</span>
            </Link>
            <div className="truncate text-sm font-bold uppercase tracking-wider gradient-text">
              {activeConverter.title}
            </div>
          </div>

          {/* Tool Panel */}
          <motion.section
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 16 }}
            key={activeConverter.kind}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {renderConverter(activeConverter)}
          </motion.section>
        </div>
      </main>
    );
  }

  /* ─── Home View (all tools grid) ─── */
  return (
    <main className="relative min-h-screen text-zinc-100">
      <div className="mesh-bg" />
      <div className="grid-pattern" />
      <AppHeader />

      {/* Hero */}
      <section className="relative isolate overflow-hidden px-4 pb-10 pt-14 sm:px-8 sm:pt-20 lg:pt-24">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-5xl text-center"
          initial={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h1 className="hero-title text-balance text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
            <span className="gradient-text">Every tool</span>{" "}
            <span className="text-white">you need to edit images in bulk</span>
          </h1>
          <p className="hero-subtitle mx-auto mt-5 max-w-2xl text-lg text-zinc-400 sm:text-xl lg:text-2xl">
            Your online photo editor is here and forever free!
          </p>

          {/* Category Filter */}
          <div className="mt-10 flex flex-wrap justify-center gap-2 sm:gap-3">
            {categories.map((cat) => (
              <button
                className={`rounded-full border px-5 py-2.5 text-sm font-bold transition-all duration-200 sm:px-7 sm:py-3 sm:text-base ${
                  activeCategory === cat
                    ? "btn-gradient border-transparent"
                    : "border-white/[.08] bg-white/[.03] text-zinc-400 hover:border-white/15 hover:bg-white/[.06] hover:text-zinc-200"
                }`}
                key={cat}
                onClick={() => setActiveCategory(cat)}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tools Grid */}
        <div className="mx-auto mt-12 grid max-w-[1800px] gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <AnimatePresence mode="popLayout">
            {filteredConverters.map((converter, i) => {
              const Icon = converter.Icon;

              return (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card shimmer-border relative min-h-[220px] p-6 text-left sm:min-h-[240px] sm:p-7"
                  exit={{ opacity: 0, scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  key={converter.kind}
                  layout
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                >
                  <Link
                    className="absolute inset-0 z-10 rounded-[var(--radius-card)]"
                    href={`/tools/${converter.kind}`}
                    aria-label={`Open ${converter.title}`}
                  />

                  {/* Icon */}
                  <div
                    className={`icon-glow mb-6 grid h-12 w-12 place-items-center rounded-xl ${converter.accent} text-white sm:h-14 sm:w-14`}
                  >
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-extrabold text-white sm:text-2xl">
                    {converter.title}
                  </h2>

                  {/* Description */}
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
                    {converter.description}
                  </p>

                  {/* Arrow hint */}
                  <div className="absolute bottom-5 right-5 grid h-8 w-8 place-items-center rounded-lg bg-white/[.04] text-zinc-500 transition-all group-hover:bg-white/[.08] group-hover:text-white">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform">
                      <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}

export default ConvertApp;
