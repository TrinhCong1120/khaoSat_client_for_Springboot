import type { DatasetRecord, SurveyResultQuestion } from "@/types/report";
import {
  extractText,
  parseSmartNumber,
  resolveFieldRawValue,
} from "./extractors";
import {
  evaluateAst,
  FORMULA_FUNCTION_CATALOG,
  parseFormula,
  resolveReferenceToFieldRef,
  type ASTNode,
} from "./formula";
import {
  FormulaErrorValue,
  type ComputedField,
  type ComputedFieldStatus,
  type FieldRef,
  type FormulaPreviewRow,
} from "./types";

function extractLetterTransform(raw: string, extractType: string, pattern?: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  switch (extractType) {
    case "firstLetter": {
      const letterMatch = /\p{L}/u.exec(trimmed);
      if (letterMatch) return letterMatch[0].toUpperCase();
      return trimmed.charAt(0).toUpperCase();
    }
    case "firstWord": {
      const words = trimmed.split(/\s+/).filter(Boolean);
      return words[0] ?? "";
    }
    case "beforeDash": {
      const idx = trimmed.search(/\s*[-–—]\s*/);
      return idx === -1 ? trimmed : trimmed.slice(0, idx).trim();
    }
    case "afterDash": {
      const match = /\s*[-–—]\s*(.+)$/.exec(trimmed);
      return match ? match[1].trim() : trimmed;
    }
    case "regexGroup": {
      if (!pattern || pattern.length > 200) return "";
      try {
        const m = new RegExp(pattern).exec(trimmed);
        if (!m) return "";
        return (m[1] ?? m[0] ?? "").trim();
      } catch {
        return "";
      }
    }
    default:
      return trimmed;
  }
}

