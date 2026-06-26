import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QLVRS - Quran Live Verse Recognition System",
  description: "AI-Powered Real-Time Quran Verse Recognition & Mushaf Display",
  manifest: "/manifest.json",
  themeColor: "#166534",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QLVRS",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
