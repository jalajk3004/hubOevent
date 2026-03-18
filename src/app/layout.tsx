import type { Metadata } from "next";
import { Inter, Outfit, Geist, Pacifico, Fredoka } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const pacifico = Pacifico({
  weight: "400",
  variable: "--font-pacifico",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HubO Events | Where Moments Become Experiences",
  description: "We create unforgettable concerts, nightlife experiences, and brand events that bring people together.",
};

export const viewport = {
  width: 'device-width',
  height: 'device-height',
  initialScale: 1.0,
  maximumScale: 1.0,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body className={`${inter.variable} ${outfit.variable} ${pacifico.variable} ${fredoka.variable} ${inter.className}`}>
        {children}
      </body>
    </html>
  );
}
