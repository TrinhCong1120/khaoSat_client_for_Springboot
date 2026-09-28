"use client";

import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 px-1 pt-4 text-sm dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-gray-500">
        Hiển thị {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} / {total}
      </p>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          <FiChevronLeft size={15} /> Trước
        </button>
        <span className="min-w-20 text-center text-xs font-semibold text-gray-700 dark:text-gray-200">Trang {page} / {pageCount}</span>
        <button type="button" disabled={page === pageCount} onClick={() => onPageChange(page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          Sau <FiChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
