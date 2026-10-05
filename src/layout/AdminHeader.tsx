"use client";

import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import { useSidebar } from "@/context/SidebarContext";
import Image from "next/image";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FiMenu, FiMoreVertical, FiLogOut, FiUser } from "react-icons/fi";

const AdminHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);

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
    if (window.innerWidth >= 768) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };

  // ======================
  // SEARCH SHORTCUT (Ctrl + K)
  // ======================
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    <header className="sticky top-0 z-40 w-full border-b border-gray-200/50 bg-white/80 backdrop-blur-xl dark:border-gray-800/50 dark:bg-gray-900/80">
      <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-6">

        {/* ================= LEFT ================= */}
        <div className="flex items-center justify-between w-full gap-3 py-3 md:py-4">

          {/* SIDEBAR BUTTON */}
          <button
            onClick={handleToggle}
            type="button"
            aria-label="Mở menu sidebar"
            className="group flex size-9 shrink-0 items-center justify-center rounded-lg border border-gray-200/80 bg-white/70 text-gray-500 transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 active:scale-95 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400 md:-ml-5"
          >
            <FiMenu size={18} strokeWidth={2.2} />
          </button>

          {/* LOGO MOBILE */}
          <Link href="/" className="md:hidden">
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
            onClick={toggleApplicationMenu}
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden text-gray-500"
          >
            <FiMoreVertical size={20} />
          </button>
        </div>

        {/* ================= RIGHT ================= */}
        <div
          className={`${
            isApplicationMenuOpen ? "flex" : "hidden"
          } md:flex items-center gap-4 w-full md:w-auto pb-3 md:pb-0`}
        >
          {/* ACTIONS */}
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <div className="relative">
              <NotificationDropdown />
            </div>
          </div>

          {/* USER INFO */}
          {user && (
            <div className="flex items-center gap-3 ml-2">
              
              {/* TEXT */}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {user.username}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {user.roles?.[0] || "Người dùng"}
                </p>
              </div>

              {/* AVATAR */}
              <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold shadow-lg shadow-brand-500/20">
                {user.username?.charAt(0)?.toUpperCase() || <FiUser size={18} />}
              </div>

              {/* LOGOUT */}
              <button
                onClick={handleLogout}
                className="ml-3 p-2 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-xl transition-all group"
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
