"use client";

import { useCallback, useState } from "react";
import ImageToolPanel from "@/components/converters/shared/ImageToolPanel";
import { rotateRasterImage } from "@/components/converters/shared/converterUtils";
import type { ConverterComponentProps } from "@/components/converters/shared/types";
import { RefreshCw, RotateCw } from "lucide-react";

type RotationFilter = "all" | "landscape" | "portrait";

function RotateImageTool({ config }: ConverterComponentProps): React.ReactElement {
  const [degrees, setDegrees] = useState(90);
  const [filter, setFilter] = useState<RotationFilter>("all");

  const convertFile = useCallback(
    async (file: File): Promise<Blob> => {
      // If filtering is applied, we must inspect the image size first
      if (filter !== "all") {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("Failed to load image"));
            el.src = String(e.target?.result ?? "");
          };
          reader.readAsDataURL(file);
        });

        const isLandscape = img.naturalWidth > img.naturalHeight;
        if (filter === "landscape" && !isLandscape) {
          // Skip rotation, return original file blob
          return file;
        }
        if (filter === "portrait" && isLandscape) {
          // Skip rotation, return original file blob
          return file;
        }
      }
      return rotateRasterImage(file, degrees);
    },
    [degrees, filter]
  );

  return (
    <ImageToolPanel
      config={config}
      convertFile={convertFile}
      controls={
        <div className="flex w-full flex-col gap-4 rounded-2xl border border-white/[.06] bg-white/[.03] p-5 sm:w-80">
          <h3 className="text-sm font-extrabold text-white pb-2 border-b border-white/[.06]">Rotation options</h3>

          {/* Dial Angle Buttons */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-zinc-500">Select Rotation Angle</span>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-950 p-1">
              {[90, 180, 270].map((value) => (
                <button
                  className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                    degrees === value ? "btn-gradient shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  key={value}
                  onClick={() => setDegrees(value)}
                  type="button"
                >
                  {value}°
                </button>
              ))}
            </div>
          </div>

          {/* Direction Info */}
          <div className="flex items-center gap-2.5 rounded-xl border border-white/[.04] bg-white/[.02] px-3 py-2.5 text-xs text-zinc-400">
            <RotateCw className="h-4 w-4 text-cyan-400" />
            <span>Rotates images {degrees === 90 ? "90° Clockwise" : degrees === 180 ? "180° Upside Down" : "90° Counter-Clockwise"}.</span>
          </div>

          {/* Smart orientation filters */}
          <div className="flex flex-col gap-2 mt-1">
            <span className="text-xs font-semibold text-zinc-500">Apply Filter Options</span>
            <div className="grid grid-cols-1 gap-1">
              {(["all", "landscape", "portrait"] as RotationFilter[]).map((f) => (
                <label className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 cursor-pointer" key={f}>
                  <input
                    checked={filter === f}
                    name="rotation-filter"
                    onChange={() => setFilter(f)}
                    type="radio"
                    className="w-4 h-4 cursor-pointer accent-[#6C63FF]"
                  />
                  <span>
                    {f === "all" ? "Rotate all uploaded images" : f === "landscape" ? "Only rotate Landscape images" : "Only rotate Portrait images"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      }
    />
  );
}

export default RotateImageTool;
