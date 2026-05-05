import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AeroAssist — Votre Assistant Aéroport Intelligent via WhatsApp",
  description:
    "Simplifiez votre passage à l'aéroport avec AeroAssist. Assistant IA propulsé par Groq, accessible via WhatsApp. Infos vols, restaurants, salons VIP, transport et Duty-Free.",
  keywords: [
    "AeroAssist",
    "assistant aéroport",
    "WhatsApp",
    "IA",
    "aéroport",
    "Groq",
    "vol",
    "vols en temps réel",
    "salon VIP",
    "Duty-Free",
    "transport aéroport",
  ],
  authors: [{ name: "AeroAssist Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "AeroAssist — Assistant Aéroport Intelligent",
    description:
      "Votre assistant IA d'aéroport sur WhatsApp. Infos vols, restaurants, salons VIP, transport et plus encore.",
    siteName: "AeroAssist",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AeroAssist — Assistant Aéroport Intelligent",
    description:
      "Votre assistant IA d'aéroport sur WhatsApp. Infos vols, restaurants, salons VIP, transport et plus encore.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
