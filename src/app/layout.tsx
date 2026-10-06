import type { Metadata, Viewport } from "next";

import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { Agentation } from "agentation";


export const metadata: Metadata = {
  title: "Khảo sát nhà ở xã hội | Sở Xây dựng Đà Nẵng",
  description: "Cổng khảo sát nhu cầu nhà ở xã hội của Sở Xây dựng Đà Nẵng.",
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
              {children}
              {process.env.NODE_ENV === "development" && (
                <Agentation endpoint="http://localhost:4747" />
              )}
            </SidebarProvider>
          </ThemeProvider>
        </body>
    </html>
  );
}
