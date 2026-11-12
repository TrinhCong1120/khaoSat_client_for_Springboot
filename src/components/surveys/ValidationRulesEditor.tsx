"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  FiChevronDown,
  FiPlus,
  FiTrash2,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiSave,
} from "react-icons/fi";
import { API_QUESTIONS, API_VALIDATION_RULE_CATALOG } from "@/lib/api";

export type ValidationRule = {
  type: string;
  value: unknown;
  message: string;
  enabled: boolean;
};

type RuleDefinition = {
  type: string;
  label: string;
  valueKind: "number" | "boolean" | "text" | "list" | "json";
  placeholder?: string;
  parameters?: any[];
};

const catalogRequests = new Map<string, Promise<RuleDefinition[]>>();

type QuestionOption = {
  id: string;
  optionText?: string;
};

const OPTION_LIST_RULES = [
  "ALLOWED_OPTIONS",
  "DISALLOWED_OPTIONS",
  "REQUIRED_OPTIONS",
  "AT_MOST_ONE_OF",
  "EXCLUSIVE_OPTIONS",
  "MUTUALLY_EXCLUSIVE",
];

const RULES: Record<string, RuleDefinition[]> = {
  TEXT: [
    { type: "PHONE", label: "📱 Định dạng số điện thoại", valueKind: "text", placeholder: "Mã quốc gia, ví dụ: VN" },
    { type: "MIN_LENGTH", label: "📏 Độ dài ký tự tối thiểu", valueKind: "number", placeholder: "Ví dụ: 6" },
    { type: "MAX_LENGTH", label: "📐 Độ dài ký tự tối đa", valueKind: "number", placeholder: "Ví dụ: 255" },
    { type: "REGEX", label: "⚙️ Biểu thức chính quy (Regex)", valueKind: "text", placeholder: "Ví dụ: ^0[0-9]{9}$" },
    { type: "EMAIL", label: "✉️ Định dạng Email hợp lệ", valueKind: "boolean" },
    { type: "URL", label: "🔗 Địa chỉ liên kết Web (URL)", valueKind: "boolean" },
    { type: "NUMERIC_TEXT", label: "🔢 Chỉ chứa chữ số", valueKind: "boolean" },
    { type: "ALPHABET_ONLY", label: "🔤 Chỉ chứa chữ cái", valueKind: "boolean" },
    { type: "ALPHANUMERIC", label: "🔠 Chữ cái và số", valueKind: "boolean" },
    { type: "STARTS_WITH", label: "🔤 Bắt đầu bằng chuỗi", valueKind: "text", placeholder: "Ví dụ: SV-" },
    { type: "ENDS_WITH", label: "🔤 Kết thúc bằng chuỗi", valueKind: "text", placeholder: "Ví dụ: @school.edu.vn" },
    { type: "MUST_CONTAIN", label: "📌 Bắt buộc phải chứa từ", valueKind: "text", placeholder: "Ví dụ: đại học" },
    { type: "NOT_CONTAIN", label: "🚫 Không được chứa từ cấm", valueKind: "list", placeholder: "Các từ cấm, cách nhau bằng dấu phẩy" },
  ],
  NUMBER: [
    { type: "MIN", label: "⬇️ Giá trị số nhỏ nhất (Tối thiểu)", valueKind: "number", placeholder: "Ví dụ: 0" },
    { type: "MAX", label: "⬆️ Giá trị số lớn nhất (Tối đa)", valueKind: "number", placeholder: "Ví dụ: 10" },
    { type: "GREATER_THAN", label: "▶️ Giá trị phải lớn hơn (>)", valueKind: "number", placeholder: "Ví dụ: 0" },
    { type: "LESS_THAN", label: "◀️ Giá trị phải nhỏ hơn (<)", valueKind: "number", placeholder: "Ví dụ: 100" },
    { type: "INTEGER_ONLY", label: "🔢 Chỉ chấp nhận số nguyên", valueKind: "boolean" },
    { type: "DECIMAL_PLACES", label: "🎯 Số chữ số thập phân", valueKind: "number", placeholder: "Ví dụ: 2" },
    { type: "STEP", label: "📶 Bước nhảy giá trị (Step)", valueKind: "number", placeholder: "Ví dụ: 0.5" },
    { type: "POSITIVE", label: "➕ Số dương (> 0)", valueKind: "boolean" },
    { type: "NEGATIVE", label: "➖ Số âm (< 0)", valueKind: "boolean" },
    { type: "NOT_EQUAL", label: "≠ Không được bằng số", valueKind: "number", placeholder: "Ví dụ: 0" },
    { type: "ALLOWED_VALUES", label: "✅ Giá trị cho phép", valueKind: "list", placeholder: "Ví dụ: 1, 2, 5, 10" },
    { type: "DISALLOWED_VALUES", label: "❌ Giá trị bị cấm", valueKind: "list", placeholder: "Ví dụ: 13, 4" },
  ],
  DATE: [
    { type: "MIN_DATE", label: "📅 Ngày sớm nhất (Tối thiểu)", valueKind: "text", placeholder: "YYYY-MM-DD" },
    { type: "MAX_DATE", label: "📅 Ngày muộn nhất (Tối đa)", valueKind: "text", placeholder: "YYYY-MM-DD" },
    { type: "BEFORE_TODAY", label: "⏱️ Phải là ngày trước hôm nay", valueKind: "boolean" },
    { type: "AFTER_TODAY", label: "⏱️ Phải là ngày sau hôm nay", valueKind: "boolean" },
    { type: "NOT_FUTURE", label: "🚫 Không được là ngày tương lai", valueKind: "boolean" },
    { type: "NOT_PAST", label: "🚫 Không được là ngày quá khứ", valueKind: "boolean" },
    { type: "MIN_AGE", label: "👤 Độ tuổi tối thiểu", valueKind: "number", placeholder: "Ví dụ: 18" },
    { type: "MAX_AGE", label: "👤 Độ tuổi tối đa", valueKind: "number", placeholder: "Ví dụ: 65" },
    { type: "ALLOWED_WEEKDAYS", label: "🗓️ Thứ trong tuần cho phép", valueKind: "list", placeholder: "1-7, ví dụ: 2,3,4,5,6" },
    { type: "DISALLOWED_DATES", label: "⛔ Các ngày bị cấm chọn", valueKind: "list", placeholder: "YYYY-MM-DD, cách nhau bằng dấu phẩy" },
  ],
  ADDRESS: [
    { type: "REQUIRE_PROVINCE", label: "📍 Bắt buộc chọn Tỉnh / Thành phố", valueKind: "boolean" },
    { type: "REQUIRE_WARD", label: "📍 Bắt buộc chọn Xã / Phường", valueKind: "boolean" },
    { type: "REQUIRE_DETAIL", label: "🏠 Bắt buộc nhập địa chỉ chi tiết", valueKind: "boolean" },
    { type: "DETAIL_MIN_LENGTH", label: "📏 Độ dài địa chỉ chi tiết tối thiểu", valueKind: "number", placeholder: "Ví dụ: 5" },
    { type: "DETAIL_MAX_LENGTH", label: "📐 Độ dài địa chỉ chi tiết tối đa", valueKind: "number", placeholder: "Ví dụ: 200" },
    { type: "DETAIL_REGEX", label: "⚙️ Biểu thức chính quy cho địa chỉ", valueKind: "text", placeholder: "Regex pattern" },
  ],
  SINGLE_CHOICE: [
    { type: "ALLOWED_OPTIONS", label: "✅ Chỉ cho phép các lựa chọn", valueKind: "list", placeholder: "STT lựa chọn, ví dụ: 1, 2" },
    { type: "DISALLOWED_OPTIONS", label: "🚫 Cấm các lựa chọn", valueKind: "list", placeholder: "STT lựa chọn, ví dụ: 3" },
    { type: "FIXED_OPTION", label: "🔒 Khóa cố định một lựa chọn", valueKind: "number", placeholder: "STT lựa chọn" },
  ],
  MULTIPLE_CHOICE: [
    { type: "MIN_SELECTIONS", label: "🔢 Số lựa chọn tối thiểu", valueKind: "number", placeholder: "Ví dụ: 1" },
    { type: "MAX_SELECTIONS", label: "🔢 Số lựa chọn tối đa", valueKind: "number", placeholder: "Ví dụ: 3" },
    { type: "REQUIRED_OPTIONS", label: "⭐ Lựa chọn bắt buộc phải tích", valueKind: "list", placeholder: "STT lựa chọn, ví dụ: 1" },
    { type: "MUTUALLY_EXCLUSIVE", label: "⛔ Lựa chọn loại trừ (chọn riêng)", valueKind: "list", placeholder: "STT lựa chọn, ví dụ: 4" },
    { type: "ALLOWED_OPTIONS", label: "✅ Chỉ cho phép các lựa chọn", valueKind: "list", placeholder: "STT lựa chọn, ví dụ: 1, 2" },
    { type: "DISALLOWED_OPTIONS", label: "🚫 Cấm các lựa chọn", valueKind: "list", placeholder: "STT lựa chọn, ví dụ: 3" },
  ],
};

