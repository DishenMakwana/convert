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
  ArrowUpDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface QueuedFile {
  id: string;
  file: File;
  previewUrl?: string;
  status: "ready" | "loading-preview" | "converting" | "done" | "error";
  error?: string;
}

function MergePdfTool({ config }: ConverterComponentProps): React.ReactElement {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  // Drag and drop sorting state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
    // Canvas dataURLs don't need revocation, but if we had blob object URLs we'd clean them here
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
      const sampleA = await generateSampleFile(".pdf", "Project Brain v2");
      const sampleB = await generateSampleFile(".pdf", "DISHEN_MAKWANA");
      
      const fileA = new File([sampleA], "Project Brain v2.docx.pdf", { type: "application/pdf" });
      const fileB = new File([sampleB], "DISHEN_MAKWANA.pdf", { type: "application/pdf" });

      addFiles([fileA, fileB]);
    } catch (err) {
      setError("Failed to generate sample PDF");
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
      return prev.filter((_, i) => i !== index);
    });
  };

  const sortAlphabetically = () => {
    setFiles((prev) => {
      return [...prev].sort((a, b) => a.file.name.localeCompare(b.file.name));
    });
  };

  const mergePdfs = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setFiles((prev) => prev.map((f) => ({ ...f, status: "converting" })));

    try {
      const { PDFDocument } = await import("pdf-lib");
      const mergedPdf = await PDFDocument.create();

      for (const queued of files) {
        const arrayBuffer = await queued.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }

      const pdfBytes = await mergedPdf.save();
      const pdfBlob = new Blob([pdfBytes as any], { type: "application/pdf" });
      downloadBlob(pdfBlob, "merged_document.pdf");

      setFiles((prev) => prev.map((f) => ({ ...f, status: "done" })));
    } catch (err) {
      console.error("PDF merge error:", err);
      setFiles((prev) => prev.map((f) => ({ ...f, status: "error", error: "Merge failed" })));
      setError("Failed to merge PDF documents.");
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
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">Merge multiple PDF files into one document in your preferred order.</p>
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
                    Try with sample PDFs
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
                    Pages <span className="ml-2 rounded-full bg-white/[.06] px-2.5 py-1 text-xs font-medium text-zinc-400">{files.length} PDFs</span>
                  </div>
                  <button className="btn-ghost inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs" onClick={reset} type="button">
                    <Trash2 className="h-3.5 w-3.5" /> Clear All
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                  {files.map((item, index) => (
                    <PdfGridCard
                      key={item.id}
                      item={item}
                      index={index}
                      filesLength={files.length}
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
              </div>

              {/* Floating Action Buttons Area */}
              <div className="flex flex-col gap-3 sticky top-24 pt-2">
                {/* Add files floating button */}
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

                {/* Sort floating button */}
                <button
                  className="grid h-12 w-12 place-items-center rounded-full bg-white hover:bg-zinc-100 text-zinc-800 dark:bg-[#10142a] dark:text-zinc-200 dark:hover:bg-[#181d3d] border border-white/10 shadow-lg shadow-black/20 transition hover:scale-105 active:scale-95 animate-in fade-in zoom-in"
                  onClick={sortAlphabetically}
                  title="Sort Alphabetically A-Z"
                  type="button"
                >
                  <ArrowUpDown className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
          <input
            accept=".pdf"
            className="hidden"
            id="merge-pdf-file-input"
            multiple
            onChange={handleInputChange}
            ref={fileInputRef}
            type="file"
          />
        </div>

        {/* Right Column: PDF Actions Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="flex w-full flex-col gap-5 rounded-2xl border border-white/[.06] bg-[#0b0e18]/80 p-5 shadow-xl min-h-[300px] justify-between">
            <div className="flex flex-col gap-5">
              <h3 className="text-center text-lg font-black text-white pb-3 border-b border-white/[.06]">
                Merge PDF
              </h3>

              {/* Instructions Blue Alert Box */}
              <div className="flex gap-3 rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-sky-400">
                <Info className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold leading-relaxed">
                  To change the order of your PDFs, drag and drop the files as you want.
                </p>
              </div>
            </div>

            {/* Merge PDF Button */}
            <div className="flex flex-col gap-2.5">
              <button
                className="btn-gradient w-full py-4 mt-2 flex items-center justify-center gap-2 text-sm font-black tracking-wide"
                disabled={files.length === 0 || processing}
                onClick={mergePdfs}
                type="button"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Merging...</span>
                  </>
                ) : allDone ? (
                  <>
                    <RefreshCcw className="h-4 w-4" />
                    <span>Merge Again</span>
                  </>
                ) : (
                  <>
                    <span>Merge PDF</span>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-red-500 shadow-sm ml-0.5">
                      <ArrowRight className="h-3 w-3 stroke-[3]" />
                    </span>
                  </>
                )}
              </button>
              {error ? <div className="text-center text-xs text-rose-400 font-bold">{error}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface PdfGridCardProps {
  item: QueuedFile;
  index: number;
  filesLength: number;
  draggedIndex: number | null;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
  moveLeft: (index: number) => void;
  moveRight: (index: number) => void;
  removeFile: (index: number) => void;
}

function PdfGridCard({
  item,
  index,
  filesLength,
  draggedIndex,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  moveLeft,
  moveRight,
  removeFile
}: PdfGridCardProps): React.ReactElement {
  return (
    <div
      className={`group relative flex flex-col items-center rounded-xl border p-3.5 transition cursor-grab active:cursor-grabbing select-none ${
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
      <div className="absolute inset-0 z-20 flex items-center justify-center gap-1.5 rounded-xl bg-black/80 opacity-0 transition-opacity group-hover:opacity-100 p-2">
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

      {/* Filename footer */}
      <div className="mt-3 w-full text-center">
        <div className="truncate text-xs font-semibold text-zinc-300 px-1" title={item.file.name}>
          {item.file.name}
        </div>
        <div className="mt-0.5 text-[10px] text-zinc-500">
          {formatSize(item.file.size)}
        </div>
      </div>
    </div>
  );
}

export default MergePdfTool;
