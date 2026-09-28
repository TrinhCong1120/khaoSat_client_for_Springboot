"use client";

import React from "react";
import { Role } from "@/app/admin/roles/page";
import { FiEdit3, FiTrash2 } from "react-icons/fi";

interface RoleTableProps {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (roleId: number) => void;
}

const RoleTable: React.FC<RoleTableProps> = ({
  roles,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-gray-900 transition-all">
      <div className="hidden w-full overflow-x-auto md:block">
        <table className="w-full min-w-[460px] text-left text-sm">
          
          {/* HEADER */}
          <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-[11px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Tên vai trò</th>
              <th className="px-6 py-4 text-right">Hành động</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {roles.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-10 text-center text-gray-400 italic"
                >
                  Không tìm thấy vai trò nào.
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr
                  key={role.id}
                  className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* ID */}
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">
                    #{role.id}
                  </td>

                  {/* NAME */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-lg bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-tight text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 border border-brand-100 dark:border-brand-500/20">
                      {role.name}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      
                      <button
                        title="Chỉnh sửa"
                        onClick={() => onEdit(role)}
                        className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-xl transition-all"
                      >
                        <FiEdit3 size={18} />
                      </button>

                      <button
                        title="Xóa vai trò"
                        onClick={() => onDelete(role.id)}
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
        {roles.length === 0 ? <div className="px-5 py-10 text-center text-sm text-gray-400">Không tìm thấy vai trò nào.</div> : roles.map((role) => (
          <article key={role.id} className="flex items-center justify-between gap-3 p-4">
            <div><p className="mb-1 font-mono text-xs text-gray-400">#{role.id}</p><span className="inline-flex rounded-lg border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-bold uppercase text-brand-600 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400">{role.name}</span></div>
            <div className="flex gap-1"><button aria-label="Chỉnh sửa" onClick={() => onEdit(role)} className="rounded-xl p-2 text-gray-400 hover:bg-brand-50 hover:text-brand-500"><FiEdit3 size={18} /></button><button aria-label="Xóa vai trò" onClick={() => onDelete(role.id)} className="rounded-xl p-2 text-gray-400 hover:bg-error-50 hover:text-error-500"><FiTrash2 size={18} /></button></div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default RoleTable;
