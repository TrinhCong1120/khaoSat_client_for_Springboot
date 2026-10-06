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
    ? "lg:ml-[264px]"
    : "lg:ml-[68px]";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 lg:flex">
      {/* SIDEBAR */}
      <AdminSidebar />

      {/* BACKDROP */}
      <Backdrop />

      {/* MAIN */}
      <div
        className={`min-w-0 flex-1 bg-gray-50 transition-[margin] duration-300 ease-in-out dark:bg-gray-950 ${mainContentMargin}`}
      >
        {/* HEADER */}
        <AdminHeader />


        {/* CONTENT */}
        <div className="mx-auto w-full max-w-(--breakpoint-2xl) px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <button
            onClick={() => router.back()}
            className="group mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm font-medium text-gray-600 transition-colors hover:text-brand-700 dark:text-gray-300 dark:hover:text-brand-300"
          >
            <FiArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Quay lại
          </button>
          
          <main id="main-content" className="min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
