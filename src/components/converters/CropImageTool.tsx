"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { cropRasterImage, downloadBlob, generateSampleFile } from "@/components/converters/shared/converterUtils";
import type { ConverterComponentProps } from "@/components/converters/shared/types";
import { ArrowLeft, Crop, Download, FileUp, Loader2, RefreshCcw, Sparkles, Trash2, UploadCloud, X } from "lucide-react";
import { motion } from "motion/react";

type CropPreset = "custom" | "1:1" | "16:9" | "9:16" | "4:3";

function CropImageTool({ config }: ConverterComponentProps): React.ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  
  // Crop box dimensions in PERCENTAGE (0 to 100) of the image's container width/height
  const [boxX, setBoxX] = useState(10);
  const [boxY, setBoxY] = useState(10);
  const [boxW, setBoxW] = useState(80);
  const [boxH, setBoxH] = useState(80);

  const [preset, setPreset] = useState<CropPreset>("custom");
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load file as data URL
  const loadFile = (f: File) => {
    setFile(f);
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
    setNaturalW(0);
    setNaturalH(0);
    setBoxX(10);
    setBoxY(10);
    setBoxW(80);
    setBoxH(80);
    setPreset("custom");
    setProcessing(false);
  };

  // On Image load, set base layout sizes
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalW(img.naturalWidth);
    setNaturalH(img.naturalHeight);
  };

  // Convert percentage dimensions to actual pixels
  const pxW = Math.max(1, Math.round(naturalW * (boxW / 100)));
  const pxH = Math.max(1, Math.round(naturalH * (boxH / 100)));
  const pxX = Math.max(0, Math.round(naturalW * (boxX / 100)));
  const pxY = Math.max(0, Math.round(naturalH * (boxY / 100)));

  // Sync manual input values back to percentages
  const handleManualSet = (field: "x" | "y" | "w" | "h", value: number) => {
    if (!naturalW || !naturalH) return;
    if (field === "w") {
      const targetW = Math.max(1, Math.min(value, naturalW - pxX));
      const pctW = (targetW / naturalW) * 100;
      setBoxW(pctW);
      if (preset === "1:1") {
        setBoxH((targetW / naturalH) * 100);
      } else if (preset === "16:9") {
        setBoxH(((targetW * (9 / 16)) / naturalH) * 100);
      } else if (preset === "9:16") {
        setBoxH(((targetW * (16 / 9)) / naturalH) * 100);
      } else if (preset === "4:3") {
        setBoxH(((targetW * (3 / 4)) / naturalH) * 100);
      }
    } else if (field === "h") {
      const targetH = Math.max(1, Math.min(value, naturalH - pxY));
      const pctH = (targetH / naturalH) * 100;
      setBoxH(pctH);
    } else if (field === "x") {
      const targetX = Math.max(0, Math.min(value, naturalW - pxW));
      setBoxX((targetX / naturalW) * 100);
    } else if (field === "y") {
      const targetY = Math.max(0, Math.min(value, naturalH - pxH));
      setBoxY((targetY / naturalH) * 100);
    }
  };

  // Preset Ratio change
  const handlePresetSelect = (p: CropPreset) => {
    setPreset(p);
    if (!naturalW || !naturalH) return;
    
    let ratio = 1;
    if (p === "1:1") ratio = 1;
    else if (p === "16:9") ratio = 16 / 9;
    else if (p === "9:16") ratio = 9 / 16;
    else if (p === "4:3") ratio = 4 / 3;

    if (p !== "custom") {
      // Calculate a centered crop box matching the ratio
      let targetW = widthPercentageToPixels(80);
      let targetH = targetW / ratio;
      if (targetH > naturalH) {
        targetH = naturalH * 0.8;
        targetW = targetH * ratio;
      }
      const pctW = (targetW / naturalW) * 100;
      const pctH = (targetH / naturalH) * 100;
      setBoxW(pctW);
      setBoxH(pctH);
      setBoxX((100 - pctW) / 2);
      setBoxY((100 - pctH) / 2);
    }
  };

  const widthPercentageToPixels = (pct: number) => {
    return Math.round(naturalW * (pct / 100));
  };

  // Handle visual drag and resize operations (Mouse & Touch compatible)
  const startInteraction = (
    e: React.MouseEvent | React.TouchEvent,
    type: "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w"
  ) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const startX = clientX;
    const startY = clientY;
    const startBoxX = boxX;
    const startBoxY = boxY;
    const startBoxW = boxW;
    const startBoxH = boxH;

    // Preset ratio constraints
    let ratio = 1;
    if (preset === "1:1") ratio = 1;
    else if (preset === "16:9") ratio = 16 / 9;
    else if (preset === "9:16") ratio = 9 / 16;
    else if (preset === "4:3") ratio = 4 / 3;

    const onMove = (moveX: number, moveY: number) => {
      const deltaX = ((moveX - startX) / rect.width) * 100;
      const deltaY = ((moveY - startY) / rect.height) * 100;

      if (type === "move") {
        setBoxX(Math.max(0, Math.min(startBoxX + deltaX, 100 - startBoxW)));
        setBoxY(Math.max(0, Math.min(startBoxY + deltaY, 100 - startBoxH)));
      } else {
        let newX = startBoxX;
        let newY = startBoxY;
        let newW = startBoxW;
        let newH = startBoxH;

        // X resizing
        if (type.includes("w")) {
          newW = Math.max(5, startBoxW - deltaX);
          newX = startBoxX + startBoxW - newW;
          if (newX < 0) {
            newW = startBoxX + startBoxW;
            newX = 0;
          }
        } else if (type.includes("e")) {
          newW = Math.max(5, Math.min(startBoxW + deltaX, 100 - startBoxX));
        }

        // Y resizing
        if (type.includes("n")) {
          newH = Math.max(5, startBoxH - deltaY);
          newY = startBoxY + startBoxH - newH;
          if (newY < 0) {
            newH = startBoxY + startBoxH;
            newY = 0;
          }
        } else if (type.includes("s")) {
          newH = Math.max(5, Math.min(startBoxH + deltaY, 100 - startBoxY));
        }

        // Apply aspect ratio preset constraints
        if (preset !== "custom") {
          // Adjust height relative to width based on container shape
          // Map percentages to aspect ratio: boxW% * rect.width / (boxH% * rect.height) = ratio
          const scaleFactor = rect.width / rect.height;
          
          if (type === "e" || type === "w" || type === "ne" || type === "se") {
            newH = newW / (ratio * scaleFactor);
            if (type.includes("n")) {
              newY = startBoxY + startBoxH - newH;
            }
          } else {
            newW = newH * (ratio * scaleFactor);
            if (type.includes("w")) {
              newX = startBoxX + startBoxW - newW;
            }
          }

          // Safety Bounds clamp
          if (newX < 0 || newY < 0 || newX + newW > 100 || newY + newH > 100) {
            return; // Reject moves out of bounds
          }
        }

        setBoxX(newX);
        setBoxY(newY);
        setBoxW(newW);
        setBoxH(newH);
      }
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      onMove(moveEvent.clientX, moveEvent.clientY);
    };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length) {
        onMove(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY);
      }
    };

    const handleInteractionEnd = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleInteractionEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleInteractionEnd);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleInteractionEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleInteractionEnd);
  };

  const handleCrop = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const croppedBlob = await cropRasterImage(file, {
        x: pxX,
        y: pxY,
        width: pxW,
        height: pxH
      });
      downloadBlob(croppedBlob, `cropped_${file.name}`);
    } catch (err) {
      setError("Cropping failed");
      window.setTimeout(() => setError(""), 2500);
    } finally {
      setProcessing(false);
    }
  };

  // ─── Phase 1: Upload Dropzone view ───
  if (!file) {
    return (
      <section className="glass-card p-4 shadow-2xl shadow-black/30 sm:p-6 lg:p-8">
        <div className="mb-6 flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#00D4FF] text-white sm:h-14 sm:w-14">
            <Crop className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold text-white sm:text-2xl">{config.title}</h2>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">Crop image visually using relative layout anchors. Support for PNG, JPEG, GIF.</p>
          </div>
        </div>

        <motion.div
          className={`upload-zone relative grid min-h-56 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed p-6 text-center transition-colors sm:min-h-64 sm:p-8 ${
            dragging ? "dragging border-[#00D4FF] bg-[#00D4FF]/[.06]" : "border-white/[.08] bg-white/[.02] hover:border-white/15 hover:bg-white/[.04]"
          } ${error ? "border-rose-400/40 bg-rose-400/[.06]" : ""}`}
          onClick={() => document.getElementById("crop-file-input")?.click()}
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
          <input accept={config.accept} className="hidden" id="crop-file-input" onChange={handleInputChange} type="file" />
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
            <Crop className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold text-white sm:text-2xl">{config.title}</h2>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">Drag overlay boundaries to set crop frame region, then click Crop Image.</p>
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

      {/* Main Split workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left Column: Interactive Crop Canvas */}
        <div className="flex items-center justify-center rounded-2xl border border-white/[.06] bg-black/40 p-4 sm:p-6 min-h-[300px] sm:min-h-[460px]">
          {imageUrl && (
            <div
              className="relative overflow-hidden select-none select-none max-w-full"
              ref={containerRef}
              style={{ width: "fit-content" }}
            >
              {/* Target Image */}
              <img
                alt="Crop preview source"
                className="max-w-full max-h-[500px] object-contain pointer-events-none"
                onLoad={handleImageLoad}
                ref={imageRef}
                src={imageUrl}
              />

              {/* Crop Bounding Box overlay */}
              <div
                className="absolute border-2 border-white cursor-move"
                style={{
                  left: `${boxX}%`,
                  top: `${boxY}%`,
                  width: `${boxW}%`,
                  height: `${boxH}%`,
                  boxShadow: "0 0 0 9999px rgba(6, 8, 15, 0.65)"
                }}
                onMouseDown={(e) => startInteraction(e, "move")}
                onTouchStart={(e) => startInteraction(e, "move")}
              >
                {/* Composition guideline thirds rules */}
                <div className="absolute inset-x-0 top-1/3 border-b border-dashed border-white/30 pointer-events-none" />
                <div className="absolute inset-x-0 top-2/3 border-b border-dashed border-white/30 pointer-events-none" />
                <div className="absolute inset-y-0 left-1/3 border-r border-dashed border-white/30 pointer-events-none" />
                <div className="absolute inset-y-0 left-2/3 border-r border-dashed border-white/30 pointer-events-none" />

                {/* NW handle */}
                <div
                  className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full border border-indigo-500 bg-white cursor-nw-resize"
                  onMouseDown={(e) => startInteraction(e, "nw")}
                  onTouchStart={(e) => startInteraction(e, "nw")}
                />
                {/* NE handle */}
                <div
                  className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full border border-indigo-500 bg-white cursor-ne-resize"
                  onMouseDown={(e) => startInteraction(e, "ne")}
                  onTouchStart={(e) => startInteraction(e, "ne")}
                />
                {/* SW handle */}
                <div
                  className="absolute -left-2.5 -bottom-2.5 h-5 w-5 rounded-full border border-indigo-500 bg-white cursor-sw-resize"
                  onMouseDown={(e) => startInteraction(e, "sw")}
                  onTouchStart={(e) => startInteraction(e, "sw")}
                />
                {/* SE handle */}
                <div
                  className="absolute -right-2.5 -bottom-2.5 h-5 w-5 rounded-full border border-indigo-500 bg-white cursor-se-resize"
                  onMouseDown={(e) => startInteraction(e, "se")}
                  onTouchStart={(e) => startInteraction(e, "se")}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Option Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="flex w-full flex-col gap-4 rounded-2xl border border-white/[.06] bg-white/[.03] p-5">
            <h3 className="text-sm font-extrabold text-white pb-2 border-b border-white/[.06]">Crop options</h3>
            
            {/* Aspect Preset */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-zinc-500">Aspect Ratio Preset</span>
              <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-950 p-1">
                {(["custom", "1:1", "16:9", "9:16", "4:3"] as CropPreset[]).map((p) => (
                  <button
                    className={`flex-1 rounded-lg py-1 px-1.5 text-[10px] font-bold transition-all ${
                      preset === p ? "btn-gradient shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                    key={p}
                    onClick={() => handlePresetSelect(p)}
                    type="button"
                  >
                    {p === "custom" ? "Free" : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs grid */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4 text-xs font-semibold text-zinc-400">
                <span>Width (px)</span>
                <input
                  className="w-24 rounded-xl border border-white/[.08] bg-[#0b0e18] px-3 py-2 text-right text-sm text-white transition focus:border-[#6C63FF]/50 focus:ring-1 focus:ring-[#6C63FF]/30"
                  min={1}
                  onChange={(e) => handleManualSet("w", Number(e.target.value))}
                  type="number"
                  value={pxW}
                />
              </div>
              <div className="flex items-center justify-between gap-4 text-xs font-semibold text-zinc-400">
                <span>Height (px)</span>
                <input
                  className="w-24 rounded-xl border border-white/[.08] bg-[#0b0e18] px-3 py-2 text-right text-sm text-white transition focus:border-[#6C63FF]/50 focus:ring-1 focus:ring-[#6C63FF]/30"
                  min={1}
                  disabled={preset !== "custom"}
                  onChange={(e) => handleManualSet("h", Number(e.target.value))}
                  type="number"
                  value={pxH}
                />
              </div>
              <div className="flex items-center justify-between gap-4 text-xs font-semibold text-zinc-400">
                <span>Position X (px)</span>
                <input
                  className="w-24 rounded-xl border border-white/[.08] bg-[#0b0e18] px-3 py-2 text-right text-sm text-white transition focus:border-[#6C63FF]/50 focus:ring-1 focus:ring-[#6C63FF]/30"
                  min={0}
                  onChange={(e) => handleManualSet("x", Number(e.target.value))}
                  type="number"
                  value={pxX}
                />
              </div>
              <div className="flex items-center justify-between gap-4 text-xs font-semibold text-zinc-400">
                <span>Position Y (px)</span>
                <input
                  className="w-24 rounded-xl border border-white/[.08] bg-[#0b0e18] px-3 py-2 text-right text-sm text-white transition focus:border-[#6C63FF]/50 focus:ring-1 focus:ring-[#6C63FF]/30"
                  min={0}
                  onChange={(e) => handleManualSet("y", Number(e.target.value))}
                  type="number"
                  value={pxY}
                />
              </div>
            </div>

            {/* Crop Button */}
            <button
              className="btn-gradient w-full py-3.5 mt-2 flex items-center justify-center gap-2 text-sm"
              disabled={processing}
              onClick={handleCrop}
              type="button"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crop className="h-4 w-4" />
              )}
              Crop Image
            </button>
            {error ? <div className="mt-1 text-center text-xs text-rose-400 font-bold">{error}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CropImageTool;
