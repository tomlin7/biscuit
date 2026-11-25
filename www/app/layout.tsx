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
    default: "Biscuit · High-Performance Desktop Code Editor",
    template: "%s | Biscuit",
  },
  description:
    "Fast, focused desktop code editor built with Tauri 2, compiled Rust PTY engine, Monaco, and React 19. Sub-second startup, native terminal, split panes, and sandboxed extensions.",
  applicationName: "Biscuit",
  authors: [{ name: "Tomlin7", url: "https://github.com/tomlin7" }],
  generator: "Next.js",
  keywords: [
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
  publisher: "Biscuit",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://t3d.sh",
    siteName: "Biscuit",
    title: "Biscuit · High-Performance Desktop Code Editor",
    description:
      "Fast, focused desktop code editor built on Tauri 2, compiled Rust PTY engine, Monaco, and React 19. Sub-100ms startup, native terminal, and sandboxed extensions.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Biscuit · High-Performance Desktop Code Editor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Biscuit · High-Performance Desktop Code Editor",
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
      "name": "Biscuit",
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
      "name": "Biscuit",
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
