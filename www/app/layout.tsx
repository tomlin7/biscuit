import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://t3d.sh"),
  title: {
    default: "Morsel /ℳℴ𝓇𝓈ℯ𝓁/ · A code editor that respects your palate",
    template: "%s | Morsel",
  },
  description:
    "Morsel /ℳℴ𝓇𝓈ℯ𝓁/ is a code editor that respects your palate (AKA Biscuit-v2). Fast, focused desktop code editor built with Tauri 2, compiled Rust PTY engine, Monaco, and React 19. Sub-second startup, native terminal, split panes, and sandboxed extensions.",
  applicationName: "Morsel",
  authors: [{ name: "Tomlin7", url: "https://github.com/tomlin7" }],
  generator: "Next.js",
  keywords: [
    "Morsel",
    "Biscuit",
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
    "open source code editor",
  ],
  creator: "Tomlin7",
  publisher: "Morsel",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://t3d.sh",
    siteName: "Morsel",
    title: "Morsel /ℳℴ𝓇𝓈ℯ𝓁/ · A code editor that respects your palate",
    description:
      "Morsel /ℳℴ𝓇𝓈ℯ𝓁/ is a code editor that respects your palate (AKA Biscuit-v2). Fast, focused desktop code editor built on Tauri 2, compiled Rust PTY engine, Monaco, and React 19.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Morsel · A code editor that respects your palate (AKA Biscuit-v2)",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Morsel /ℳℴ𝓇𝓈ℯ𝓁/ · A code editor that respects your palate",
    description:
      "Morsel /ℳℴ𝓇𝓈ℯ𝓁/ is a code editor that respects your palate (AKA Biscuit-v2). Fast, focused desktop code editor built on Tauri 2, compiled Rust PTY engine, Monaco, and React 19.",
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
      "name": "Morsel",
      "operatingSystem": "Windows, macOS, Linux",
      "applicationCategory": "DeveloperApplication",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "softwareVersion": "1.220.0",
      "description":
        "Morsel /ℳℴ𝓇𝓈ℯ𝓁/ is a code editor that respects your palate (AKA Biscuit-v2). Fast, focused desktop code editor built with Tauri 2, compiled Rust PTY engine, Monaco, and React 19.",
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
      "name": "Morsel",
      "url": "https://t3d.sh",
      "description": "Morsel /ℳℴ𝓇𝓈ℯ𝓁/ is a code editor that respects your palate (AKA Biscuit-v2).",
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
      className={`${geistSans.variable} dark font-sans`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
