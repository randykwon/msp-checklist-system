import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AdviceProvider } from "@/contexts/AdviceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

// 동적 렌더링 강제
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "AWS MSP 자체 평가 어드바이저",
  description: "AWS MSP 파트너 프로그램 자체 평가 어드바이저",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <ThemeProvider>
          <LanguageProvider>
            <AdviceProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </AdviceProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
