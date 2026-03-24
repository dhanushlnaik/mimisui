import type { Metadata } from "next";
import { Libre_Baskerville, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const titleFont = Libre_Baskerville({
  subsets: ["latin"],
  variable: "--font-libre-baskerville",
  weight: ["400", "700"]
});

export const metadata: Metadata = {
  title: "CoCo-sui Dashboard",
  description: "Guild control center for CoCo-sui bot"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${titleFont.variable}`}>{children}</body>
    </html>
  );
}
