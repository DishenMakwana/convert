import { ImageResponse } from "next/og";

export const alt = "Convert online image editor and file converter";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#06080f",
          color: "#f0f0f5",
          padding: "72px",
          fontFamily: "Inter, Arial, sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "22px",
            fontSize: "40px",
            fontWeight: 900
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #6c63ff, #00d4ff)"
            }}
          >
            C
          </div>
          Convert
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
          <div
            style={{
              fontSize: "74px",
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: 0,
              maxWidth: "950px"
            }}
          >
            Free online image editor and file converter
          </div>
          <div
            style={{
              fontSize: "30px",
              lineHeight: 1.35,
              color: "#b8bdd4",
              maxWidth: "900px"
            }}
          >
            Remove backgrounds, compress, resize, crop, rotate, convert PDFs, Word files, PowerPoint files, JPG, PNG, WEBP, and ICO.
          </div>
        </div>
      </div>
    ),
    size
  );
}
