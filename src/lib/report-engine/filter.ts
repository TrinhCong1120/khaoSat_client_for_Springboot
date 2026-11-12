import type { DatasetRecord, SurveyResultQuestion } from "@/types/report";
import {
  extractArrayValues,
  extractText,
  isValueEmpty,
  parseSmartNumber,
  resolveFieldRawValue,
} from "./extractors";
import type { FilterGroup, FilterOperator, FilterRule, SurveyFieldMeta } from "./types";

export function createEmptyFilterTree(id = "root"): FilterGroup {
  return { kind: "group", id, logic: "AND", children: [] };
}

export function countActiveFilterRules(node: FilterGroup | FilterRule): number {
  if (node.kind === "rule") {
    return isRuleComplete(node) ? 1 : 0;
  }
  return node.children.reduce((acc, child) => acc + countActiveFilterRules(child), 0);
}

export function isRuleComplete(rule: FilterRule): boolean {
  if (!rule.field || !rule.operator) return false;
  if (rule.operator === "isEmpty" || rule.operator === "isNotEmpty") return true;
  if (rule.operator === "in" || rule.operator === "notIn") {
    return Array.isArray(rule.value)
      ? rule.value.length > 0
      : String(rule.value ?? "").trim().length > 0;
  }
  if (rule.operator === "between") {
    return (
      rule.value !== undefined &&
      rule.value !== null &&
      String(rule.value).trim() !== "" &&
      rule.valueTo !== undefined &&
      rule.valueTo !== null &&
      String(rule.valueTo).trim() !== ""
    );
  }
  return rule.value !== undefined && rule.value !== null && String(rule.value).trim() !== "";
}

export function evaluateFilterTree(
  records: DatasetRecord[],
  root: FilterGroup,
  questionsById: Map<string, SurveyResultQuestion>,
  computedValues: Map<string, Record<string, unknown>>
): DatasetRecord[] {
  if (!root || root.children.length === 0 || countActiveFilterRules(root) === 0) {
    return records;
  }
  return records.filter((record) =>
    evaluateGroup(record, root, questionsById, computedValues.get(record.id))
  );
}

function evaluateGroup(
  record: DatasetRecord,
  group: FilterGroup,
  questionsById: Map<string, SurveyResultQuestion>,
  recordComputed?: Record<string, unknown>
): boolean {
  const activeChildren = group.children.filter((c) =>
    c.kind === "rule" ? isRuleComplete(c) : countActiveFilterRules(c) > 0
  );
  if (activeChildren.length === 0) return true;

  if (group.logic === "AND") {
    return activeChildren.every((child) =>
      child.kind === "rule"
        ? evaluateRule(record, child, questionsById, recordComputed)
        : evaluateGroup(record, child, questionsById, recordComputed)
    );
  }
  return activeChildren.some((child) =>
    child.kind === "rule"
      ? evaluateRule(record, child, questionsById, recordComputed)
      : evaluateGroup(record, child, questionsById, recordComputed)
  );
}

export function evaluateRule(
  record: DatasetRecord,
  rule: FilterRule,
  questionsById: Map<string, SurveyResultQuestion>,
  recordComputed?: Record<string, unknown>
): boolean {
  if (!isRuleComplete(rule)) return true;

  const raw = resolveFieldRawValue(record, rule.field, questionsById, recordComputed);
  const empty = isValueEmpty(raw);

  if (rule.operator === "isEmpty") return empty;
  if (rule.operator === "isNotEmpty") return !empty;
  if (empty) return false;

  const isDateField =
    rule.field === "system:submittedAt" ||
    (rule.field.startsWith("question:") &&
      String(questionsById.get(rule.field.split(":")[1] ?? "")?.questionTypeCode ?? "").toUpperCase() ===
        "DATE");

  const listValues = extractArrayValues(raw);
  const textValue = extractText(raw).trim();
  const textLower = textValue.toLowerCase();

  switch (rule.operator) {
    case "equals": {
      const targetStr = String(rule.value ?? "").trim();
      const targetNum = parseSmartNumber(targetStr);
      const rawNum = parseSmartNumber(raw);
      if (targetNum !== null && rawNum !== null && !isDateField) {
        return Math.abs(rawNum - targetNum) < 1e-9;
      }
      if (isDateField) {
        return compareDates(textValue, targetStr) === 0;
      }
      if (listValues.length > 1) {
        return listValues.some((v) => v.toLowerCase() === targetStr.toLowerCase());
      }
      return textLower === targetStr.toLowerCase();
    }

    case "notEquals":
      return !evaluateRule(record, { ...rule, operator: "equals" }, questionsById, recordComputed);

    case "contains": {
      const needle = String(rule.value ?? "").trim().toLowerCase();
      return textLower.includes(needle) || listValues.some((v) => v.toLowerCase().includes(needle));
    }

    case "notContains":
      return !evaluateRule(record, { ...rule, operator: "contains" }, questionsById, recordComputed);

    case "startsWith": {
      const needle = String(rule.value ?? "").trim().toLowerCase();
      return textLower.startsWith(needle);
    }

    case "endsWith": {
      const needle = String(rule.value ?? "").trim().toLowerCase();
      return textLower.endsWith(needle);
    }

    case "regex": {
      const pat = String(rule.value ?? "");
      if (!pat || pat.length > 200) return false;
      try {
        return new RegExp(pat, "i").test(textValue);
      } catch {
        return false;
      }
    }

    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      if (isDateField) {
        const cmp = compareDates(textValue, String(rule.value ?? ""));
        if (cmp === null) return false;
        if (rule.operator === "gt") return cmp > 0;
        if (rule.operator === "gte") return cmp >= 0;
        if (rule.operator === "lt") return cmp < 0;
        return cmp <= 0;
      }
      const rawNum = parseSmartNumber(raw);
      const targetNum = parseSmartNumber(rule.value);
      if (rawNum === null || targetNum === null) return false;
      if (rule.operator === "gt") return rawNum > targetNum;
      if (rule.operator === "gte") return rawNum >= targetNum;
      if (rule.operator === "lt") return rawNum < targetNum;
      return rawNum <= targetNum;
    }

    case "between": {
      if (isDateField) {
        const c1 = compareDates(textValue, String(rule.value ?? ""));
        const c2 = compareDates(textValue, String(rule.valueTo ?? ""));
        if (c1 === null || c2 === null) return false;
        return c1 >= 0 && c2 <= 0;
      }
      const rawNum = parseSmartNumber(raw);
      const min = parseSmartNumber(rule.value);
      const max = parseSmartNumber(rule.valueTo);
      if (rawNum === null || min === null || max === null) return false;
      const lo = Math.min(min, max);
      const hi = Math.max(min, max);
      return rawNum >= lo && rawNum <= hi;
    }

    case "in":
    case "notIn": {
      const targets = normalizeTargetList(rule.value);
      const matched = listValues.some((v) => targets.has(v.toLowerCase()));
      return rule.operator === "in" ? matched : !matched;
    }

    default:
      return true;
  }
}

