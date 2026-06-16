import type { Metadata } from "next";
import { Cinzel, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { RiftWorldMount } from "@/components/rift/RiftWorldMount";
import { SiteHeader } from "@/components/site/Header";
import { SiteFooter } from "@/components/site/Footer";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { themeInitScript } from "@/components/theme/themeStore";
import { SITE_URL } from "@/lib/site";

const display = Cinzel({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display", display: "swap" });
const sans = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono", display: "swap" });

const siteUrl = SITE_URL;
const tagline =
  "op.gg tells you how you play. StackGG tells you how your group plays together. A shared stack page for your League squad, rendered inside the Rift.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "StackGG — settle it, as a stack", template: "%s — StackGG" },
  description: tagline,
  applicationName: "StackGG",
  keywords: [
    "League of Legends stats",
    "LoL group stats",
    "duo winrate",
    "premade stats",
    "squad stats",
    "stack stats",
    "op.gg for groups",
    "who carries",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "StackGG",
    url: siteUrl,
    title: "StackGG — settle it, as a stack",
    description: tagline,
  },
  twitter: {
    card: "summary_large_image",
    title: "StackGG — settle it, as a stack",
    description: tagline,
  },
  // Public marketing surfaces are indexable; private/dynamic routes opt out via their
  // own segment metadata + robots.ts disallow.
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="parchment" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col">
        {/* The persistent 3D Rift — the stage every surface sits inside. */}
        <RiftWorldMount />
        <SiteHeader />
        <main className="relative flex-1">{children}</main>
        <SiteFooter />
        <ThemeSwitcher />
      </body>
    </html>
  );
}
