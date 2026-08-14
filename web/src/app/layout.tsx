import type { Metadata, Viewport } from "next";
import {
  Inter,
  Source_Serif_4,
  JetBrains_Mono,
  Instrument_Serif,
  Newsreader,
} from "next/font/google";
import "./globals.css";
import "./mobile.css";

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

// Phrase Bank display serif (per the design's --pb-phrase-font). Variable
// weight + optical size; italic used for saved context quotes.
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Saylo · Have the words ready",
    template: "%s · Saylo",
  },
  description:
    "Build and practise the English you need for real introductions, interviews, meetups, and pitches. Join the Saylo private beta waitlist.",
  keywords: [
    "English speaking practice",
    "speech practice",
    "startup pitch practice",
    "English fluency",
    "mirror practice",
  ],
  openGraph: {
    type: "website",
    title: "Have the words ready when the moment comes.",
    description: "Build the English you actually need for your life, then practise it until it feels like yours.",
    siteName: "Saylo",
    images: [{ url: "/og.png", width: 1536, height: 804, alt: "Saylo speaking practice app preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Have the words ready when the moment comes.",
    description: "Build the English you actually need for your life, then practise it until it feels like yours.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Saylo",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111a3d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} ${newsreader.variable} h-full antialiased`}
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
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
