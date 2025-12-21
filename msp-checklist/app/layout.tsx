import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AdviceProvider } from "@/contexts/AdviceContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AWS MSP 자체 평가 헬퍼 시스템",
  description: "AWS MSP 파트너 프로그램 자체 평가 헬퍼 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          <AdviceProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </AdviceProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
