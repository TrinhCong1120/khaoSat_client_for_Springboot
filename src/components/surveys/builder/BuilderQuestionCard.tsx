"use client";

import React, { useState } from "react";
import {
  FiTrash2,
  FiCopy,
  FiSave,
  FiImage,
  FiPlus,
  FiX,
  FiCornerDownRight,
  FiCheckCircle,
  FiList,
  FiType,
  FiHash,
  FiCalendar,
  FiMapPin,
  FiGrid,
  FiEdit3,
  FiCpu,
  FiChevronDown,
  FiLayers,
} from "react-icons/fi";
import BuilderMatrixConfig from "./BuilderMatrixConfig";
import ValidationRulesEditor from "@/components/surveys/ValidationRulesEditor";
import MediaUploader from "@/components/surveys/MediaUploader";
import type { QuestionItem, SurveyData, OptionItem } from "@/hooks/useSurveyEditorData";

interface BuilderQuestionCardProps {
  question: QuestionItem;
  orderNumber: number;
  survey: SurveyData | null;
  onUpdate: (questionId: string, updates: Partial<QuestionItem>) => void;
  onSave: (question: QuestionItem) => void;
  onDelete: (questionId: string) => void;
  onDuplicate: (question: QuestionItem) => void;
  onAddChild: (parentQuestion: QuestionItem) => void;
  savingStatus?: string;
  isHighlighted?: boolean;
}

const TYPE_NAME_MAP: Record<string, string> = {
  TEXT: "Văn bản",
  SINGLE_CHOICE: "Một lựa chọn",
  MULTIPLE_CHOICE: "Nhiều lựa chọn",
  NUMBER: "Điểm / Số liệu",
  DATE: "Ngày tháng",
  ADDRESS: "Địa chỉ",
  MATRIX_SINGLE: "Ma trận (1 lựa chọn)",
  MATRIX_MULTI: "Ma trận (Nhiều lựa chọn)",
  MATRIX_INPUT: "Ma trận nhập số / chữ",
  DYNAMIC_TABLE: "Bảng động (Thêm dòng)",
  AGGREGATION: "Tiêu chí Cha (👑 Tổng hợp)",
};

export interface AggregationMethod {
  value: string;
  label: string;
  description?: string;
  hasFormula?: boolean;
}

export function getSupportedAggregations(typeCode: string): AggregationMethod[] {
  switch (typeCode) {
    case "TEXT":
    case "ADDRESS":
      return [
        {
          value: "TEMPLATE",
          label: "📝 NỘI SUY GHÉP CÂU (TEMPLATE)",
          description: "Ghép chuỗi theo mẫu, ví dụ: 'Xin chào em là {ten} học sinh {lop}'",
          hasFormula: true,
        },
        {
          value: "CONCAT",
          label: "🔗 NỐI CHUỖI VĂN BẢN (CONCAT)",
          description: "Nối các câu trả lời con lại bằng dấu gạch ngang",
        },
        {
          value: "JOIN_LINES",
          label: "📋 NỐI XUỐNG DÒNG (JOIN_LINES)",
          description: "Nối mỗi câu trả lời con thành một dòng riêng biệt",
        },
        {
          value: "FIRST",
          label: "📌 LẤY CÂU ĐẦU TIÊN (FIRST)",
          description: "Lấy giá trị từ câu con đầu tiên có điền dữ liệu",
        },
      ];

    case "NUMBER":
      return [
        { value: "SUM", label: "➕ CỘNG TỔNG (SUM)" },
        { value: "AVG", label: "⚖️ TRUNG BÌNH CỘNG (AVG)" },
        { value: "WEIGHTED", label: "🎯 THEO TRỌNG SỐ (WEIGHTED)" },
        { value: "MIN", label: "🔻 ĐIỂM THẤP NHẤT (MIN)" },
        { value: "MAX", label: "🔺 ĐIỂM CAO NHẤT (MAX)" },
        {
          value: "CUSTOM",
          label: "🧮 CÔNG THỨC TOÁN (CUSTOM)",
          hasFormula: true,
        },
      ];

    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE":
      return [
        { value: "COUNT", label: "🔢 ĐẾM SỐ LỰA CHỌN (COUNT)" },
        { value: "CONCAT", label: "🔗 NỐI ĐÁP ÁN ĐÃ CHỌN (CONCAT)" },
        { value: "MAJORITY", label: "👑 ĐÁP ÁN ĐA SỐ (MAJORITY)" },
        { value: "SCORE_SUM", label: "⭐ TỔNG ĐIỂM ĐÁP ÁN (SCORE_SUM)" },
      ];

    case "DATE":
      return [
        { value: "DATEDIFF_YEARS", label: "🎂 TÍNH TUỔI / SỐ NĂM (YEARS)" },
        { value: "DATEDIFF_DAYS", label: "📅 KHOẢNG CÁCH NGÀY (DAYS)" },
        { value: "MIN_DATE", label: "⏮️ MỐC SỚM NHẤT (MIN)" },
        { value: "MAX_DATE", label: "⏭️ MỐC MUỘN NHẤT (MAX)" },
      ];

    case "MATRIX_SINGLE":
    case "MATRIX_MULTI":
    case "MATRIX_INPUT":
    case "DYNAMIC_TABLE":
      return [
        { value: "SUM", label: "➕ TỔNG ĐIỂM TOÀN BỘ MA TRẬN / BẢNG" },
        { value: "AVG", label: "⚖️ TRUNG BÌNH CỘNG MA TRẬN / BẢNG" },
        { value: "ROW_COUNT", label: "📋 ĐẾM TỔNG SỐ DÒNG DỮ LIỆU" },
      ];

    default:
      return [];
  }
}

