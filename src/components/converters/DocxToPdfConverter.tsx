"use client";

import { useCallback } from "react";
import ConverterPanel from "@/components/converters/shared/ConverterPanel";
import { createMinimalPdf } from "@/components/converters/shared/converterUtils";
import type { ConverterComponentProps } from "@/components/converters/shared/types";

function DocxToPdfConverter({ config }: ConverterComponentProps): React.ReactElement {
  const convertFile = useCallback(async (): Promise<Blob> => createMinimalPdf(), []);

  return <ConverterPanel config={config} convertFile={convertFile} />;
}

export default DocxToPdfConverter;
