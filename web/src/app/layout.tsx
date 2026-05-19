import type { Metadata, Viewport } from "next";
import {
  Inter,
  Source_Serif_4,
  JetBrains_Mono,
  Instrument_Serif,
} from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

// Home page editorial serif. Loaded by next/font for FOUT-free render;
// home.css consumes it via --font-instrument-serif.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: "Shadowing Plus",
  description: "English shadowing practice with AI subtitles",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} h-full antialiased`}
      style={{
        // Pretendard variable comes from a CDN; home.css falls back to this
        // string when --font-pretendard isn't explicitly set elsewhere.
        // The actual font is loaded by the <link> tags below.
        ["--font-pretendard" as string]:
          '"Pretendard Variable", "Pretendard", ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      }}
    >
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="preload"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
