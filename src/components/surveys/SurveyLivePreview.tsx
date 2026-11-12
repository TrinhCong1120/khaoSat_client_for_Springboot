"use client";

import { useState, useMemo } from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiRefreshCw,
  FiEye,
  FiLock,
  FiCpu,
  FiAlertCircle,
} from "react-icons/fi";
import SurveyMatrixField from "./SurveyMatrixField";
import type { MatrixConfig } from "./builder/BuilderMatrixConfig";
import ProvinceWardSelect, {
  type ProvinceWardValue,
} from "@/components/form/ProvinceWardSelect";
import { getQuestionTypeCode } from "@/types/survey";

interface PreviewOption {
  id: string;
  optionText?: string;
  orderIndex?: number;
}

interface PreviewQuestion {
  id: string;
  questionText?: string;
  description?: string;
  isRequired?: boolean;
  orderIndex?: number;
  questionTypeCode?: string;
  questionType?: { id?: string; code?: string; name?: string };
  parentId?: string | null;
  weight?: number | null;
  aggregationType?: string | null;
  aggregationFormula?: string | null;
  matrixConfig?: string | MatrixConfig | null;
  options?: PreviewOption[];
}

interface PreviewPage {
  id: string;
  title?: string;
  description?: string;
  orderIndex?: number;
  questions?: PreviewQuestion[];
}

interface PreviewCondition {
  id?: string;
  sourceQuestionId: string;
  targetType?: "QUESTION" | "PAGE" | string;
  targetQuestionId?: string | null;
  targetPageId?: string | null;
  action: "SHOW" | "HIDE" | string;
  sourceValue?: string;
}

interface PreviewSurvey {
  id?: string;
  title?: string;
  description?: string | null;
  pages?: PreviewPage[];
  conditions?: PreviewCondition[];
}

interface AnswerState {
  questionId?: string;
  answerText?: string;
  answerNumber?: number | null;
  answerDate?: string;
  optionIds?: string[];
  provinceCode?: number;
  wardCode?: number | null;
  province?: string;
  ward?: string;
  matrixData?: string;
}

interface SurveyLivePreviewProps {
  survey: PreviewSurvey;
  conditions?: PreviewCondition[];
}

