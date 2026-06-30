# spec: Remove Background

How it works on iLoveIMG & how we implement a custom premium Dribbble UI for it.

---

## 1. iLoveIMG Features
- **AI Background Remover:** Automatic cutout of backgrounds.
- **Transparent output:** Export directly as transparent PNG.

---

## 2. Our Custom Premium UI (Dribbble-Inspired)
- **Tolerance Mode presets:**
  - **Sharp Cutout (Low Tolerance):** Removes only the exact matched color.
  - **Medium Bleed (Default):** Smooth cutout for gradients.
  - **High Tolerance:** Strong background removal.
- **Custom Precision slider:** Sliders for tolerance adjustment.
- **Visual checkerboard preview graphic:** Illustrating transparent output structure.
