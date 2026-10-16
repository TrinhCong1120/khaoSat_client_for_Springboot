"use client";

import { useState, type FormEvent } from "react";
import { FiAlertTriangle, FiCheckCircle, FiX } from "react-icons/fi";

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
      className="fixed inset-0 z-[120] flex items-end justify-center bg-gray-950/65 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="survey-confirm-title"
      aria-describedby="survey-confirm-description"
      onMouseDown={(event) => event.target === event.currentTarget && !busy && onCancel()}
    >
      <form onSubmit={submit} className="max-h-[calc(100dvh-1rem)] w-full max-w-[470px] overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl dark:bg-gray-900">
        <div className="px-5 pb-5 pt-6 sm:px-6">
          <div className="flex items-start gap-4">
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${danger ? "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400" : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"}`}>
              <FiAlertTriangle size={22} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 id="survey-confirm-title" className="text-xl font-semibold tracking-[-0.02em] text-gray-900 dark:text-white">{heading}</h2>
              <p id="survey-confirm-description" className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
                Hành động này cần được xác nhận để tránh thao tác nhầm.
              </p>
            </div>
            <button type="button" onClick={onCancel} disabled={busy} aria-label="Đóng" className="-mr-2 -mt-2 flex size-10 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-200">
              <FiX size={20} />
            </button>
          </div>
        </div>

        <div className="border-y border-gray-100 bg-gray-50/70 px-5 py-5 sm:px-6 dark:border-gray-800 dark:bg-gray-950/40">
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            Để xác nhận {actionText}, vui lòng nhập chính xác tên <strong className="break-words font-bold text-gray-950 dark:text-white">“{surveyTitle}”</strong>.
          </p>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">Tên khảo sát</span>
            <input
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Nhập tên khảo sát"
              disabled={busy}
              aria-invalid={value.length > 0 && !matches}
              className={`h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-gray-900 outline-none transition focus:ring-3 disabled:opacity-60 dark:bg-gray-900 dark:text-white ${value.length > 0 && !matches ? "border-error-300 focus:border-error-400 focus:ring-error-500/10 dark:border-error-700" : "border-gray-300 focus:border-brand-500 focus:ring-brand-500/10 dark:border-gray-700"}`}
            />
          </label>

          <div className="mt-2 min-h-5 text-xs">
            {matches ? (
              <p className="flex items-center gap-1.5 font-medium text-success-600 dark:text-success-400"><FiCheckCircle size={14} /> Tên khảo sát đã khớp.</p>
            ) : value ? (
              <p className="text-error-600 dark:text-error-400">Tên khảo sát chưa khớp.</p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Nút xác nhận sẽ mở khi tên khớp hoàn toàn.</p>
            )}
          </div>

          {error && <p role="alert" className="mt-3 rounded-xl bg-error-50 px-3.5 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-300">{error}</p>}
        </div>

        <div className="flex flex-col-reverse gap-2.5 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={onCancel} disabled={busy} className="h-11 rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40 sm:min-w-24 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Hủy</button>
          <button type="submit" disabled={!matches || busy} className={`h-11 rounded-xl px-5 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 sm:min-w-44 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 ${danger ? "bg-error-600 hover:bg-error-700 focus-visible:ring-error-500" : "bg-brand-600 hover:bg-brand-700 focus-visible:ring-brand-500"}`}>
            {busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
