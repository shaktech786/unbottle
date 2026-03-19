import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Unbottle -- AI Music Producer for Solo Musicians",
  description:
    "An AI producer that helps solo musicians go from idea to finished track. Built for ADHD-friendly workflows with no forced linearity and no decision fatigue.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-50">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
