import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { users, categories, type Category } from "@/db/schema";
import { eq } from "drizzle-orm";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  let isOnboarded = true;
  let dbUser = null;
  let initialCategories: Category[] = [];

  if (session) {
    const userRes = await db.select().from(users).where(eq(users.id, session.user.id));
    dbUser = userRes[0] || null;
    isOnboarded = dbUser?.onboardingCompleted ?? false;
    
    if (!isOnboarded && dbUser) {
      initialCategories = await db.select().from(categories).where(eq(categories.userId, dbUser.id));
    }
  }

  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}>
      <body suppressHydrationWarning className="bg-[#000000] text-slate-100 min-h-screen relative">
        <div className="noise-overlay" />
        {isOnboarded ? (
          <div className="flex flex-col lg:flex-row min-h-screen">
            <TopNav />
            <main className={`flex-1 ${session ? 'lg:pl-72' : ''} p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto lg:max-w-none`}>
              {children}
            </main>
          </div>
        ) : (
          <main className="w-full min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
            {dbUser && <OnboardingWizard user={dbUser} initialCategories={initialCategories} />}
          </main>
        )}
      </body>
    </html>
  );
}

