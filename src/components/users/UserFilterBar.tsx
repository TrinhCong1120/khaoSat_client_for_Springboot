"use client";

import React from "react";
import { FiSearch, FiX, FiFilter } from "react-icons/fi";

interface UserFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedRole: string;
  onRoleChange: (role: string) => void;
  roles: string[];
  selectedStatus: "all" | "active" | "inactive";
  onStatusChange: (status: "all" | "active" | "inactive") => void;
  onReset: () => void;
  totalResults: number;
}

export default function UserFilterBar({
  searchQuery,
  onSearchChange,
  selectedRole,
  onRoleChange,
  roles,
  selectedStatus,
  onStatusChange,
  onReset,
  totalResults,
}: UserFilterBarProps) {
  const isFiltered = searchQuery.trim() !== "" || selectedRole !== "all" || selectedStatus !== "all";

  return (
    <div className="mb-5 rounded-2xl border border-gray-200/80 bg-white p-3 sm:p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <FiSearch
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên hiển thị, @username, email, SĐT..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-9 text-xs font-medium text-gray-800 placeholder-gray-400 transition-all focus:border-brand-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:bg-gray-900"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Xóa tìm kiếm"
            >
              <FiX size={14} />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter */}
          <div className="relative min-w-[140px]">
            <select
              value={selectedRole}
              onChange={(e) => onRoleChange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-100 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-200"
            >
              <option value="all">Tất cả vai trò</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative min-w-[140px]">
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value as "all" | "active" | "inactive")}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-100 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-200"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Tạm khóa</option>
            </select>
          </div>

          {/* Reset Filter Button */}
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition-all hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400"
            >
              <FiX size={13} />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Count Bar */}
      <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2 text-[11px] text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <span className="flex items-center gap-1.5 font-medium">
          <FiFilter size={11} className="text-brand-500" />
          <span>
            Hiển thị <strong>{totalResults}</strong> người dùng phù hợp
          </span>
        </span>
        {isFiltered && (
          <span className="text-brand-600 dark:text-brand-400 font-medium">
            (Đang áp dụng bộ lọc)
          </span>
        )}
      </div>
    </div>
  );
}
