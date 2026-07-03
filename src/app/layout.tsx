import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Frank's Restaurant | مطعم فرانك - توصيل سريع",
  description: "اطلب طعامك المفضل من مطعم Frank's - برغر، بيتزا، مقبلات، وحلويات مع توصيل سريع لباب منزلك",
  keywords: ["Frank's", "مطعم", "دليفري", "توصيل", "برغر", "بيتزا", "restaurant", "delivery"],
  authors: [{ name: "Frank's Restaurant" }],
  icons: {
    icon: "🍔",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} font-cairo antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-center" richColors />
      </body>
    </html>
  );
}
