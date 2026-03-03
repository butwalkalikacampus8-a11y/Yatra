import type { Metadata } from "next";
import { Outfit, Geist_Mono, Mukta } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import OfflineBanner from "@/components/shared/OfflineBanner";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["devanagari", "latin"],
  weight: ["400", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YATRA",
  description: "Track your bus in real-time, book seats, and share your ride.",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${geistMono.variable} ${mukta.variable} antialiased font-sans`}
      >
        <AuthProvider>
          {children}
          <Toaster />
          <SonnerToaster richColors position="top-center" duration={5000} />
          <OfflineBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
