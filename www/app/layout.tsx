import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://t3d.sh"),
  title: {
    default: "T3D — High-Performance Desktop Code Editor",
    template: "%s | T3D",
  },
  description:
    "Fast, focused desktop code editor built with Tauri 2, compiled Rust PTY engine, Monaco, and React 19. Sub-second startup, native terminal, split panes, and sandboxed extensions.",
  applicationName: "T3D",
  authors: [{ name: "Tomlin7", url: "https://github.com/tomlin7" }],
  generator: "Next.js",
  keywords: [
    "T3D",
    "code editor",
    "desktop code editor",
    "Tauri 2",
    "Rust",
    "Monaco Editor",
    "React 19",
    "developer tools",
    "lightweight IDE",
    "fast code editor",
    "portable-pty",
    "biscuit successor",
    "open source code editor",
  ],
  creator: "Tomlin7",
  publisher: "T3D",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://t3d.sh",
    siteName: "T3D",
    title: "T3D — High-Performance Desktop Code Editor",
    description:
      "Fast, focused desktop code editor built on Tauri 2, compiled Rust PTY engine, Monaco, and React 19. Sub-100ms startup, native terminal, and sandboxed extensions.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "T3D — High-Performance Desktop Code Editor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "T3D — High-Performance Desktop Code Editor",
    description:
      "Fast, focused desktop code editor built on Tauri 2, compiled Rust PTY engine, Monaco, and React 19.",
    creator: "@Tomlin7",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/ted.svg", type: "image/svg+xml" },
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "T3D",
      "operatingSystem": "Windows, macOS, Linux",
      "applicationCategory": "DeveloperApplication",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "softwareVersion": "1.212.0",
      "description":
        "Fast, focused desktop code editor built with Tauri 2, compiled Rust PTY engine, Monaco, and React 19.",
      "downloadUrl": "https://github.com/tomlin7/t3d/releases",
      "author": {
        "@type": "Person",
        "name": "Tomlin7",
        "url": "https://github.com/tomlin7",
      },
      "license": "https://github.com/tomlin7/T3D/blob/main/LICENSE",
    },
    {
      "@type": "WebSite",
      "name": "T3D",
      "url": "https://t3d.sh",
      "description": "The high-density desktop code editor.",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} ${dmSans.variable} ${jetbrainsMono.variable} dark`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
