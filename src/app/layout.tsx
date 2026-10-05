import type { Metadata } from "next";

import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { Agentation } from "agentation";


export const metadata: Metadata = {
  title: "Khảo sát nhà ở xã hội-Sở xây dựng Đà Nẵng",
  description: "Khảo sát nhà ở xã hội-Sở xây dựng Đà Nẵng",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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
