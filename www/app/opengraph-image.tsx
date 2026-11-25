import { ImageResponse } from "next/og";

export const alt = "T3D . High-Performance Desktop Code Editor";
export const size = {
  width: 1200,
  height: 630,
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
          padding: "72px 80px",
          backgroundColor: "#0c0c0e",
          border: "2px solid #27272a",
          color: "#f4f4f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              color: "#0a0a0c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              fontWeight: 800,
              letterSpacing: "-0.05em",
            }}
          >
            T3
          </div>
          <span style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.03em" }}>
            T3D
          </span>
          <div
            style={{
              marginLeft: "12px",
              padding: "4px 14px",
              borderRadius: "9999px",
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              color: "#a1a1aa",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            v1.212.0
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h1
            style={{
              fontSize: "64px",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.08,
              margin: 0,
              color: "#ffffff",
            }}
          >
            The high-density desktop code editor.
          </h1>
          <p
            style={{
              fontSize: "24px",
              color: "#a1a1aa",
              margin: 0,
              lineHeight: 1.4,
              maxWidth: "960px",
            }}
          >
            Compiled Rust PTY shell · Tauri 2 · Monaco engine · React 19 · Sub-100ms startup.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {["Sub-second startup", "Zero telemetry", "True island layout", "MIT License"].map((pill) => (
            <div
              key={pill}
              style={{
                padding: "8px 18px",
                borderRadius: "6px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#d4d4d8",
                fontSize: "15px",
                fontWeight: 500,
              }}
            >
              {pill}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
