"use client";

import { useState, type FormEvent } from "react";
import { FiAlertTriangle, FiX } from "react-icons/fi";

type Props = {
  heading: string;
  actionText: string;
  surveyTitle: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export default function SurveyNameConfirmationModal({
  heading,
  actionText,
  surveyTitle,
  confirmLabel,
  busy = false,
  error = "",
  danger = false,
  onCancel,
  onConfirm,
}: Props) {
  const [value, setValue] = useState("");
  const matches = value === surveyTitle;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (matches && !busy) void onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="survey-confirm-title"
      onMouseDown={(event) => event.target === event.currentTarget && !busy && onCancel()}
    >
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span className={`mt-0.5 rounded-full p-2 ${danger ? "bg-error-50 text-error-600 dark:bg-error-500/10" : "bg-amber-50 text-amber-600 dark:bg-amber-500/10"}`}>
              <FiAlertTriangle size={20} />
            </span>
            <div className="min-w-0">
              <h2 id="survey-confirm-title" className="text-lg font-semibold text-gray-900 dark:text-white">{heading}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Để xác nhận {actionText}, vui lòng nhập tên <strong className="font-bold text-gray-900 dark:text-white">“{surveyTitle}”</strong>.
              </p>
            </div>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Đóng" className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-200">
            <FiX size={20} />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Tên khảo sát</span>
          <input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Nhập chính xác tên khảo sát"
            disabled={busy}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          />
        </label>

        {error && <p role="alert" className="mt-3 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-900 dark:bg-error-950/30 dark:text-error-300">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Hủy</button>
          <button type="submit" disabled={!matches || busy} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 ${danger ? "bg-error-500 hover:bg-error-600" : "bg-brand-500 hover:bg-brand-600"}`}>
            {busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
