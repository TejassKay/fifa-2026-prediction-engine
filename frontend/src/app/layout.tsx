import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fifawc26hub.com"),
  title: "Fifa WC 26 Hub",
  description: "Global Prediction Engine and Dashboard for the 2026 World Cup",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${oswald.variable} bg-background text-foreground antialiased flex flex-col md:flex-row h-screen overflow-hidden relative`}>
        {/* Ambient Neon Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#00f2fe]/20 blur-[120px] pointer-events-none z-[-2]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#4facfe]/20 blur-[150px] pointer-events-none z-[-2]"></div>
        <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] rounded-full bg-[#00f2fe]/10 blur-[100px] pointer-events-none z-[-2]"></div>

        {/* Persistent Watermark Background */}
        <div className="absolute inset-0 pointer-events-none z-[-1] overflow-hidden flex items-center justify-center opacity-[0.02]">
          <div className="font-black text-[20vw] leading-none text-white whitespace-nowrap -rotate-12 select-none tracking-tighter">
            FIFA WC 26 HUB
          </div>
        </div>

        <MobileNav />
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-neutral-950/80 backdrop-blur-3xl p-4 md:p-10 relative z-10 w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