// Aliases for legacy numeric IDs
RULES["1"] = RULES.SINGLE_CHOICE;
RULES["2"] = RULES.MULTIPLE_CHOICE;
RULES["3"] = RULES.TEXT;
RULES["4"] = RULES.NUMBER;
RULES["5"] = RULES.DATE;
RULES["6"] = RULES.ADDRESS;

function definitionFor(typeIdOrCode: string | undefined, type: string) {
  if (!typeIdOrCode) return localizedDefinitionFor(type);
  const byCode = RULES[String(typeIdOrCode).toUpperCase()];
  if (byCode) {
    const found = byCode.find((r) => r.type === type);
    if (found) return found;
  }
  return RULES[String(typeIdOrCode)]?.find((rule) => rule.type === type) || localizedDefinitionFor(type);
}

function localizedDefinitionFor(type: string) {
  return Object.values(RULES).flat().find((rule) => rule.type === type);
}

function optionIdToSequence(optionId: unknown, options: QuestionOption[]) {
  const index = options.findIndex((option) => String(option.id) === String(optionId));
  return index >= 0 ? index + 1 : optionId;
}

function sequenceToOptionId(sequence: unknown, options: QuestionOption[]) {
  const index = Number(sequence) - 1;
  return Number.isInteger(index) && index >= 0 && index < options.length
    ? String(options[index].id)
    : null;
}

