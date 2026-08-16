import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "شجرة عائلة العريفي",
  description: "نموذج أولي لعرض شجرة العائلة بشكل شجرة حقيقية",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Loaded via a plain <link> rather than next/font so the POC still
            builds and renders (with system Arabic fonts) when offline. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&family=Amiri:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
