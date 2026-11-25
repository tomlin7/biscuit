import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Biscuit — High-Performance Desktop Code Editor",
    short_name: "Biscuit",
    description: "High-performance desktop code editor built on Tauri 2, Rust, and Monaco.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    icons: [
      {
        src: "/ted.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