function displayValue(rule: ValidationRule, definition: RuleDefinition | undefined, options: QuestionOption[]) {
  if (!definition) return typeof rule.value === "string" ? rule.value : JSON.stringify(rule.value ?? "");
  if (definition.valueKind === "boolean") return Boolean(rule.value);
  if (definition.valueKind === "number") {
    if (typeof rule.value === "object" && rule.value !== null) {
      const value = rule.value as any;
      const rawValue = value.optionId ?? value.value ?? "";
      return definition.type === "FIXED_OPTION"
        ? String(optionIdToSequence(rawValue, options))
        : String(rawValue);
    }
    return rule.value == null ? "" : String(rule.value);
  }
  if (definition.valueKind === "list") {
    const value = rule.value as any;
    const list = Array.isArray(value) ? value : value?.optionIds ?? value?.values ?? value?.dates ?? value?.weekdays ?? value?.provinceCodes ?? value?.wardCodes;
    if (!Array.isArray(list)) return String(value ?? "");
    return OPTION_LIST_RULES.includes(definition.type)
      ? list.map((item) => optionIdToSequence(item, options)).join(",")
      : list.join(",");
  }
  if (typeof rule.value === "object") {
    const value = rule.value as any;
    return String(value.country ?? value.code ?? value.name ?? JSON.stringify(value));
  }
  return String(rule.value ?? "");
}

