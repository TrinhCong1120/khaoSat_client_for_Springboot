"use client";

import React from "react";
import { FiUsers, FiUserCheck, FiShield } from "react-icons/fi";
import { Bot } from "lucide-react";
import { User } from "@/app/admin/users/page";

interface UserStatsCardsProps {
  users: User[];
  totalElements: number;
}

export default function UserStatsCards({ users, totalElements }: UserStatsCardsProps) {
  // Compute metrics from current dataset / page
  const activeCount = users.filter((u) => u.isActive).length;
  const botLinkedCount = users.filter(
    (u) => u.telegramChatId != null || (u.zaloChatId != null && u.zaloChatId.trim() !== "")
  ).length;
  const adminCount = users.filter((u) =>
    u.roles?.some((r) => r.toLowerCase().includes("admin"))
  ).length;

  const stats = [
    {
      label: "Tổng người dùng",
      value: totalElements,
      subtext: "Tài khoản trong hệ thống",
      icon: FiUsers,
      color: "from-blue-500/10 to-indigo-500/10 text-brand-600 dark:text-brand-400 border-brand-200/60 dark:border-brand-900/40",
      iconBg: "bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400",
    },
    {
      label: "Đang hoạt động",
      value: activeCount,
      subtext: `${users.length > 0 ? Math.round((activeCount / users.length) * 100) : 100}% tài khoản khả dụng`,
      icon: FiUserCheck,
      color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/40",
      iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
    },
    {
      label: "Đã liên kết Chatbot",
      value: botLinkedCount,
      subtext: "Telegram hoặc Zalo",
      icon: Bot,
      color: "from-sky-500/10 to-cyan-500/10 text-sky-600 dark:text-sky-400 border-sky-200/60 dark:border-sky-900/40",
      iconBg: "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400",
    },
    {
      label: "Quản trị viên",
      value: adminCount,
      subtext: "Có quyền quản trị hệ thống",
      icon: FiShield,
      color: "from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border-purple-200/60 dark:border-purple-900/40",
      iconBg: "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {stat.label}
              </span>
              <div
                className={`flex size-9 sm:size-10 items-center justify-center rounded-xl ${stat.iconBg} transition-transform group-hover:scale-110`}
              >
                <Icon size={18} />
              </div>
            </div>

            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {stat.value}
              </div>
              <p className="mt-1 text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate">
                {stat.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
