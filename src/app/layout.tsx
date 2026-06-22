import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Planify AI - Controle Financeiro",
  description: "Dashboard inteligente para o seu controle financeiro com WhatsApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}>
      <body>
        <main className="min-h-screen max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <TopNav />
          {children}
        </main>
      </body>
    </html>
  );
}
