"use client";

import React, { useState } from "react";
import { UserProfile } from "@/lib/profile-service";
import AvatarPickerModal from "./AvatarPickerModal";
import {
  FiUser,
  FiShield,
  FiSend,
  FiCamera,
  FiMail,
  FiPhone,
} from "react-icons/fi";
import { Bot } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

interface ProfileHeroProps {
  user: UserProfile;
  activeTab: "profile" | "security" | "bot" | "google";
  onTabChange: (tab: "profile" | "security" | "bot" | "google") => void;
  onAvatarUpdated: (newAvatarUrl: string | null) => Promise<void>;
  googleConnectionsCount?: number;
}

export default function ProfileHero({
  user,
  activeTab,
  onTabChange,
  onAvatarUpdated,
  googleConnectionsCount,
}: ProfileHeroProps) {
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const isTelegramLinked = user.telegramChatId != null;
  const isZaloLinked = user.zaloChatId != null && user.zaloChatId.trim() !== "";
  const roleName = user.roles?.[0] || "Thành viên";
  const displayName = user.fullName || user.username;

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl border border-gray-200/90 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        {/* Decorative Top Banner */}
        <div className="relative h-28 w-full bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 sm:h-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_60%)]" />
        </div>

        {/* Content Section - 100% on Clean Background (Zero Text Overlapping Banner!) */}
        <div className="px-5 pb-5 sm:px-8">
          {/* Header Row: Floating Avatar on left, User Details on right */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            {/* Floating Avatar sticking up into banner */}
            <div className="-mt-14 sm:-mt-16 group relative size-24 shrink-0 rounded-2xl bg-white p-1 ring-4 ring-white shadow-xl dark:bg-gray-900 dark:ring-gray-900 sm:size-28">
              <div className="size-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={displayName}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-gradient-to-br from-brand-500 to-indigo-600 text-3xl font-black text-white sm:text-4xl">
                    {displayName.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Edit Camera Button */}
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                aria-label="Thay đổi ảnh đại diện"
                className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-xl border-2 border-white bg-brand-600 text-white shadow-md transition-all hover:scale-110 hover:bg-brand-700 dark:border-gray-900 cursor-pointer"
                title="Thay đổi ảnh đại diện"
              >
                <FiCamera size={14} />
              </button>
            </div>

            {/* User Names, Meta Information & Bot Status Chips - Completely on White/Dark Card */}
            <div className="min-w-0 flex-1 pt-1.5 sm:pt-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl tracking-tight">
                  {displayName}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:border-brand-800/80 dark:bg-brand-950/80 dark:text-brand-300">
                  <FiShield size={12} className="text-brand-600 dark:text-brand-400" />
                  {roleName}
                </span>
              </div>

              {/* Username & Contact Line with High Contrast */}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="font-mono font-bold text-gray-500 dark:text-gray-400">
                  @{user.username}
                </span>

                {user.email && (
                  <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-200">
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <FiMail size={13} className="text-brand-600 dark:text-brand-400" />
                    <span>{user.email}</span>
                  </span>
                )}

                {user.phoneNumber && (
                  <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-200">
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <FiPhone size={13} className="text-brand-600 dark:text-brand-400" />
                    <span>{user.phoneNumber}</span>
                  </span>
                )}
              </div>

              {/* Bot Status Indicators - Neatly aligned under user contact info */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isTelegramLinked
                      ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800/70 dark:bg-sky-950/50 dark:text-sky-300"
                      : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  <FiSend size={13} className={isTelegramLinked ? "text-sky-600 dark:text-sky-400" : "text-gray-400"} />
                  <span>Telegram: {isTelegramLinked ? "Đã liên kết" : "Chưa liên kết"}</span>
                  <span
                    className={`size-1.5 rounded-full ${
                      isTelegramLinked ? "bg-emerald-500 animate-pulse" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isZaloLinked
                      ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/70 dark:bg-blue-950/50 dark:text-blue-300"
                      : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  <Bot className={`size-4 ${isZaloLinked ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`} />
                  <span>Zalo: {isZaloLinked ? "Đã liên kết" : "Chưa liên kết"}</span>
                  <span
                    className={`size-1.5 rounded-full ${
                      isZaloLinked ? "bg-emerald-500 animate-pulse" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                </div>

                {googleConnectionsCount !== undefined && (
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      googleConnectionsCount > 0
                        ? "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800/70 dark:bg-purple-950/50 dark:text-purple-300"
                        : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    <FcGoogle className="size-3.5" />
                    <span>Google: {googleConnectionsCount > 0 ? `${googleConnectionsCount} tài khoản` : "Chưa kết nối"}</span>
                    <span
                      className={`size-1.5 rounded-full ${
                        googleConnectionsCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={() => onTabChange("profile")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "profile"
                  ? "bg-brand-600 text-white shadow-xs shadow-brand-500/25"
                  : "bg-gray-100/80 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              <FiUser size={14} />
              <span>Thông tin cá nhân</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange("security")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "security"
                  ? "bg-brand-600 text-white shadow-xs shadow-brand-500/25"
                  : "bg-gray-100/80 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              <FiShield size={14} />
              <span>Bảo mật & Đổi mật khẩu</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange("bot")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "bot"
                  ? "bg-brand-600 text-white shadow-xs shadow-brand-500/25"
                  : "bg-gray-100/80 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              <Bot className="size-4" />
              <span>Kết nối Chatbot</span>
              {(isTelegramLinked || isZaloLinked) && (
                <span className="flex size-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onTabChange("google")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "google"
                  ? "bg-brand-600 text-white shadow-xs shadow-brand-500/25"
                  : "bg-gray-100/80 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              <FcGoogle className="size-4" />
              <span>Kết nối Google</span>
              {googleConnectionsCount !== undefined && googleConnectionsCount > 0 && (
                <span className="flex size-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={user.avatarUrl}
        username={user.username}
        onSaveAvatar={onAvatarUpdated}
      />
    </>
  );
}
