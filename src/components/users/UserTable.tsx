"use client";

import React from "react";
import { User } from "@/app/admin/users/page";
import { FiEdit3, FiTrash2 } from "react-icons/fi";

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: number) => void;
}

const UserTable: React.FC<UserTableProps> = ({ users, onEdit, onDelete }) => {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[680px] text-sm text-left">
          
          {/* HEADER */}
          <thead className="bg-gray-50 text-xs font-semibold text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Thông tin người dùng</th>
              <th className="px-6 py-4">Vai trò</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-right">Hành động</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">
                  Không tìm thấy người dùng nào.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">
                    #{user.id}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xs border border-brand-100 dark:border-brand-500/20">
                        {user.username?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-800 dark:text-white/90">{user.username}</span>
                    </div>
                  </td>

                  {/* ✅ ROLE */}
                  <td className="px-6 py-4">
                    {user.roles && user.roles.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                            {role}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic">Chưa có vai trò</span>
                    )}
                  </td>

                  {/* STATUS */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-success-500 animate-pulse" : "bg-gray-300 dark:bg-gray-600"}`} />
                      <span className={`text-xs font-medium ${user.isActive ? "text-success-600 dark:text-success-400" : "text-gray-400"}`}>
                        {user.isActive ? "Đang hoạt động" : "Tạm khóa"}
                      </span>
                    </div>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Chỉnh sửa"
                        onClick={() => onEdit(user)}
                        className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-xl transition-all"
                      >
                        <FiEdit3 size={18} />
                      </button>

                      <button
                        title="Xóa người dùng"
                        onClick={() => onDelete(user.id)}
                        className="p-2 text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-xl transition-all"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
        {users.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Không tìm thấy người dùng nào.</div>
        ) : users.map((user) => (
          <article key={user.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">{user.username?.charAt(0)?.toUpperCase()}</div>
                <div className="min-w-0"><p className="truncate font-semibold text-gray-800 dark:text-white/90">{user.username}</p><p className="font-mono text-xs text-gray-400">#{user.id}</p></div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button aria-label="Chỉnh sửa" onClick={() => onEdit(user)} className="rounded-xl p-2 text-gray-400 hover:bg-brand-50 hover:text-brand-500"><FiEdit3 size={18} /></button>
                <button aria-label="Xóa người dùng" onClick={() => onDelete(user.id)} className="rounded-xl p-2 text-gray-400 hover:bg-error-50 hover:text-error-500"><FiTrash2 size={18} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="mb-1 text-gray-400">Vai trò</p><div className="flex flex-wrap gap-1">{user.roles?.length ? user.roles.map((role, idx) => <span key={idx} className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 font-bold text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">{role}</span>) : <span className="italic text-gray-400">Chưa có vai trò</span>}</div></div>
              <div><p className="mb-1 text-gray-400">Trạng thái</p><span className={user.isActive ? "font-medium text-success-600" : "font-medium text-gray-400"}>{user.isActive ? "● Đang hoạt động" : "● Tạm khóa"}</span></div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default UserTable;