function normalizeTargetList(val: unknown): Set<string> {
  if (Array.isArray(val)) {
    return new Set(val.map((v) => String(v).trim().toLowerCase()).filter(Boolean));
  }
  return new Set(
    String(val ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function compareDates(rawDateStr: string, targetDateStr: string): number | null {
  const a = toComparableDay(rawDateStr);
  const b = toComparableDay(targetDateStr);
  if (a === null || b === null) return null;
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

function toComparableDay(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (iso) return iso[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: "Bằng",
  notEquals: "Khác",
  contains: "Chứa",
  notContains: "Không chứa",
  startsWith: "Bắt đầu bằng",
  endsWith: "Kết thúc bằng",
  regex: "Khớp Regex (nâng cao)",
  gt: "Lớn hơn (>)",
  gte: "Lớn hơn hoặc bằng (>=)",
  lt: "Nhỏ hơn (<)",
  lte: "Nhỏ hơn hoặc bằng (<=)",
  between: "Trong khoảng",
  in: "Thuộc danh sách",
  notIn: "Không thuộc danh sách",
  isEmpty: "Bị bỏ trống",
  isNotEmpty: "Có câu trả lời",
};

export function getOperatorsForFieldKind(kind: SurveyFieldMeta["kind"]): FilterOperator[] {
  if (kind === "number") {
    return ["equals", "notEquals", "gt", "gte", "lt", "lte", "between", "in", "isEmpty", "isNotEmpty"];
  }
  if (kind === "date") {
    return ["equals", "gte", "lte", "between", "isEmpty", "isNotEmpty"];
  }
  if (kind === "choice") {
    return ["equals", "notEquals", "in", "notIn", "contains", "isEmpty", "isNotEmpty"];
  }
  return [
    "contains",
    "notContains",
    "equals",
    "notEquals",
    "startsWith",
    "endsWith",
    "in",
    "notIn",
    "gt",
    "gte",
    "lt",
    "lte",
    "isEmpty",
    "isNotEmpty",
    "regex",
  ];
}

export function describeFilterTree(
  group: FilterGroup,
  fieldMap: Map<string, SurveyFieldMeta>
): string {
  const parts = group.children
    .map((child) => {
      if (child.kind === "group") {
        const inner = describeFilterTree(child, fieldMap);
        return inner ? `(${inner})` : "";
      }
      if (!isRuleComplete(child)) return "";
      const label = fieldMap.get(child.field)?.shortLabel ?? child.field;
      const op = OPERATOR_LABELS[child.operator] ?? child.operator;
      if (child.operator === "isEmpty" || child.operator === "isNotEmpty") {
        return `${label} ${op}`;
      }
      if (child.operator === "between") {
        return `${label} ${op} [${String(child.value)} .. ${String(child.valueTo)}]`;
      }
      const valText = Array.isArray(child.value) ? child.value.join(", ") : String(child.value ?? "");
      return `${label} ${op} "${valText}"`;
    })
    .filter(Boolean);

  return parts.join(` ${group.logic === "AND" ? "VÀ" : "HOẶC"} `);
}

