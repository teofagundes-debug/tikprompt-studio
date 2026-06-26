import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TikPrompt Studio",
  description: "Biblioteca operacional de prompts para TikTok Shop"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