function buildValue(definition: RuleDefinition, raw: string | boolean, options: QuestionOption[]) {
  if (definition.valueKind === "boolean") return Boolean(raw);
  if (definition.valueKind === "number") {
    const value = raw === "" ? "" : Number(raw);
    if (definition.type === "FIXED_OPTION") return { optionId: sequenceToOptionId(value, options) };
    return value;
  }
  if (definition.valueKind === "list") {
    const values = String(raw).split(",").map((item) => item.trim()).filter(Boolean);
    if (OPTION_LIST_RULES.includes(definition.type)) {
      return { optionIds: values.map((item) => sequenceToOptionId(item, options)).filter((item): item is string => item != null) };
    }
    if (definition.type === "NOT_CONTAIN") return { values };
    if (definition.type === "ALLOWED_WEEKDAYS") return { weekdays: values.map(Number).filter(Number.isFinite) };
    if (definition.type === "DISALLOWED_DATES") return { dates: values };
    if (definition.type.includes("PROVINCES")) return { provinceCodes: values };
    if (definition.type.includes("WARDS")) return { wardCodes: values };
    return values;
  }
  if (definition.type === "FIXED_PROVINCE") return { code: String(raw), name: String(raw) };
  if (definition.type === "FIXED_WARD") return { code: String(raw), name: String(raw) };
  return raw;
}

function catalogDefinition(rule: any, questionTypeIdOrCode: string): RuleDefinition {
  const parameter = Array.isArray(rule?.parameters) ? rule.parameters[0] : null;
  const code = String(rule?.code || "");
  const parameterType = String(parameter?.type || "TEXT").toUpperCase();
  let valueKind: RuleDefinition["valueKind"] = "text";
  if (!parameter) valueKind = "boolean";
  else if (parameterType.includes("NUMBER")) valueKind = "number";
  else if (parameterType.includes("OPTION")) valueKind = "number";
  else if (parameterType.includes("LIST") || parameter?.multiple === true) valueKind = "list";
  if (/OPTIONS|VALUES|WEEKDAYS|DATES|PROVINCES|WARDS|MUST_CONTAIN|NOT_CONTAIN/.test(code)) valueKind = "list";
  const localizedDefinition = definitionFor(questionTypeIdOrCode, code) || localizedDefinitionFor(code);
  return {
    type: code,
    label: localizedDefinition?.label || String(rule.name || code),
    valueKind,
    placeholder: localizedDefinition?.placeholder || parameter?.description || parameter?.name || "Giá trị",
    parameters: Array.isArray(rule.parameters) ? rule.parameters : [],
  };
}

function toParameters(rule: ValidationRule, definition?: RuleDefinition) {
  const value: any = rule.value;
  if (!definition || definition.valueKind === "boolean") return [];
  const metadata = definition.parameters || [];
  const parameterValue = (parameter: any, fallback: any = "") => {
    const raw = value && typeof value === "object" && !Array.isArray(value)
      ? value[parameter.name] ?? parameter.defaultValue ?? fallback
      : parameter.name === "base"
        ? parameter.defaultValue ?? fallback
        : value ?? parameter.defaultValue ?? fallback;
    const type = String(parameter.type || "TEXT").toUpperCase();
    if (type.includes("NUMBER")) return { numberValue: raw === "" ? null : Number(raw) };
    if (type.includes("DATE")) return { dateValue: String(raw) };
    if (type.includes("OPTION")) return { optionId: String(raw) };
    return { textValue: String(raw) };
  };
  if (metadata.length > 1) {
    return metadata.map((parameter: any, index: number) => ({
      name: parameter.name,
      groupIndex: 0,
      position: index,
      ...parameterValue(parameter, parameter.name === "base" ? "0" : ""),
    }));
  }
  if (definition.type === "FIXED_OPTION") return [{ name: "value", groupIndex: 0, position: 0, optionId: String(value?.optionId ?? value) }];
  if (definition.valueKind === "number") return [{ name: metadata[0]?.name || "value", groupIndex: 0, position: 0, numberValue: value === "" ? null : Number(value) }];
  if (definition.valueKind === "list") {
    const list = Array.isArray(value) ? value : value?.optionIds ?? value?.values ?? value?.dates ?? value?.weekdays ?? value?.provinceCodes ?? value?.wardCodes ?? [];
    const isOptionList = ["ALLOWED_OPTIONS", "DISALLOWED_OPTIONS", "REQUIRED_OPTIONS", "AT_MOST_ONE_OF", "EXCLUSIVE_OPTIONS", "MUTUALLY_EXCLUSIVE"].includes(definition.type);
    const isNumberList = ["ALLOWED_VALUES", "DISALLOWED_VALUES", "ALLOWED_WEEKDAYS"].includes(definition.type);
    const isDateList = ["ALLOWED_DATES", "DISALLOWED_DATES"].includes(definition.type);
    return list.map((item: any, index: number) => isOptionList
      ? { name: metadata[0]?.name || "value", groupIndex: 0, position: index, optionId: String(item) }
      : isNumberList
        ? { name: metadata[0]?.name || "value", groupIndex: 0, position: index, numberValue: Number(item) }
        : isDateList
          ? { name: metadata[0]?.name || "value", groupIndex: 0, position: index, dateValue: String(item) }
      : { name: metadata[0]?.name || "value", groupIndex: 0, position: index, textValue: String(item) });
  }
  if (definition.type === "PHONE") return [{ name: metadata[0]?.name || "country", groupIndex: 0, position: 0, textValue: String(value?.country ?? value ?? "VN") }];
  if (definition.type === "FIXED_PROVINCE" || definition.type === "FIXED_WARD") return [{ name: metadata[0]?.name || "value", groupIndex: 0, position: 0, textValue: String(value?.name ?? value?.code ?? value ?? "") }];
  return [{ name: metadata[0]?.name || "value", groupIndex: 0, position: 0, textValue: String(value ?? "") }];
}

