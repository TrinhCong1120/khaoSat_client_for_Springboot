import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  // Simple logic for showing a few pages around current
  const startPage = Math.max(1, currentPage - 1);
  const endPage = Math.min(totalPages, startPage + 2);
  const adjustedStart = Math.max(1, endPage - 2);

  const pages = [];
  for (let i = adjustedStart; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center gap-2 select-none">
      {/* PREVIOUS */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
        title="Trang trước"
      >
        <FiChevronLeft size={20} />
      </button>

      {/* PAGES */}
      <div className="flex items-center gap-1.5 px-1">
        {adjustedStart > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(1)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold text-gray-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-500 transition-all"
            >
              1
            </button>
            {adjustedStart > 2 && <span className="text-gray-300 dark:text-gray-700 font-bold px-1">...</span>}
          </div>
        )}

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all shadow-sm
              ${
                currentPage === page
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20 scale-110 z-10"
                  : "bg-white dark:bg-gray-900 text-gray-500 border border-gray-100 dark:border-gray-800 hover:border-brand-500/50 hover:text-brand-500"
              }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <div className="flex items-center gap-1.5">
            {endPage < totalPages - 1 && <span className="text-gray-300 dark:text-gray-700 font-bold px-1">...</span>}
            <button
              onClick={() => onPageChange(totalPages)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold text-gray-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-500 transition-all"
            >
              {totalPages}
            </button>
          </div>
        )}
      </div>

      {/* NEXT */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
        title="Trang sau"
      >
        <FiChevronRight size={20} />
      </button>
    </div>
  );
};

export default Pagination;
