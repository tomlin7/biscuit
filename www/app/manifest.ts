import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Morsel — A code editor that respects your palate (AKA Biscuit-v2)",
    short_name: "Morsel",
    description: "Morsel /ℳℴ𝓇𝓈ℯ𝓁/ is a code editor that respects your palate (AKA Biscuit-v2). High-performance desktop code editor built on Tauri 2, Rust, and Monaco.",
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
