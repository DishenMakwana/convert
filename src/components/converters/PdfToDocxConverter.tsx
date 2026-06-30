"use client";

import { useCallback } from "react";
import ConverterPanel from "@/components/converters/shared/ConverterPanel";
import { createMinimalDocx } from "@/components/converters/shared/converterUtils";
import type { ConverterComponentProps } from "@/components/converters/shared/types";

function PdfToDocxConverter({ config }: ConverterComponentProps): React.ReactElement {
  const convertFile = useCallback(async (file: File): Promise<Blob> => createMinimalDocx(file.name.replace(/\.[^.]+$/, "")), []);

  return <ConverterPanel config={config} convertFile={convertFile} />;
}

export default PdfToDocxConverter;
