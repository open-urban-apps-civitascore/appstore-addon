import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIVITAS/CORE Marketplace",
  description: "Use case catalog for CIVITAS/CORE v2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
