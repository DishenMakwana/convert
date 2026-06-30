"use client";

import { useCallback } from "react";
import ConverterPanel from "@/components/converters/shared/ConverterPanel";
import { createMinimalPptx } from "@/components/converters/shared/converterUtils";
import type { ConverterComponentProps } from "@/components/converters/shared/types";

function PdfToPptxConverter({ config }: ConverterComponentProps): React.ReactElement {
  const convertFile = useCallback(async (): Promise<Blob> => createMinimalPptx(), []);

  return <ConverterPanel config={config} convertFile={convertFile} />;
}

export default PdfToPptxConverter;