export default function SurveyLivePreview({
  survey,
  conditions = [],
}: SurveyLivePreviewProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [showConditionBadges, setShowConditionBadges] = useState(true);

  const pages = useMemo(() => survey?.pages || [], [survey?.pages]);
  const allConditions = useMemo(
    () => (conditions.length > 0 ? conditions : survey?.conditions || []),
    [conditions, survey?.conditions]
  );

  const allQuestions = useMemo(() => {
    return pages.flatMap((p: PreviewPage) => p.questions || []);
  }, [pages]);

  // Condition evaluation
  const checkConditionMatched = (
    c: PreviewCondition,
    answer: AnswerState | undefined,
    sourceQuestion: PreviewQuestion | undefined
  ) => {
    if (!answer) return false;
    let matched = false;
    const sourceTypeCode = getQuestionTypeCode(sourceQuestion || { questionTypeCode: "" });

    if (sourceTypeCode === "ADDRESS") {
      const tokens = String(c.sourceValue || "")
        .split(",")
        .map((x) => x.trim().toLowerCase());
      if (tokens.length > 0) {
        const province = String(answer.province ?? "").trim().toLowerCase();
        const ward = String(answer.ward ?? "").trim().toLowerCase();
        matched = tokens.some((t) => t === province || t === ward);
      }
    } else if (answer.optionIds?.length) {
      const conditionOptionIds = String(c.sourceValue || "")
        .split(",")
        .map((x) => x.trim());
      if (conditionOptionIds.length > 0) {
        matched = conditionOptionIds.some((oid) =>
          answer.optionIds?.includes(oid)
        );
      } else {
        const selectedOptions = sourceQuestion?.options?.filter((o: PreviewOption) =>
          answer.optionIds?.includes(o.id)
        );
        matched = selectedOptions?.some(
          (o: PreviewOption) => o.optionText === c.sourceValue
        ) ?? false;
      }
    }

    if (answer.answerText != null && answer.answerText !== "") {
      matched =
        String(answer.answerText).trim().toLowerCase() ===
        String(c.sourceValue).trim().toLowerCase();
    }

    return matched;
  };

  const isPageEnabled = (pageId: string) => {
    if (!allConditions.length) return true;
    const related = allConditions.filter(
      (c: PreviewCondition) =>
        (c.targetType === "PAGE" || (!c.targetQuestionId && c.targetPageId)) &&
        c.targetPageId === pageId
    );
    if (related.length === 0) return true;

    let enabled = true;
    for (const c of related) {
      const ans = answers[c.sourceQuestionId];
      const sourceQuestion = allQuestions.find(
        (q: PreviewQuestion) => q.id === c.sourceQuestionId
      );
      const matched = checkConditionMatched(c, ans, sourceQuestion);
      const action = String(c.action || "").toUpperCase();
      if (action === "SHOW" && !matched) enabled = false;
      if (action === "HIDE" && matched) enabled = false;
    }
    return enabled;
  };

  const isQuestionEnabled = (questionId: string) => {
    const pageOfQuestion = pages.find((p: PreviewPage) =>
      (p.questions || []).some((q: PreviewQuestion) => q.id === questionId)
    );
    if (pageOfQuestion && !isPageEnabled(pageOfQuestion.id)) return false;
    if (!allConditions.length) return true;

    const related = allConditions.filter(
      (c: PreviewCondition) =>
        (!c.targetType || c.targetType === "QUESTION") &&
        c.targetQuestionId === questionId
    );
    if (related.length === 0) return true;

    let enabled = true;
    for (const c of related) {
      const ans = answers[c.sourceQuestionId];
      const sourceQuestion = allQuestions.find(
        (q: PreviewQuestion) => q.id === c.sourceQuestionId
      );
      const matched = checkConditionMatched(c, ans, sourceQuestion);
      const action = String(c.action || "").toUpperCase();
      if (action === "SHOW" && !matched) enabled = false;
      if (action === "HIDE" && matched) enabled = false;
    }
    return enabled;
  };

  // Real-time calculation for parent / aggregation questions across multiple question types
  const calculateAggregatedValue = (
    targetQ: PreviewQuestion,
    currentAnswers: Record<string, AnswerState>
  ): string | number | null => {
    const aggType = String(targetQ.aggregationType || "NONE").toUpperCase();
    if (aggType === "NONE") return null;

    const children = allQuestions.filter((q: PreviewQuestion) => q.parentId === targetQ.id);

    // Matrix or Dynamic Table parsing
    const targetTypeCode = getQuestionTypeCode(targetQ);
    if (["DYNAMIC_TABLE", "MATRIX_INPUT"].includes(targetTypeCode)) {
      const rawMatrixData = currentAnswers[targetQ.id]?.matrixData;
      if (rawMatrixData) {
        try {
          const parsed =
            typeof rawMatrixData === "string"
              ? JSON.parse(rawMatrixData)
              : rawMatrixData;
          const numbers: number[] = [];
          if (Array.isArray(parsed)) {
            for (const row of parsed) {
              for (const val of Object.values(row)) {
                const num = parseFloat(String(val));
                if (Number.isFinite(num)) numbers.push(num);
              }
            }
          } else if (typeof parsed === "object" && parsed !== null) {
            for (const rowVal of Object.values(parsed)) {
              if (typeof rowVal === "object" && rowVal != null) {
                for (const colVal of Object.values(rowVal as object)) {
                  const num = parseFloat(String(colVal));
                  if (Number.isFinite(num)) numbers.push(num);
                }
              }
            }
          }
          if (numbers.length > 0) {
            const sum = numbers.reduce((a, b) => a + b, 0);
            if (aggType === "SUM") return Math.round(sum * 100) / 100;
            if (aggType === "AVG")
              return Math.round((sum / numbers.length) * 100) / 100;
          }
          if (aggType === "ROW_COUNT" && Array.isArray(parsed)) {
            return parsed.length;
          }
        } catch {}
      }
    }

    if (children.length === 0) return null;

    // Helper: get text/number from child answer
    const getChildTextOrNumber = (c: PreviewQuestion): string => {
      const ans = currentAnswers[c.id];
      if (!ans) return "";
      if (ans.answerText != null && ans.answerText !== "") return String(ans.answerText);
      if (ans.answerNumber != null && !isNaN(ans.answerNumber)) return String(ans.answerNumber);
      if (ans.province != null || ans.ward != null) {
        return [ans.ward, ans.province].filter(Boolean).join(", ");
      }
      if (ans.answerDate != null) return String(ans.answerDate);
      return "";
    };

    // 1. TEMPLATE INTERPOLATION (e.g. "Xin chào em là {ten} học sinh {lop}")
    if (aggType === "TEMPLATE") {
      let formula = targetQ.aggregationFormula?.trim() || "";
      if (!formula) {
        return children.map(getChildTextOrNumber).filter(Boolean).join(" ");
      }
      children.forEach((c, idx) => {
        const val = getChildTextOrNumber(c);
        const name = (c.questionText || "").trim();
        if (name) {
          const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          formula = formula.replace(new RegExp(`\\{${escapedName}\\}`, "gi"), val);
        }
        formula = formula
          .replace(new RegExp(`\\{q${idx + 1}\\}`, "gi"), val)
          .replace(new RegExp(`\\{c${idx + 1}\\}`, "gi"), val)
          .replace(new RegExp(`\\{${idx + 1}\\}`, "gi"), val);
      });
      return formula;
    }

    // 2. CONCAT (Nối chuỗi)
    if (aggType === "CONCAT") {
      const parts = children.map(getChildTextOrNumber).filter(Boolean);
      return parts.length > 0 ? parts.join(" - ") : null;
    }

    // 3. JOIN_LINES (Nối xuống dòng)
    if (aggType === "JOIN_LINES") {
      const parts = children.map(getChildTextOrNumber).filter(Boolean);
      return parts.length > 0 ? parts.join("\n") : null;
    }

    // 4. FIRST (Lấy câu đầu tiên có dữ liệu)
    if (aggType === "FIRST") {
      for (const c of children) {
        const val = getChildTextOrNumber(c);
        if (val) return val;
      }
      return null;
    }

    // 5. COUNT (Đếm số lựa chọn / câu trả lời)
    if (aggType === "COUNT") {
      let count = 0;
      for (const c of children) {
        const ans = currentAnswers[c.id];
        if (ans?.optionIds && ans.optionIds.length > 0) {
          count += ans.optionIds.length;
        } else if (getChildTextOrNumber(c)) {
          count++;
        }
      }
      return count;
    }

    // 6. DATEDIFF_YEARS (Tính tuổi / năm)
    if (aggType === "DATEDIFF_YEARS") {
      for (const c of children) {
        const dStr = currentAnswers[c.id]?.answerDate;
        if (dStr) {
          const d = new Date(dStr);
          if (!isNaN(d.getTime())) {
            const age = new Date().getFullYear() - d.getFullYear();
            return age >= 0 ? age : 0;
          }
        }
      }
      return null;
    }

    // 7. SUM (Cộng tổng)
    if (aggType === "SUM" || aggType === "SCORE_SUM") {
      let sum = 0;
      let hasVal = false;
      for (const c of children) {
        if (!isQuestionEnabled(c.id)) continue;
        const val = currentAnswers[c.id]?.answerNumber;
        if (typeof val === "number" && !isNaN(val)) {
          sum += val;
          hasVal = true;
        }
      }
      return hasVal ? Math.round(sum * 100) / 100 : null;
    }

    // 8. AVG (Trung bình cộng)
    if (aggType === "AVG") {
      let sum = 0;
      let count = 0;
      for (const c of children) {
        if (!isQuestionEnabled(c.id)) continue;
        const val = currentAnswers[c.id]?.answerNumber;
        if (typeof val === "number" && !isNaN(val)) {
          sum += val;
          count++;
        }
      }
      return count > 0 ? Math.round((sum / count) * 100) / 100 : null;
    }

    // 9. WEIGHTED (Trọng số)
    if (aggType === "WEIGHTED") {
      let weightedSum = 0;
      let totalWeight = 0;
      for (const c of children) {
        if (!isQuestionEnabled(c.id)) continue;
        const val = currentAnswers[c.id]?.answerNumber;
        const weight = Number(c.weight ?? 1);
        if (typeof val === "number" && !isNaN(val)) {
          weightedSum += val * weight;
          totalWeight += weight;
        }
      }
      return totalWeight > 0
        ? Math.round((weightedSum / totalWeight) * 100) / 100
        : null;
    }

    // 10. MIN
    if (aggType === "MIN") {
      const nums = children
        .map((c) => currentAnswers[c.id]?.answerNumber)
        .filter((n): n is number => typeof n === "number" && !isNaN(n));
      return nums.length > 0 ? Math.min(...nums) : null;
    }

    // 11. MAX
    if (aggType === "MAX") {
      const nums = children
        .map((c) => currentAnswers[c.id]?.answerNumber)
        .filter((n): n is number => typeof n === "number" && !isNaN(n));
      return nums.length > 0 ? Math.max(...nums) : null;
    }

    return null;
  };

  const handleAnswerChange = (qId: string, patch: Partial<AnswerState>) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || { questionId: qId }),
        ...patch,
      },
    }));
  };

  const currentPage = pages[currentPageIndex];
  const isCurrentPageVisible = currentPage ? isPageEnabled(currentPage.id) : true;

  return (
    <div className="space-y-6">
      {/* PREVIEW BANNER TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <FiEye size={18} />
          </span>
          <div>
            <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
              Chế độ Xem trước Trực tiếp (Live Interactive Preview)
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Thử nghiệm nhập liệu, kiểm tra tự động tính toán tiêu chí cha-con và ẩn/hiện trang theo logic điều kiện.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showConditionBadges}
              onChange={(e) => setShowConditionBadges(e.target.checked)}
              className="size-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            Hiện cảnh báo điều kiện ẩn
          </label>

          <button
            type="button"
            onClick={() => setAnswers({})}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-300"
          >
            <FiRefreshCw size={13} /> Xóa dữ liệu thử
          </button>
        </div>
      </div>

      {/* PAGE NAVIGATION TABS */}
      {pages.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {pages.map((p: PreviewPage, idx: number) => {
            const pageActive = idx === currentPageIndex;
            const pageVisible = isPageEnabled(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setCurrentPageIndex(idx)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  pageActive
                    ? "bg-brand-500 text-white shadow-sm shadow-brand-500/20"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                } ${!pageVisible ? "opacity-50 line-through" : ""}`}
              >
                <span>
                  Trang {idx + 1}: {p.title || "Chưa đặt tên"}
                </span>
                {!pageVisible && (
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-700 no-underline dark:bg-rose-950/60 dark:text-rose-300">
                    Bị ẩn
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* PAGE CONTENT */}
      {!currentPage ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-400 dark:border-gray-800">
          Khảo sát chưa có trang nào để xem trước.
        </div>
      ) : !isCurrentPageVisible && !showConditionBadges ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <FiAlertCircle size={28} className="mx-auto mb-2 text-rose-500" />
          <h4 className="text-base font-bold text-rose-900 dark:text-rose-200">
            Trang {currentPageIndex + 1} đang bị ẩn bởi điều kiện logic
          </h4>
          <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">
            Người làm khảo sát sẽ tự động được chuyển qua trang tiếp theo khi điều kiện ẩn được thỏa mãn.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-6">
          {/* PAGE HEADER */}
          <div className="border-b border-gray-100 pb-4 dark:border-gray-800">
            {!isCurrentPageVisible && (
              <span className="mb-2 inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                <FiAlertCircle size={14} /> Trang này đang bị điều kiện ẩn với câu trả lời hiện tại
              </span>
            )}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {currentPage.title || `Trang ${currentPageIndex + 1}`}
            </h2>
            {currentPage.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {currentPage.description}
              </p>
            )}
          </div>

          {/* QUESTIONS LIST */}
          {(!currentPage.questions || currentPage.questions.length === 0) ? (
            <p className="py-8 text-center text-sm text-gray-400">
              Trang này chưa có câu hỏi nào.
            </p>
          ) : (
            <div className="space-y-6">
              {currentPage.questions.map((q: PreviewQuestion, qIdx: number) => {
                const isVisible = isQuestionEnabled(q.id);
                if (!isVisible && !showConditionBadges) return null;

                const typeCode = getQuestionTypeCode(q);
                const isChild = !!q.parentId;
                const parentQuestion = isChild
                  ? allQuestions.find((item: PreviewQuestion) => item.id === q.parentId)
                  : null;

                // Check aggregation
                const aggValue = calculateAggregatedValue(q, answers);
                const isAutoCalculated = aggValue !== null;

                const currentAnswer = answers[q.id] || {};
                const currentAnswerNumber = isAutoCalculated
                  ? aggValue
                  : currentAnswer.answerNumber;

                return (
                  <div
                    key={q.id}
                    className={`rounded-xl border p-5 transition-all ${
                      !isVisible
                        ? "border-dashed border-rose-300 bg-rose-50/20 opacity-75 dark:border-rose-900/50 dark:bg-rose-950/10"
                        : isChild
                        ? "border-l-4 border-l-brand-400 border-gray-200 bg-gray-50/40 ml-4 dark:border-gray-800 dark:bg-gray-800/30"
                        : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                    }`}
                  >
                    {/* CONDITION WARNING */}
                    {!isVisible && (
                      <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                        <FiAlertCircle size={14} />
                        Câu hỏi đang bị ẨN bởi logic điều kiện
                      </div>
                    )}

                    {/* PARENT/CHILD BADGES */}
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {isChild && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                          ↳ Tiêu chí con của: {parentQuestion?.questionText || "Câu cha"}
                          {q.weight != null && ` (Hệ số: ${q.weight})`}
                        </span>
                      )}

                      {isAutoCalculated && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300">
                          <FiCpu size={12} />
                          Tự động tính: {q.aggregationType} = {aggValue}
                        </span>
                      )}
                    </div>

                    {/* QUESTION TITLE */}
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                      {qIdx + 1}. {q.questionText || "Chưa có tiêu đề câu hỏi"}
                      {q.isRequired && (
                        <span className="ml-1 text-rose-500">*</span>
                      )}
                    </h3>

                    {q.description && (
                      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                        {q.description}
                      </p>
                    )}

                    {/* FIELD RENDERING */}
                    <div className="mt-3">
                      {/* TEXT */}
                      {typeCode === "TEXT" && (
                        <div className="relative">
                          <textarea
                            rows={3}
                            readOnly={isAutoCalculated}
                            value={isAutoCalculated ? String(aggValue ?? "") : (currentAnswer.answerText || "")}
                            onChange={(e) =>
                              handleAnswerChange(q.id, {
                                answerText: e.target.value,
                              })
                            }
                            placeholder={isAutoCalculated ? "Tự động ghép nối nội dung từ các câu con..." : "Nhập câu trả lời..."}
                            className={`w-full rounded-xl border p-3 text-sm outline-none transition ${
                              isAutoCalculated
                                ? "border-emerald-300 bg-emerald-50/50 text-emerald-950 font-semibold cursor-not-allowed dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                                : "border-gray-200 bg-white text-gray-800 focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                            }`}
                          />
                          {isAutoCalculated && (
                            <span className="absolute right-3 top-3 text-emerald-600 dark:text-emerald-400" title="Trường này được tạo tự động từ tiêu chí con">
                              <FiLock size={16} />
                            </span>
                          )}
                        </div>
                      )}

                      {/* NUMBER */}
                      {typeCode === "NUMBER" && (
                        <div className="relative max-w-xs">
                          <input
                            type="number"
                            readOnly={isAutoCalculated}
                            value={currentAnswerNumber ?? ""}
                            onChange={(e) =>
                              handleAnswerChange(q.id, {
                                answerNumber:
                                  e.target.value === ""
                                    ? null
                                    : parseFloat(e.target.value),
                              })
                            }
                            placeholder={isAutoCalculated ? "Tự động nhảy số..." : "Nhập số hoặc điểm..."}
                            className={`w-full rounded-xl border p-3 text-sm font-semibold outline-none transition ${
                              isAutoCalculated
                                ? "border-emerald-300 bg-emerald-50/50 text-emerald-900 cursor-not-allowed dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                                : "border-gray-200 bg-white text-gray-800 focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                            }`}
                          />
                          {isAutoCalculated && (
                            <span className="absolute right-3 top-3.5 text-emerald-600 dark:text-emerald-400">
                              <FiLock size={16} />
                            </span>
                          )}
                        </div>
                      )}

                      {/* SINGLE CHOICE */}
                      {typeCode === "SINGLE_CHOICE" && (
                        <div className="space-y-2">
                          {(q.options || []).map((opt: PreviewOption) => {
                            const isSelected =
                              currentAnswer.optionIds?.[0] === opt.id;
                            return (
                              <label
                                key={opt.id}
                                className={`flex items-center gap-3 rounded-xl border p-3 text-sm font-medium cursor-pointer transition ${
                                  isSelected
                                    ? "border-brand-500 bg-brand-50/50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                                    : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`q-${q.id}`}
                                  checked={isSelected}
                                  onChange={() =>
                                    handleAnswerChange(q.id, {
                                      optionIds: [opt.id],
                                      answerText: opt.optionText,
                                    })
                                  }
                                  className="size-4 text-brand-500 focus:ring-brand-500"
                                />
                                <span>{opt.optionText}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* MULTIPLE CHOICE */}
                      {typeCode === "MULTIPLE_CHOICE" && (
                        <div className="space-y-2">
                          {(q.options || []).map((opt: PreviewOption) => {
                            const selectedIds: string[] =
                              currentAnswer.optionIds || [];
                            const isSelected = selectedIds.includes(opt.id);
                            return (
                              <label
                                key={opt.id}
                                className={`flex items-center gap-3 rounded-xl border p-3 text-sm font-medium cursor-pointer transition ${
                                  isSelected
                                    ? "border-brand-500 bg-brand-50/50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                                    : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const next = e.target.checked
                                      ? [...selectedIds, opt.id]
                                      : selectedIds.filter(
                                          (x: string) => x !== opt.id
                                        );
                                    handleAnswerChange(q.id, {
                                      optionIds: next,
                                    });
                                  }}
                                  className="size-4 rounded text-brand-500 focus:ring-brand-500"
                                />
                                <span>{opt.optionText}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* DATE */}
                      {typeCode === "DATE" && (
                        <input
                          type="date"
                          value={currentAnswer.answerDate || ""}
                          onChange={(e) =>
                            handleAnswerChange(q.id, {
                              answerDate: e.target.value,
                            })
                          }
                          className="rounded-xl border border-gray-200 bg-white p-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                        />
                      )}

                      {/* ADDRESS */}
                      {typeCode === "ADDRESS" && (
                        <ProvinceWardSelect
                          value={
                            currentAnswer.provinceCode
                              ? {
                                  provinceCode: currentAnswer.provinceCode,
                                  wardCode: currentAnswer.wardCode ?? null,
                                  province: currentAnswer.province || "",
                                  ward: currentAnswer.ward || "",
                                }
                              : {
                                  provinceCode: 48,
                                  wardCode: null,
                                  province: "",
                                  ward: "",
                                }
                          }
                          onChange={(next: ProvinceWardValue) =>
                            handleAnswerChange(q.id, {
                              provinceCode: next.provinceCode,
                              wardCode: next.wardCode,
                              province: next.province,
                              ward: next.ward,
                            })
                          }
                        />
                      )}

                      {/* MATRIX / DYNAMIC TABLE */}
                      {["MATRIX_SINGLE", "MATRIX_MULTI", "MATRIX_INPUT", "DYNAMIC_TABLE"].includes(
                        typeCode
                      ) && (
                        <SurveyMatrixField
                          question={q}
                          value={currentAnswer.matrixData}
                          onChange={(val: string) =>
                            handleAnswerChange(q.id, { matrixData: val })
                          }
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAGE SWITCHER BUTTONS */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              disabled={currentPageIndex === 0}
              onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
            >
              <FiArrowLeft size={14} /> Trang trước
            </button>

            <span className="text-xs font-medium text-gray-400">
              Trang {currentPageIndex + 1} / {pages.length}
            </span>

            <button
              type="button"
              disabled={currentPageIndex >= pages.length - 1}
              onClick={() =>
                setCurrentPageIndex((prev) =>
                  Math.min(pages.length - 1, prev + 1)
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Trang kế tiếp <FiArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
