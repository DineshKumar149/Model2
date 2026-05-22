import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProvider } from "@/components/layout/ClientProvider";
import { AppLayout } from "@/components/layout/AppLayout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport = {
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: "Nova — Social Platform",
  description: "The ultimate social platform combining the best of Instagram, Twitter, Snapchat, and Telegram.",
  keywords: ["social media", "photos", "videos", "messaging", "stories", "reels"],
  manifest: "/manifest.json",
  openGraph: {
    title: "Nova — Social Platform",
    description: "Connect, share, and discover with Nova.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>
        <ClientProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </ClientProvider>
      </body>
    </html>
  );
}
