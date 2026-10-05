"use client";

import { useEffect, useState } from "react";
import { FiChevronDown, FiChevronUp, FiPlus, FiTrash2 } from "react-icons/fi";
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

const RULES: Record<number, RuleDefinition[]> = {
  1: [
    { type: "ALLOWED_OPTIONS", label: "Chỉ cho phép lựa chọn", valueKind: "list", placeholder: "ID option, ví dụ: 101,102" },
    { type: "DISALLOWED_OPTIONS", label: "Cấm lựa chọn", valueKind: "list", placeholder: "ID option, ví dụ: 104" },
    { type: "FIXED_OPTION", label: "Khóa một lựa chọn", valueKind: "number", placeholder: "ID option" },
  ],
  2: [
    { type: "MIN_SELECTIONS", label: "Số lựa chọn tối thiểu", valueKind: "number" },
    { type: "MAX_SELECTIONS", label: "Số lựa chọn tối đa", valueKind: "number" },
    { type: "ALLOWED_OPTIONS", label: "Chỉ cho phép lựa chọn", valueKind: "list", placeholder: "ID option, ví dụ: 201,202" },
    { type: "DISALLOWED_OPTIONS", label: "Cấm lựa chọn", valueKind: "list", placeholder: "ID option, ví dụ: 205" },
    { type: "REQUIRED_OPTIONS", label: "Lựa chọn bắt buộc", valueKind: "list", placeholder: "ID option, ví dụ: 201" },
    { type: "MUTUALLY_EXCLUSIVE", label: "Lựa chọn loại trừ", valueKind: "list", placeholder: "ID option, ví dụ: 205" },
  ],
  3: [
    { type: "MIN_LENGTH", label: "Độ dài tối thiểu", valueKind: "number" },
    { type: "MAX_LENGTH", label: "Độ dài tối đa", valueKind: "number" },
    { type: "REGEX", label: "Regex", valueKind: "text", placeholder: "Ví dụ: ^SV[0-9]{6}$" },
    { type: "EMAIL", label: "Email", valueKind: "boolean" },
    { type: "PHONE", label: "Số điện thoại / Regex", valueKind: "text" },
    { type: "URL", label: "URL", valueKind: "boolean" },
    { type: "NUMERIC_TEXT", label: "Chỉ chữ số", valueKind: "boolean" },
    { type: "ALPHABET_ONLY", label: "Chỉ chữ cái", valueKind: "boolean" },
    { type: "ALPHANUMERIC", label: "Chữ và số", valueKind: "boolean" },
    { type: "STARTS_WITH", label: "Bắt đầu bằng", valueKind: "text" },
    { type: "ENDS_WITH", label: "Kết thúc bằng", valueKind: "text" },
    { type: "NOT_CONTAIN", label: "Không chứa từ", valueKind: "list", placeholder: "Các từ, cách nhau bằng dấu phẩy" },
  ],
  4: [
    { type: "MIN", label: "Giá trị tối thiểu", valueKind: "number" },
    { type: "MAX", label: "Giá trị tối đa", valueKind: "number" },
    { type: "GREATER_THAN", label: "Lớn hơn", valueKind: "number" },
    { type: "LESS_THAN", label: "Nhỏ hơn", valueKind: "number" },
    { type: "INTEGER_ONLY", label: "Chỉ số nguyên", valueKind: "boolean" },
    { type: "DECIMAL_PLACES", label: "Số chữ số thập phân", valueKind: "number" },
    { type: "MULTIPLE_OF", label: "Bội số của", valueKind: "number" },
    { type: "POSITIVE", label: "Số dương", valueKind: "boolean" },
    { type: "NEGATIVE", label: "Số âm", valueKind: "boolean" },
    { type: "NOT_EQUAL", label: "Không bằng", valueKind: "number" },
  ],
  5: [
    { type: "MIN_DATE", label: "Ngày tối thiểu", valueKind: "text", placeholder: "YYYY-MM-DD" },
    { type: "MAX_DATE", label: "Ngày tối đa", valueKind: "text", placeholder: "YYYY-MM-DD" },
    { type: "BEFORE_TODAY", label: "Trước hôm nay", valueKind: "boolean" },
    { type: "AFTER_TODAY", label: "Sau hôm nay", valueKind: "boolean" },
    { type: "NOT_FUTURE", label: "Không phải ngày tương lai", valueKind: "boolean" },
    { type: "NOT_PAST", label: "Không phải ngày quá khứ", valueKind: "boolean" },
    { type: "MIN_AGE", label: "Tuổi tối thiểu", valueKind: "number" },
    { type: "MAX_AGE", label: "Tuổi tối đa", valueKind: "number" },
    { type: "ALLOWED_WEEKDAYS", label: "Thứ trong tuần cho phép", valueKind: "list", placeholder: "1-7, ví dụ: 1,2,3,4,5" },
    { type: "DISALLOWED_DATES", label: "Ngày bị cấm", valueKind: "list", placeholder: "YYYY-MM-DD, cách nhau bằng dấu phẩy" },
  ],
  6: [
    { type: "REQUIRE_PROVINCE", label: "Bắt buộc tỉnh/thành", valueKind: "boolean" },
    { type: "REQUIRE_WARD", label: "Bắt buộc xã/phường", valueKind: "boolean" },
    { type: "REQUIRE_DETAIL", label: "Bắt buộc địa chỉ chi tiết", valueKind: "boolean" },
    { type: "FIXED_PROVINCE", label: "Khóa tỉnh/thành (mã)", valueKind: "text" },
    { type: "FIXED_WARD", label: "Khóa xã/phường (mã)", valueKind: "text" },
    { type: "ALLOWED_PROVINCES", label: "Tỉnh/thành cho phép", valueKind: "list", placeholder: "Mã tỉnh, ví dụ: 79,01" },
    { type: "DISALLOWED_PROVINCES", label: "Tỉnh/thành bị cấm", valueKind: "list" },
    { type: "ALLOWED_WARDS", label: "Xã/phường cho phép", valueKind: "list", placeholder: "Mã xã/phường" },
    { type: "DISALLOWED_WARDS", label: "Xã/phường bị cấm", valueKind: "list" },
    { type: "DETAIL_MIN_LENGTH", label: "Độ dài địa chỉ tối thiểu", valueKind: "number" },
    { type: "DETAIL_MAX_LENGTH", label: "Độ dài địa chỉ tối đa", valueKind: "number" },
    { type: "DETAIL_REGEX", label: "Regex địa chỉ chi tiết", valueKind: "text" },
  ],
};

