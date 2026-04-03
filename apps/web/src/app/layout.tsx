import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/libre-baskerville/400.css";
import "@fontsource/libre-baskerville/700.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiMisui Dashboard",
  description: "Guild control center for MiMisui bot"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="pink" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('mimisui.theme');
                  document.documentElement.setAttribute('data-theme', t === 'green' ? 'green' : 'pink');
                } catch (_) {
                  document.documentElement.setAttribute('data-theme', 'pink');
                }
              })();
            `
          }}
        />
      </head>
      <body className="font-body">{children}</body>
    </html>
  );
}
