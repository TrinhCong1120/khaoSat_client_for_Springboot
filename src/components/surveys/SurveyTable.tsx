"use client";

import React from "react";
import {
  FiEdit3,
  FiTrash2,
  FiBarChart2,
  FiExternalLink,
  FiUnlock,
  FiLock,
} from "react-icons/fi";
import { API_PUBLIC_SURVEYS } from "@/lib/api";

type Survey = {
  id: number;
  title: string;
  description: string;
  isActive?: boolean;
};

type Props = {
  surveys: Survey[];
  togglingId: number | null;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, nextActive: boolean) => void | Promise<void>;
};

export default function SurveyTable({
  surveys,
  togglingId,
  onEdit,
  onDelete,
  onToggleActive,
}: Props) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-gray-900 transition-all">
      <div className="overflow-x-auto text-gray-500 dark:text-gray-400">
        <table className="w-full text-sm text-left">

          {/* HEADER */}
          <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-[11px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Tiêu đề</th>
              <th className="px-6 py-4">Mô tả</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4">API Public</th>
              <th className="px-6 py-4 text-right">Hành động</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {surveys.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 italic">
                  Không tìm thấy khảo sát nào.
                </td>
              </tr>
            ) : (
              surveys.map((s) => {
                const open = s.isActive !== false;
                const busy = togglingId === s.id;
                return (
                <tr
                  key={s.id}
                  className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* ID */}
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">
                    #{s.id}
                  </td>

                  {/* TITLE */}
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-800 dark:text-white/90">
                      {s.title}
                    </div>
                  </td>

                  {/* DESCRIPTION */}
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate text-gray-500 dark:text-gray-400 text-xs">
                      {s.description || "—"}
                    </div>
                  </td>

                  {/* OPEN / CLOSE */}
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggleActive(s.id, !open)}
                      title={open ? "Nhấn để đóng khảo sát" : "Nhấn để mở lại"}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
                        open
                          ? "border-success-200 bg-success-50 text-success-700 hover:bg-success-100 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400 dark:hover:bg-success-500/15"
                          : "border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                    >
                      {busy ? (
                        <span className="size-3.5 animate-pulse rounded-full bg-current opacity-60" />
                      ) : open ? (
                        <FiUnlock className="size-3.5 shrink-0" />
                      ) : (
                        <FiLock className="size-3.5 shrink-0" />
                      )}
                      {busy ? "…" : open ? "Đang mở" : "Đã đóng"}
                    </button>
                  </td>

                  {/* API PUBLIC */}
                  <td className="px-6 py-4">
                    <a
                      href={`${API_PUBLIC_SURVEYS}/${s.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-brand-500 hover:text-brand-600 font-bold text-xs uppercase tracking-tight transition-colors group/link"
                    >
                      <span>Xem link</span>
                      <FiExternalLink size={14} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                    </a>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      
                      {/* RESULT */}
                      <a
                        href={`/admin/survey/${s.id}/result`}
                        title="Xem kết quả"
                        className="p-2 text-success-500 hover:bg-success-50 dark:hover:bg-success-500/10 rounded-xl transition-all"
                      >
                        <FiBarChart2 size={18} />
                      </a>

                      {/* EDIT */}
                      <button
                        onClick={() => onEdit(s.id)}
                        title="Chỉnh sửa"
                        className="p-2 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-xl transition-all"
                      >
                        <FiEdit3 size={18} />
                      </button>

                      {/* DELETE */}
                      <button
                        onClick={() => onDelete(s.id)}
                        title="Xóa"
                        className="p-2 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-xl transition-all"
                      >
                        <FiTrash2 size={18} />
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
    </div>
  );
}
