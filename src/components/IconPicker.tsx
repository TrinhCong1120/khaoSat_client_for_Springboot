"use client";

import * as Icons from "@/icons";
import React from "react";

type Props = {
  value?: string;
  onChange: (iconName: string) => void;
};

export default function IconPicker({ value, onChange }: Props) {
  const iconEntries = Object.entries(Icons);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
        Biểu tượng
      </p>

      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl p-3 bg-gray-50/50 dark:bg-gray-900/50 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
        {iconEntries.map(([name, Icon]: any) => {
          const isActive = value === name;

          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              title={name}
              className={`flex items-center justify-center p-2.5 rounded-lg border transition-all duration-200
                ${
                  isActive
                    ? "bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20 scale-105"
                    : "bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-700 hover:border-brand-500/50 hover:text-brand-500 dark:hover:text-brand-400"
                }`}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      {value ? (
        <div className="flex items-center gap-2 mt-2 px-2 py-1.5 bg-brand-50 dark:bg-brand-500/10 rounded-lg w-fit">
          <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase">Đã chọn:</span>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{value}</span>
        </div>
      ) : (
        <p className="text-[10px] text-gray-400 italic ml-1">Chưa chọn biểu tượng nào</p>
      )}
    </div>
  );
}