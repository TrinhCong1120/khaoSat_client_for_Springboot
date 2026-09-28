import type { Metadata } from "next";

import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarProvider } from "@/context/SidebarContext";
import ChatWidget from "@/components/chat/ChatWidget";


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
      <body className="min-h-full flex flex-col">
          <ThemeProvider>
            <SidebarProvider>
              {children}
              <ChatWidget />
            </SidebarProvider>
          </ThemeProvider>
        </body>
    </html>
  );
}
