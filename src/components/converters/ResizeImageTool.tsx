"use client";

import { useCallback, useState } from "react";
import ImageToolPanel from "@/components/converters/shared/ImageToolPanel";
import { resizeRasterImage } from "@/components/converters/shared/converterUtils";
import type { ConverterComponentProps } from "@/components/converters/shared/types";

type ResizeMethod = "pixels" | "percentage";

function ResizeImageTool({ config }: ConverterComponentProps): React.ReactElement {
  const [method, setMethod] = useState<ResizeMethod>("pixels");
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [percent, setPercent] = useState(50); // 25% smaller, 50% smaller, 75% smaller

  const convertFile = useCallback(
    async (file: File): Promise<Blob> => {
      if (method === "percentage") {
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
        const factor = (100 - percent) / 100;
        const w = Math.max(1, Math.round(img.naturalWidth * factor));
        const h = Math.max(1, Math.round(img.naturalHeight * factor));
        return resizeRasterImage(file, { width: w, height: h, maintainAspectRatio: false });
      } else {
        return resizeRasterImage(file, { width, height, maintainAspectRatio });
      }
    },
    [method, percent, width, height, maintainAspectRatio]
  );

  return (
    <ImageToolPanel
      config={config}
      convertFile={convertFile}
      controls={
        <div className="flex w-full flex-col gap-4 rounded-2xl border border-white/[.06] bg-white/[.03] p-5 sm:w-80">
          <h3 className="text-sm font-extrabold text-white pb-2 border-b border-white/[.06]">Resize options</h3>
          
          {/* Method Selector */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-950 p-1">
            {(["pixels", "percentage"] as ResizeMethod[]).map((m) => (
              <button
                className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                  method === m ? "btn-gradient shadow-md" : "text-zinc-400 hover:text-zinc-200"
                }`}
                key={m}
                onClick={() => setMethod(m)}
                type="button"
              >
                {m === "pixels" ? "By Pixels" : "By Percentage"}
              </button>
            ))}
          </div>

          {method === "pixels" ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4 text-xs font-semibold text-zinc-400">
                <span>Width (px)</span>
                <input
                  className="w-24 rounded-xl border border-white/[.08] bg-[#0b0e18] px-3 py-2 text-right text-sm text-white transition focus:border-[#6C63FF]/50 focus:ring-1 focus:ring-[#6C63FF]/30"
                  min={1}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  type="number"
                  value={width}
                />
              </div>
              <div className="flex items-center justify-between gap-4 text-xs font-semibold text-zinc-400">
                <span>Height (px)</span>
                <input
                  className="w-24 rounded-xl border border-white/[.08] bg-[#0b0e18] px-3 py-2 text-right text-sm text-white transition focus:border-[#6C63FF]/50 focus:ring-1 focus:ring-[#6C63FF]/30"
                  min={1}
                  disabled={maintainAspectRatio}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  type="number"
                  value={height}
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400 cursor-pointer mt-1">
                <input
                  checked={maintainAspectRatio}
                  onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                  type="checkbox"
                />
                Maintain aspect ratio
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="text-xs font-semibold text-zinc-400">Scale reduction:</div>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-950 p-1">
                {[25, 50, 75].map((pct) => (
                  <button
                    className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                      percent === pct ? "btn-gradient shadow-md" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                    key={pct}
                    onClick={() => setPercent(pct)}
                    type="button"
                  >
                    -{pct}%
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-white/[.04] bg-white/[.02] p-2.5 text-center text-xs font-medium text-zinc-500">
                Images will be resized to {100 - percent}% of their original dimensions.
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}

export default ResizeImageTool;
