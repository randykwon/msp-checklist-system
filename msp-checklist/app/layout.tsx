import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AdviceProvider } from "@/contexts/AdviceContext";

// 동적 렌더링 강제
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      <body className="antialiased">
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
