import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FIFA 2026 Prediction Engine",
  description: "Advanced Monte Carlo simulation engine and dashboard for the 2026 World Cup",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased flex h-screen overflow-hidden`}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-neutral-950 p-6 md:p-10">
          {children}
        </main>
      </body>
    </html>
  );
}
