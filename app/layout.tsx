import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "./robots";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const TITLE = "Arogya Relay — Offline-First Disease Monitoring for Field Health Workers";
const DESCRIPTION =
  "Arogya Relay is a research prototype interface that helps community health workers in remote, low-connectivity areas record screenings, spot emerging health signals, prioritise follow-ups, and sync reports when the network returns.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Arogya Relay",
  },
  description: DESCRIPTION,
  applicationName: "Arogya Relay",
  keywords: [
    "community health worker",
    "offline-first",
    "disease surveillance",
    "syndromic monitoring",
    "rural health",
    "field screening",
  ],
  authors: [{ name: "Arogya Relay" }],
  alternates: { canonical: "/" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Arogya Relay",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  // Stated on every page: this is a prototype, not a medical device.
  other: {
    "prototype-notice":
      "Research and user-interface prototype. Not a certified medical device. All records shown are fictional demonstration data.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Do not lock zoom: pinch-zoom must stay available (WCAG 2.2, 1.4.4).
  maximumScale: 5,
  themeColor: "#17644f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