function definitionFor(typeId: number, type: string) {
  return RULES[typeId]?.find((rule) => rule.type === type);
}

function displayValue(rule: ValidationRule, definition?: RuleDefinition) {
  if (!definition) return typeof rule.value === "string" ? rule.value : JSON.stringify(rule.value ?? "");
  if (definition.valueKind === "boolean") return Boolean(rule.value);
  if (definition.valueKind === "number") {
    if (typeof rule.value === "object" && rule.value !== null) {
      const value = rule.value as any;
      return String(value.optionId ?? value.value ?? "");
    }
    return rule.value == null ? "" : String(rule.value);
  }
  if (definition.valueKind === "list") {
    const value = rule.value as any;
    const list = Array.isArray(value) ? value : value?.optionIds ?? value?.values ?? value?.dates ?? value?.weekdays ?? value?.provinceCodes ?? value?.wardCodes;
    return Array.isArray(list) ? list.join(",") : String(value ?? "");
  }
  if (typeof rule.value === "object") {
    const value = rule.value as any;
    return String(value.country ?? value.code ?? value.name ?? JSON.stringify(value));
  }
  return String(rule.value ?? "");
}

function buildValue(definition: RuleDefinition, raw: string | boolean) {
  if (definition.valueKind === "boolean") return Boolean(raw);
  if (definition.valueKind === "number") {
    const value = raw === "" ? "" : Number(raw);
    if (definition.type === "FIXED_OPTION") return { optionId: value };
    return value;
  }
  if (definition.valueKind === "list") {
    const values = String(raw).split(",").map((item) => item.trim()).filter(Boolean);
    if (["ALLOWED_OPTIONS", "DISALLOWED_OPTIONS", "REQUIRED_OPTIONS", "MUTUALLY_EXCLUSIVE"].includes(definition.type)) return { optionIds: values.map(Number).filter(Number.isFinite) };
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

function catalogDefinition(rule: any): RuleDefinition {
  const parameter = Array.isArray(rule?.parameters) ? rule.parameters[0] : null;
  const code = String(rule?.code || "");
  const parameterType = String(parameter?.type || "TEXT").toUpperCase();
  let valueKind: RuleDefinition["valueKind"] = "text";
  if (!parameter) valueKind = "boolean";
  else if (parameterType.includes("NUMBER")) valueKind = "number";
  else if (parameterType.includes("LIST") || parameter?.multiple === true) valueKind = "list";
  if (/OPTIONS|VALUES|WEEKDAYS|DATES|PROVINCES|WARDS|MUST_CONTAIN|NOT_CONTAIN/.test(code)) valueKind = "list";
  return { type: code, label: String(rule.name || code), valueKind, placeholder: parameter?.description || parameter?.name || "Giá trị", parameters: Array.isArray(rule.parameters) ? rule.parameters : [] };
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
  if (definition.type === "FIXED_OPTION") return [{ name: "value", groupIndex: 0, position: 0, optionId: Number(value?.optionId ?? value) }];
  if (definition.valueKind === "number") return [{ name: metadata[0]?.name || "value", groupIndex: 0, position: 0, numberValue: value === "" ? null : Number(value) }];
  if (definition.valueKind === "list") {
    const list = Array.isArray(value) ? value : value?.optionIds ?? value?.values ?? value?.dates ?? value?.weekdays ?? value?.provinceCodes ?? value?.wardCodes ?? [];
    const isOptionList = ["ALLOWED_OPTIONS", "DISALLOWED_OPTIONS", "REQUIRED_OPTIONS", "AT_MOST_ONE_OF", "EXCLUSIVE_OPTIONS", "MUTUALLY_EXCLUSIVE"].includes(definition.type);
    const isNumberList = ["ALLOWED_VALUES", "DISALLOWED_VALUES", "ALLOWED_WEEKDAYS"].includes(definition.type);
    const isDateList = ["ALLOWED_DATES", "DISALLOWED_DATES"].includes(definition.type);
    return list.map((item: any, index: number) => isOptionList
      ? { name: metadata[0]?.name || "value", groupIndex: 0, position: index, optionId: Number(item) }
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
  const optionIds = parameters.filter((item: any) => item.optionId != null).map((item: any) => Number(item.optionId));
  if (optionIds.length === parameters.length) return { type: String(rule.code), value: { optionIds }, message: defaultMessage, enabled: rule.isActive !== false };
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

export default function ValidationRulesEditor({ questionId, questionTypeId, questionTypeCode, revision, rules, onChange }: { questionId?: number; questionTypeId: number; questionTypeCode?: string; revision?: number; rules?: ValidationRule[]; onChange: (rules: ValidationRule[]) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [catalog, setCatalog] = useState<RuleDefinition[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [effectiveRevision, setEffectiveRevision] = useState<number | undefined>(revision);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const current = Array.isArray(rules)
    ? rules.map((rule: any) => rule?.type ? rule : fromApiRule(rule))
    : [];
  // Backend catalog là nguồn danh sách rule chính; RULES chỉ dùng để đọc
  // cấu hình cũ mà catalog chưa trả về, không dùng để tạo rule mới.
  const definitions = catalog;

  useEffect(() => {
    setEffectiveRevision(revision);
  }, [revision]);

  useEffect(() => {
    const code = String(questionTypeCode || "").toUpperCase();
    if (!code) return;
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    fetch(`${API_VALIDATION_RULE_CATALOG}?questionType=${encodeURIComponent(code)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("catalog");
        return response.json();
      })
      .then((body) => {
        const next = (Array.isArray(body) ? body : body?.rules || [])
          .filter((rule: any) => rule?.code)
          .map(catalogDefinition);
        setCatalog(next);
        setCatalogError("");
      })
      .catch(() => setCatalogError("Không tải được danh sách điều kiện từ Backend"));
  }, [questionTypeCode]);

  useEffect(() => {
    if (!questionId) return;
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    fetch(`${API_QUESTIONS}/${questionId}/validation-rules`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("rules");
        return response.json();
      })
      .then((body) => {
        const apiRules = Array.isArray(body) ? body : body?.rules;
        if (Array.isArray(apiRules)) onChange(apiRules.map(fromApiRule));
        const nextRevision =
          body?.validationRevision ??
          body?.revision ??
          body?.expectedRevision;
        if (nextRevision != null && Number.isFinite(Number(nextRevision))) {
          setEffectiveRevision(Number(nextRevision));
        }
      })
      .catch(() => undefined);
  }, [questionId]);

  const addRule = (type: string) => {
    const definition = definitions.find((item) => item.type === type) || definitionFor(questionTypeId, type);
    if (!definition || current.some((rule) => rule.type === type)) return;
    onChange([...current, { type, value: definition.valueKind === "boolean" ? true : "", message: "Giá trị không hợp lệ", enabled: true }]);
  };

  const updateRule = (index: number, patch: Partial<ValidationRule>) => onChange(current.map((rule, i) => i === index ? { ...rule, ...patch } : rule));

  const saveRules = async () => {
    if (!questionId) return;
    setSaveState("saving");
    setSaveError("");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    try {
      const response = await fetch(`${API_QUESTIONS}/${questionId}/validation-rules`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          expectedRevision: Number(effectiveRevision ?? revision ?? 1),
          rules: current.map((rule, index) => {
            const definition = definitions.find((item) => item.type === rule.type) || definitionFor(questionTypeId, rule.type);
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
        body?.validationRevision ??
        body?.revision ??
        body?.expectedRevision;
      if (nextRevision != null && Number.isFinite(Number(nextRevision))) {
        setEffectiveRevision(Number(nextRevision));
      }
      setSaveState("saved");
    } catch {
      setSaveError("Không kết nối được Backend");
      setSaveState("error");
    }
  };

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
      <button type="button" onClick={() => setExpanded((value) => !value)} className="flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
        {expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        {expanded ? "Thu gọn điều kiện" : `Hiển thị thêm điều kiện${current.length ? ` (${current.length})` : ""}`}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/40">
          {current.map((rule, index) => {
            const definition = definitions.find((item) => item.type === rule.type) || definitionFor(questionTypeId, rule.type);
            const rawValue = displayValue(rule, definition);
            return (
              <div key={`${rule.type}-${index}`} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-xs font-bold text-gray-600 dark:text-gray-300">{definition?.label || rule.type}</span>
                  <label className="flex items-center gap-1 text-xs text-gray-500"><input type="checkbox" checked={rule.enabled !== false} onChange={(event) => updateRule(index, { enabled: event.target.checked })} /> Bật</label>
                  <button type="button" onClick={() => onChange(current.filter((_, i) => i !== index))} className="text-gray-400 hover:text-red-500" title="Xóa điều kiện"><FiTrash2 size={15} /></button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {definition?.valueKind === "boolean" ? (
                    <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={Boolean(rule.value)} onChange={(event) => updateRule(index, { value: event.target.checked })} /> Áp dụng điều kiện</label>
                  ) : (
                    <input value={String(rawValue)} placeholder={definition?.placeholder || "Giá trị"} onChange={(event) => updateRule(index, { value: buildValue(definition || { type: rule.type, label: rule.type, valueKind: "text" }, event.target.value) })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800" />
                  )}
                  <input value={rule.message || ""} placeholder="Thông báo lỗi" onChange={(event) => updateRule(index, { message: event.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800" />
                </div>
              </div>
            );
          })}
          <div className="flex gap-2">
            <select defaultValue="" onChange={(event) => { addRule(event.target.value); event.currentTarget.value = ""; }} className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
              <option value="">Chọn điều kiện để thêm...</option>
              {definitions.filter((definition) => !current.some((rule) => rule.type === definition.type)).map((definition) => <option key={definition.type} value={definition.type}>{definition.label}</option>)}
            </select>
            <button type="button" onClick={() => setExpanded(true)} className="rounded-lg border border-brand-200 px-3 text-brand-600" title="Thêm điều kiện"><FiPlus size={16} /></button>
          </div>
          {catalogError && <p className="text-xs text-amber-600">{catalogError}; đang dùng danh sách dự phòng.</p>}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
            {saveState === "saved" && <span className="text-xs font-semibold text-green-600">Đã lưu điều kiện</span>}
            {saveState === "error" && <span className="text-xs font-semibold text-red-600">{saveError || "Lưu điều kiện thất bại"}</span>}
            <button type="button" onClick={saveRules} disabled={saveState === "saving" || !questionId} className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">
              {saveState === "saving" ? "Đang lưu..." : "Lưu điều kiện"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
