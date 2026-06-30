"use client";

import { useCallback, useState } from "react";
import ImageToolPanel from "@/components/converters/shared/ImageToolPanel";
import { compressRasterImage } from "@/components/converters/shared/converterUtils";
import type { ConverterComponentProps } from "@/components/converters/shared/types";

type CompressionMode = "recommended" | "max" | "custom";

function CompressImageTool({ config }: ConverterComponentProps): React.ReactElement {
  const [mode, setMode] = useState<CompressionMode>("recommended");
  const [quality, setQuality] = useState(75);

  const activeQuality = mode === "recommended" ? 75 : mode === "max" ? 45 : quality;

  const convertFile = useCallback(async (file: File): Promise<Blob> => {
    return compressRasterImage(file, activeQuality / 100);
  }, [activeQuality]);

  const sizeEstimate = mode === "recommended" ? "Expected space saved: 50% - 70%" : mode === "max" ? "Expected space saved: 75% - 90%" : `Quality level: ${quality}%`;

  return (
    <ImageToolPanel
      config={config}
      convertFile={convertFile}
      controls={
        <div className="flex w-full flex-col gap-4 rounded-2xl border border-white/[.06] bg-white/[.03] p-5 sm:w-80">
          <h3 className="text-sm font-extrabold text-white pb-2 border-b border-white/[.06]">Compression options</h3>
          
          {/* Mode Tabs */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-950 p-1">
            {(["recommended", "max", "custom"] as CompressionMode[]).map((m) => (
              <button
                className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                  mode === m
                    ? "btn-gradient shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                key={m}
                onClick={() => setMode(m)}
                type="button"
              >
                {m === "recommended" ? "Good" : m === "max" ? "Max" : "Custom"}
              </button>
            ))}
          </div>

          {/* Conditional Slider */}
          {mode === "custom" && (
            <label className="grid w-full gap-2 text-xs font-semibold text-zinc-400">
              <div className="flex items-center justify-between">
                <span>Quality level</span>
                <span className="rounded bg-white/[.06] px-1.5 py-0.5 text-xs font-bold gradient-text">{quality}%</span>
              </div>
              <input max={95} min={20} onChange={(e) => setQuality(Number(e.target.value))} type="range" value={quality} />
            </label>
          )}

          {/* Savings Badge */}
          <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 px-3.5 py-2.5 text-center text-xs font-semibold text-emerald-400">
            {sizeEstimate}
          </div>
        </div>
      }
    />
  );
}

export default CompressImageTool;