function fromApiRule(rule: any): ValidationRule {
  const parameters = Array.isArray(rule?.parameters) ? rule.parameters : [];
  const defaultMessage = rule.errorMessage || rule.defaultMessage || "Giá trị không hợp lệ";
  if (parameters.length === 0) return { type: String(rule.code), value: true, message: defaultMessage, enabled: rule.isActive !== false };
  const optionIds = parameters.filter((item: any) => item.optionId != null).map((item: any) => String(item.optionId));
  if (optionIds.length === parameters.length) {
    const value = String(rule.code) === "FIXED_OPTION"
      ? { optionId: optionIds[0] }
      : { optionIds };
    return { type: String(rule.code), value, message: defaultMessage, enabled: rule.isActive !== false };
  }
  if (parameters.length > 1 || parameters.some((item: any) => item.name !== "value")) {
    const grouped = Object.fromEntries(parameters.map((item: any) => [item.name, item.numberValue ?? item.dateValue ?? item.textValue ?? ""]));
    return { type: String(rule.code), value: grouped, message: defaultMessage, enabled: rule.isActive !== false };
  }
  const first = parameters[0];
  if (String(rule.code) === "PHONE") {
    return { type: String(rule.code), value: first.textValue ?? "VN", message: defaultMessage, enabled: rule.isActive !== false };
  }
  const value = first.numberValue ?? first.dateValue ?? first.textValue ?? "";
  return { type: String(rule.code), value, message: defaultMessage, enabled: rule.isActive !== false };
}

interface ValidationRulesEditorProps {
  questionId?: string;
  questionTypeId: string;
  questionTypeCode?: string;
  revision?: number;
  rules?: any;
  options?: QuestionOption[];
  onChange: (rules: ValidationRule[]) => void;
}

