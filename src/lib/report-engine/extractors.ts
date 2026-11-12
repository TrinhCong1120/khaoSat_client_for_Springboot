import type { DatasetAnswerValue, DatasetRecord, SurveyResultQuestion } from "@/types/report";
import type { FieldRef, SurveyFieldMeta } from "./types";

type MatrixMeta = {
  rows: Array<{ id: string; label: string }>;
  cols: Array<{ id: string; label: string }>;
};

export function getQuestionLabel(q: SurveyResultQuestion): string {
  return String(q.questionText ?? q.text ?? q.title ?? "Câu hỏi").trim();
}

/** Gắn tiền tố `[Tên trang]` khi câu hỏi có thông tin pageTitle (khảo sát >= 2 trang) */
export function getQuestionPrefixedLabel(q: SurveyResultQuestion): string {
  const base = getQuestionLabel(q);
  const page = q.pageTitle?.trim();
  return page ? `[${page}] ${base}` : base;
}

/** Rút gọn riêng phần câu hỏi, luôn giữ nguyên vẹn tiền tố `[Tên trang]` */
export function getQuestionPrefixedShortLabel(q: SurveyResultQuestion, maxQuestionLen = 48): string {
  const base = getQuestionLabel(q);
  const shortBase =
    base.length <= maxQuestionLen ? base : `${base.slice(0, Math.max(4, maxQuestionLen - 3)).trimEnd()}...`;
  const page = q.pageTitle?.trim();
  return page ? `[${page}] ${shortBase}` : shortBase;
}

/** Tên tham chiếu trong công thức Excel (không dùng ngoặc vuông lồng để tránh xung đột tokenizer `[...]`) */
export function getQuestionFormulaRefName(q: SurveyResultQuestion): string {
  const base = getQuestionLabel(q);
  const page = q.pageTitle?.trim();
  return page ? `${page} / ${base}` : base;
}

/** Tìm câu hỏi khớp tên tham chiếu công thức: ưu tiên khớp `[Trang / Câu hỏi]`, sau đó fallback `[Câu hỏi]` */
export function resolveQuestionByFormulaRef(
  refName: string,
  questions: Iterable<SurveyResultQuestion>
): SurveyResultQuestion | undefined {
  const target = refName.trim().toLowerCase();
  if (!target) return undefined;
  let fallback: SurveyResultQuestion | undefined;
  for (const q of questions) {
    if (getQuestionFormulaRefName(q).toLowerCase() === target) {
      return q;
    }
    if (!fallback && getQuestionLabel(q).toLowerCase() === target) {
      fallback = q;
    }
  }
  return fallback;
}

/** Làm phẳng danh sách câu hỏi từ các trang, tự động gắn `pageTitle` khi khảo sát có >= 2 trang */
export function flattenSurveyPagesQuestions(
  pages?: Array<{ id: string; title?: string | null; questions?: SurveyResultQuestion[] }> | null
): SurveyResultQuestion[] {
  if (!pages || pages.length === 0) return [];
  const multiPage = pages.length > 1;
  return pages.flatMap((page, pageIdx) =>
    (page.questions ?? []).map((q) => ({
      ...q,
      pageId: page.id,
      pageTitle: multiPage ? page.title?.trim() || `Trang ${pageIdx + 1}` : null,
      pageOrderIndex: pageIdx + 1,
    }))
  );
}

export function normalizeQuestionType(q?: SurveyResultQuestion | null): string {
  return String(q?.questionTypeCode ?? "").trim().toUpperCase();
}

export function parseMatrixConfig(raw?: string | null): MatrixMeta {
  if (!raw || !raw.trim()) return { rows: [], cols: [] };
  try {
    const parsed = JSON.parse(raw) as {
      rows?: Array<{ id?: string; label?: string; text?: string }>;
      columns?: Array<{ id?: string; label?: string; text?: string }>;
      cols?: Array<{ id?: string; label?: string; text?: string }>;
    };
    const rows = Array.isArray(parsed.rows)
      ? parsed.rows
          .filter((r) => r && (r.id || r.label || r.text))
          .map((r, idx) => ({
            id: String(r.id ?? `row_${idx}`),
            label: String(r.label ?? r.text ?? r.id ?? `Hàng ${idx + 1}`),
          }))
      : [];
    const rawCols = parsed.columns ?? parsed.cols ?? [];
    const cols = Array.isArray(rawCols)
      ? rawCols
          .filter((c) => c && (c.id || c.label || c.text))
          .map((c, idx) => ({
            id: String(c.id ?? `col_${idx}`),
            label: String(c.label ?? c.text ?? c.id ?? `Cột ${idx + 1}`),
          }))
      : [];
    return { rows, cols };
  } catch {
    return { rows: [], cols: [] };
  }
}