const getTypeIcon = (typeCode?: string) => {
  switch (typeCode) {
    case "TEXT":
      return FiType;
    case "SINGLE_CHOICE":
      return FiCheckCircle;
    case "MULTIPLE_CHOICE":
      return FiList;
    case "NUMBER":
      return FiHash;
    case "DATE":
      return FiCalendar;
    case "ADDRESS":
      return FiMapPin;
    case "MATRIX_SINGLE":
    case "MATRIX_MULTI":
    case "MATRIX_INPUT":
      return FiGrid;
    case "DYNAMIC_TABLE":
      return FiEdit3;
    default:
      return FiType;
  }
};

export default function BuilderQuestionCard({
  question,
  orderNumber,
  survey,
  onUpdate,
  onSave,
  onDelete,
  onDuplicate,
  onAddChild,
  savingStatus,
  isHighlighted = false,
}: BuilderQuestionCardProps) {
  const [showMediaSection, setShowMediaSection] = useState(false);
  const [showDescription, setShowDescription] = useState(!!question.description);

  const typeCode = question.questionTypeCode || "TEXT";
  const TypeIcon = getTypeIcon(typeCode);
  const typeName = TYPE_NAME_MAP[typeCode] || typeCode;

  const isChoice = ["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(typeCode);
  const isMatrix = [
    "MATRIX_SINGLE",
    "MATRIX_MULTI",
    "MATRIX_INPUT",
    "DYNAMIC_TABLE",
  ].includes(typeCode);
  const supportsValidation = [
    "TEXT",
    "NUMBER",
    "DATE",
    "ADDRESS",
    "SINGLE_CHOICE",
    "MULTIPLE_CHOICE",
  ].includes(typeCode);

  const isChild = !!question.parentId;
  const isParent =
    !isChild && question.aggregationType && question.aggregationType !== "NONE";
  const currentRole = isChild ? "CHILD" : isParent ? "PARENT" : "INDEPENDENT";

  const allSurveyQuestions = (survey?.pages || []).flatMap((p) => p.questions || []);
  const myChildren = allSurveyQuestions.filter((q) => q.parentId === question.id);
  const selectedParent = allSurveyQuestions.find((q) => q.id === question.parentId);
  const isWeightApplicable =
    selectedParent?.aggregationType === "WEIGHTED" ||
    (selectedParent?.questionTypeCode === "NUMBER" && selectedParent?.aggregationType === "WEIGHTED");

  // Options manipulation
  const addOption = () => {
    const options = [...(question.options || [])];
    const newIdx = options.length + 1;
    options.push({
      id: `opt_${Date.now()}_${newIdx}`,
      optionText: `Lựa chọn ${newIdx}`,
      orderIndex: newIdx,
    });
    onUpdate(question.id, { options });
  };

  const updateOptionText = (idx: number, text: string) => {
    const options = [...(question.options || [])];
    if (options[idx]) {
      options[idx] = { ...options[idx], optionText: text };
      onUpdate(question.id, { options });
    }
  };

  const deleteOption = (idx: number) => {
    const options = [...(question.options || [])];
    options.splice(idx, 1);
    onUpdate(question.id, { options });
  };

  return (
    <div
      id={`survey-question-${question.id}`}
      className={`relative rounded-2xl border transition-all duration-200 ${
        isHighlighted
          ? "ring-2 ring-brand-500 shadow-md border-brand-400 bg-white dark:bg-gray-900"
          : isChild
          ? "ml-4 sm:ml-7 border-blue-200/90 bg-blue-50/20 dark:border-blue-900/40 dark:bg-blue-950/10 shadow-xs border-l-4 border-l-blue-500"
          : isParent
          ? "border-purple-200/90 bg-purple-50/20 dark:border-purple-900/40 dark:bg-purple-950/10 shadow-xs border-l-4 border-l-purple-600"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-xs"
      }`}
    >
      {/* TREE CONNECTOR LINE FOR CHILDREN */}
      {isChild && (
        <div className="absolute -left-6 sm:-left-7 top-6 flex items-center text-blue-400">
          <FiCornerDownRight size={18} />
        </div>
      )}

      <div className="p-4 sm:p-5 space-y-4">
        {/* HEADER: NUMBER, TYPE BADGE & ACTION TOOLBAR */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                isChild
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  : isParent
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {orderNumber}
            </span>

            {/* TYPE BADGE */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold ${
                isParent
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                  : isChild
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              <TypeIcon size={13} />
              <span>{typeName}</span>
            </span>

            {/* ROLE PILL */}
            {currentRole === "PARENT" && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-600 text-white">
                👑 TIÊU CHÍ CHA ({question.aggregationType})
              </span>
            )}
            {currentRole === "CHILD" && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white">
                ↳ TIÊU CHÍ CON{isWeightApplicable ? ` (Hệ số: ${question.weight ?? 1.0})` : ""}
              </span>
            )}
          </div>

          {/* RIGHT ACTION BUTTONS */}
          <div className="flex items-center gap-1.5">
            {savingStatus === "SAVING" && (
              <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1 mr-1">
                <span className="size-2 rounded-full bg-brand-500 animate-pulse" />
                Đang lưu...
              </span>
            )}
            {savingStatus === "SAVED" && (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mr-1">
                Đã lưu ✓
              </span>
            )}

            {/* ATTACH MEDIA BUTTON (COMPACT ICON ONLY) */}
            <button
              type="button"
              onClick={() => setShowMediaSection((prev) => !prev)}
              className={`p-2 rounded-xl text-xs font-semibold transition ${
                showMediaSection || question.imageUrl
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              }`}
              title="Đính kèm ảnh / video minh họa"
            >
              <FiImage size={16} />
            </button>

            {/* QUICK ADD CHILD BUTTON (IF PARENT) */}
            {isParent && (
              <button
                type="button"
                onClick={() => onAddChild(question)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 rounded-xl transition"
                title="Thêm tiêu chí con trực thuộc"
              >
                <FiPlus size={13} />
                <span>+ Con</span>
              </button>
            )}

            {/* DUPLICATE BUTTON */}
            <button
              type="button"
              onClick={() => onDuplicate(question)}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 rounded-xl transition"
              title="Nhân bản câu hỏi này"
            >
              <FiCopy size={16} />
            </button>

            {/* DELETE BUTTON */}
            <button
              type="button"
              onClick={() => onDelete(question.id)}
              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
              title="Xóa câu hỏi này"
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        </div>

        {/* QUESTION TITLE & DESCRIPTION INPUTS */}
        <div className="space-y-2">
          <input
            type="text"
            value={question.questionText || ""}
            onChange={(e) => onUpdate(question.id, { questionText: e.target.value })}
            onBlur={() => onSave(question)}
            placeholder="Nhập nội dung câu hỏi..."
            className="w-full bg-transparent text-sm sm:text-base font-bold text-gray-900 dark:text-white placeholder:text-gray-400 border-b border-transparent focus:border-brand-500 outline-none transition-all py-1"
          />

          {showDescription ? (
            <textarea
              rows={2}
              value={question.description || ""}
              onChange={(e) => onUpdate(question.id, { description: e.target.value })}
              onBlur={() => onSave(question)}
              placeholder="Thêm mô tả hoặc hướng dẫn trả lời cho câu này (không bắt buộc)..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white outline-none dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300 dark:focus:bg-gray-900 transition"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowDescription(true)}
              className="text-[11px] font-semibold text-gray-400 hover:text-brand-500 transition"
            >
              + Thêm mô tả hướng dẫn
            </button>
          )}
        </div>

        {/* EXPANDABLE MEDIA UPLOADER */}
        {showMediaSection && (
          <div className="rounded-xl border border-brand-200/80 bg-brand-50/20 p-3 dark:border-brand-500/20 dark:bg-brand-500/5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-brand-700 dark:text-brand-400">
                Tệp đa phương tiện minh họa
              </span>
              <button
                type="button"
                onClick={() => setShowMediaSection(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={14} />
              </button>
            </div>
            <MediaUploader
              compact
              ownerType="QUESTION"
              ownerId={question.id}
              values={question}
              onChange={(field, value) => {
                onUpdate(question.id, { [field]: value });
                onSave({ ...question, [field]: value });
              }}
            />
          </div>
        )}

        {/* COMPACT ROLE SEGMENTED CONTROL (SAVES 70%+ VERTICAL SPACE) */}
        {(() => {
          const supportedAggregations = getSupportedAggregations(typeCode);
          if (supportedAggregations.length === 0) {
            // Nếu thể loại câu hỏi không hỗ trợ tính toán/phân cấp thì ẩn luôn thanh vai trò!
            return null;
          }

          const currentAggOption = supportedAggregations.find(
            (a) => a.value === (question.aggregationType || "NONE")
          );
          const isFormulaMode =
            question.aggregationType === "TEMPLATE" ||
            question.aggregationType === "CUSTOM" ||
            currentAggOption?.hasFormula;

          return (
            <div className="rounded-xl border border-gray-200/70 bg-gray-50/60 p-2 dark:border-gray-800 dark:bg-gray-800/30">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Vai trò:
                  </span>
                  <div className="inline-flex rounded-lg bg-gray-200/70 p-0.5 text-xs font-semibold dark:bg-gray-800">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentRole === "INDEPENDENT") return;
                        const updated = {
                          ...question,
                          parentId: null,
                          aggregationType: "NONE",
                          aggregationFormula: null,
                        };
                        onUpdate(question.id, {
                          parentId: null,
                          aggregationType: "NONE",
                          aggregationFormula: null,
                        });
                        onSave(updated);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                        currentRole === "INDEPENDENT"
                          ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white font-bold ring-1 ring-black/5"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      Độc lập
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (currentRole === "PARENT") return;
                        const nextAgg =
                          question.aggregationType && question.aggregationType !== "NONE"
                            ? question.aggregationType
                            : supportedAggregations[0]?.value || "SUM";
                        const updated = {
                          ...question,
                          parentId: null,
                          aggregationType: nextAgg,
                        };
                        onUpdate(question.id, {
                          parentId: null,
                          aggregationType: nextAgg,
                        });
                        onSave(updated);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                        currentRole === "PARENT"
                          ? "bg-purple-600 text-white shadow-xs font-bold"
                          : "text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-300"
                      }`}
                    >
                      <span>👑</span> Tiêu chí Cha
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (currentRole === "CHILD") return;
                        const firstParent = allSurveyQuestions.find(
                          (q) => q.id !== question.id && q.aggregationType && q.aggregationType !== "NONE"
                        );
                        const updated = {
                          ...question,
                          parentId: firstParent?.id || null,
                          aggregationType: "NONE",
                          weight: question.weight ?? 1.0,
                        };
                        onUpdate(question.id, {
                          parentId: firstParent?.id || null,
                          aggregationType: "NONE",
                          weight: question.weight ?? 1.0,
                        });
                        onSave(updated);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                        currentRole === "CHILD"
                          ? "bg-blue-600 text-white shadow-xs font-bold"
                          : "text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300"
                      }`}
                    >
                      <span>↳</span> Tiêu chí Con
                    </button>
                  </div>
                </div>

                {/* Contextual Status / Info */}
                {currentRole === "INDEPENDENT" && (
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:inline">
                    Câu hỏi tự điền, không tính gộp
                  </span>
                )}
                {currentRole === "PARENT" && (
                  <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <span>👑</span> Đang gộp {myChildren.length} câu con ({question.aggregationType || supportedAggregations[0]?.value})
                  </span>
                )}
                {currentRole === "CHILD" && (
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <span>↳</span> {selectedParent ? `Thuộc: ${selectedParent.questionText || "Tiêu chí Cha"}` : "Tiêu chí Con"}
                    {isWeightApplicable && ` (Hệ số: ${question.weight ?? 1.0})`}
                  </span>
                )}
              </div>

              {/* Only when PARENT is selected: show compact formula selection & child actions */}
              {currentRole === "PARENT" && (
                <div className="mt-2 pt-2 border-t border-purple-200/70 dark:border-purple-800/40 space-y-2 bg-purple-50/50 dark:bg-purple-950/20 p-2.5 rounded-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-purple-900 dark:text-purple-300 whitespace-nowrap">
                        Phương thức tính / tổng hợp:
                      </label>
                      <select
                        value={question.aggregationType || supportedAggregations[0]?.value || "SUM"}
                        onChange={(e) => {
                          const nextAgg = e.target.value;
                          onUpdate(question.id, { aggregationType: nextAgg });
                          onSave({ ...question, aggregationType: nextAgg });
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-gray-900 border border-purple-300 dark:border-purple-800 rounded-lg text-xs font-bold text-purple-900 dark:text-purple-300 outline-none cursor-pointer"
                      >
                        {supportedAggregations.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-purple-900 dark:text-purple-300">
                      <span>{myChildren.length} tiêu chí con</span>
                      <button
                        type="button"
                        onClick={() => onAddChild(question)}
                        className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-bold hover:bg-purple-700 transition"
                      >
                        + Thêm tiêu chí con
                      </button>
                    </div>
                  </div>

                  {/* FORMULA / TEMPLATE INTERPOLATION INPUT BOX (IF APPLICABLE) */}
                  {isFormulaMode && (
                    <div className="pt-2 border-t border-purple-200/50 dark:border-purple-800/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-purple-900 dark:text-purple-200">
                          {question.aggregationType === "TEMPLATE"
                            ? "📝 Mẫu câu ghép nối (Template nội suy):"
                            : "🧮 Biểu thức công thức toán học:"}
                        </label>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          {question.aggregationType === "TEMPLATE"
                            ? "Chèn {Tên câu con} để tự động điền giá trị khi làm khảo sát"
                            : "Ví dụ: ({q1} + {q2} * 2) / 3"}
                        </span>
                      </div>

                      <input
                        type="text"
                        value={question.aggregationFormula || ""}
                        placeholder={
                          question.aggregationType === "TEMPLATE"
                            ? "Ví dụ: Xin chào em là {ten} học sinh {lop}"
                            : "Ví dụ: ({q1} + {q2} * 2) / 3"
                        }
                        onChange={(e) => {
                          onUpdate(question.id, { aggregationFormula: e.target.value });
                        }}
                        onBlur={() => onSave(question)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-purple-300 dark:border-purple-800 rounded-lg text-xs font-semibold text-purple-950 dark:text-purple-100 outline-none focus:ring-2 focus:ring-purple-500/20"
                      />

                      {/* QUICK VARIABLE INSERT TAGS FOR CHILDREN */}
                      {myChildren.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                            Bấm để chèn biến:
                          </span>
                          {myChildren.map((child, cIdx) => {
                            const token = child.questionText?.trim() || `câu ${cIdx + 1}`;
                            return (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => {
                                  const currentFormula = question.aggregationFormula || "";
                                  const insertTag = `{${token}}`;
                                  const nextFormula = currentFormula
                                    ? `${currentFormula} ${insertTag}`
                                    : insertTag;
                                  onUpdate(question.id, { aggregationFormula: nextFormula });
                                  onSave({ ...question, aggregationFormula: nextFormula });
                                }}
                                className="px-2 py-0.5 rounded-md bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800 text-[11px] font-bold text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <span>+</span> &#123;{token}&#125;
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Only when CHILD is selected: show compact parent picker & weight (if applicable) */}
              {currentRole === "CHILD" && (
                <div className="mt-2 pt-2 border-t border-blue-200/70 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <label className="text-xs font-bold text-blue-900 dark:text-blue-300 whitespace-nowrap shrink-0">
                        Thuộc câu Cha:
                      </label>
                      <select
                        value={question.parentId || ""}
                        onChange={(e) => {
                          const nextParentId = e.target.value || null;
                          onUpdate(question.id, { parentId: nextParentId });
                          onSave({ ...question, parentId: nextParentId });
                        }}
                        className="flex-1 min-w-0 px-3 py-1.5 bg-white dark:bg-gray-900 border border-blue-300 dark:border-blue-800 rounded-lg text-xs font-semibold text-blue-950 dark:text-blue-100 outline-none cursor-pointer truncate"
                      >
                        <option value="">-- Chọn tiêu chí cha --</option>
                        {(survey?.pages || []).flatMap((p, pIdx) =>
                          (p.questions || [])
                            .filter((item) => item.id !== question.id)
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                [Trang {pIdx + 1}] {item.questionText || `Câu ${item.id}`} ({item.aggregationType && item.aggregationType !== "NONE" ? item.aggregationType : item.questionTypeCode})
                              </option>
                            ))
                        )}
                      </select>
                    </div>

                    {/* ONLY SHOW WEIGHT INPUT WHEN PARENT AGGREGATION TYPE IS WEIGHTED */}
                    {isWeightApplicable && (
                      <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-blue-200 dark:border-blue-800/60 pt-2 sm:pt-0 sm:pl-3">
                        <label className="text-xs font-bold text-blue-900 dark:text-blue-300 whitespace-nowrap">
                          Hệ số (Weight):
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={question.weight ?? 1.0}
                          onChange={(e) =>
                            onUpdate(question.id, { weight: parseFloat(e.target.value) || 1.0 })
                          }
                          onBlur={() => onSave(question)}
                          className="w-20 px-2 py-1 bg-white dark:bg-gray-900 border border-blue-300 dark:border-blue-800 rounded-lg text-xs font-bold text-blue-900 dark:text-blue-200 outline-none text-center"
                        />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          (Mặc định 1.0)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* MATRIX CONFIGURATION (IF MATRIX) */}
        {isMatrix && (
          <BuilderMatrixConfig
            typeCode={typeCode}
            config={question.matrixConfig}
            onChange={(nextConfig) => {
              const configStr = JSON.stringify(nextConfig);
              onUpdate(question.id, { matrixConfig: configStr });
              onSave({ ...question, matrixConfig: configStr });
            }}
          />
        )}

        {/* CHOICE OPTIONS EDITOR (IF SINGLE / MULTIPLE CHOICE) */}
        {isChoice && (
          <div className="space-y-2.5 pl-3 border-l-2 border-gray-200 dark:border-gray-800">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Danh sách lựa chọn trả lời:
            </label>
            <div className="space-y-2">
              {(question.options || []).map((opt, idx) => (
                <div key={opt.id || idx} className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs w-4">
                    {typeCode === "SINGLE_CHOICE" ? "○" : "□"}
                  </span>
                  <input
                    type="text"
                    value={opt.optionText || ""}
                    onChange={(e) => updateOptionText(idx, e.target.value)}
                    onBlur={() => onSave(question)}
                    placeholder={`Lựa chọn ${idx + 1}`}
                    className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => deleteOption(idx)}
                    className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg transition"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addOption}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 pt-1"
            >
              <FiPlus size={14} /> Thêm lựa chọn
            </button>
          </div>
        )}

        {/* VALIDATION RULES EDITOR */}
        {supportsValidation && (
          <ValidationRulesEditor
            questionId={question.id}
            questionTypeId={String(question.questionTypeId || "")}
            questionTypeCode={typeCode}
            revision={survey?.validationRevision ?? (survey as any)?.revision}
            rules={question.validationRules}
            options={question.options || []}
            onChange={(newRules) => {
              onUpdate(question.id, { validationRules: newRules });
            }}
          />
        )}

        {/* CARD FOOTER: REQUIRED TOGGLE */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!question.isRequired}
              onChange={(e) => {
                onUpdate(question.id, { isRequired: e.target.checked });
                onSave({ ...question, isRequired: e.target.checked });
              }}
              className="size-4 rounded text-brand-500 focus:ring-brand-500 border-gray-300"
            />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Bắt buộc trả lời
            </span>
          </label>

          <button
            type="button"
            onClick={() => onSave(question)}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition"
          >
            <FiSave size={13} />
            <span>Lưu câu</span>
          </button>
        </div>
      </div>
    </div>
  );
}

