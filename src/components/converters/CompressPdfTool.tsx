"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { acceptedExtensions, downloadBlob, formatSize, getExt, generateSampleFile } from "@/components/converters/shared/converterUtils";
import type { ConverterComponentProps } from "@/components/converters/shared/types";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FileText,
  FileUp,
  FolderArchive,
  Info,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2,
  UploadCloud,
  X,
  XCircle,
  Shrink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface QueuedFile {
  id: string;
  file: File;
  previewUrl?: string;
  status: "ready" | "loading-preview" | "converting" | "done" | "error";
  error?: string;
  compressedBlob?: Blob;
  compressedSize?: number;
  savedPercent?: number;
}

type CompressionLevel = "extreme" | "recommended" | "less";

interface CompressionPreset {
  id: CompressionLevel;
  title: string;
  description: string;
  scale: number;
  quality: number;
}

const PRESETS: CompressionPreset[] = [
  {
    id: "extreme",
    title: "EXTREME COMPRESSION",
    description: "Less quality, high compression",
    scale: 0.5,
    quality: 0.15
  },
  {
    id: "recommended",
    title: "RECOMMENDED COMPRESSION",
    description: "Good quality, good compression",
    scale: 0.8,
    quality: 0.35
  },
  {
    id: "less",
    title: "LESS COMPRESSION",
    description: "High quality, less compression",
    scale: 1.1,
    quality: 0.55
  }
];

