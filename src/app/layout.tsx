import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Briefing",
  description: "10개국 현지어 매체 기반 일일 국제 정세 브리핑",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
