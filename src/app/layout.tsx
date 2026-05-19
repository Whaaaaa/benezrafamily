import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import TabNav from "@/components/TabNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex items-center justify-between pt-4 pb-1">
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                BenEzra Family
              </h1>
            </div>
            <TabNav />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