function CompressPdfTool({ config }: ConverterComponentProps): React.ReactElement {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<CompressionLevel>("recommended");

  // Success state stats
  const [result, setResult] = useState<{ originalSize: number; compressedSize: number; savedPercent: number } | null>(null);
  const [lastCompressedBlob, setLastCompressedBlob] = useState<Blob | null>(null);
  const [lastCompressedName, setLastCompressedName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load PDF.js first page thumbnail
  const getPdfFirstPageThumbnail = async (file: File): Promise<string> => {
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
        script.onload = () => {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
          resolve();
        };
        script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"));
        document.head.appendChild(script);
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = (window as any).pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not get canvas context");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    return canvas.toDataURL("image/png");
  };

  const loadPreviewForFile = async (id: string, file: File) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "loading-preview" } : f))
    );
    try {
      const previewUrl = await getPdfFirstPageThumbnail(file);
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, previewUrl, status: "ready" } : f))
      );
    } catch (err) {
      console.error("Preview generation error:", err);
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "ready" } : f))
      );
    }
  };

  const allDone = files.length > 0 && files.every((f) => f.status === "done" || f.status === "error");
  const doneFilesCount = useMemo(() => files.filter((f) => f.status === "done").length, [files]);

  const reset = () => {
    setFiles([]);
    setError("");
    setProcessing(false);
    setResult(null);
    setLastCompressedBlob(null);
    setLastCompressedName("");
  };

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const valid: QueuedFile[] = [];
    let hasInvalid = false;

    Array.from(fileList).forEach((f) => {
      const ext = getExt(f.name);
      if (ext === "pdf") {
        const id = `${f.name}-${f.size}-${Date.now()}-${Math.random()}`;
        valid.push({
          id,
          file: f,
          status: "ready"
        });
      } else {
        hasInvalid = true;
      }
    });

    if (hasInvalid) {
      setError("Some files had invalid type. Allowed formats: PDF.");
      window.setTimeout(() => setError(""), 2500);
    }

    if (valid.length === 0) return;
    
    setFiles((prev) => [...prev, ...valid]);

    // Generate previews asynchronously
    valid.forEach((vf) => {
      loadPreviewForFile(vf.id, vf.file);
    });
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles?.length) addFiles(selectedFiles);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
  };

  const loadSample = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const sample = await generateSampleFile(".pdf", "Project Brain v2");
      const file = new File([sample], "Project Brain v2.docx.pdf", { type: "application/pdf" });
      addFiles([file]);
    } catch (err) {
      setError("Failed to generate sample PDF");
      window.setTimeout(() => setError(""), 2500);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      return prev.filter((_, i) => i !== index);
    });
  };

  const compressSinglePdf = async (queued: QueuedFile, preset: CompressionPreset): Promise<Blob> => {
    const { PDFDocument } = await import("pdf-lib");
    const originalSize = queued.file.size;
    const arrayBuffer = await queued.file.arrayBuffer();

    // 1. Try vector-copy stream compression first (keeps high vector text quality)
    const vectorPdf = await PDFDocument.create();
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const copiedPages = await vectorPdf.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach((page) => vectorPdf.addPage(page));
    const vectorBytes = await vectorPdf.save({ useObjectStreams: true });
    const vectorBlob = new Blob([vectorBytes as any], { type: "application/pdf" });

    // 2. Try rasterized canvas JPEG compression
    let rasterBlob: Blob | null = null;
    try {
      if (!(window as any).pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
          script.onload = () => {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
            resolve();
          };
          script.onerror = () => reject(new Error("Failed to load PDF.js"));
          document.head.appendChild(script);
        });
      }

      const pdfjsDoc = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const destPdfDoc = await PDFDocument.create();

      for (let pageNum = 1; pageNum <= pdfjsDoc.numPages; pageNum++) {
        const page = await pdfjsDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: preset.scale });
        
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not get canvas context");
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        const jpegDataUrl = canvas.toDataURL("image/jpeg", preset.quality);
        const base64Data = jpegDataUrl.split(",")[1];
        if (!base64Data) throw new Error("Failed to export image from canvas");

        const binaryString = window.atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const embeddedJpg = await destPdfDoc.embedJpg(bytes);
        const jpgSize = embeddedJpg.size();

        const pointsWidth = jpgSize.width * (72 / (72 * preset.scale));
        const pointsHeight = jpgSize.height * (72 / (72 * preset.scale));

        const destPage = destPdfDoc.addPage([pointsWidth, pointsHeight]);
        destPage.drawImage(embeddedJpg, {
          x: 0,
          y: 0,
          width: pointsWidth,
          height: pointsHeight
        });
      }

      const rasterBytes = await destPdfDoc.save({ useObjectStreams: true });
      rasterBlob = new Blob([rasterBytes as any], { type: "application/pdf" });
    } catch (err) {
      console.error("Rasterized compression failed, falling back to vector:", err);
    }

    // 3. Select the smallest blob
    let finalBlob = vectorBlob;
    if (rasterBlob && rasterBlob.size < vectorBlob.size) {
      finalBlob = rasterBlob;
    }

    // 4. Fallback to original file if the compressed size is still larger
    if (finalBlob.size > originalSize) {
      finalBlob = new Blob([arrayBuffer], { type: "application/pdf" });
    }

    return finalBlob;
  };

  const handleCompression = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setFiles((prev) => prev.map((f) => ({ ...f, status: "converting" })));

    const preset = PRESETS.find((p) => p.id === selectedPreset) ?? PRESETS[1];

    try {
      let totalOriginal = 0;
      let totalCompressed = 0;
      let lastBlob: Blob | null = null;
      let lastName = "";

      for (let i = 0; i < files.length; i++) {
        const queued = files[i];
        const originalSize = queued.file.size;
        totalOriginal += originalSize;

        const compressedBlob = await compressSinglePdf(queued, preset);
        const compressedSize = compressedBlob.size;
        totalCompressed += compressedSize;
        lastBlob = compressedBlob;

        const fileSavedPercent = originalSize > 0 
          ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
          : 0;

        const outputName = queued.file.name.replace(/\.[^.]+$/, "") + "_compressed.pdf";
        lastName = outputName;
        downloadBlob(compressedBlob, outputName);
        
        setFiles((prev) =>
          prev.map((f, idx) => 
            idx === i 
              ? { 
                  ...f, 
                  status: "done", 
                  compressedBlob, 
                  compressedSize, 
                  savedPercent: fileSavedPercent 
                } 
              : f
          )
        );
      }

      setLastCompressedBlob(lastBlob);
      setLastCompressedName(lastName);

      const savedPercent = totalOriginal > 0 
        ? Math.max(0, Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100)) 
        : 0;

      setResult({
        originalSize: totalOriginal,
        compressedSize: totalCompressed,
        savedPercent
      });
    } catch (err) {
      console.error("PDF compression error:", err);
      setFiles((prev) => prev.map((f) => ({ ...f, status: "error", error: "Compression failed" })));
      setError("Failed to compress PDF documents.");
      window.setTimeout(() => setError(""), 2500);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <section className="glass-card p-4 shadow-2xl shadow-black/30 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#00D4FF] text-white sm:h-14 sm:w-14">
            <Shrink className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold text-white sm:text-2xl">{config.title}</h2>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">Compress PDF documents online in your browser while keeping quality.</p>
          </div>
        </div>
        {files.length > 0 && (
          <div className="flex w-fit items-center gap-2 rounded-full border border-white/[.06] bg-white/[.03] px-4 py-2 text-sm font-semibold text-zinc-400">
            <FolderArchive className="h-4 w-4 gradient-text" />
            {doneFilesCount}/{files.length} ready
          </div>
        )}
      </div>

      {/* Split grid layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left Column: Dropzone or Files Grid */}
        <div className="relative flex flex-col gap-5">
          {files.length === 0 ? (
            /* Upload Zone */
            <motion.div
              className={`upload-zone relative grid min-h-56 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed p-6 text-center transition-colors sm:min-h-64 sm:p-8 ${
                dragging ? "dragging border-[#00D4FF] bg-[#00D4FF]/[.06]" : "border-white/[.08] bg-white/[.02] hover:border-white/15 hover:bg-white/[.04]"
              } ${error ? "border-rose-400/40 bg-rose-400/[.06]" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(108,99,255,.1),transparent_60%)]" />
              <div className="relative flex max-w-sm flex-col items-center">
                <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#00D4FF] text-white shadow-xl shadow-indigo-950/30 sm:h-20 sm:w-20">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <div className="text-xl font-extrabold text-white sm:text-2xl">Drop PDF files here</div>
                <div className="mt-2 text-sm text-zinc-500">or click to browse from your device</div>
                <div className="mt-4 flex flex-col items-center gap-3">
                  <span className="rounded-full border border-white/[.06] bg-white/[.03] px-3 py-1.5 text-xs font-medium text-zinc-400">Accepts PDF</span>
                  <button
                    className="mt-1 inline-flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-2 text-xs font-bold text-zinc-300 transition hover:border-[#6C63FF]/30 hover:bg-[#6C63FF]/10 hover:text-white"
                    onClick={loadSample}
                    type="button"
                  >
                    Try with a sample PDF
                  </button>
                </div>
                {error ? <div className="mt-3 text-sm font-semibold text-rose-300">{error}</div> : null}
              </div>
            </motion.div>
          ) : (
            /* Visual Files Queue with floating controls */
            <div className="flex flex-row gap-4 relative items-start">
              {/* Grid of PDFs */}
              <div className="flex-1 rounded-2xl border border-white/[.06] bg-black/20 p-6 min-h-[300px]">
                <div className="mb-6 flex items-center justify-between">
                  <div className="text-sm font-bold text-white">
                    Files <span className="ml-2 rounded-full bg-white/[.06] px-2.5 py-1 text-xs font-medium text-zinc-400">{files.length} PDFs</span>
                  </div>
                  <button className="btn-ghost inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs" onClick={reset} type="button">
                    <Trash2 className="h-3.5 w-3.5" /> Clear All
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                  {files.map((item, index) => (
                    <PdfCard
                      key={item.id}
                      item={item}
                      index={index}
                      removeFile={removeFile}
                    />
                  ))}
                </div>
              </div>

              {/* Floating Action Button */}
              <div className="flex flex-col gap-3 sticky top-24 pt-2">
                <div className="relative">
                  <button
                    className="grid h-12 w-12 place-items-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition hover:scale-105 active:scale-95 animate-in fade-in zoom-in"
                    onClick={() => fileInputRef.current?.click()}
                    title="Add PDF Files"
                    type="button"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black border border-white/20 text-[10px] font-black text-white">
                    {files.length}
                  </span>
                </div>
              </div>
            </div>
          )}
          <input
            accept=".pdf"
            className="hidden"
            id="compress-pdf-file-input"
            multiple
            onChange={handleInputChange}
            ref={fileInputRef}
            type="file"
          />
        </div>

        {/* Right Column: PDF Options / Success Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="flex w-full flex-col gap-5 rounded-2xl border border-white/[.06] bg-[#0b0e18]/80 p-5 shadow-xl min-h-[300px] justify-between">
            {result ? (
              /* Success Stats UI matching screenshot */
              <div className="flex flex-col gap-6 p-1 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-center text-lg font-black text-white pb-3 border-b border-white/[.06]">
                  Compression Complete
                </h3>

                <div className="flex items-center gap-5 my-4">
                  {/* SVG Circular Progress Ring */}
                  <div className="relative h-24 w-24 shrink-0">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 96 96">
                      <circle
                        cx="48"
                        cy="48"
                        r="38"
                        className="stroke-zinc-800 fill-transparent"
                        strokeWidth="7"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="38"
                        className="stroke-red-500 fill-transparent transition-all duration-1000 ease-out"
                        strokeWidth="7"
                        strokeDasharray="238.76"
                        strokeDashoffset={238.76 - (238.76 * result.savedPercent) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Centered saved text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-white leading-none">
                        {result.savedPercent}%
                      </span>
                      <span className="text-[9px] font-bold text-zinc-500 tracking-wider mt-1 uppercase">
                        SAVED
                      </span>
                    </div>
                  </div>

                  {/* Size Comparison Stats */}
                  <div className="flex flex-col gap-1.5">
                    <div className="text-sm font-bold text-white leading-snug">
                      Your PDF {files.length > 1 ? "files are" : "is"} now {result.savedPercent}% smaller!
                    </div>
                    <div className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-zinc-300">{formatSize(result.originalSize)}</span>
                      <span className="text-zinc-600 font-black">→</span>
                      <span className="text-emerald-400 font-extrabold">{formatSize(result.compressedSize)}</span>
                    </div>
                  </div>
                </div>

                {/* Success Sidebar Buttons */}
                <div className="flex flex-col gap-2.5">
                  <button
                    className="btn-gradient w-full py-4 flex items-center justify-center gap-2 text-sm font-black"
                    onClick={() => {
                      if (lastCompressedBlob && lastCompressedName) {
                        downloadBlob(lastCompressedBlob, lastCompressedName);
                      }
                    }}
                    type="button"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    className="btn-ghost w-full py-3.5 text-xs font-bold"
                    onClick={reset}
                    type="button"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            ) : (
              /* Presets & Compress Button Panel */
              <>
                <div className="flex flex-col gap-5">
                  <h3 className="text-center text-lg font-black text-white pb-3 border-b border-white/[.06]">
                    Compression level
                  </h3>

                  {/* Presets List */}
                  <div className="flex flex-col gap-3">
                    {PRESETS.map((preset) => {
                      const isSelected = selectedPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "border-[#6C63FF]/30 bg-[#6C63FF]/10 text-white"
                              : "border-white/[.06] bg-black/20 text-zinc-400 hover:bg-[#10142a] hover:border-white/10"
                          }`}
                          onClick={() => setSelectedPreset(preset.id)}
                          type="button"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-black tracking-wider text-rose-500">
                              {preset.title}
                            </span>
                            <span className="text-[11px] text-zinc-400 font-semibold">
                              {preset.description}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Compress Button */}
                <div className="flex flex-col gap-2.5">
                  <button
                    className="btn-gradient w-full py-4 mt-2 flex items-center justify-center gap-2 text-sm font-black tracking-wide"
                    disabled={files.length === 0 || processing}
                    onClick={handleCompression}
                    type="button"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Compressing...</span>
                      </>
                    ) : (
                      <>
                        <span>Compress PDF</span>
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-red-500 shadow-sm ml-0.5">
                          <ArrowRight className="h-3 w-3 stroke-[3]" />
                        </span>
                      </>
                    )}
                  </button>
                  {error ? <div className="text-center text-xs text-rose-400 font-bold">{error}</div> : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

interface PdfCardProps {
  item: QueuedFile;
  index: number;
  removeFile: (index: number) => void;
}

function PdfCard({ item, index, removeFile }: PdfCardProps): React.ReactElement {
  return (
    <div className="group relative flex flex-col items-center rounded-xl border border-white/[.06] bg-[#0b0e18]/80 p-3.5 transition select-none">
      {/* Delete/Remove or Individual Download on hover */}
      <div className="absolute inset-0 z-20 flex items-center justify-center gap-1.5 rounded-xl bg-black/80 opacity-0 transition-opacity group-hover:opacity-100 p-2">
        {item.compressedBlob && (
          <button
            className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
            onClick={() => downloadBlob(item.compressedBlob!, item.file.name.replace(/\.[^.]+$/, "") + "_compressed.pdf")}
            type="button"
            title="Download Compressed PDF"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
        <button
          className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
          onClick={() => removeFile(index)}
          type="button"
          title="Remove File"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Visual representation of a PDF sheet */}
      <div className="relative overflow-hidden rounded-lg bg-white border border-zinc-200 flex items-center justify-center transition-all duration-300 h-44 w-32 shadow-lg shadow-black/30">
        {item.previewUrl ? (
          <img
            alt="pdf page preview"
            className="h-full w-full object-contain rounded"
            src={item.previewUrl}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-3 text-center">
            <FileText className="h-10 w-10 text-red-500 mb-2" />
            <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">
              {item.status === "loading-preview" ? "Loading..." : "PDF Page 1"}
            </span>
            {item.status === "loading-preview" && (
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400 mt-2" />
            )}
          </div>
        )}
      </div>

      {/* Filename footer & size changes */}
      <div className="mt-3 w-full text-center">
        <div className="truncate text-xs font-semibold text-zinc-300 px-1" title={item.file.name}>
          {item.file.name}
        </div>
        
        {item.status === "done" && item.compressedSize !== undefined && item.savedPercent !== undefined ? (
          <div className="mt-1.5 flex flex-col items-center gap-1">
            <div className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full animate-in zoom-in duration-300">
              <span>{item.savedPercent}% Saved</span>
            </div>
            <div className="text-[9px] text-zinc-400 font-semibold truncate w-full px-0.5">
              {formatSize(item.file.size)} → {formatSize(item.compressedSize)}
            </div>
          </div>
        ) : (
          <div className="mt-0.5 text-[10px] text-zinc-500">
            {formatSize(item.file.size)}
          </div>
        )}
      </div>
    </div>
  );
}

export default CompressPdfTool;
