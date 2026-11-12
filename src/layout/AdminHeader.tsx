"use client";

import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { useSidebar } from "@/context/SidebarContext";
import Image from "next/image";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FiMenu,
  FiMoreVertical,
  FiLogOut,
  FiUser,
  FiShield,
  FiChevronDown,
  FiSend,
} from "react-icons/fi";
import { Bot } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import BotConnectModal from "@/components/users/BotConnectModal";
import { getMyProfile } from "@/lib/profile-service";

interface HeaderUserData {
  id?: string;
  username?: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  roles?: string[];
}

const AdminHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [user, setUser] = useState<HeaderUserData | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();
  const router = useRouter();

  // ======================
  // LOAD USER FROM STORAGE & BACKEND
  // ======================
  useEffect(() => {
    const loadUser = () => {
      const storage = localStorage.getItem("token")
        ? localStorage
        : sessionStorage;

      const userData = storage.getItem("user");
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch {
          // ignore
        }
      } else {
        setUser(null);
      }
    };

    loadUser();

    // Fetch latest profile to ensure avatar and full name are up to date
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      getMyProfile()
        .then((profile) => {
          setUser((prev) => ({
            ...prev,
            id: profile.id,
            username: profile.username,
            email: profile.email || undefined,
            fullName: profile.fullName || undefined,
            avatarUrl: profile.avatarUrl || undefined,
            roles: profile.roles,
          }));
        })
        .catch(() => {
          // silently fallback to storage data
        });
    }

    // listen khi login/logout/profile update
    window.addEventListener("userChanged", loadUser);
    return () => window.removeEventListener("userChanged", loadUser);
  }, []);

  // Click outside to close user dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const displayName = user?.fullName || user?.username || "Người dùng";
  const roleName = user?.roles?.[0] || "Thành viên";

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
              style={{ width: "auto", height: "auto" }}
            />
            <Image
              width={140}
              height={32}
              src="/images/logo/logo-dark.svg"
              alt="Logo"
              className="hidden dark:block"
              style={{ width: "auto", height: "auto" }}
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
            <button
              type="button"
              onClick={() => setIsBotModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-xs transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-950 dark:hover:text-brand-300"
              title="Kết nối Bot Telegram / Zalo"
            >
              <Bot className="size-4 text-brand-600 dark:text-brand-400" />
              <span className="hidden sm:inline">Bot thông báo</span>
            </button>
            <ThemeToggleButton />
          </div>

          {/* USER INFO & DROPDOWN MENU */}
          {user && (
            <div className="relative shrink-0 sm:ml-2" ref={dropdownRef}>
              {/* TRIGGER BUTTON */}
              <button
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                aria-expanded={isUserDropdownOpen}
                aria-label="Mở bảng điều khiển tài khoản"
                className="flex items-center gap-2.5 rounded-2xl p-1.5 text-left transition-colors hover:bg-gray-100/80 dark:hover:bg-gray-800/60"
              >
                {/* AVATAR */}
                <div className="relative flex size-9 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-brand-500 font-bold text-white shadow-xs dark:border-gray-700">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={displayName}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      {displayName.charAt(0)?.toUpperCase() || <FiUser size={18} />}
                    </div>
                  )}
                </div>

                {/* TEXT */}
                <div className="hidden min-w-0 max-w-40 text-left sm:block">
                  <p
                    className="truncate text-xs font-bold text-gray-800 dark:text-white"
                    title={displayName}
                  >
                    {displayName}
                  </p>
                  <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                    {roleName}
                  </p>
                </div>

                <FiChevronDown
                  size={14}
                  className={`text-gray-400 transition-transform ${
                    isUserDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* DROPDOWN MENU */}
              {isUserDropdownOpen && (
                <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-2xl border border-gray-200/80 bg-white p-2 shadow-xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-100">
                  {/* User Profile Mini Header */}
                  <div className="border-b border-gray-100 p-3 dark:border-gray-800">
                    <p className="truncate text-xs font-bold text-gray-900 dark:text-white">
                      {displayName}
                    </p>
                    <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                      @{user.username}
                    </p>
                    <div className="mt-2 inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                      {roleName}
                    </div>
                  </div>

                  {/* Links */}
                  <div className="space-y-0.5 py-1.5 text-xs font-semibold">
                    <Link
                      href="/admin/profile?tab=profile"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-brand-400"
                    >
                      <FiUser size={15} className="text-gray-400" />
                      <span>Hồ sơ cá nhân</span>
                    </Link>

                    <Link
                      href="/admin/profile?tab=security"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-brand-400"
                    >
                      <FiShield size={15} className="text-gray-400" />
                      <span>Đổi mật khẩu</span>
                    </Link>

                    <Link
                      href="/admin/profile?tab=bot"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-brand-400"
                    >
                      <Bot size={15} className="text-gray-400" />
                      <span>Kết nối Chatbot</span>
                    </Link>

                    <Link
                      href="/admin/profile?tab=google"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-brand-400"
                    >
                      <FcGoogle size={15} />
                      <span>Kết nối Google</span>
                    </Link>
                  </div>

                  {/* Divider & Logout */}
                  <div className="border-t border-gray-100 pt-1 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      <FiLogOut size={15} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <BotConnectModal
        isOpen={isBotModalOpen}
        onClose={() => setIsBotModalOpen(false)}
      />
    </header>
  );
};

export default AdminHeader;
