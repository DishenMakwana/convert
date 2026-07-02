"use client";

import { useCallback } from "react";
import ConverterPanel from "@/components/converters/shared/ConverterPanel";
import type { ConverterComponentProps } from "@/components/converters/shared/types";
import JSZip from "jszip";

interface TextItem {
  str: string;
  fontSize: number;
  x: number;
  y: number;
  isBold: boolean;
  isMonospace: boolean;
}

function PdfToDocxConverter({ config }: ConverterComponentProps): React.ReactElement {
  
  const extractPageLines = async (pdf: any, pageNum: number): Promise<TextItem[][]> => {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items: TextItem[] = textContent.items.map((item: any) => {
      const transform = item.transform; // [scaleX, skewY, skewX, scaleY, x, y]
      const fontSize = Math.abs(transform[3]);
      const x = transform[4];
      const y = transform[5];
      
      const fontNameLower = (item.fontName || "").toLowerCase();
      // Heuristics for detecting bold styling in PDF
      const isBold = fontNameLower.includes("bold") || 
                     fontNameLower.includes("black") || 
                     fontNameLower.includes("g_d0_f2") || 
                     fontNameLower.includes("g_d0_f4") ||
                     fontNameLower.includes("g_d1") || 
                     fontNameLower.includes("g_d2");
      
      // Heuristics for monospace styling (trees, code paths)
      const isMonospace = fontNameLower.includes("mono") || 
                          fontNameLower.includes("courier") || 
                          fontNameLower.includes("consolas") || 
                          item.str.includes("├") || 
                          item.str.includes("└") || 
                          item.str.includes("│") ||
                          item.str.includes("──");

      return {
        str: item.str,
        fontSize,
        x,
        y,
        isBold,
        isMonospace
      };
    });

    const Y_TOLERANCE = 4; // Group items into visual lines
    const lineMap: { y: number; items: TextItem[] }[] = [];

    items.forEach((item) => {
      const foundLine = lineMap.find((line) => Math.abs(line.y - item.y) <= Y_TOLERANCE);
      if (foundLine) {
        foundLine.items.push(item);
      } else {
        lineMap.push({ y: item.y, items: [item] });
      }
    });

    // Sort items horizontally within each line
    lineMap.forEach((line) => {
      line.items.sort((a, b) => a.x - b.x);
    });

    // Sort lines vertically (top to bottom)
    lineMap.sort((a, b) => b.y - a.y);

    return lineMap.map((l) => l.items);
  };

  const extractTextAndLinesFromPdf = async (file: File): Promise<(TextItem[] | "page-break")[]> => {
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
        script.onload = () => {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
          resolve();
        };
        script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"));
        document.head.appendChild(script);
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = (window as any).pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const documentLines: (TextItem[] | "page-break")[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const pageLines = await extractPageLines(pdf, pageNum);
      documentLines.push(...pageLines);
      if (pageNum < pdf.numPages) {
        documentLines.push("page-break");
      }
    }

    return documentLines;
  };

  const buildRunXml = (
    text: string,
    isBold: boolean,
    isMono: boolean,
    isMainTitle: boolean,
    isHeading: boolean,
    isSubTitle: boolean,
    isTree: boolean,
    isArrow: boolean
  ) => {
    const escapeXml = (unsafe: string) => {
      return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    };

    const font = isMono ? "Consolas" : "Segoe UI";
    let size = 22; // 11pt
    let color = "333333"; // off-black

    if (isMainTitle) {
      size = 48; // 24pt
      color = "1F4E79"; // Blue-Grey
    } else if (isSubTitle) {
      size = 26; // 13pt
      color = "2E75B6"; // Secondary Blue
    } else if (isHeading) {
      const isPhase = text.toLowerCase().includes("phase ");
      size = isPhase ? 36 : 26;
      color = "1F4E79";
    } else if (isTree) {
      size = 20; // 10pt
      color = "2B2B2B";
    } else if (isArrow) {
      size = 28;
      color = "2E75B6";
    }

    const boldTag = (isBold || isMainTitle || isHeading) ? "<w:b/>" : "";
    const italicTag = isSubTitle ? "<w:i/>" : "";

    return `<w:r>
      <w:rPr>
        <w:rFonts w:ascii="${font}" w:hAnsi="${font}"/>
        ${boldTag}
        ${italicTag}
        <w:color w:val="${color}"/>
        <w:sz w:val="${size}"/>
      </w:rPr>
      <w:t xml:space="preserve">${escapeXml(text)}</w:t>
    </w:r>`;
  };

  const getParagraphXml = (line: TextItem[], isFirstLine: boolean): string => {
    const lineText = line.map((item) => item.str).join(" ").trim();
    if (lineText.length === 0) return "";

    const lower = lineText.toLowerCase();

    const isMainTitle = isFirstLine || lineText.includes("Project Brain v2");
    const isSubTitle = lineText.includes("AI Runtime Architecture");
    
    const isHeading = !isMainTitle && !isSubTitle && (
      lower.startsWith("phase ") || 
      lower === "vision" || 
      lower === "core principles" || 
      lower === "project structure" || 
      lower === "directory" || 
      lower === "design philosophy" || 
      (line.some(item => item.isBold) && lineText.length < 50 && (
        lineText.endsWith(".md") || 
        lineText.endsWith(".json") || 
        lower.startsWith("purpose:") || 
        lower.startsWith("responsibilities:") || 
        lower.startsWith("responsible for:") || 
        lower === "example runtime execution"
      ))
    );

    const isList = lineText.startsWith("●") || lineText.startsWith("•") || lineText.startsWith("-") || lineText.startsWith("*");
    
    const isTree = lineText.includes("├──") || 
                   lineText.includes("└──") || 
                   lineText.includes("│") ||
                   lower.startsWith("project-brain/") ||
                   lower.startsWith("system/") ||
                   lower.startsWith("memory/") ||
                   lower.startsWith("graph/") ||
                   lower.startsWith("runtime/") ||
                   lower.startsWith("cache/") ||
                   (line.every(item => item.isMonospace) && (
                     lineText.endsWith(".md") || 
                     lineText.endsWith(".json") ||
                     lower.includes("system.md") ||
                     lower.includes("planner.md") ||
                     lower.includes("workflow.md") ||
                     lower.includes("overview.md") ||
                     lower.includes("architecture.md") ||
                     lower.includes("backend.md") ||
                     lower.includes("frontend.md") ||
                     lower.includes("database.md") ||
                     lower.includes("routing.md") ||
                     lower.includes("api.md") ||
                     lower.includes("dependencies.md") ||
                     lower.includes("patterns.md")
                   ));

    const isArrow = lineText === "↓" || lineText === "→";

    // Set paragraph properties
    let pPr = "";
    if (isMainTitle) {
      pPr = `<w:pPr>
        <w:spacing w:before="360" w:after="120"/>
        <w:jc w:val="left"/>
      </w:pPr>`;
    } else if (isSubTitle) {
      pPr = `<w:pPr>
        <w:spacing w:after="360"/>
        <w:jc w:val="left"/>
        <w:pBdr>
          <w:bottom w:val="single" w:sz="18" w:space="8" w:color="2E75B6"/>
        </w:pBdr>
      </w:pPr>`;
    } else if (isHeading) {
      const isPhase = lower.startsWith("phase ");
      pPr = `<w:pPr>
        <w:spacing w:before="${isPhase ? 400 : 240}" w:after="120"/>
        <w:keepNext/>
        ${isPhase ? `
        <w:pBdr>
          <w:bottom w:val="single" w:sz="12" w:space="6" w:color="2E75B6"/>
        </w:pBdr>` : ""}
      </w:pPr>`;
    } else if (isList) {
      pPr = `<w:pPr>
        <w:spacing w:before="60" w:after="60"/>
        <w:ind w:left="720" w:hanging="360"/>
      </w:pPr>`;
    } else if (isTree) {
      pPr = `<w:pPr>
        <w:spacing w:before="20" w:after="20" w:line="240" w:lineRule="auto"/>
        <w:ind w:left="540"/>
      </w:pPr>`;
    } else if (isArrow) {
      pPr = `<w:pPr>
        <w:spacing w:before="120" w:after="120"/>
        <w:jc w:val="center"/>
      </w:pPr>`;
    } else {
      pPr = `<w:pPr>
        <w:spacing w:after="160" w:line="276" w:lineRule="auto"/>
      </w:pPr>`;
    }

    let runsXml = "";

    // Bullet point list decoration
    if (isList) {
      runsXml += `<w:r>
        <w:rPr>
          <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/>
          <w:color w:val="2E75B6"/>
          <w:b/>
          <w:sz w:val="24"/>
        </w:rPr>
        <w:t>•   </w:t>
      </w:r>`;
    }

    let itemsToProcess = [...line];
    if (isList && itemsToProcess.length > 0) {
      const firstItem = itemsToProcess[0];
      const bulletPattern = /^[●•\-\*]\s*/;
      if (bulletPattern.test(firstItem.str)) {
        itemsToProcess[0] = {
          ...firstItem,
          str: firstItem.str.replace(bulletPattern, "")
        };
      }
    }

    let currentText = "";
    let currentBold = false;
    let currentMono = false;

    itemsToProcess.forEach((item, idx) => {
      const itemBold = item.isBold || isMainTitle || isHeading;
      const itemMono = item.isMonospace || isTree;

      if (idx > 0 && (itemBold !== currentBold || itemMono !== currentMono)) {
        if (currentText.length > 0) {
          runsXml += buildRunXml(currentText, currentBold, currentMono, isMainTitle, isHeading, isSubTitle, isTree, isArrow);
        }
        currentText = "";
      }

      currentBold = itemBold;
      currentMono = itemMono;
      currentText += item.str;
    });

    if (currentText.length > 0) {
      runsXml += buildRunXml(currentText, currentBold, currentMono, isMainTitle, isHeading, isSubTitle, isTree, isArrow);
    }

    return `<w:p>${pPr}${runsXml}</w:p>`;
  };

  const createStyledDocx = async (documentLines: (TextItem[] | "page-break")[]): Promise<Blob> => {
    const zip = new JSZip();

    // 1. Add relationships file
    zip.file(
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    );

    // 2. Add Content Types map
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
    );

    // 3. Construct Word body text elements
    let paragraphsXml = "";
    let isFirstLine = true;

    documentLines.forEach((element) => {
      if (element === "page-break") {
        paragraphsXml += `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>`;
      } else {
        paragraphsXml += getParagraphXml(element, isFirstLine);
        if (isFirstLine && element.length > 0) {
          isFirstLine = false;
        }
      }
    });

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphsXml || `<w:p><w:r><w:t>No selectable text found in the PDF.</w:t></w:r></w:p>`}
  </w:body>
</w:document>`;

    zip.file("word/document.xml", documentXml);

    return zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
  };

  const convertFile = useCallback(async (file: File): Promise<Blob> => {
    try {
      const documentLines = await extractTextAndLinesFromPdf(file);
      const docxBlob = await createStyledDocx(documentLines);
      return docxBlob;
    } catch (err) {
      console.error("PDF to DOCX conversion failed:", err);
      throw err;
    }
  }, []);

  return <ConverterPanel config={config} convertFile={convertFile} />;
}

export default PdfToDocxConverter;