export function parseSmartNumber(input: unknown): number | null {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }
  if (typeof input === "boolean" || input == null) return null;
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Reject clear non-numeric strings (e.g., ISO dates "2026-11-11", phone numbers with leading 0 >= 9 digits?)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return null;

  // Support Vietnamese comma decimal literals like "8,5" or "1.250,5"
  let normalized = trimmed.replace(/\s+/g, "");
  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d+,\d+$/.test(normalized)) {
    normalized = normalized.replace(",", ".");
  } else if (/^-?\d{1,3}(,\d{3})+\.\d+$/.test(normalized)) {
    normalized = normalized.replace(/,/g, "");
  }

  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(normalized)) {
    return null;
  }
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

export function parseMatrixAnswer(
  matrixDataRaw: string | null | undefined,
  matrixConfigRaw?: string | null
): Record<string, unknown> {
  if (!matrixDataRaw || !matrixDataRaw.trim()) return {};
  try {
    const parsed = JSON.parse(matrixDataRaw) as unknown;
    const meta = parseMatrixConfig(matrixConfigRaw);
    const colMap = new Map(meta.cols.map((c) => [c.id, c.label]));
    const result: Record<string, unknown> = {};

    if (Array.isArray(parsed)) {
      parsed.forEach((rowObj, idx) => {
        result[String(idx + 1)] = rowObj;
      });
      return result;
    }

    if (parsed && typeof parsed === "object") {
      for (const [rowKey, val] of Object.entries(parsed as Record<string, unknown>)) {
        if (Array.isArray(val)) {
          result[rowKey] = val.map((item) => colMap.get(String(item)) ?? String(item));
        } else if (val && typeof val === "object") {
          const innerEntries = Object.entries(val as Record<string, unknown>).map(
            ([ck, cv]) => `${colMap.get(ck) ?? ck}: ${cv ?? ""}`
          );
          const numericValues = Object.values(val as Record<string, unknown>)
            .map(parseSmartNumber)
            .filter((n): n is number => n !== null);
          result[rowKey] =
            numericValues.length === 1 && Object.keys(val).length === 1
              ? numericValues[0]
              : innerEntries.join("; ");
        } else if (typeof val === "string") {
          result[rowKey] = colMap.get(val) ?? val;
        } else {
          result[rowKey] = val;
        }
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function resolveFieldRawValue(
  record: DatasetRecord,
  field: FieldRef,
  questionsById: Map<string, SurveyResultQuestion>,
  computedValues?: Record<string, unknown>
): unknown {
  if (field === "system:submittedAt") return record.submittedAt ?? null;
  if (field === "system:durationMs") return record.durationMs ?? null;
  if (field === "system:totalScore") return record.totalScore ?? null;

  if (field.startsWith("computed:")) {
    const cid = field.slice("computed:".length);
    return computedValues ? computedValues[cid] ?? null : null;
  }

  if (!field.startsWith("question:")) return null;
  const rest = field.slice("question:".length);
  const sepIdx = rest.indexOf(":");
  const qId = sepIdx === -1 ? rest : rest.slice(0, sepIdx);
  const matrixRowKey = sepIdx === -1 ? null : rest.slice(sepIdx + 1);
  const answer = record.answers?.[qId];
  if (!answer) return null;

  const question = questionsById.get(qId);
  const qType = normalizeQuestionType(question);

  if (matrixRowKey !== null) {
    const matrixMap = parseMatrixAnswer(answer.matrixData, question?.matrixConfig);
    if (matrixRowKey in matrixMap) {
      return matrixMap[matrixRowKey];
    }
    const meta = parseMatrixConfig(question?.matrixConfig);
    const matchedRow = meta.rows.find(
      (r) => r.label.toLowerCase() === matrixRowKey.toLowerCase() || r.id === matrixRowKey
    );
    if (matchedRow && matchedRow.id in matrixMap) {
      return matrixMap[matchedRow.id];
    }
    return null;
  }

  if (qType === "SINGLE_CHOICE") {
    if (answer.optionTexts && answer.optionTexts.length > 0) {
      return answer.optionTexts[0];
    }
    return answer.formatted ?? answer.text ?? null;
  }
  if (qType === "MULTIPLE_CHOICE") {
    if (answer.optionTexts && answer.optionTexts.length > 0) {
      return answer.optionTexts;
    }
    return answer.formatted ?? answer.text ?? null;
  }
  if (qType === "NUMBER") {
    if (answer.number !== undefined && answer.number !== null) return answer.number;
    return parseSmartNumber(answer.text ?? answer.formatted);
  }
  if (qType === "DATE") {
    return answer.date ?? answer.formatted ?? answer.text ?? null;
  }
  if (qType === "ADDRESS") {
    if (answer.province || answer.ward) {
      return {
        province: answer.province ?? "",
        ward: answer.ward ?? "",
        detail: answer.addressDetail ?? "",
        formatted: answer.formatted ?? [answer.province, answer.ward].filter(Boolean).join(" / "),
      };
    }
    return answer.formatted ?? answer.text ?? null;
  }

  return firstNonEmptyAnswerValue(answer);
}

export function firstNonEmptyAnswerValue(answer: DatasetAnswerValue): unknown {
  if (answer.number !== undefined && answer.number !== null) return answer.number;
  if (answer.optionTexts && answer.optionTexts.length === 1) return answer.optionTexts[0];
  if (answer.optionTexts && answer.optionTexts.length > 1) return answer.optionTexts;
  if (answer.date) return answer.date;
  if (answer.text !== undefined && answer.text !== null && answer.text !== "") return answer.text;
  if (answer.formatted !== undefined && answer.formatted !== null && answer.formatted !== "") return answer.formatted;
  return null;
}

export function extractText(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  if (Array.isArray(raw)) return raw.map(extractText).filter(Boolean).join(", ");
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.formatted === "string" && obj.formatted) return obj.formatted;
    if (typeof obj.province === "string" || typeof obj.ward === "string") {
      return [obj.province, obj.ward, obj.detail].filter(Boolean).join(" / ");
    }
    return JSON.stringify(raw);
  }
  return String(raw);
}

export function extractArrayValues(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => extractText(item).trim()).filter(Boolean);
  }
  const str = extractText(raw).trim();
  if (!str) return [];
  return [str];
}

