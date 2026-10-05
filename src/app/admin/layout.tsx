"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";

import AdminSidebar from "@/layout/AdminSidebar";
import AdminHeader from "@/layout/AdminHeader";
import Backdrop from "@/layout/Backdrop";

// ======================
// MAIN LAYOUT (CHECK TOKEN)
// ======================
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);


  useEffect(() => {
    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (!token) {
      router.replace("/signin");
    } else {
      setIsChecking(false);
    }
  }, []);

  if (isChecking) return null;

  return (
    <ThemeProvider>
      <SidebarProvider>
        <LayoutContent>{children}</LayoutContent>
      </SidebarProvider>
    </ThemeProvider>
  );
}


function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isExpanded, isMobileOpen } = useSidebar();
  const router = useRouter();

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded
    ? "md:ml-[264px]"
    : "md:ml-[68px]";

  return (
    <div className="min-h-screen xl:flex bg-gray-50 dark:bg-gray-900">
      {/* SIDEBAR */}
      <AdminSidebar />

      {/* BACKDROP */}
      <Backdrop />

      {/* MAIN */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin} bg-gray-50 dark:bg-gray-900`}
      >
        {/* HEADER */}
        <AdminHeader />


        {/* CONTENT */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6 bg-transparent">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-brand-500 dark:text-gray-500 dark:hover:text-brand-400 mb-6 group transition-all"
          >
            <FiArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Quay lại
          </button>
          
          <main className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
