"use client";

import { useState, useRef, useEffect } from "react";
import { removeBackgroundRasterImage, downloadBlob, generateSampleFile } from "@/components/converters/shared/converterUtils";
import type { ConverterComponentProps } from "@/components/converters/shared/types";
import { Check, Download, Loader2, RefreshCcw, Scissors, Trash2, UploadCloud } from "lucide-react";
import { motion } from "motion/react";

function RemoveBackgroundTool({ config }: ConverterComponentProps): React.ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [removedBlob, setRemovedBlob] = useState<Blob | null>(null);
  const [removedBgUrl, setRemovedBgUrl] = useState<string>("");
  
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  
  const [sliderPos, setSliderPos] = useState(50); // % from left to right

  const containerRef = useRef<HTMLDivElement>(null);

  // Cleanup object URL on unmount/reset
  useEffect(() => {
    return () => {
      if (removedBgUrl) {
        URL.revokeObjectURL(removedBgUrl);
      }
    };
  }, [removedBgUrl]);

  const loadFile = (f: File) => {
    setFile(f);
    setRemovedBlob(null);
    if (removedBgUrl) {
      URL.revokeObjectURL(removedBgUrl);
      setRemovedBgUrl("");
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(String(e.target?.result ?? ""));
    };
    reader.readAsDataURL(f);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles?.length) {
      loadFile(selectedFiles[0]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) {
      loadFile(event.dataTransfer.files[0]);
    }
  };

  const loadSample = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const sample = await generateSampleFile(config.accept, config.title);
      loadFile(sample);
    } catch (err) {
      setError("Failed to generate sample image");
      window.setTimeout(() => setError(""), 2500);
    }
  };

  const reset = () => {
    setFile(null);
    setImageUrl("");
    setRemovedBlob(null);
    if (removedBgUrl) {
      URL.revokeObjectURL(removedBgUrl);
      setRemovedBgUrl("");
    }
    setSliderPos(50);
    setProcessing(false);
  };

  const handleRemoveBackground = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const blob = await removeBackgroundRasterImage(file);
      setRemovedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRemovedBgUrl(url);
    } catch (err) {
      setError("Background removal failed");
      window.setTimeout(() => setError(""), 2500);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!removedBlob || !file) return;
    const originalName = file.name.replace(/\.[^.]+$/, "");
    downloadBlob(removedBlob, `${originalName}_no_bg.png`);
  };

  // Drag handlers for the comparison slider (Mouse & Touch supported)
  const startSliderDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    const onMove = (clientX: number) => {
      const xOffset = clientX - rect.left;
      const pct = Math.max(0, Math.min((xOffset / rect.width) * 100, 100));
      setSliderPos(pct);
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      onMove(moveEvent.clientX);
    };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length) {
        onMove(moveEvent.touches[0].clientX);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleMouseUp);
  };

  // ─── Phase 1: Upload Dropzone view ───
  if (!file) {
    return (
      <section className="glass-card p-4 shadow-2xl shadow-black/30 sm:p-6 lg:p-8">
        <div className="mb-6 flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#00D4FF] text-white sm:h-14 sm:w-14">
            <Scissors className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold text-white sm:text-2xl">{config.title}</h2>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">Isolate foreground subjects and output transparent PNG cutouts instantly.</p>
          </div>
        </div>

        <motion.div
          className={`upload-zone relative grid min-h-56 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed p-6 text-center transition-colors sm:min-h-64 sm:p-8 ${
            dragging ? "dragging border-[#00D4FF] bg-[#00D4FF]/[.06]" : "border-white/[.08] bg-white/[.02] hover:border-white/15 hover:bg-white/[.04]"
          } ${error ? "border-rose-400/40 bg-rose-400/[.06]" : ""}`}
          onClick={() => document.getElementById("bg-file-input")?.click()}
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
            <div className="text-xl font-extrabold text-white sm:text-2xl">Drop image here</div>
            <div className="mt-2 text-sm text-zinc-500">or click to browse from your device</div>
            <div className="mt-4 flex flex-col items-center gap-3">
              <span className="rounded-full border border-white/[.06] bg-white/[.03] px-3 py-1.5 text-xs font-medium text-zinc-400">Accepts {config.accept}</span>
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
          <input accept={config.accept} className="hidden" id="bg-file-input" onChange={handleInputChange} type="file" />
        </motion.div>
      </section>
    );
  }

  // ─── Phase 2: Active Workspace view ───
  return (
    <section className="glass-card p-4 shadow-2xl shadow-black/30 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#00D4FF] text-white sm:h-14 sm:w-14">
            <Scissors className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold text-white sm:text-2xl">{config.title}</h2>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
              {removedBgUrl
                ? "Cutout complete! Drag comparison slider to inspect cutout detail."
              : "Upload an image and create an AI cutout."}
            </p>
          </div>
        </div>
        <button
          className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm"
          onClick={reset}
          type="button"
        >
          <Trash2 className="h-4 w-4" /> Clear File
        </button>
      </div>

      {/* Split grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        
        {/* Left Column: Visual Canvas Workspace */}
        <div className="flex items-center justify-center rounded-2xl border border-white/[.06] bg-[#0b0e18]/80 p-4 shadow-inner shadow-black/30 sm:min-h-[460px] sm:p-6 min-h-[300px]">
          {removedBgUrl ? (
            /* COMPARISON SLIDER VIEW */
            <div
              className="relative max-w-full select-none overflow-hidden rounded-xl bg-white shadow-2xl shadow-black/30"
              ref={containerRef}
              style={{ width: "fit-content" }}
            >
              {/* Bottom Layer: Original Image (Shows on the right side) */}
              <img
                alt="Original background"
                className="max-w-full max-h-[500px] object-contain pointer-events-none"
                src={imageUrl}
              />

              {/* Top Layer: Transparent Checkerboard Cutout (Clipped on the left/sliding side) */}
              <div
                className="absolute inset-0 select-none overflow-hidden pointer-events-none"
                style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
              >
                {/* Checkerboard transparency grid background */}
                <div className="absolute inset-0" style={{
                  backgroundColor: "#ffffff",
                  backgroundImage: "conic-gradient(#ffffff 25%, #e2e8f0 0 50%, #ffffff 0 75%, #e2e8f0 0)",
                  backgroundSize: "20px 20px"
                }} />
                <img
                  alt="Transparent cutout"
                  className="w-full h-full object-contain relative z-10"
                  src={removedBgUrl}
                />
              </div>

              {/* Slider Line Divider Drag handle */}
              <div
                className="absolute inset-y-0 w-1 bg-white cursor-ew-resize flex items-center justify-center"
                style={{ left: `${sliderPos}%` }}
                onMouseDown={startSliderDrag}
                onTouchStart={startSliderDrag}
              >
                <div className="h-8 w-8 rounded-full bg-white shadow-xl border border-zinc-300 flex items-center justify-center text-zinc-800 font-black text-xs select-none pointer-events-none">
                  ‹›
                </div>
              </div>
            </div>
          ) : (
            /* ORIGINAL IMAGE PREVIEW (BEFORE CROP) */
            imageUrl && (
              <img
                alt="Source preview"
                className="max-w-full max-h-[500px] object-contain pointer-events-none rounded-lg"
                src={imageUrl}
              />
            )
          )}
        </div>

        {/* Right Column: Settings / Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="flex w-full flex-col gap-4 rounded-2xl border border-white/[.06] bg-white/[.03] p-5">
            {!removedBgUrl ? (
              /* PANEL A: SETTINGS FORM (BEFORE CROP) */
              <>
                <h3 className="text-sm font-extrabold text-white pb-2 border-b border-white/[.06]">Remove background</h3>

                {/* Info Text */}
                <div className="text-[11px] leading-relaxed text-zinc-500">
                  AI matting removes complex backgrounds and exports a transparent PNG.
                </div>

                {/* Remove Background Button */}
                <button
                  className="btn-gradient w-full py-3.5 mt-2 flex items-center justify-center gap-2 text-sm"
                  disabled={processing}
                  onClick={handleRemoveBackground}
                  type="button"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Scissors className="h-4 w-4" />
                  )}
                  Remove background
                </button>
              </>
            ) : (
              /* PANEL B: SUCCESS & DOWNLOAD PANEL */
              <>
                <div className="flex flex-col items-center text-center py-2">
                  <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Check className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-white">Cutout Created!</h3>
                  <p className="mt-1 text-xs text-zinc-500 leading-normal">
                    The background was removed and made transparent.
                  </p>
                </div>

                {/* Download Button */}
                <button
                  className="btn-success w-full py-3.5 flex items-center justify-center gap-2 text-sm"
                  onClick={handleDownload}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  Download Cutout
                </button>

                {/* Reset Option */}
                <button
                  className="btn-ghost w-full py-3 flex items-center justify-center gap-2 text-xs"
                  onClick={() => {
                    if (removedBgUrl) URL.revokeObjectURL(removedBgUrl);
                    setRemovedBgUrl("");
                    setRemovedBlob(null);
                  }}
                  type="button"
                >
                  <RefreshCcw className="h-3 w-3" />
                  Re-process image
                </button>
              </>
            )}

            {error ? <div className="mt-1 text-center text-xs text-rose-400 font-bold">{error}</div> : null}
          </div>
        </div>

      </div>
    </section>
  );
}

export default RemoveBackgroundTool;
