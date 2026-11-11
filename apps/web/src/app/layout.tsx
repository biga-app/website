import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@biga/ui/components/tooltip";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const siteUrl = siteConfig.url;
const title = "biga: stream your saves, not your screen";
const description =
  "Broadcast the files you're working on to a browser tab. Run one command, share the link, and anyone can follow along as you save. Read-only, syntax-highlighted, no account or install.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s · biga",
  },
  description,
  applicationName: "biga",
  keywords: [
    "live code sharing",
    "pair programming",
    "screen share alternative",
    "real-time code",
    "code broadcast",
    "teaching",
    "mentoring",
    "developer tools",
  ],
  authors: [{ name: siteConfig.author }],
  openGraph: {
    type: "website",
    siteName: "biga",
    title,
    description,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
};

/** Browser chrome matches the page background in each scheme. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Declared by hand rather than via `app/manifest.ts`: see the note in
            `app/manifest.webmanifest/route.ts` on Vercel Deployment Protection. */}
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
        {/* Suppress Monaco language-service cancelation rejections before the
            Next.js dev overlay installs its unhandledrejection handler. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('unhandledrejection',function(e){var r=e.reason;if(r&&typeof r==='object'&&r.type==='cancelation'){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
