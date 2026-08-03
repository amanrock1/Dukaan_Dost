import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/QueryProvider";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DukaanDost AI — Autonomous Operations Workspace",
  description: "Autonomous AI Employee & Operations System for Indian retail stores and MSMEs. Built for Codex India 2026.",
  keywords: ["inventory", "AI agent", "GST invoice", "retail India", "MSME", "dukaandost", "copilot", "autonomous", "Codex India"],
  icons: {
    icon: "/logo.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${jetBrainsMono.variable} antialiased bg-[#09090b] text-zinc-100 font-[family-name:var(--font-plus-jakarta)] selection:bg-emerald-500/30 selection:text-emerald-300`}
      >
        <QueryProvider>
          {children}
          <Toaster theme="dark" position="bottom-right" richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
