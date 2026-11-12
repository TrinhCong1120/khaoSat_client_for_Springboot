"use client";

import React, { useState } from "react";
import {
  FiType,
  FiCheckCircle,
  FiList,
  FiHash,
  FiCalendar,
  FiMapPin,
  FiGrid,
  FiEdit3,
  FiCpu,
  FiPlus,
  FiX,
  FiLayers,
} from "react-icons/fi";
import Modal from "@/components/ui/modal/Modal";

export interface PaletteTypeOption {
  code: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: "BASIC" | "MATRIX" | "ADVANCED";
  badge?: string;
  color: string;
}

const PALETTE_OPTIONS: PaletteTypeOption[] = [
  // BASIC
  {
    code: "TEXT",
    name: "Văn bản",
    description: "Nhập câu trả lời dạng chữ ngắn hoặc đoạn văn tự do",
    icon: FiType,
    category: "BASIC",
    color: "blue",
  },
  {
    code: "SINGLE_CHOICE",
    name: "Một lựa chọn",
    description: "Chọn duy nhất 1 đáp án tròn (Radio) trong danh sách",
    icon: FiCheckCircle,
    category: "BASIC",
    color: "emerald",
  },
  {
    code: "MULTIPLE_CHOICE",
    name: "Nhiều lựa chọn",
    description: "Chọn một hoặc nhiều đáp án vuông (Checkbox)",
    icon: FiList,
    category: "BASIC",
    color: "teal",
  },
  {
    code: "NUMBER",
    name: "Điểm / Số liệu",
    description: "Nhập điểm số, số lượng hoặc số liệu tính toán",
    icon: FiHash,
    category: "BASIC",
    color: "indigo",
  },
  {
    code: "DATE",
    name: "Ngày tháng",
    description: "Chọn ngày / tháng / năm qua bộ chọn lịch",
    icon: FiCalendar,
    category: "BASIC",
    color: "amber",
  },
  {
    code: "ADDRESS",
    name: "Địa chỉ",
    description: "Chọn địa danh chuẩn Việt Nam (Tỉnh/Thành, Xã/Phường)",
    icon: FiMapPin,
    category: "BASIC",
    color: "rose",
  },

  // MATRIX & TABLES
  {
    code: "MATRIX_SINGLE",
    name: "Ma trận (1 lựa chọn / hàng)",
    description: "Bảng khảo sát Likert, mỗi hàng chỉ được chọn 1 cột đánh giá",
    icon: FiGrid,
    category: "MATRIX",
    badge: "Phổ biến",
    color: "purple",
  },
  {
    code: "MATRIX_MULTI",
    name: "Ma trận (Nhiều lựa chọn / hàng)",
    description: "Bảng dạng lưới cho phép đánh dấu nhiều ô trên mỗi hàng",
    icon: FiGrid,
    category: "MATRIX",
    color: "purple",
  },
  {
    code: "MATRIX_INPUT",
    name: "Ma trận nhập số / chữ",
    description: "Bảng biểu cho phép người tham gia tự gõ số hoặc chữ vào từng ô",
    icon: FiGrid,
    category: "MATRIX",
    color: "purple",
  },
  {
    code: "DYNAMIC_TABLE",
    name: "Bảng động (Thêm dòng tự do)",
    description: "Bảng mẫu cho phép người làm tự bấm '+ Thêm dòng' để khai báo",
    icon: FiEdit3,
    category: "MATRIX",
    badge: "Mới",
    color: "pink",
  },

  // ADVANCED AGGREGATION
  {
    code: "AGGREGATION",
    name: "Tiêu chí Cha (👑 Tổng hợp)",
    description: "Tự động tính tổng hợp điểm (SUM/AVG) từ các tiêu chí thành phần",
    icon: FiCpu,
    category: "ADVANCED",
    badge: "Tự động tính",
    color: "purple",
  },
];

interface BuilderQuestionPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (typeCode: string) => void;
}

export default function BuilderQuestionPalette({
  isOpen,
  onClose,
  onSelectType,
}: BuilderQuestionPaletteProps) {
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | "BASIC" | "MATRIX">("ALL");

  if (!isOpen) return null;

  const filteredOptions = PALETTE_OPTIONS.filter((opt) => {
    if (selectedCategory === "ALL") return true;
    if (selectedCategory === "BASIC") return opt.category === "BASIC";
    if (selectedCategory === "MATRIX") return opt.category === "MATRIX" || opt.category === "ADVANCED";
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm loại câu hỏi mới"
      description="Chọn loại câu hỏi bạn muốn đưa vào trang khảo sát hiện tại"
      className="max-w-2xl p-6"
    >
      <div className="space-y-4 pt-2">
        {/* CATEGORY TABS */}
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedCategory === "ALL"
                ? "bg-brand-500 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            Tất cả ({PALETTE_OPTIONS.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("BASIC")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedCategory === "BASIC"
                ? "bg-brand-500 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            Câu hỏi thông dụng (6)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("MATRIX")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedCategory === "MATRIX"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            Bảng ma trận & Tổng hợp (5)
          </button>
        </div>

        {/* OPTIONS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {filteredOptions.map((opt) => {
            const Icon = opt.icon;
            const isPurple = opt.color === "purple";
            const isPink = opt.color === "pink";

            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => {
                  onSelectType(opt.code);
                  onClose();
                }}
                className={`group flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                  isPurple
                    ? "border-purple-200/80 bg-purple-50/40 hover:border-purple-400 hover:bg-purple-50 dark:border-purple-900/50 dark:bg-purple-950/20"
                    : isPink
                    ? "border-pink-200/80 bg-pink-50/40 hover:border-pink-400 hover:bg-pink-50 dark:border-pink-900/50 dark:bg-pink-950/20"
                    : "border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50/20 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                }`}
              >
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition ${
                    isPurple
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 group-hover:bg-purple-600 group-hover:text-white"
                      : isPink
                      ? "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 group-hover:bg-pink-600 group-hover:text-white"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 group-hover:bg-brand-500 group-hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                      {opt.name}
                    </p>
                    {opt.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          isPurple
                            ? "bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            : "bg-pink-200 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

