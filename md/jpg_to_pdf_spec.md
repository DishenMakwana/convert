# spec: JPG to PDF Converter

How it works on iLovePDF & how we implement a custom premium Dribbble UI for it.

---

## 1. iLovePDF Features
- **Multiple Image Upload:** Compile several JPG/JPEG images into one PDF document.
- **Image Reordering:** Drag & drop images in the queue to specify page sequence.
- **Page Layout Options:**
  - **Orientation:** Portrait (Vertical) or Landscape (Horizontal).
  - **Page Size:** Fit (match image proportions), A4, or US Letter.
  - **Margins:** None, Small, or Big margins.

---

## 2. Our Custom Premium UI (Dribbble-Inspired)
- **Visual Grid Reorderable Queue:**
  - Standard list layout with thumbnail preview, size, and status badges.
  - **Sort Actions:** Interactive `Move Up` and `Move Down` arrow controls for each item card to easily rearrange pages, plus `Remove` single buttons.
- **PDF Options Sidebar:**
  - **Orientation Selector:** Pill button tabs for Portrait and Landscape.
  - **Page Size Selector:** Styled select dropdown options for Fit Image, A4, and US Letter.
  - **Margin Selector:** Pill button tabs for None (0mm), Small (5mm), and Big (15mm).
- **Client-Side jsPDF Compiler:** Loads each file in the queue, extracts dimensions, calculates scale offsets based on margins/orientations, appends PDF pages, and saves the output locally.
