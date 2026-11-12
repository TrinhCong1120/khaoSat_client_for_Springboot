"use client";

import React from "react";
import Modal from "@/components/ui/modal/Modal";
import { User } from "@/app/admin/users/page";
import { FiAlertTriangle, FiTrash2 } from "react-icons/fi";

interface DeleteUserConfirmModalProps {
  isOpen: boolean;
  user: User | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteUserConfirmModal({
  isOpen,
  user,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteUserConfirmModalProps) {
  if (!isOpen || !user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isDeleting ? () => {} : onClose}
      title="Xác nhận xóa tài khoản"
      description="Hành động này không thể hoàn tác sau khi thực hiện"
      size="sm"
    >
      <div className="space-y-4 pt-2">
        {/* Warning Icon & Message */}
        <div className="flex items-start gap-3.5 rounded-2xl border border-rose-200/80 bg-rose-50/70 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
            <FiAlertTriangle size={20} />
          </div>
          <div className="min-w-0 flex-1 text-xs text-rose-900 dark:text-rose-200">
            <p className="font-bold">Bạn có chắc chắn muốn xóa người dùng này?</p>
            <p className="mt-1 leading-relaxed opacity-90">
              Tất cả dữ liệu liên kết, quyền hạn và lịch sử hoạt động của tài khoản sẽ bị xóa khỏi hệ thống.
            </p>
          </div>
        </div>

        {/* User Card to delete */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3.5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 font-bold text-white text-sm">
              {(user.fullName || user.username).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                {user.fullName || user.username}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-mono">@{user.username}</span>
                <span>•</span>
                <span className="truncate">{user.email || "Chưa có email"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-700 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Đang xóa...</span>
              </>
            ) : (
              <>
                <FiTrash2 size={14} />
                <span>Xác nhận xóa</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
