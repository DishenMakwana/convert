import type { LucideIcon } from "lucide-react";

export type ConversionStatus = "ready" | "converting" | "done" | "error";

export type ConverterKind =
  | "docx-pdf"
  | "pdf-docx"
  | "pdf-pptx"
  | "jpeg-png"
  | "jpeg-webp"
  | "png-jpeg"
  | "png-webp"
  | "png-ico"
  | "crop-image"
  | "compress-image"
  | "resize-image"
  | "remove-background"
  | "rotate-image"
  | "jpg-pdf"
  | "merge-pdf"
  | "compress-pdf";

export interface ConvertedFile {
  source: File;
  blob: Blob | null;
  fileName: string;
  status: ConversionStatus;
  savedBytes: number | null;
  error: string | null;
}

export interface ConverterConfig {
  kind: ConverterKind;
  title: string;
  description: string;
  category: "Optimize" | "Create" | "Edit" | "Convert" | "Security";
  accent: string;
  Icon: LucideIcon;
  fromLabel: string;
  toLabel: string;
  accept: string;
  outputExt: string;
  multiple: boolean;
}

export interface ConverterComponentProps {
  config: ConverterConfig;
}
