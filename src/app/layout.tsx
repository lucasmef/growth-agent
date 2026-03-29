import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growth Agent",
  description: "Agentic growth OS for Instagram and TikTok.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
