# spec: Compress IMAGE

How it works on iLoveIMG & how we implement a custom premium Dribbble UI for it.

---

## 1. iLoveIMG Features
- **Automatic optimization:** Balances quality and size automatically.
- **Batch mode:** Allows drag-drop of multiple files and compresses them simultaneously.

---

## 2. Our Custom Premium UI (Dribbble-Inspired)
- **Compression Mode Selector:**
  - **Recommended (Balanced):** Optimizes to ~75% quality for a good mix of file size and visual fidelity.
  - **Extreme Compression:** High compression (~50% quality) for minimum file size.
  - **High Quality:** Minimal compression (~90% quality) to preserve maximum image detail.
  - **Custom Slider:** Standard range slider with real-time value tooltip.
- **Interactive Saved Estimate Badge:** Tells the user the estimated space they will save before clicking convert.
