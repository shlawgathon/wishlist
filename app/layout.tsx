import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Wishlist - AI-Powered Crypto Fundraising",
  description: "AI-powered crypto fundraising platform with autonomous investment matching",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const storageKey = 'wishlist-theme';
                const stored = localStorage.getItem(storageKey);
                const theme = stored || 'system';
                let resolved = 'light';
                
                if (theme === 'system') {
                  resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                } else {
                  resolved = theme;
                }
                
                document.documentElement.classList.add(resolved);
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey="wishlist-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

