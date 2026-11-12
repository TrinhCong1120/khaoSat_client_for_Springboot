import type { SurveyResultQuestion } from "@/types/report";
import { getQuestionFormulaRefName, resolveQuestionByFormulaRef } from "../extractors";

export { tokenizeFormula } from "./lexer";
export { parseFormula, type ASTNode } from "./parser";
export { evaluateAst, evaluateFormulaExpression, resolveReferenceToFieldRef } from "./evaluator";
export { FORMULA_FUNCTION_CATALOG, type FormulaRuntimeValue } from "./functions";

/** Chuyển công thức lưu trữ ([#id]) sang công thức hiển thị thân thiện ([Tên trang / Tên câu hỏi]) */
export function toDisplayFormula(
  storageFormula: string,
  questions: SurveyResultQuestion[]
): string {
  if (!storageFormula) return "";
  const map = new Map(questions.map((q) => [q.id, getQuestionFormulaRefName(q)]));
  return storageFormula.replace(/\[#([^\]]+)\]/g, (full, id: string) => {
    const trimmed = id.trim();
    if (trimmed === "submittedAt") return "[Thời gian nộp]";
    if (trimmed === "durationMs") return "[Thời lượng]";
    if (trimmed === "totalScore") return "[Tổng điểm]";
    const label = map.get(trimmed);
    return label ? `[${label}]` : full;
  });
}

/** Chuyển công thức người dùng gõ ([Tên trang / Tên câu hỏi] hoặc [Tên câu hỏi]) về dạng lưu trữ ([#id]) */
export function toStorageFormula(
  displayFormula: string,
  questions: SurveyResultQuestion[]
): string {
  if (!displayFormula) return "";
  return displayFormula.replace(/\[([^\]]+)\]/g, (full, inner: string) => {
    const trimmed = inner.trim();
    if (trimmed.startsWith("#")) return full;
    const lower = trimmed.toLowerCase();
    if (lower === "thời gian nộp") return "[#submittedAt]";
    if (lower === "thời lượng") return "[#durationMs]";
    if (lower === "tổng điểm") return "[#totalScore]";
    const matched = resolveQuestionByFormulaRef(trimmed, questions);
    return matched ? `[#${matched.id}]` : full;
  });
}

