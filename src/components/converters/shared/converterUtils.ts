import type { ConvertedFile } from "./types";

export function getExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function acceptedExtensions(accept: string): string[] {
  return accept.split(",").map((item) => item.trim().replace(".", ""));
}

export function createOutputName(fileName: string, outputExt: string): string {
  return `${fileName.replace(/\.[^.]+$/, "")}.${outputExt}`;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createReadyFile(file: File, outputExt: string): ConvertedFile {
  return {
    source: file,
    blob: null,
    fileName: createOutputName(file.name, outputExt),
    status: "ready",
    savedBytes: null,
    error: null
  };
}

export function createMinimalDocx(title: string): Blob {
  const contentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body><w:p><w:r><w:t>Converted document: ${title}</w:t></w:r></w:p></w:body>
</w:document>`;

  return new Blob([contentXml], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
}

export function createMinimalPptx(): Blob {
  const contentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:sldMasterIdLst/><p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;

  return new Blob([contentXml], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  });
}

export function createMinimalPdf(): Blob {
  const content = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
trailer<</Size 5/Root 1 0 R>>
startxref
340
%%EOF`;

  return new Blob([content], { type: "application/pdf" });
}

export function convertImage(file: File, outputExt: string): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Canvas is unavailable"));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const mimeType = outputExt === "png" ? "image/png" : outputExt === "webp" ? "image/webp" : "image/jpeg";
        const quality = outputExt === "png" ? undefined : 0.9;

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas conversion failed"));
          },
          mimeType,
          quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = String(event.target?.result ?? "");
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = String(event.target?.result ?? "");
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png", quality?: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas export failed"));
      },
      type,
      quality
    );
  });
}

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResizeOptions {
  width: number;
  height: number;
  maintainAspectRatio: boolean;
}

export async function cropRasterImage(file: File, options: CropOptions): Promise<Blob> {
  const img = await loadImage(file);
  const sx = Math.max(0, Math.min(options.x, img.naturalWidth - 1));
  const sy = Math.max(0, Math.min(options.y, img.naturalHeight - 1));
  const sw = Math.max(1, Math.min(options.width, img.naturalWidth - sx));
  const sh = Math.max(1, Math.min(options.height, img.naturalHeight - sy));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Canvas is unavailable");

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvasToBlob(canvas, "image/png");
}

export async function compressRasterImage(file: File, quality: number): Promise<Blob> {
  if (file.type === "image/svg+xml") {
    const text = await file.text();
    return new Blob([text.replace(/>\s+</g, "><").trim()], { type: "image/svg+xml" });
  }

  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Canvas is unavailable");

  ctx.drawImage(img, 0, 0);
  return canvasToBlob(canvas, "image/jpeg", quality);
}

export async function resizeRasterImage(file: File, options: ResizeOptions): Promise<Blob> {
  if (file.type === "image/svg+xml") {
    const text = await file.text();
    const resized = text
      .replace(/\swidth="[^"]*"/, ` width="${options.width}"`)
      .replace(/\sheight="[^"]*"/, ` height="${options.height}"`);
    return new Blob([resized], { type: "image/svg+xml" });
  }

  const img = await loadImage(file);
  const ratio = img.naturalWidth / img.naturalHeight;
  const width = Math.max(1, options.width);
  const height = Math.max(1, options.maintainAspectRatio ? Math.round(width / ratio) : options.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Canvas is unavailable");

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  return canvasToBlob(canvas, "image/png");
}

export async function rotateRasterImage(file: File, degrees: number): Promise<Blob> {
  const img = await loadImage(file);
  const normalized = ((degrees % 360) + 360) % 360;
  const swapsSize = normalized === 90 || normalized === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swapsSize ? img.naturalHeight : img.naturalWidth;
  canvas.height = swapsSize ? img.naturalWidth : img.naturalHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Canvas is unavailable");

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((normalized * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return canvasToBlob(canvas, "image/png");
}

export async function removeBackgroundRasterImage(file: File): Promise<Blob> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/remove-background", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Background removal failed");
  }

  return response.blob();
}

export async function convertPngToIco(file: File): Promise<Blob> {
  const pngBytes = new Uint8Array(await file.arrayBuffer());
  const size = pngBytes.length;
  const icoBytes = new Uint8Array(22 + size);
  const view = new DataView(icoBytes.buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  icoBytes[6] = 0;
  icoBytes[7] = 0;
  icoBytes[8] = 0;
  icoBytes[9] = 0;
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, size, true);
  view.setUint32(18, 22, true);
  icoBytes.set(pngBytes, 22);

  return new Blob([icoBytes], { type: "image/x-icon" });
}

export function generateSampleFile(accept: string, title: string): Promise<File> {
  const extensions = acceptedExtensions(accept);

  if (extensions.includes("docx")) {
    const blob = createMinimalDocx(title);
    return Promise.resolve(new File([blob], "sample.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
  }

  if (extensions.includes("pdf")) {
    const blob = createMinimalPdf();
    return Promise.resolve(new File([blob], "sample.pdf", { type: "application/pdf" }));
  }

  if (extensions.includes("pptx")) {
    const blob = createMinimalPptx();
    return Promise.resolve(new File([blob], "sample.pptx", { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }));
  }

  // Generate image sample using HTML5 canvas
  return new Promise<File>((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas context creation failed");
      }

      // Draw background gradient
      const grad = ctx.createLinearGradient(0, 0, 600, 400);
      grad.addColorStop(0, "#6C63FF");
      grad.addColorStop(1, "#00D4FF");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 400);

      // Draw standard circles/decorative elements
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.arc(300, 200, 120, 0, Math.PI * 2);
      ctx.fill();

      // Main Text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(title, 300, 170);

      // Subtitle
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.font = "16px sans-serif";
      ctx.fillText("Click Convert/Process to try this tool", 300, 220);

      // Determine mime-type & file name
      const isPng = extensions.includes("png");
      const mimeType = isPng ? "image/png" : "image/jpeg";
      const fileName = isPng ? "sample.png" : "sample.jpg";

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], fileName, { type: mimeType }));
        } else {
          reject(new Error("Sample image creation failed"));
        }
      }, mimeType);
    } catch (err) {
      reject(err);
    }
  });
}
