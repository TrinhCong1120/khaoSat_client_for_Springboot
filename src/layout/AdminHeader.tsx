"use client";

import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { useSidebar } from "@/context/SidebarContext";
import Image from "next/image";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiMenu, FiMoreVertical, FiLogOut, FiUser } from "react-icons/fi";

const AdminHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [user, setUser] = useState<{ username?: string; roles?: string[] } | null>(null);

  const { toggleSidebar, toggleMobileSidebar } = useSidebar();
  const router = useRouter();

  // ======================
  // LOAD USER FROM STORAGE
  // ======================
  useEffect(() => {
    const loadUser = () => {
      const storage = localStorage.getItem("token")
        ? localStorage
        : sessionStorage;

      const userData = storage.getItem("user");

      setUser(userData ? JSON.parse(userData) : null);
    };

    loadUser();

    // listen khi login/logout
    window.addEventListener("userChanged", loadUser);

    return () => window.removeEventListener("userChanged", loadUser);
  }, []);

  // ======================
  // SIDEBAR TOGGLE
  // ======================
  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };

  // ======================
  // LOGOUT
  // ======================
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    window.dispatchEvent(new Event("userChanged"));

    router.push("/signin");
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200/80 bg-white/90 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/90">
      <div className="flex flex-col items-center justify-between px-4 lg:flex-row lg:px-8">

        {/* ================= LEFT ================= */}
        <div className="flex w-full min-w-0 items-center justify-between gap-3 py-3 lg:w-auto lg:flex-1 lg:justify-start lg:py-4">

          {/* SIDEBAR BUTTON */}
          <button
            onClick={handleToggle}
            type="button"
            aria-label="Mở menu sidebar"
            className="group flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-950 dark:hover:text-brand-300 lg:-ml-5"
          >
            <FiMenu size={18} strokeWidth={2.2} />
          </button>

          {/* LOGO MOBILE */}
          <Link href="/" className="lg:hidden">
            <Image
              width={140}
              height={32}
              src="/images/logo/logo.svg"
              alt="Logo"
              className="dark:hidden"
              style={{ height: "auto" }}
            />
            <Image
              width={140}
              height={32}
              src="/images/logo/logo-dark.svg"
              alt="Logo"
              className="hidden dark:block"
              style={{ height: "auto" }}
            />
          </Link>

          {/* MOBILE MENU TOGGLE */}
          <button
            type="button"
            onClick={toggleApplicationMenu}
            aria-label="Mở menu tài khoản"
            aria-expanded={isApplicationMenuOpen}
            className="flex size-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 lg:hidden"
          >
            <FiMoreVertical size={20} />
          </button>
        </div>

        {/* ================= RIGHT ================= */}
        <div
          className={`${
            isApplicationMenuOpen ? "flex" : "hidden"
          } w-full min-w-0 items-center justify-between gap-3 pb-3 lg:flex lg:w-auto lg:shrink-0 lg:justify-end lg:pb-0`}
        >
          {/* ACTIONS */}
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
          </div>

          {/* USER INFO */}
          {user && (
            <div className="flex shrink-0 items-center gap-2 sm:ml-2 sm:gap-3">
              
              {/* TEXT */}
              <div className="hidden min-w-0 max-w-40 text-right sm:block">
                <p className="truncate whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-white/90" title={user.username}>
                  {user.username}
                </p>
                <p className="truncate whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                  {user.roles?.[0] || "Người dùng"}
                </p>
              </div>

              {/* AVATAR */}
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-500 font-bold text-white">
                {user.username?.charAt(0)?.toUpperCase() || <FiUser size={18} />}
              </div>

              {/* LOGOUT */}
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Đăng xuất"
                className="group rounded-lg p-2 text-error-600 transition-colors hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10 sm:ml-1"
                title="Đăng xuất"
              >
                <FiLogOut size={20} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
