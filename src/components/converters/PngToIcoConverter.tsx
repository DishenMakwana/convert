"use client";

import { useCallback } from "react";
import ConverterPanel from "@/components/converters/shared/ConverterPanel";
import { convertPngToIco } from "@/components/converters/shared/converterUtils";
import type { ConverterComponentProps } from "@/components/converters/shared/types";

function PngToIcoConverter({ config }: ConverterComponentProps): React.ReactElement {
  const convertFile = useCallback(async (file: File): Promise<Blob> => convertPngToIco(file), []);

  return <ConverterPanel config={config} convertFile={convertFile} />;
}

export default PngToIcoConverter;
