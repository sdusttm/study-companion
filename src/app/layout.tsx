import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { UserNav } from "@/components/UserNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Study Companion",
  description: "Your ultimate study tool: read PDFs, take contextual notes, and instantly search through your learning material.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={inter.variable}>
        <nav className="navbar glass">
          <Link href="/" className="nav-brand">
            <BookOpen size={24} />
            Study Companion
          </Link>
          <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {session?.user && (
              <Link href="/search" className="btn btn-outline" style={{ borderRadius: '999px', padding: '0.4rem 1rem' }}>
                <Search size={16} />
                <span>Search Notes</span>
              </Link>
            )}
            <UserNav user={session?.user} />
          </div>
        </nav>
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
