"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { acceptedExtensions, downloadBlob, formatSize, getExt, generateSampleFile } from "@/components/converters/shared/converterUtils";
import type { ConverterComponentProps } from "@/components/converters/shared/types";
import { ArrowLeft, ArrowRight, Check, Download, FileText, FileUp, FolderArchive, Loader2, RefreshCcw, Trash2, UploadCloud, X, XCircle } from "lucide-react";
import { motion } from "motion/react";

interface QueuedFile {
  id: string;
  file: File;
  previewUrl: string;
  status: "ready" | "converting" | "done" | "error";
  error?: string;
}

type PdfOrientation = "portrait" | "landscape";
type PdfPageSize = "fit" | "a4" | "letter";
type PdfMargin = "none" | "small" | "big";

function JpgToPdfConverter({ config }: ConverterComponentProps): React.ReactElement {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  // PDF options
  const [orientation, setOrientation] = useState<PdfOrientation>("portrait");
  const [pageSize, setPageSize] = useState<PdfPageSize>("a4");
  const [margin, setMargin] = useState<PdfMargin>("none");
  const [mergeAll, setMergeAll] = useState(true);

  // Drag and drop sorting state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setFiles((prev) => {
      const next = [...prev];
      const temp = next[draggedIndex];
      next[draggedIndex] = next[index];
      next[index] = temp;
      return next;
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const allDone = files.length > 0 && files.every((f) => f.status === "done" || f.status === "error");
  const doneFilesCount = useMemo(() => files.filter((f) => f.status === "done").length, [files]);

  // Clean up object URLs
  const cleanPreviews = useCallback((list: QueuedFile[]) => {
    list.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
  }, []);

  useEffect(() => {
    return () => cleanPreviews(files);
  }, []);

  const reset = () => {
    cleanPreviews(files);
    setFiles([]);
    setError("");
    setProcessing(false);
  };

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const valid: QueuedFile[] = [];
    let hasInvalid = false;

    // Accepts jpg, jpeg, png, heic
    const allowed = ["jpg", "jpeg", "png", "heic"];

    Array.from(fileList).forEach((f) => {
      const ext = getExt(f.name);
      if (allowed.includes(ext)) {
        valid.push({
          id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
          file: f,
          previewUrl: URL.createObjectURL(f),
          status: "ready"
        });
      } else {
        hasInvalid = true;
      }
    });

    if (hasInvalid) {
      setError("Some files had invalid type. Allowed formats: JPG, JPEG, PNG, HEIC.");
      window.setTimeout(() => setError(""), 2500);
    }

    if (valid.length === 0) return;
    setFiles((prev) => [...prev, ...valid]);
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
      const sample = await generateSampleFile(".png", config.title);
      addFiles([sample]);
    } catch (err) {
      setError("Failed to generate sample image");
      window.setTimeout(() => setError(""), 2500);
    }
  };

  const moveLeft = (index: number) => {
    if (index === 0) return;
    setFiles((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const moveRight = (index: number) => {
    setFiles((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const convertToPdf = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setFiles((prev) => prev.map((f) => ({ ...f, status: "converting" })));

    try {
      const { jsPDF } = await import("jspdf");
      
      const doc = new jsPDF({
        orientation: orientation === "portrait" ? "p" : "l",
        unit: "mm",
        format: "a4"
      });

      const marginMm = margin === "none" ? 0 : margin === "small" ? 5 : 15;

      for (let i = 0; i < files.length; i++) {
        const queued = files[i];
        
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("Failed to load image"));
          el.src = queued.previewUrl;
        });

        const pageOrientation = orientation === "portrait" ? "p" : "l";

        let format: string | number[] = "a4";
        if (pageSize === "letter") {
          format = "letter";
        } else if (pageSize === "fit") {
          const pxToMm = 0.264583;
          format = [img.naturalWidth * pxToMm, img.naturalHeight * pxToMm];
        }

        doc.addPage(format, pageOrientation);

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const usableW = pageWidth - (marginMm * 2);
        const usableH = pageHeight - (marginMm * 2);

        const widthRatio = usableW / img.naturalWidth;
        const heightRatio = usableH / img.naturalHeight;
        
        const scale = (pageSize === "fit" && marginMm === 0)
          ? 0.264583
          : Math.min(widthRatio, heightRatio);

        const drawW = img.naturalWidth * scale;
        const drawH = img.naturalHeight * scale;

        const x = (pageWidth - drawW) / 2;
        const y = (pageHeight - drawH) / 2;

        doc.addImage(img, "JPEG", x, y, drawW, drawH);
      }

      doc.deletePage(1);

      const pdfBlob = doc.output("blob");
      downloadBlob(pdfBlob, "merged_images.pdf");

      setFiles((prev) => prev.map((f) => ({ ...f, status: "done" })));
    } catch (err) {
      setFiles((prev) => prev.map((f) => ({ ...f, status: "error", error: "Failed to compile PDF" })));
      setError("Failed to generate PDF document.");
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
            <FileText className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold text-white sm:text-2xl">{config.title}</h2>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">Batch convert JPG, JPEG, PNG, and HEIC images to a single PDF file.</p>
          </div>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-white/[.06] bg-white/[.03] px-4 py-2 text-sm font-semibold text-zinc-400">
          <FolderArchive className="h-4 w-4 gradient-text" />
          {doneFilesCount}/{files.length} ready
        </div>
      </div>

      {/* Split grid layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left Column: Dropzone & Image Grid Queue */}
        <div className="flex flex-col gap-5">
          {/* Upload Zone */}
          <motion.div
            className={`upload-zone relative grid min-h-56 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed p-6 text-center transition-colors sm:min-h-64 sm:p-8 ${
              dragging ? "dragging border-[#00D4FF] bg-[#00D4FF]/[.06]" : "border-white/[.08] bg-white/[.02] hover:border-white/15 hover:bg-white/[.04]"
            } ${error ? "border-rose-400/40 bg-rose-400/[.06]" : ""}`}
            onClick={() => document.getElementById("jpg-pdf-file-input")?.click()}
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
              <div className="text-xl font-extrabold text-white sm:text-2xl">Drop images here</div>
              <div className="mt-2 text-sm text-zinc-500">or click to browse from your device</div>
              <div className="mt-4 flex flex-col items-center gap-3">
                <span className="rounded-full border border-white/[.06] bg-white/[.03] px-3 py-1.5 text-xs font-medium text-zinc-400">Accepts JPG, JPEG, PNG, HEIC</span>
                <button
                  className="mt-1 inline-flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-2 text-xs font-bold text-zinc-300 transition hover:border-[#6C63FF]/30 hover:bg-[#6C63FF]/10 hover:text-white"
                  onClick={loadSample}
                  type="button"
                >
                  Try with a sample image
                </button>
              </div>
              {error ? <div className="mt-3 text-sm font-semibold text-rose-300">{error}</div> : null}
            </div>
            <input accept=".jpg,.jpeg,.png,.heic" className="hidden" id="jpg-pdf-file-input" multiple onChange={handleInputChange} type="file" />
          </motion.div>

          {/* Image Grid Queue */}
          {files.length > 0 ? (
            <motion.div animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/[.06] bg-black/20 p-4 sm:p-5" initial={{ opacity: 0, y: 12 }}>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-bold text-white">
                  Pages <span className="ml-2 rounded-full bg-white/[.06] px-2.5 py-1 text-xs font-medium text-zinc-400">{files.length} images</span>
                </div>
                <button className="btn-ghost inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs" onClick={reset} type="button">
                  <Trash2 className="h-3.5 w-3.5" /> Clear All
                </button>
              </div>

              {/* Grid of Images */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                {files.map((item, index) => (
                  <ImageGridCard
                    key={item.id}
                    item={item}
                    index={index}
                    filesLength={files.length}
                    orientation={orientation}
                    pageSize={pageSize}
                    margin={margin}
                    draggedIndex={draggedIndex}
                    handleDragStart={handleDragStart}
                    handleDragOver={handleDragOver}
                    handleDragEnd={handleDragEnd}
                    moveLeft={moveLeft}
                    moveRight={moveRight}
                    removeFile={removeFile}
                  />
                ))}
              </div>
            </motion.div>
          ) : null}
        </div>

        {/* Right Column: PDF Options Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="flex w-full flex-col gap-4 rounded-2xl border border-white/[.06] bg-white/[.03] p-5">
            <h3 className="text-sm font-extrabold text-white pb-2 border-b border-white/[.06]">Image to PDF options</h3>

            {/* Page Orientation */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-500">Page Orientation</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3.5 transition-all ${
                    orientation === "portrait"
                      ? "border-[#6C63FF] bg-[#6C63FF]/5 text-white"
                      : "border-white/[.06] bg-[#0b0e18]/40 text-zinc-400 hover:border-white/10 hover:text-zinc-200"
                  }`}
                  onClick={() => setOrientation("portrait")}
                  type="button"
                >
                  {/* Vertical Rectangle shape icon */}
                  <div className={`h-8 w-6 rounded border-2 transition ${orientation === "portrait" ? "border-indigo-400" : "border-zinc-600"}`} />
                  <span className="text-xs font-bold">Portrait</span>
                </button>
                <button
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3.5 transition-all ${
                    orientation === "landscape"
                      ? "border-[#6C63FF] bg-[#6C63FF]/5 text-white"
                      : "border-white/[.06] bg-[#0b0e18]/40 text-zinc-400 hover:border-white/10 hover:text-zinc-200"
                  }`}
                  onClick={() => setOrientation("landscape")}
                  type="button"
                >
                  {/* Horizontal Rectangle shape icon */}
                  <div className={`h-6 w-8 rounded border-2 transition ${orientation === "landscape" ? "border-indigo-400" : "border-zinc-600"}`} />
                  <span className="text-xs font-bold">Landscape</span>
                </button>
              </div>
            </div>

            {/* Page Size */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-zinc-500">Page Size</span>
              <div className="relative">
                <select
                  className="w-full rounded-xl border border-white/[.08] bg-[#0b0e18] px-3.5 py-2.5 text-xs font-semibold text-white transition focus:border-[#6C63FF]/50 focus:ring-1 focus:ring-[#6C63FF]/30 cursor-pointer appearance-none"
                  onChange={(e) => setPageSize(e.target.value as PdfPageSize)}
                  value={pageSize}
                >
                  <option value="a4">A4 (297 x 210 mm)</option>
                  <option value="letter">US Letter (215 x 279 mm)</option>
                  <option value="fit">Fit Image Size</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">▼</div>
              </div>
            </div>

            {/* Margins */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-500">Margin</span>
              <div className="grid grid-cols-3 gap-2">
                {(["none", "small", "big"] as PdfMargin[]).map((opt) => (
                  <button
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 transition-all text-center ${
                      margin === opt
                        ? "border-[#6C63FF] bg-[#6C63FF]/5 text-white"
                        : "border-white/[.06] bg-[#0b0e18]/40 text-zinc-400 hover:border-white/10 hover:text-zinc-200"
                    }`}
                    key={opt}
                    onClick={() => setMargin(opt)}
                    type="button"
                  >
                    {/* Visual Border Box illustration */}
                    <div className="relative h-6 w-8 rounded border border-zinc-600 flex items-center justify-center">
                      {opt !== "none" && (
                        <div className={`absolute rounded border border-dashed border-indigo-400 ${opt === "small" ? "inset-0.5" : "inset-1.5"}`} />
                      )}
                    </div>
                    <span className="text-[10px] font-bold">
                      {opt === "none" ? "No margin" : opt === "small" ? "Small" : "Big"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Combine Checkbox Option */}
            <label className="flex items-center gap-2.5 text-xs font-semibold text-zinc-400 cursor-pointer py-1.5">
              <input
                checked={mergeAll}
                onChange={(e) => setMergeAll(e.target.checked)}
                type="checkbox"
                className="w-4 h-4 cursor-pointer accent-[#6C63FF]"
              />
              <span>Merge all images in one PDF file</span>
            </label>

            {/* Compile PDF Button */}
            <button
              className="btn-gradient w-full py-3.5 mt-2 flex items-center justify-center gap-2 text-sm"
              disabled={files.length === 0 || processing}
              onClick={convertToPdf}
              type="button"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : allDone ? (
                <RefreshCcw className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {processing ? "Compiling..." : allDone ? "Convert Again" : "Convert to PDF"}
            </button>
            {error ? <div className="mt-1 text-center text-xs text-rose-400 font-bold">{error}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

interface ImageGridCardProps {
  item: QueuedFile;
  index: number;
  filesLength: number;
  orientation: PdfOrientation;
  pageSize: PdfPageSize;
  margin: PdfMargin;
  draggedIndex: number | null;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
  moveLeft: (index: number) => void;
  moveRight: (index: number) => void;
  removeFile: (index: number) => void;
}

function ImageGridCard({
  item,
  index,
  filesLength,
  orientation,
  pageSize,
  margin,
  draggedIndex,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  moveLeft,
  moveRight,
  removeFile
}: ImageGridCardProps): React.ReactElement {
  const [imgRatio, setImgRatio] = useState<number>(4 / 3);

  const targetRatio = useMemo(() => {
    if (pageSize === "a4") {
      return orientation === "portrait" ? 210 / 297 : 297 / 210;
    }
    if (pageSize === "letter") {
      return orientation === "portrait" ? 215.9 / 279.4 : 279.4 / 215.9;
    }
    return imgRatio;
  }, [pageSize, orientation, imgRatio]);

  return (
    <div
      className={`group relative flex flex-col items-center rounded-xl border p-3 transition cursor-grab active:cursor-grabbing select-none ${
        draggedIndex === index
          ? "opacity-40 border-[#6C63FF]/50 bg-[#6C63FF]/5 scale-95"
          : "border-white/[.06] bg-[#0b0e18]/80 hover:border-white/15"
      }`}
      draggable
      onDragStart={(e) => handleDragStart(e, index)}
      onDragOver={(e) => handleDragOver(e, index)}
      onDragEnd={handleDragEnd}
    >
      {/* Page Badge */}
      <div className="absolute left-2.5 top-2.5 z-10 grid h-6 w-6 place-items-center rounded-full bg-[#6C63FF] text-[10px] font-black text-white shadow-md">
        {index + 1}
      </div>

      {/* Hover Overlay Controls */}
      <div className="absolute inset-0 z-20 flex items-center justify-center gap-1.5 rounded-xl bg-black/70 opacity-0 transition-opacity group-hover:opacity-100 p-2">
        <button
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/20 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
          disabled={index === 0}
          onClick={() => moveLeft(index)}
          type="button"
          title="Move Left"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/20 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
          disabled={index === filesLength - 1}
          onClick={() => moveRight(index)}
          type="button"
          title="Move Right"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
          onClick={() => removeFile(index)}
          type="button"
          title="Remove Page"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Image Thumbnail frame resizing to target ratio (visual sheet of paper) */}
      <div 
        className="relative overflow-hidden rounded-lg bg-zinc-900 border-2 border-white/25 flex items-center justify-center transition-all duration-300 h-40 shadow-xl shadow-black/40"
        style={{ aspectRatio: targetRatio }}
      >
        {/* Margin Guide (Dashed printable safe area box - highly visible) */}
        <div 
          className={`absolute inset-0 border-2 border-dashed transition-all duration-300 flex items-center justify-center ${
            margin === "none" 
              ? "p-0 m-0 border-transparent" 
              : margin === "small" 
                ? "p-2.5 m-2.5 border-[#00D4FF]/60 bg-[#00D4FF]/[0.02]" 
                : "p-5 m-5 border-[#00D4FF]/80 bg-[#00D4FF]/[0.04]"
          }`}
        >
          {/* Natural Ratio Detection */}
          <img 
            alt="page preview" 
            className="h-full w-full object-contain rounded transition-all duration-300" 
            src={item.previewUrl} 
            onLoad={(e) => {
              const target = e.currentTarget;
              if (target.naturalWidth && target.naturalHeight) {
                setImgRatio(target.naturalWidth / target.naturalHeight);
              }
            }}
          />
        </div>
      </div>

      {/* Filename footer */}
      <div className="mt-2.5 w-full text-center">
        <div className="truncate text-xs font-semibold text-zinc-300 px-1" title={item.file.name}>{item.file.name}</div>
        <div className="mt-0.5 text-[10px] text-zinc-500">{formatSize(item.file.size)}</div>
      </div>
    </div>
  );
}

export default JpgToPdfConverter;
