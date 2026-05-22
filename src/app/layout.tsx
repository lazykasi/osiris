import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import ErrorBoundary from '@/components/ErrorBoundary';

const SITE_NAME = "RudraOSINT";
const SITE_TITLE = "RudraOSINT — Beginner-friendly OSINT toolkit";
const SITE_DESCRIPTION =
  "A simple OSINT dashboard. Look up DNS, WHOIS, certificates, BGP, IP reputation, open ports and CVEs from your browser. Browse 2,000+ public traffic and city cameras. No accounts, no install.";

export const viewport: Viewport = {
  themeColor: "#D4AF37",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: {
    default: SITE_TITLE,
    template: "%s | OSIRIS",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "OSINT toolkit", "beginner OSINT", "DNS lookup", "WHOIS lookup",
    "SSL certificate checker", "BGP lookup", "ASN lookup", "IP reputation",
    "port scanner online", "CVE lookup", "subdomain enumeration",
    "public CCTV cameras", "traffic cameras", "open source intelligence",
  ],
  authors: [{ name: "Osiris Beginner Fork" }],
  robots: { index: true, follow: true },
  icons: {
    icon: "/favicon.ico",
  },
  category: "technology",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": SITE_NAME,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="antialiased">
        <ErrorBoundary name="OSIRIS Core">
          {children}
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
