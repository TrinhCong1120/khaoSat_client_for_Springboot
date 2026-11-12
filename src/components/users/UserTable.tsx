"use client";

import React from "react";
import { User } from "@/app/admin/users/page";
import { FiEdit3, FiTrash2, FiMail, FiPhone, FiSend, FiShield } from "react-icons/fi";
import { Bot } from "lucide-react";

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onToggleStatus: (userId: string, newStatus: boolean) => Promise<void>;
  isTogglingId?: string | null;
}

export default function UserTable({
  users,
  onEdit,
  onDelete,
  onToggleStatus,
  isTogglingId,
}: UserTableProps) {
  const getRoleBadgeStyle = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes("admin")) {
      return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/80 dark:bg-purple-950/60 dark:text-purple-300";
    }
    if (r.includes("manager") || r.includes("creator")) {
      return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/80 dark:bg-indigo-950/60 dark:text-indigo-300";
    }
    return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300";
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
      {/* DESKTOP TABLE (Fits 100% container width, no horizontal scrollbar) */}
      <div className="hidden md:block">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-gray-100 bg-gray-50/90 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
            <tr>
              <th className="px-3 py-3 text-center w-12 whitespace-nowrap">STT</th>
              <th className="px-4 py-3">Người dùng</th>
              <th className="px-3 py-3 whitespace-nowrap">Liên hệ & Chatbot</th>
              <th className="px-3 py-3 whitespace-nowrap">Vai trò</th>
              <th className="px-2 py-3 text-center w-20 whitespace-nowrap">Trạng thái</th>
              <th className="px-3 py-3 text-right w-20 whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                  Không tìm thấy người dùng nào phù hợp.
                </td>
              </tr>
            ) : (
              users.map((user, index) => {
                const isTelegramLinked = user.telegramChatId != null;
                const isZaloLinked = user.zaloChatId != null && user.zaloChatId.trim() !== "";
                const isToggling = isTogglingId === user.id;

                return (
                  <tr
                    key={user.id}
                    className="group transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                  >
                    {/* STT */}
                    <td className="px-3 py-3 text-center font-mono font-medium text-gray-400 whitespace-nowrap">
                      {index + 1}
                    </td>

                    {/* USER INFO */}
                    <td className="px-4 py-3 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <div className="relative size-9 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-2 ring-gray-100 dark:bg-gray-800 dark:ring-gray-800">
                          {user.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.avatarUrl}
                              alt={user.fullName || user.username}
                              className="size-full object-cover"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center bg-gradient-to-br from-brand-500 to-indigo-600 font-bold text-white text-xs">
                              {(user.fullName || user.username).charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate">
                            {user.fullName || user.username}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                            <span className="font-mono text-gray-400 whitespace-nowrap shrink-0">@{user.username}</span>
                            <span className="shrink-0">•</span>
                            <span className="truncate flex items-center gap-1 min-w-0">
                              <FiMail size={10} className="text-gray-400 shrink-0" />
                              <span className="truncate">{user.email || "Chưa có email"}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* CONTACT & CHATBOT */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="space-y-1">
                        {user.phoneNumber ? (
                          <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300 font-medium text-xs">
                            <FiPhone size={11} className="text-gray-400" />
                            <span>{user.phoneNumber}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[10px]">Chưa có SĐT</span>
                        )}

                        <div className="flex items-center gap-1">
                          {/* Telegram chip */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border whitespace-nowrap ${
                              isTelegramLinked
                                ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300"
                                : "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-500"
                            }`}
                          >
                            <FiSend size={8} />
                            <span>Telegram</span>
                            <span
                              className={`size-1 rounded-full ${
                                isTelegramLinked ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                              }`}
                            />
                          </span>

                          {/* Zalo chip */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border whitespace-nowrap ${
                              isZaloLinked
                                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300"
                                : "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-500"
                            }`}
                          >
                            <Bot size={9} />
                            <span>Zalo</span>
                            <span
                              className={`size-1 rounded-full ${
                                isZaloLinked ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                              }`}
                            />
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* ROLES (Supports multiple roles) */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {user.roles && user.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase whitespace-nowrap ${getRoleBadgeStyle(
                                role
                              )}`}
                            >
                              <FiShield size={9} />
                              <span>{role}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">Chưa có vai trò</span>
                      )}
                    </td>

                    {/* STATUS SWITCH TOGGLE */}
                    <td className="px-2 py-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={user.isActive}
                          disabled={isToggling}
                          onClick={() => onToggleStatus(user.id, !user.isActive)}
                          title={user.isActive ? "Bấm để tạm khóa tài khoản" : "Bấm để kích hoạt tài khoản"}
                          className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${
                            user.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"
                          }`}
                        >
                          <span className="sr-only">Toggle trạng thái tài khoản</span>
                          <span
                            className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              user.isActive ? "translate-x-4.5" : "translate-x-0.5"
                            }`}
                          >
                            {isToggling && (
                              <span className="block size-full animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                            )}
                          </span>
                        </button>
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(user)}
                          title="Chỉnh sửa thông tin & phân quyền"
                          className="flex size-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-800 dark:hover:bg-brand-950/60 dark:hover:text-brand-400"
                        >
                          <FiEdit3 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(user)}
                          title="Xóa tài khoản"
                          className="flex size-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-rose-900 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS VIEW (< md) */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
        {users.length === 0 ? (
          <div className="px-5 py-12 text-center text-xs text-gray-400 italic">
            Không tìm thấy người dùng nào phù hợp.
          </div>
        ) : (
          users.map((user, index) => {
            const isTelegramLinked = user.telegramChatId != null;
            const isZaloLinked = user.zaloChatId != null && user.zaloChatId.trim() !== "";
            const isToggling = isTogglingId === user.id;

            return (
              <article key={user.id} className="p-4 space-y-3.5">
                {/* Header: Avatar, Name, Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatarUrl}
                          alt={user.fullName || user.username}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-gradient-to-br from-brand-500 to-indigo-600 font-bold text-white text-base">
                          {(user.fullName || user.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                        {user.fullName || user.username}
                      </p>
                      <p className="text-xs text-gray-400 font-mono truncate">
                        @{user.username} • #{index + 1}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEdit(user)}
                      className="flex size-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <FiEdit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(user)}
                      className="flex size-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-rose-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-gray-50/80 p-3 text-xs dark:bg-gray-800/80">
                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                      Email
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate block">
                      {user.email || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                      Số điện thoại
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate block">
                      {user.phoneNumber || "—"}
                    </span>
                  </div>
                </div>

                {/* Roles & Status Row */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-1">
                    {user.roles?.map((role, idx) => (
                      <span
                        key={idx}
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${getRoleBadgeStyle(
                          role
                        )}`}
                      >
                        {role}
                      </span>
                    ))}
                  </div>

                  {/* Mobile Status Switch */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      {user.isActive ? "Hoạt động" : "Tạm khóa"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={user.isActive}
                      disabled={isToggling}
                      onClick={() => onToggleStatus(user.id, !user.isActive)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${
                        user.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"
                      }`}
                    >
                      <span
                        className={`inline-block size-3.5 transform rounded-full bg-white shadow-xs transition ${
                          user.isActive ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