export function isValueEmpty(raw: unknown): boolean {
  if (raw == null) return true;
  if (Array.isArray(raw)) return raw.length === 0;
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    return !obj.province && !obj.ward && !obj.formatted && !obj.detail;
  }
  return String(raw).trim() === "";
}

export function buildSurveyFieldMetas(
  questions: SurveyResultQuestion[],
  piiQuestionIds: string[] = [],
  computedFields: Array<{ id: string; name: string }> = []
): SurveyFieldMeta[] {
  const piiSet = new Set(piiQuestionIds);
  const metas: SurveyFieldMeta[] = [];

  for (const q of questions) {
    const label = getQuestionPrefixedLabel(q);
    const shortLabel = getQuestionPrefixedShortLabel(q, 48);
    const typeCode = normalizeQuestionType(q);
    const isPii = piiSet.has(q.id);

    let kind: SurveyFieldMeta["kind"] = "text";
    if (typeCode === "NUMBER") kind = "number";
    else if (typeCode === "DATE") kind = "date";
    else if (typeCode === "SINGLE_CHOICE" || typeCode === "MULTIPLE_CHOICE") kind = "choice";
    else if (typeCode === "ADDRESS") kind = "address";
    else if (["MATRIX_SINGLE", "MATRIX_MULTI", "MATRIX_INPUT", "DYNAMIC_TABLE"].includes(typeCode)) {
      kind = "matrix";
    }

    const options = Array.isArray(q.options)
      ? q.options.map((o) => ({
          id: o.id,
          text: String(o.optionText ?? o.text ?? "").trim(),
        }))
      : undefined;

    metas.push({
      ref: `question:${q.id}`,
      label,
      shortLabel,
      kind,
      questionId: q.id,
      questionTypeCode: typeCode,
      options,
      isPii,
    });

    if (kind === "matrix" && typeCode !== "DYNAMIC_TABLE") {
      const matrix = parseMatrixConfig(q.matrixConfig);
      for (const row of matrix.rows) {
        metas.push({
          ref: `question:${q.id}:${row.id}`,
          label: `${shortLabel} -> ${row.label}`,
          shortLabel: `${shortLabel} -> ${row.label}`,
          kind: typeCode === "MATRIX_INPUT" ? "text" : "matrix",
          questionId: q.id,
          matrixRowKey: row.id,
          matrixRowLabel: row.label,
          questionTypeCode: typeCode,
          isPii,
        });
      }
    }
  }

  metas.push(
    {
      ref: "system:submittedAt",
      label: "Thời gian nộp bài",
      shortLabel: "Thời gian nộp",
      kind: "date",
    },
    {
      ref: "system:durationMs",
      label: "Thời lượng làm bài (ms)",
      shortLabel: "Thời lượng (ms)",
      kind: "number",
    },
    {
      ref: "system:totalScore",
      label: "Tổng điểm các câu số (mức gốc)",
      shortLabel: "Tổng điểm số",
      kind: "number",
    }
  );

  for (const cf of computedFields) {
    metas.push({
      ref: `computed:${cf.id}`,
      label: `${cf.name} (Cột tự tạo)`,
      shortLabel: cf.name,
      kind: "computed",
    });
  }

  return metas;
}

