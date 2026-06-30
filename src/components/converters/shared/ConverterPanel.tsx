"use client";

import { ChangeEvent, DragEvent, useCallback, useMemo, useState } from "react";
import { Check, Download, FileUp, FolderArchive, Loader2, RefreshCcw, Trash2, UploadCloud, X, XCircle } from "lucide-react";
import { motion } from "motion/react";
import JSZip from "jszip";
import type { ConvertedFile, ConverterConfig } from "./types";
import { acceptedExtensions, createReadyFile, downloadBlob, formatSize, getExt, generateSampleFile } from "./converterUtils";

interface ConverterPanelProps {
  config: ConverterConfig;
  convertFile: (file: File) => Promise<Blob>;
}

function ConverterPanel({ config, convertFile }: ConverterPanelProps): React.ReactElement {
  const [files, setFiles] = useState<ConvertedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [bulkPackaging, setBulkPackaging] = useState(false);
  const [generatingSample, setGeneratingSample] = useState(false);

  const Icon = config.Icon;
  const allDone = files.length > 0 && files.every((file) => file.status === "done" || file.status === "error");
  const doneFiles = useMemo(() => files.filter((file) => file.blob), [files]);

  const removeFile = useCallback((indexToRemove: number): void => {
    setFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
  }, []);

  const reset = useCallback((): void => {
    setFiles([]);
    setError("");
    setBulkPackaging(false);
  }, []);


  const addFiles = useCallback(
    (fileList: FileList | File[]): void => {
      const accepts = acceptedExtensions(config.accept);
      const validFiles: ConvertedFile[] = [];
      let hasInvalid = false;

      Array.from(fileList).forEach((file) => {
        if (!accepts.includes(getExt(file.name))) {
          hasInvalid = true;
          return;
        }
        validFiles.push(createReadyFile(file, config.outputExt));
      });

      if (hasInvalid) {
        setError(`Some files had invalid type. Expected: ${config.accept}`);
        window.setTimeout(() => setError(""), 2500);
      }

      if (validFiles.length === 0) return;

      setFiles((existing) => {
        const next = config.multiple ? [...existing] : [];
        validFiles.forEach((item) => {
          const duplicate = next.some((e) => e.source.name === item.source.name && e.source.size === item.source.size);
          if (!duplicate) next.push(item);
        });
        return next;
      });
    },
    [config.accept, config.outputExt, config.multiple]
  );

  const loadSample = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setGeneratingSample(true);
    try {
      const sample = await generateSampleFile(config.accept, config.title);
      addFiles([sample]);
    } catch (err) {
      setError("Failed to generate sample file");
      window.setTimeout(() => setError(""), 2500);
    } finally {
      setGeneratingSample(false);
    }
  }, [config.accept, config.title, addFiles]);


  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const selectedFiles = event.target.files;
      if (selectedFiles?.length) addFiles(selectedFiles);
      event.target.value = "";
    },
    [addFiles]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      setDragging(false);
      if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
    },
    [addFiles]
  );

  const convertOne = useCallback(
    async (index: number): Promise<void> => {
      setFiles((items) => items.map((item, i) => (i === index ? { ...item, status: "converting", error: null } : item)));
      try {
        const source = files[index]?.source;
        if (!source) return;
        const blob = await convertFile(source);
        setFiles((items) =>
          items.map((item, i) =>
            i === index ? { ...item, blob, status: "done", savedBytes: item.source.size - blob.size } : item
          )
        );
      } catch (err) {
        setFiles((items) =>
          items.map((item, i) =>
            i === index ? { ...item, status: "error", error: err instanceof Error ? err.message : "Conversion failed" } : item
          )
        );
      }
    },
    [convertFile, files]
  );

  const convertAll = useCallback(async (): Promise<void> => {
    for (let index = 0; index < files.length; index++) {
      if (files[index]?.status === "done") continue;
      await convertOne(index);
    }
  }, [convertOne, files]);

  const downloadZip = useCallback(async (): Promise<void> => {
    setBulkPackaging(true);
    const zip = new JSZip();
    doneFiles.forEach((file) => {
      if (file.blob) zip.file(file.fileName, file.blob);
    });
    const content = await zip.generateAsync({ type: "blob" });
    downloadBlob(content, `${config.kind}_converted_files.zip`);
    setBulkPackaging(false);
  }, [config.kind, doneFiles]);

  return (
    <section className="glass-card p-4 shadow-2xl shadow-black/30 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#00D4FF] text-white sm:h-14 sm:w-14">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold text-white sm:text-2xl">{config.title}</h2>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">Add files, process in browser, download one-by-one or as ZIP.</p>
          </div>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-full border border-white/[.06] bg-white/[.03] px-4 py-2 text-sm font-semibold text-zinc-400">
          <FolderArchive className="h-4 w-4 gradient-text" />
          {doneFiles.length}/{files.length} ready
        </div>
      </div>

      {/* Upload Zone */}
      <motion.div
        className={`upload-zone relative grid min-h-56 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed p-6 text-center transition-colors sm:min-h-64 sm:p-8 ${
          dragging ? "dragging border-[#00D4FF] bg-[#00D4FF]/[.06]" : "border-white/[.08] bg-white/[.02] hover:border-white/15 hover:bg-white/[.04]"
        } ${error ? "border-rose-400/40 bg-rose-400/[.06]" : ""}`}
        onClick={() => document.getElementById(`${config.kind}-file-input`)?.click()}
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
          <div className="text-xl font-extrabold text-white sm:text-2xl">Drop files here</div>
          <div className="mt-2 text-sm text-zinc-500">or click to browse from your device</div>
          <div className="mt-4 flex flex-col items-center gap-3">
            <span className="rounded-full border border-white/[.06] bg-white/[.03] px-3 py-1.5 text-xs font-medium text-zinc-400">
              Accepts {config.accept}
            </span>
            <button
              className="mt-1 inline-flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-2 text-xs font-bold text-zinc-300 transition hover:border-[#6C63FF]/30 hover:bg-[#6C63FF]/10 hover:text-white disabled:opacity-50"
              disabled={generatingSample}
              onClick={loadSample}
              type="button"
            >
              {generatingSample ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Try with a sample file
            </button>
          </div>
          {error ? <div className="mt-3 text-sm font-semibold text-rose-300">{error}</div> : null}
        </div>
        <input accept={config.accept} className="hidden" id={`${config.kind}-file-input`} multiple={config.multiple} onChange={handleInputChange} type="file" />
      </motion.div>

      {/* Queue */}
      {files.length > 0 ? (
        <motion.div animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl border border-white/[.06] bg-black/20 p-3 sm:p-4" initial={{ opacity: 0, y: 12 }}>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-bold text-white">
              Queue <span className="ml-2 rounded-full bg-white/[.06] px-2.5 py-1 text-xs font-medium text-zinc-400">{files.length} files</span>
            </div>
            <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
              {!allDone ? (
                <button className="btn-gradient inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm" onClick={convertAll} type="button">
                  <RefreshCcw className="h-4 w-4" /> Convert All
                </button>
              ) : (
                <button className="btn-success inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm" disabled={bulkPackaging || doneFiles.length === 0} onClick={downloadZip} type="button">
                  {bulkPackaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download ZIP
                </button>
              )}
              <button className="btn-ghost inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm" onClick={reset} type="button">
                <Trash2 className="h-4 w-4" /> Clear
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            {files.map((item, index) => {
              const savedPct = item.savedBytes !== null ? Math.round((item.savedBytes / item.source.size) * 100) : 0;
              return (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="grid gap-3 rounded-xl border border-white/[.06] bg-[#0b0e18]/80 p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                  initial={{ opacity: 0, x: 12 }}
                  key={`${item.source.name}-${item.source.size}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[.04] text-zinc-400">
                      <FileUp className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white" title={item.source.name}>{item.source.name}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span>{formatSize(item.source.size)}</span>
                        {item.status === "done" ? <span className="text-emerald-400">{savedPct > 0 ? `Saved ${savedPct}%` : "Converted"}</span> : null}
                        {item.error ? <span className="text-rose-400">{item.error}</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                    <span className={`status-${item.status} inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold`}>
                      {item.status === "converting" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {item.status === "done" ? <Check className="h-3.5 w-3.5" /> : null}
                      {item.status === "error" ? <XCircle className="h-3.5 w-3.5" /> : null}
                      {item.status}
                    </span>
                    {item.status === "ready" || item.status === "error" ? (
                      <button className="btn-gradient rounded-xl px-3 py-2 text-xs" onClick={() => void convertOne(index)} type="button">Convert</button>
                    ) : null}
                    {item.blob ? (
                      <button className="btn-success rounded-xl px-3 py-2 text-xs" onClick={() => downloadBlob(item.blob as Blob, item.fileName)} type="button">Download</button>
                    ) : null}
                    <button
                      className="grid h-8 w-8 place-items-center rounded-xl border border-white/[.06] bg-white/[.02] text-zinc-500 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
                      onClick={() => removeFile(index)}
                      type="button"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ) : null}
    </section>
  );
}

export default ConverterPanel;