function parseDateSafe(raw: unknown): Date | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (isoDateOnly) {
    return new Date(Number(isoDateOnly[1]), Number(isoDateOnly[2]) - 1, Number(isoDateOnly[3]));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function computeDatePart(raw: unknown, part: string): string {
  const d = parseDateSafe(raw);
  if (!d) return "";
  const pad2 = (n: number) => String(n).padStart(2, "0");
  switch (part) {
    case "day":
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    case "month":
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    case "quarter":
      return `Q${Math.floor(d.getMonth() / 3) + 1}/${d.getFullYear()}`;
    case "year":
      return String(d.getFullYear());
    case "weekday": {
      const labels = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
      return labels[d.getDay()] ?? "";
    }
    case "hour":
      return `${pad2(d.getHours())}:00`;
    default:
      return "";
  }
}

export function buildDynamicEqualWidthRanges(
  values: number[],
  step?: number,
  binCount = 5
): Array<{ label: string; min: number; max: number; inclusiveMax: boolean }> {
  if (values.length === 0) return [];
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  if (rawMin === rawMax) {
    return [{ label: `${formatNumCompact(rawMin)}`, min: rawMin, max: rawMin, inclusiveMax: true }];
  }
  const effectiveStep =
    step && step > 0
      ? step
      : chooseNiceStep((rawMax - rawMin) / Math.max(2, Math.min(12, binCount)));
  const start = Math.floor(rawMin / effectiveStep) * effectiveStep;
  const end = Math.ceil(rawMax / effectiveStep) * effectiveStep;
  const ranges: Array<{ label: string; min: number; max: number; inclusiveMax: boolean }> = [];
  let cursor = start;
  let guard = 0;
  while (cursor < end + effectiveStep * 1e-9 && guard < 24) {
    const next = Number((cursor + effectiveStep).toFixed(6));
    const isLast = next >= end - effectiveStep * 1e-9;
    ranges.push({
      label: `${formatNumCompact(cursor)} - ${formatNumCompact(next)}`,
      min: cursor,
      max: next,
      inclusiveMax: isLast,
    });
    if (isLast) break;
    cursor = next;
    guard++;
  }
  return ranges;
}

function chooseNiceStep(rawStep: number): number {
  if (rawStep <= 0 || !Number.isFinite(rawStep)) return 1;
  const exp = Math.floor(Math.log10(rawStep));
  const frac = rawStep / Math.pow(10, exp);
  let nice = 1;
  if (frac <= 1) nice = 1;
  else if (frac <= 2) nice = 2;
  else if (frac <= 2.5) nice = 2.5;
  else if (frac <= 5) nice = 5;
  else nice = 10;
  return nice * Math.pow(10, exp);
}

function formatNumCompact(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

function evaluateBinValue(
  raw: unknown,
  field: Extract<ComputedField, { kind: "bin" }>,
  autoRanges: Array<{ label: string; min: number; max: number; inclusiveMax: boolean }>
): string {
  const num = parseSmartNumber(raw);
  if (num === null) return "";

  if (field.method === "customEdges" && field.customRanges && field.customRanges.length > 0) {
    for (let i = 0; i < field.customRanges.length; i++) {
      const r = field.customRanges[i];
      const lowerOk = r.min == null || num >= r.min;
      const isLast = i === field.customRanges.length - 1;
      const upperOk = r.max == null || (isLast ? num <= r.max : num < r.max);
      if (lowerOk && upperOk) return r.label;
    }
    return "";
  }

  if (field.method === "customEdges" && field.edges && field.edges.length >= 2) {
    for (let i = 0; i < field.edges.length - 1; i++) {
      const min = field.edges[i];
      const max = field.edges[i + 1];
      const isLast = i === field.edges.length - 2;
      if (num >= min && (isLast ? num <= max : num < max)) {
        return field.labels?.[i] ?? `${formatNumCompact(min)} - ${formatNumCompact(max)}`;
      }
    }
    return "";
  }

  for (const r of autoRanges) {
    if (num >= r.min && (r.inclusiveMax ? num <= r.max : num < r.max)) {
      return r.label;
    }
  }
  return "";
}

export function evaluateComputedFields(
  records: DatasetRecord[],
  computedFields: ComputedField[],
  questionsById: Map<string, SurveyResultQuestion>
): {
  computedValues: Map<string, Record<string, unknown>>;
  statuses: ComputedFieldStatus[];
} {
  const computedValues = new Map<string, Record<string, unknown>>();
  for (const r of records) {
    computedValues.set(r.id, {});
  }
  const statuses: ComputedFieldStatus[] = [];

  for (const cf of computedFields) {
    const status: ComputedFieldStatus = {
      fieldId: cf.id,
      fieldName: cf.name,
      runtimeErrorCount: 0,
      sampleErrors: [],
    };

    if (cf.kind === "formula") {
      let ast: ASTNode;
      try {
        ast = parseFormula(cf.expression);
        validateFormulaIdentifiers(ast);
      } catch (err) {
        status.syntaxError =
          err instanceof FormulaErrorValue
            ? `${err.code}${err.detail ? ` (${err.detail})` : ""}`
            : "#SYNTAX?";
        for (const r of records) {
          computedValues.get(r.id)![cf.id] = new FormulaErrorValue("#SYNTAX?");
          status.runtimeErrorCount++;
        }
        statuses.push(status);
        continue;
      }

      for (const r of records) {
        const val = evaluateAst(ast, {
          record: r,
          questionsById,
          computedValues: computedValues.get(r.id),
        });
        if (val instanceof FormulaErrorValue) {
          status.runtimeErrorCount++;
          if (status.sampleErrors.length < 3) {
            const msg = `${val.code}${val.detail ? `: ${val.detail}` : ""}`;
            if (!status.sampleErrors.includes(msg)) status.sampleErrors.push(msg);
          }
        }
        computedValues.get(r.id)![cf.id] = val;
      }
      statuses.push(status);
      continue;
    }

    if (cf.kind === "extract") {
      for (const r of records) {
        const raw = resolveFieldRawValue(r, cf.sourceField, questionsById, computedValues.get(r.id));
        if (cf.extractType === "province" && raw && typeof raw === "object") {
          computedValues.get(r.id)![cf.id] = String((raw as { province?: string }).province ?? "");
          continue;
        }
        if (cf.extractType === "ward" && raw && typeof raw === "object") {
          computedValues.get(r.id)![cf.id] = String((raw as { ward?: string }).ward ?? "");
          continue;
        }
        const txt = extractText(raw);
        if (cf.extractType === "province" && txt.includes("/")) {
          computedValues.get(r.id)![cf.id] = txt.split("/")[0].trim();
          continue;
        }
        if (cf.extractType === "ward" && txt.includes("/")) {
          computedValues.get(r.id)![cf.id] = (txt.split("/")[1] ?? "").trim();
          continue;
        }
        computedValues.get(r.id)![cf.id] = extractLetterTransform(txt, cf.extractType, cf.pattern);
      }
      statuses.push(status);
      continue;
    }

    if (cf.kind === "datePart") {
      for (const r of records) {
        const raw = resolveFieldRawValue(r, cf.sourceField, questionsById, computedValues.get(r.id));
        computedValues.get(r.id)![cf.id] = computeDatePart(raw, cf.part);
      }
      statuses.push(status);
      continue;
    }

    if (cf.kind === "bin") {
      const nums = records
        .map((r) => parseSmartNumber(resolveFieldRawValue(r, cf.sourceField, questionsById, computedValues.get(r.id))))
        .filter((n): n is number => n !== null);
      const autoRanges =
        cf.method === "equalWidth"
          ? buildDynamicEqualWidthRanges(nums, cf.step, cf.binCount ?? 5)
          : [];
      for (const r of records) {
        const raw = resolveFieldRawValue(r, cf.sourceField, questionsById, computedValues.get(r.id));
        computedValues.get(r.id)![cf.id] = evaluateBinValue(raw, cf, autoRanges);
      }
      statuses.push(status);
    }
  }

  return { computedValues, statuses };
}

function validateFormulaIdentifiers(node: ASTNode) {
  const allowed = new Set(FORMULA_FUNCTION_CATALOG.map((f) => f.name));
  allowed.add("AVERAGE");
  if (node.kind === "Call") {
    if (!allowed.has(node.name)) {
      throw new FormulaErrorValue("#NAME?", `Hàm '${node.name}' không tồn tại`);
    }
    for (const arg of node.args) {
      validateFormulaIdentifiers(arg);
    }
  } else if (node.kind === "BinaryOp") {
    validateFormulaIdentifiers(node.left);
    validateFormulaIdentifiers(node.right);
  } else if (node.kind === "UnaryOp") {
    validateFormulaIdentifiers(node.operand);
  }
}

export function previewComputedField(
  field: ComputedField,
  records: DatasetRecord[],
  questionsById: Map<string, SurveyResultQuestion>,
  priorFields: ComputedField[] = [],
  limit = 5
): { rows: FormulaPreviewRow[]; status: ComputedFieldStatus } {
  const sample = records.slice(0, limit);
  const { computedValues, statuses } = evaluateComputedFields(
    sample,
    [...priorFields, field],
    questionsById
  );
  const status = statuses[statuses.length - 1] ?? {
    fieldId: field.id,
    fieldName: field.name,
    runtimeErrorCount: 0,
    sampleErrors: [],
  };

  const referencedFields: FieldRef[] =
    field.kind === "formula"
      ? collectFormulaRefs(field.expression, questionsById)
      : [field.sourceField];

  const rows: FormulaPreviewRow[] = sample.map((r) => {
    const val = computedValues.get(r.id)?.[field.id];
    const inputsSummary = referencedFields
      .map((f) => extractText(resolveFieldRawValue(r, f, questionsById, computedValues.get(r.id))))
      .filter(Boolean)
      .join(" | ");

    if (val instanceof FormulaErrorValue) {
      return {
        recordId: r.id,
        submittedAt: r.submittedAt,
        inputsSummary: inputsSummary || "—",
        output: val.code,
        error: val.detail ?? val.code,
      };
    }

    return {
      recordId: r.id,
      submittedAt: r.submittedAt,
      inputsSummary: inputsSummary || "—",
      output: val === null || val === undefined || val === "" ? "—" : String(val),
    };
  });

  return { rows, status };
}

function collectFormulaRefs(
  expr: string,
  questionsById: Map<string, SurveyResultQuestion>
): FieldRef[] {
  const refs: FieldRef[] = [];
  const matches = expr.match(/\[[^\]]+\](\.\[[^\]]+\])?/g) ?? [];
  for (const m of matches) {
    const parts = m.split("].[");
    const raw = parts[0].replace(/^\[|\]$/g, "");
    const matrixRow = parts[1]?.replace(/\]$/, "");
    const resolved = resolveReferenceToFieldRef(raw, matrixRow, questionsById);
    if (!(resolved instanceof FormulaErrorValue) && !refs.includes(resolved)) {
      refs.push(resolved);
    }
  }
  return refs.slice(0, 3);
}

