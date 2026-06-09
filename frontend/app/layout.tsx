import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navigation from "@/components/Navigation";
import Providers from "@/components/Providers";
import "./globals.css";
import "mana-font/css/mana.min.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MTG Chicken Soup",
  description: "AI-powered Magic: The Gathering assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 dark:bg-slate-950 min-h-screen`}>
        <Providers>
          <Navigation />
          <div className="md:pl-56 pt-14 md:pt-0 min-h-screen">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
