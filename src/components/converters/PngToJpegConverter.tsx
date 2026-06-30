"use client";

import { useCallback } from "react";
import ConverterPanel from "@/components/converters/shared/ConverterPanel";
import { convertImage } from "@/components/converters/shared/converterUtils";
import type { ConverterComponentProps } from "@/components/converters/shared/types";

function PngToJpegConverter({ config }: ConverterComponentProps): React.ReactElement {
  const convertFile = useCallback(async (file: File): Promise<Blob> => convertImage(file, "jpeg"), []);

  return <ConverterPanel config={config} convertFile={convertFile} />;
}

export default PngToJpegConverter;
