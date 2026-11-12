"use client";

import React from "react";
import Modal from "./Modal";
import { FiAlertTriangle, FiInfo, FiTrash2 } from "react-icons/fi";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title?: string;
  message?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string | null;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Xác nhận hành động",
  message = "Bạn có chắc chắn muốn thực hiện hành động này?",
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const isDanger = variant === "danger";
  const isWarning = variant === "warning";

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title={title}
      description={description}
      blocking={isLoading}
      className="max-w-md p-6"
    >
      <div className="space-y-4 pt-2">
        {/* ICON & MESSAGE */}
        <div
          className={`flex items-start gap-3.5 rounded-2xl border p-4 ${
            isDanger
              ? "border-rose-200/80 bg-rose-50/70 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
              : isWarning
              ? "border-amber-200/80 bg-amber-50/70 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
              : "border-blue-200/80 bg-blue-50/70 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200"
          }`}
        >
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
              isDanger
                ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400"
                : isWarning
                ? "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
                : "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
            }`}
          >
            {isDanger ? (
              <FiTrash2 size={20} />
            ) : isWarning ? (
              <FiAlertTriangle size={20} />
            ) : (
              <FiInfo size={20} />
            )}
          </div>
          <div className="min-w-0 flex-1 text-sm leading-relaxed">
            <p className="font-semibold">{message}</p>
            {description && (
              <p className="mt-1 text-xs opacity-80">{description}</p>
            )}
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {cancelText && (
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-xl transition disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              if (onConfirm) {
                await onConfirm();
              }
              onClose();
            }}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                : isWarning
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                : "bg-brand-500 hover:bg-brand-600 shadow-brand-500/20"
            }`}
          >
            {isLoading ? (
              <>
                <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Đang xử lý...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
