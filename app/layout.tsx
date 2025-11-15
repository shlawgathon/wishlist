import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

