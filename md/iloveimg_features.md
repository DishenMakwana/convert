# iLoveIMG Features & Functional List

This document lists all the major tools and features found on [iLoveIMG](https://www.iloveimg.com/) and describes how they work.

---

## 1. Core Image Optimization & Editing Tools

### 1.1 Compress IMAGE
*   **How it works:** Upload JPG, PNG, SVG, or GIF files. The tool uses lossy/lossless compression algorithms to shrink file sizes while retaining optimal visual quality.
*   **Settings/Inputs:** Drag & drop images, automatic compression level.
*   **Output:** Compressed image files (individual or wrapped in a ZIP).
*   **Current App Status:** **Implemented** (uses local canvas/SVG compression).

### 1.2 Resize IMAGE
*   **How it works:** Change dimensions of images in bulk.
*   **Settings/Inputs:**
    *   *By Pixels:* Define custom width and height, option to maintain aspect ratio, option to not upscale if smaller.
    *   *By Percentage:* Shrink by 25%, 50%, or 75%.
*   **Output:** Resized image files.
*   **Current App Status:** **Implemented** (supports pixel resizing & aspect ratio lock).

### 1.3 Crop IMAGE
*   **How it works:** Crop an image by selecting a rectangular region.
*   **Settings/Inputs:** Interactive cropping box or manually entering X, Y coordinates, Width, and Height.
*   **Output:** Cropped image file.
*   **Current App Status:** **Implemented** (supports coordinate/dimension cropping inputs).

### 1.4 Rotate IMAGE
*   **How it works:** Change the orientation of images in bulk.
*   **Settings/Inputs:** Rotate 90° clockwise, 180°, or 270° (90° counter-clockwise).
*   **Output:** Rotated images.
*   **Current App Status:** **Implemented** (supports 90°, 180°, 270°).

### 1.5 Remove Background
*   **How it works:** Uses AI or color-key algorithms to isolate the subject and make the background transparent.
*   **Settings/Inputs:** Color tolerance slider for manual removal, or fully automated AI removal.
*   **Output:** PNG file with transparent background.
*   **Current App Status:** **Implemented** (local color-key removal with tolerance slider).

---

## 2. Format Conversion Tools

### 2.1 Convert to JPG
*   **How it works:** Converts images from other formats (PNG, GIF, WEBP, HEIC, RAW) to JPG/JPEG format.
*   **Settings/Inputs:** Upload source images, optional quality controls.
*   **Output:** JPG files.
*   **Current App Status:** **Implemented** (PNG to JPG).

### 2.2 Convert from JPG
*   **How it works:** Converts JPG images to other formats (PNG or GIF).
*   **Settings/Inputs:** Select target output format.
*   **Output:** PNG, animated GIF, or static images.
*   **Current App Status:** **Implemented** (JPG to PNG, JPG to WEBP).

---

## 3. Creative & Privacy Tools

### 3.1 Meme Generator
*   **How it works:** Create custom memes using templates or custom image uploads.
*   **Settings/Inputs:** Add text captions (top/bottom), drag and reposition text boxes, select font sizes, colors, and outlines.
*   **Output:** Custom meme image.
*   **Current App Status:** *Not Implemented*.

### 3.2 Add Watermark
*   **How it works:** Protect images by overlaying a text or image watermark.
*   **Settings/Inputs:** Type text or upload a logo image. Adjust opacity, position (grid alignment or custom coordinates), and rotation.
*   **Output:** Watermarked images.
*   **Current App Status:** *Not Implemented*.

### 3.3 Blur Face
*   **How it works:** Automatically detects faces in images and applies a pixelated or blurred filter to obscure identity.
*   **Settings/Inputs:** Automatic detection or manual select-to-blur boxes.
*   **Output:** Blurred image.
*   **Current App Status:** *Not Implemented*.

### 3.4 HTML to IMAGE
*   **How it works:** Renders a web page URL and takes a full-page screenshot.
*   **Settings/Inputs:** Enter website URL, select screen size (desktop/mobile), set delay timer.
*   **Output:** JPG or PNG screenshot of the web page.
*   **Current App Status:** *Not Implemented*.

### 3.5 Image Upscaler
*   **How it works:** Uses super-resolution AI models to double or quadruple the pixel resolution of an image while reducing noise and maintaining sharpness.
*   **Settings/Inputs:** Upscale factor (2x, 4x).
*   **Output:** High-resolution image.
*   **Current App Status:** *Not Implemented*.

### 3.6 Photo Editor
*   **How it works:** Full-featured rich browser editor.
*   **Settings/Inputs:** Add shapes, text overlay, crop, rotate, apply filters (greyscale, sepia, vintage), draw with brush.
*   **Output:** Edited image.
*   **Current App Status:** *Not Implemented*.
