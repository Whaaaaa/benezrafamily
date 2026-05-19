import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import TabNav from "@/components/TabNav";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "BenEzra Family",
  description: "Family meals, shopping, and budget",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md shadow-lg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex items-center py-3">
              <Link
                href="/"
                className="text-xl font-black tracking-tight select-none"
                style={{
                  background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                ✨ BenEzra Family
              </Link>
            </div>
            <TabNav />
          </div>
          <div
            className="h-1"
            style={{
              background:
                "linear-gradient(90deg, #7C3AED, #EC4899, #F59E0B, #10B981, #3B82F6, #7C3AED)",
            }}
          />
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
