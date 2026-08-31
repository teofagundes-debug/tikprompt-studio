import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TikPrompt Studio",
  description: "Biblioteca de prompts com geração de falas por IA para vídeos de venda"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
