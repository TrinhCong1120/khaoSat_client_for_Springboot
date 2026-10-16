import type { Metadata, Viewport } from "next";

import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { Agentation } from "agentation";
import SiteVisitTracker from "@/components/SiteVisitTracker";


export const metadata: Metadata = {
  title: "Khảo sát | Tạo, chia sẻ và phân tích phản hồi",
  description: "Công cụ khảo sát cá nhân với lịch xuất bản, câu hỏi điều kiện, chia sẻ bằng mã và báo cáo trực quan.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c111d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className="antialiased"
    >
      <body
        className="min-h-full flex flex-col"
        suppressHydrationWarning
      >
          <ThemeProvider>
            <SidebarProvider>
              <SiteVisitTracker />
              {children}
              {process.env.NODE_ENV === "development" && (
                <Agentation />
              )}
            </SidebarProvider>
          </ThemeProvider>
        </body>
    </html>
  );
}
