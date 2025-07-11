import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/RootLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anbudshanteraren",
  description: "Anbudshanteraren - Hitta dina nästa upphandlingar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="w-full h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased w-full h-full m-0 p-0`}
        style={{ width: "100vw", minHeight: "100vh" }}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