export default function ValidationRulesEditor({
  questionId,
  questionTypeId,
  questionTypeCode,
  revision,
  rules,
  options = [],
  onChange,
}: ValidationRulesEditorProps) {
  const [expanded, setExpanded] = useState(false);
  const [catalog, setCatalog] = useState<RuleDefinition[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [effectiveRevision, setEffectiveRevision] = useState<number | undefined>(revision);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const current: ValidationRule[] = Array.isArray(rules)
    ? rules.map((rule: any) => (rule?.type ? rule : fromApiRule(rule)))
    : [];

  const activeRulesCount = current.filter((r) => r.enabled !== false).length;

  // Use catalog definitions if loaded; fallback to local definition list
  const typeKey = (questionTypeCode || "").toUpperCase();
  const fallbackList = RULES[typeKey] || RULES[questionTypeId] || [];
  const definitions = catalog.length > 0 ? catalog : fallbackList;

  useEffect(() => {
    setEffectiveRevision(revision);
  }, [revision]);

  // Load catalog on mount or when questionTypeCode changes
  useEffect(() => {
    const code = String(questionTypeCode || "").toUpperCase();
    if (!code) return;

    let active = true;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || sessionStorage.getItem("token") : null;
    const cacheKey = `${code}:${questionTypeId}`;
    let request = catalogRequests.get(cacheKey);

    if (!request) {
      request = fetch(`${API_VALIDATION_RULE_CATALOG}?questionType=${encodeURIComponent(code)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }).then(async (response) => {
        if (!response.ok) throw new Error("catalog fetch failed");
        const body = await response.json();
        return (Array.isArray(body) ? body : body?.rules || [])
          .filter((rule: any) => rule?.code)
          .map((rule: any) => catalogDefinition(rule, code || questionTypeId));
      });
      catalogRequests.set(cacheKey, request);
      request.catch(() => catalogRequests.delete(cacheKey));
    }

    request
      .then((next) => {
        if (!active) return;
        setCatalog(next);
        setCatalogError("");
      })
      .catch(() => {
        if (!active) return;
        setCatalog(fallbackList);
        setCatalogError("Không tải được danh mục từ máy chủ, dùng danh mục dự phòng");
      });

    return () => {
      active = false;
    };
  }, [questionTypeCode, questionTypeId, fallbackList]);

  // Clean up debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const triggerSave = useCallback(
    async (rulesToSave: ValidationRule[]) => {
      if (!questionId) return;
      setSaveState("saving");
      setSaveError("");
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || sessionStorage.getItem("token") : null;

      try {
        const response = await fetch(`${API_QUESTIONS}/${questionId}/validation-rules`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            expectedRevision: Number(effectiveRevision ?? revision ?? 1),
            rules: rulesToSave.map((rule, index) => {
              const definition =
                definitions.find((item) => item.type === rule.type) ||
                definitionFor(questionTypeCode || questionTypeId, rule.type);
              return {
                code: rule.type,
                isActive: rule.enabled !== false,
                orderIndex: index,
                errorMessage: rule.message || null,
                parameters: toParameters(rule, definition),
              };
            }),
          }),
        });

        const contentType = response.headers.get("content-type") || "";
        const body = contentType.includes("application/json")
          ? await response.json().catch(() => null)
          : await response.text().catch(() => "");

        if (!response.ok) {
          const message =
            typeof body === "string"
              ? body
              : body?.message || body?.title || body?.error;
          setSaveError(message || `Lưu điều kiện thất bại (${response.status})`);
          setSaveState("error");
          return;
        }

        const nextRevision =
          body?.validationRevision ?? body?.revision ?? body?.expectedRevision;
        if (nextRevision != null && Number.isFinite(Number(nextRevision))) {
          setEffectiveRevision(Number(nextRevision));
        }
        setSaveState("saved");
      } catch {
        setSaveError("Không kết nối được máy chủ");
        setSaveState("error");
      }
    },
    [questionId, effectiveRevision, revision, definitions, questionTypeCode, questionTypeId]
  );

  const scheduleAutoSave = (newRules: ValidationRule[]) => {
    onChange(newRules);
    if (!questionId) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void triggerSave(newRules);
    }, 600);
  };

  const addRule = (type: string) => {
    const definition =
      definitions.find((item) => item.type === type) ||
      definitionFor(questionTypeCode || questionTypeId, type);
    if (!definition || current.some((rule) => rule.type === type)) return;

    const nextRules = [
      ...current,
      {
        type,
        value: definition.valueKind === "boolean" ? true : "",
        message: "",
        enabled: true,
      },
    ];
    scheduleAutoSave(nextRules);
  };

  const updateRule = (index: number, patch: Partial<ValidationRule>) => {
    const nextRules = current.map((rule, i) => (i === index ? { ...rule, ...patch } : rule));
    scheduleAutoSave(nextRules);
  };

  const removeRule = (index: number) => {
    const nextRules = current.filter((_, i) => i !== index);
    scheduleAutoSave(nextRules);
  };

  // List of available definitions not yet added
  const availableDefinitions = definitions.filter(
    (def) => !current.some((r) => r.type === def.type)
  );

  return (
    <div className="mt-3 border-t border-gray-100 dark:border-gray-800/80 pt-3">
      {/* ACCORDION TRIGGER */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-gray-200/90 dark:border-gray-800 bg-gray-50/70 hover:bg-gray-100/80 dark:bg-gray-900/40 dark:hover:bg-gray-900/80 transition-all text-left group"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
            <FiShield size={13} />
          </div>
          <span className="text-xs font-bold text-gray-750 dark:text-gray-250">
            Thiết lập ràng buộc & kiểm tra dữ liệu
          </span>
          {activeRulesCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              {activeRulesCount} ràng buộc
            </span>
          ) : (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-normal">
              (Chưa bật)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
          <FiChevronDown
            size={15}
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* EXPANDED PANEL */}
      {expanded && (
        <div className="mt-2.5 space-y-3 rounded-2xl border border-gray-200/90 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-950/40 p-3.5 transition-all">
          {/* RULE CARDS LIST */}
          {current.length > 0 ? (
            <div className="space-y-2.5">
              {current.map((rule, index) => {
                const definition =
                  definitions.find((item) => item.type === rule.type) ||
                  definitionFor(questionTypeCode || questionTypeId, rule.type);
                const rawValue = displayValue(rule, definition, options);

                return (
                  <div
                    key={`${rule.type}-${index}`}
                    className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shadow-xs space-y-2.5 transition-all"
                  >
                    {/* RULE HEADER */}
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">
                          {definition?.label || rule.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rule.enabled !== false}
                            onChange={(e) => updateRule(index, { enabled: e.target.checked })}
                            className="size-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                          />
                          <span className="font-medium text-[11px]">Bật</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => removeRule(index)}
                          className="p-1 text-gray-400 hover:text-rose-500 rounded-lg transition"
                          title="Xóa điều kiện này"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* RULE INPUTS */}
                    <div className="grid gap-2 sm:grid-cols-2">
                      {/* VALUE INPUT (IF NOT BOOLEAN) */}
                      {definition?.valueKind === "boolean" ? (
                        <div className="flex items-center px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300">
                          <span>✓ Áp dụng quy tắc kiểm tra này</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                            Giá trị kiểm tra:
                          </label>
                          <input
                            type={definition?.valueKind === "number" ? "number" : "text"}
                            value={String(rawValue)}
                            placeholder={definition?.placeholder || "Nhập giá trị..."}
                            onChange={(e) =>
                              updateRule(index, {
                                value: buildValue(
                                  definition || { type: rule.type, label: rule.type, valueKind: "text" },
                                  e.target.value,
                                  options
                                ),
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}

                      {/* ERROR MESSAGE INPUT */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                          Thông báo khi vi phạm:
                        </label>
                        <input
                          type="text"
                          value={rule.message || ""}
                          placeholder="Ví dụ: Dữ liệu không đúng định dạng..."
                          onChange={(e) => updateRule(index, { message: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-3 px-2 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400 dark:text-gray-500 text-xs">
              Chưa có điều kiện ràng buộc nào. Chọn bên dưới để thêm mới.
            </div>
          )}

          {/* ADD RULE SELECT */}
          <div className="flex gap-2 pt-1">
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  addRule(e.target.value);
                  e.currentTarget.value = "";
                }
              }}
              className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200 outline-none focus:border-indigo-500"
            >
              <option value="">+ Chọn điều kiện ràng buộc để thêm...</option>
              {availableDefinitions.map((def) => (
                <option key={def.type} value={def.type}>
                  {def.label}
                </option>
              ))}
            </select>
          </div>

          {catalogError && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              {catalogError}
            </p>
          )}

          {/* STATUS & ACTIONS */}
          <div className="flex items-center justify-between border-t border-gray-200/80 dark:border-gray-800 pt-2.5">
            <div className="flex items-center gap-1.5 text-xs">
              {saveState === "saving" && (
                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium text-[11px]">
                  <FiRefreshCw className="animate-spin" size={12} /> Đang lưu ràng buộc...
                </span>
              )}
              {saveState === "saved" && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                  <FiCheckCircle size={13} /> Đã lưu ràng buộc
                </span>
              )}
              {saveState === "error" && (
                <span className="flex items-center gap-1.5 text-rose-500 font-medium text-[11px]">
                  <FiAlertCircle size={13} /> {saveError || "Lưu thất bại"}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => void triggerSave(current)}
              disabled={saveState === "saving" || !questionId}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-bold transition shadow-xs"
            >
              <FiSave size={12} />
              <span>Lưu điều kiện</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
