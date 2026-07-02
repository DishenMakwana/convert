"use client";

import { useCallback } from "react";
import ConverterPanel from "@/components/converters/shared/ConverterPanel";
import type { ConverterComponentProps } from "@/components/converters/shared/types";
import JSZip from "jszip";
import { jsPDF } from "jspdf";

interface StyledWord {
  text: string;
  isBold: boolean;
  isItalic: boolean;
  font: "courier" | "helvetica";
  size: number;
  color: string;
}

interface ParsedParagraph {
  align: "left" | "center" | "right" | "justify";
  leftIndent: number;
  hasBottomBorder: boolean;
  borderSize: number;
  borderColor: string;
  beforeSpacing: number;
  afterSpacing: number;
  isPageBreak: boolean;
  ilvl: number;
  listPrefix?: string;
  runs: {
    text: string;
    isBold: boolean;
    isItalic: boolean;
    font: "courier" | "helvetica";
    size: number;
    color: string;
  }[];
}

function DocxToPdfConverter({ config }: ConverterComponentProps): React.ReactElement {
  
  const parseDocxXml = async (file: File): Promise<ParsedParagraph[]> => {
    const zip = await JSZip.loadAsync(file);
    const documentXmlFile = zip.file("word/document.xml");
    if (!documentXmlFile) {
      throw new Error("Invalid DOCX structure: word/document.xml not found.");
    }

    const xmlText = await documentXmlFile.async("string");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    const pNodes = xmlDoc.getElementsByTagName("w:p");
    const paragraphs: ParsedParagraph[] = [];

    // Track active numbering counters per list template ID (numId)
    const numCounters: { [numId: number]: number } = {};

    for (let i = 0; i < pNodes.length; i++) {
      const pNode = pNodes[i];
      
      // Page break check
      let isPageBreak = false;
      const brNodes = pNode.getElementsByTagName("w:br");
      for (let k = 0; k < brNodes.length; k++) {
        if (brNodes[k].getAttribute("w:type") === "page") {
          isPageBreak = true;
        }
      }

      // Parse Paragraph Properties (pPr)
      const pPr = pNode.getElementsByTagName("w:pPr")[0];
      let align: ParsedParagraph["align"] = "left";
      let leftIndent = 0;
      let hasBottomBorder = false;
      let borderSize = 1;
      let borderColor = "#A6A6A6";
      let beforeSpacing = 0;
      let afterSpacing = 8; // default

      // List metadata
      let ilvl = -1;
      let numId = -1;

      if (pPr) {
        // Alignment
        const jc = pPr.getElementsByTagName("w:jc")[0];
        if (jc) {
          const val = jc.getAttribute("w:val") || "left";
          if (val === "center" || val === "right" || val === "left" || val === "both") {
            align = val === "both" ? "justify" : val;
          }
        }

        // Indentation (left margin and first line alignment offsets)
        const ind = pPr.getElementsByTagName("w:ind")[0];
        if (ind) {
          const leftVal = ind.getAttribute("w:left");
          if (leftVal) {
            leftIndent = parseInt(leftVal, 10) / 20; // twips to pt
          }
          const firstLineVal = ind.getAttribute("w:firstLine");
          if (firstLineVal) {
            leftIndent += parseInt(firstLineVal, 10) / 20;
          }
        }

        // Bottom border
        const pBdr = pPr.getElementsByTagName("w:pBdr")[0];
        if (pBdr) {
          const bottom = pBdr.getElementsByTagName("w:bottom")[0];
          if (bottom) {
            hasBottomBorder = true;
            const sz = parseInt(bottom.getAttribute("w:sz") || "8", 10);
            borderSize = sz / 8; // sz is 1/8 pt
            borderColor = "#" + (bottom.getAttribute("w:color") || "A6A6A6");
          }
        }

        // Spacing
        const spacing = pPr.getElementsByTagName("w:spacing")[0];
        if (spacing) {
          beforeSpacing = parseInt(spacing.getAttribute("w:before") || "0", 10) / 20;
          afterSpacing = parseInt(spacing.getAttribute("w:after") || "160", 10) / 20;
        }

        // Word List numbering details
        const numPr = pPr.getElementsByTagName("w:numPr")[0];
        if (numPr) {
          const ilvlNode = numPr.getElementsByTagName("w:ilvl")[0];
          const numIdNode = numPr.getElementsByTagName("w:numId")[0];
          if (ilvlNode) ilvl = parseInt(ilvlNode.getAttribute("w:val") || "0", 10);
          if (numIdNode) numId = parseInt(numIdNode.getAttribute("w:val") || "0", 10);
        }
      }

      // Update counters & build list prefixes
      let listPrefix: string | undefined = undefined;
      if (ilvl === 0 && numId !== -1) {
        numCounters[numId] = (numCounters[numId] || 0) + 1;
        listPrefix = `${numCounters[numId]}.   `;
      } else if (ilvl === 1) {
        listPrefix = "o   ";
      }

      // Automatically fallback standard margins if it is list but no indent specified
      if (leftIndent === 0 && ilvl >= 0) {
        leftIndent = ilvl === 0 ? 36 : 72;
      }

      // Detect VML horizontal divider lines
      const picts = pNode.getElementsByTagName("w:pict");
      if (picts.length > 0) {
        hasBottomBorder = true;
        borderSize = 1.5;
        borderColor = "#a0a0a0";
      }

      // Parse Runs (r)
      const rNodes = pNode.getElementsByTagName("w:r");
      const runs: ParsedParagraph["runs"] = [];

      for (let j = 0; j < rNodes.length; j++) {
        const rNode = rNodes[j];

        // Page break in run
        const runBrs = rNode.getElementsByTagName("w:br");
        for (let k = 0; k < runBrs.length; k++) {
          if (runBrs[k].getAttribute("w:type") === "page") {
            isPageBreak = true;
          }
        }

        const tNode = rNode.getElementsByTagName("w:t")[0];
        if (!tNode) continue;
        const text = tNode.textContent || "";

        const rPr = rNode.getElementsByTagName("w:rPr")[0];
        let isBold = false;
        let isItalic = false;
        let font: "courier" | "helvetica" = "helvetica";
        let size = 11;
        let color = "#333333";

        if (rPr) {
          if (rPr.getElementsByTagName("w:b").length > 0) isBold = true;
          if (rPr.getElementsByTagName("w:i").length > 0) isItalic = true;

          const sz = rPr.getElementsByTagName("w:sz")[0];
          if (sz) {
            size = parseInt(sz.getAttribute("w:val") || "22", 10) / 2;
          }

          const colorNode = rPr.getElementsByTagName("w:color")[0];
          if (colorNode) {
            color = "#" + (colorNode.getAttribute("w:val") || "333333");
          }

          const fonts = rPr.getElementsByTagName("w:rFonts")[0];
          if (fonts) {
            const ascii = (fonts.getAttribute("w:ascii") || "").toLowerCase();
            if (ascii === "consolas" || ascii === "courier new" || ascii.includes("mono")) {
              font = "courier";
            }
          }
        }

        runs.push({ text, isBold, isItalic, font, size, color });
      }

      const fullText = runs.map(r => r.text).join("").trim();
      if (fullText.length === 0 && !isPageBreak && !hasBottomBorder) {
        continue;
      }

      paragraphs.push({
        align,
        leftIndent,
        hasBottomBorder,
        borderSize,
        borderColor,
        beforeSpacing,
        afterSpacing,
        isPageBreak,
        ilvl,
        listPrefix,
        runs
      });
    }

    return paragraphs;
  };

  const renderPdfFromParagraphs = (paragraphs: ParsedParagraph[]): Blob => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "letter"
    });

    const LEFT_MARGIN = 54;
    const RIGHT_MARGIN = 558;
    const TOP_MARGIN = 54;
    const BOTTOM_MARGIN = 738;
    const PRINTABLE_WIDTH = RIGHT_MARGIN - LEFT_MARGIN;

    let y = TOP_MARGIN;

    paragraphs.forEach((p) => {
      if (p.isPageBreak) {
        doc.addPage();
        y = TOP_MARGIN;
        return;
      }

      const words: StyledWord[] = [];

      // Prepend list numbering or bullet prefix
      if (p.listPrefix) {
        words.push({
          text: p.listPrefix,
          isBold: p.ilvl === 0, // Numbers are bold headings
          isItalic: false,
          font: "helvetica",
          size: p.runs[0]?.size || 11,
          color: p.ilvl === 0 ? "#1F4E79" : "#333333"
        });
      }

      // Convert normal text runs into styled words
      p.runs.forEach((run) => {
        const parts = run.text.split(/(\s+)/);
        parts.forEach((part) => {
          if (part.length > 0) {
            words.push({
              text: part,
              isBold: run.isBold,
              isItalic: run.isItalic,
              font: run.font,
              size: run.size,
              color: run.color
            });
          }
        });
      });

      const lineWrappingWidth = PRINTABLE_WIDTH - p.leftIndent;

      // Group words into lines
      interface RenderLine {
        words: StyledWord[];
        height: number;
      }
      const lines: RenderLine[] = [];
      let currentLineWords: StyledWord[] = [];
      let currentWidth = 0;
      let maxLineHeight = 12;

      words.forEach((word) => {
        let style = "normal";
        if (word.isBold && word.isItalic) style = "bolditalic";
        else if (word.isBold) style = "bold";
        else if (word.isItalic) style = "italic";

        doc.setFont(word.font, style);
        doc.setFontSize(word.size);

        const wordWidth = doc.getTextWidth(word.text);

        if (currentWidth + wordWidth > lineWrappingWidth && currentLineWords.length > 0) {
          lines.push({ words: currentLineWords, height: maxLineHeight });
          currentLineWords = [];
          currentWidth = 0;
          maxLineHeight = 12;
        }

        currentLineWords.push(word);
        currentWidth += wordWidth;
        const wordHeight = word.size * 1.35; // Line height spacing
        if (wordHeight > maxLineHeight) maxLineHeight = wordHeight;
      });

      if (currentLineWords.length > 0) {
        lines.push({ words: currentLineWords, height: maxLineHeight });
      }

      // Check overflow
      const paragraphHeight = lines.reduce((sum, line) => sum + line.height, 0) + p.beforeSpacing + p.afterSpacing;
      if (y + paragraphHeight > BOTTOM_MARGIN) {
        doc.addPage();
        y = TOP_MARGIN;
      }

      // Add paragraph spacing before
      y += p.beforeSpacing;

      // Render paragraph lines
      lines.forEach((line, lineIdx) => {
        let x = LEFT_MARGIN + p.leftIndent;

        // Alignment offsets
        if (p.align === "center") {
          let totalLineWidth = 0;
          line.words.forEach((w) => {
            let style = "normal";
            if (w.isBold) style = "bold";
            doc.setFont(w.font, style);
            doc.setFontSize(w.size);
            totalLineWidth += doc.getTextWidth(w.text);
          });
          x = LEFT_MARGIN + (PRINTABLE_WIDTH - totalLineWidth) / 2;
        } else if (p.align === "right") {
          let totalLineWidth = 0;
          line.words.forEach((w) => {
            let style = "normal";
            if (w.isBold) style = "bold";
            doc.setFont(w.font, style);
            doc.setFontSize(w.size);
            totalLineWidth += doc.getTextWidth(w.text);
          });
          x = RIGHT_MARGIN - totalLineWidth;
        }

        line.words.forEach((word, wIdx) => {
          let style = "normal";
          if (word.isBold && word.isItalic) style = "bolditalic";
          else if (word.isBold) style = "bold";
          else if (word.isItalic) style = "italic";

          doc.setFont(word.font, style);
          doc.setFontSize(word.size);

          const hex = word.color.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16) || 0;
          const g = parseInt(hex.substring(2, 4), 16) || 0;
          const b = parseInt(hex.substring(4, 6), 16) || 0;
          doc.setTextColor(r, g, b);

          let currentX = x;
          // Position prefix shifted left to align nested text lines (hanging indent)
          if (p.listPrefix && lineIdx === 0 && wIdx === 0) {
            currentX = LEFT_MARGIN + p.leftIndent - 18;
          }

          doc.text(word.text, currentX, y + line.height - 2);

          if (p.listPrefix && lineIdx === 0 && wIdx === 0) {
            x = LEFT_MARGIN + p.leftIndent;
          } else {
            x += doc.getTextWidth(word.text);
          }
        });

        y += line.height;
      });

      // Bottom border rendering
      if (p.hasBottomBorder) {
        const hex = p.borderColor.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16) || 0;
        const g = parseInt(hex.substring(2, 4), 16) || 0;
        const b = parseInt(hex.substring(4, 6), 16) || 0;
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(p.borderSize);
        doc.line(LEFT_MARGIN, y + 4, RIGHT_MARGIN, y + 4);
        y += 8;
      }

      // Add paragraph spacing after
      y += Math.max(6, p.afterSpacing);
    });

    return doc.output("blob");
  };

  const convertFile = useCallback(async (file: File): Promise<Blob> => {
    try {
      const paragraphs = await parseDocxXml(file);
      const pdfBlob = renderPdfFromParagraphs(paragraphs);
      return pdfBlob;
    } catch (err) {
      console.error("DOCX to PDF conversion failed:", err);
      throw err;
    }
  }, []);

  return <ConverterPanel config={config} convertFile={convertFile} />;
}

export default DocxToPdfConverter;
