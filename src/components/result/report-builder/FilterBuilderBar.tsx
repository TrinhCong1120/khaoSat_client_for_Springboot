"use client";

import React, { useMemo } from "react";
import { Filter, FolderPlus, Plus, Trash2, X } from "lucide-react";
import {
  countActiveFilterRules,
  getOperatorsForFieldKind,
  OPERATOR_LABELS,
  type FieldRef,
  type FilterGroup,
  type FilterOperator,
  type FilterRule,
  type SurveyFieldMeta,
} from "@/lib/report-engine";

type Props = {
  filterTree: FilterGroup;
  onChange: (next: FilterGroup) => void;
  fieldMetas: SurveyFieldMeta[];
  totalCount: number;
  filteredCount: number;
};

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function FilterBuilderBar({
  filterTree,
  onChange,
  fieldMetas,
  totalCount,
  filteredCount,
}: Props) {
  const fieldMap = useMemo(() => new Map(fieldMetas.map((m) => [m.ref, m])), [fieldMetas]);
  const activeRules = countActiveFilterRules(filterTree);

  const defaultFieldRef: FieldRef = fieldMetas[0]?.ref ?? "system:submittedAt";

  const createDefaultRule = (): FilterRule => {
    const meta = fieldMap.get(defaultFieldRef);
    const defaultOp = meta ? getOperatorsForFieldKind(meta.kind)[0] : "contains";
    return {
      kind: "rule",
      id: makeId("r"),
      field: defaultFieldRef,
      operator: defaultOp,
      value: "",
    };
  };

  return (
    <section
      aria-label="Bộ lọc dữ liệu động"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <Filter size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Bộ lọc điều kiện động (VÀ / HOẶC)
              </h3>
              <span
                data-testid="rb-match-counter"
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                  activeRules > 0
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {filteredCount} / {totalCount} phản hồi
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Áp dụng đồng thời cho Tổng quan câu hỏi, Bảng tổng hợp, Danh sách phản hồi và File xuất.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filterTree.children.length > 0 && (
            <button
              type="button"
              data-testid="rb-clear-filters-btn"
              onClick={() => onChange({ ...filterTree, children: [] })}
              className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X size={13} />
              Xóa bộ lọc
            </button>
          )}
          <button
            type="button"
            data-testid="rb-add-root-rule-btn"
            onClick={() =>
              onChange({
                ...filterTree,
                children: [...filterTree.children, createDefaultRule()],
              })
            }
            className="inline-flex h-8 items-center gap-1 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={14} />
            Thêm điều kiện
          </button>
        </div>
      </div>

      {filterTree.children.length > 0 && (
        <div className="mt-3">
          <FilterGroupNode
            group={filterTree}
            depth={0}
            fieldMetas={fieldMetas}
            fieldMap={fieldMap}
            createDefaultRule={createDefaultRule}
            onChange={onChange}
          />
        </div>
      )}
    </section>
  );
}

function FilterGroupNode({
  group,
  depth,
  fieldMetas,
  fieldMap,
  createDefaultRule,
  onChange,
  onRemoveSelf,
}: {
  group: FilterGroup;
  depth: number;
  fieldMetas: SurveyFieldMeta[];
  fieldMap: Map<string, SurveyFieldMeta>;
  createDefaultRule: () => FilterRule;
  onChange: (next: FilterGroup) => void;
  onRemoveSelf?: () => void;
}) {
  const groupedMetas = useMemo(() => {
    const questionFields = fieldMetas.filter((m) => m.ref.startsWith("question:") && !m.matrixRowKey);
    const matrixFields = fieldMetas.filter((m) => Boolean(m.matrixRowKey));
    const systemFields = fieldMetas.filter((m) => m.ref.startsWith("system:"));
    const computedFields = fieldMetas.filter((m) => m.ref.startsWith("computed:"));
    return { questionFields, matrixFields, systemFields, computedFields };
  }, [fieldMetas]);

  return (
    <div
      className={`rounded-xl border p-3 ${
        depth === 0
          ? "border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/50"
          : "border-blue-200 bg-blue-50/30 dark:border-blue-900/50 dark:bg-blue-950/20"
      }`}
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {depth === 0 ? "Thỏa mãn:" : "Nhóm con:"}
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
            {(["AND", "OR"] as const).map((logic) => (
              <button
                key={logic}
                type="button"
                onClick={() => onChange({ ...group, logic })}
                className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold transition ${
                  group.logic === logic
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {logic === "AND" ? "Tất cả (VÀ)" : "Bất kỳ (HOẶC)"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              onChange({ ...group, children: [...group.children, createDefaultRule()] })
            }
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Plus size={12} /> Điều kiện
          </button>
          {depth < 2 && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...group,
                  children: [
                    ...group.children,
                    {
                      kind: "group",
                      id: makeId("fg"),
                      logic: group.logic === "AND" ? "OR" : "AND",
                      children: [createDefaultRule()],
                    },
                  ],
                })
              }
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-blue-200 bg-white px-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-300"
            >
              <FolderPlus size={12} /> Nhóm lồng
            </button>
          )}
          {onRemoveSelf && (
            <button
              type="button"
              onClick={onRemoveSelf}
              className="inline-flex h-7 items-center rounded-lg p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              title="Xóa nhóm điều kiện"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {group.children.map((child, idx) =>
          child.kind === "group" ? (
            <FilterGroupNode
              key={child.id}
              group={child}
              depth={depth + 1}
              fieldMetas={fieldMetas}
              fieldMap={fieldMap}
              createDefaultRule={createDefaultRule}
              onChange={(updatedChild) => {
                const next = [...group.children];
                next[idx] = updatedChild;
                onChange({ ...group, children: next });
              }}
              onRemoveSelf={() => {
                onChange({
                  ...group,
                  children: group.children.filter((_, i) => i !== idx),
                });
              }}
            />
          ) : (
            <FilterRuleRow
              key={child.id}
              rule={child}
              groupedMetas={groupedMetas}
              fieldMap={fieldMap}
              onChange={(updatedRule) => {
                const next = [...group.children];
                next[idx] = updatedRule;
                onChange({ ...group, children: next });
              }}
              onRemove={() => {
                onChange({
                  ...group,
                  children: group.children.filter((_, i) => i !== idx),
                });
              }}
            />
          )
        )}
      </div>
    </div>
  );
}

function FilterRuleRow({
  rule,
  groupedMetas,
  fieldMap,
  onChange,
  onRemove,
}: {
  rule: FilterRule;
  groupedMetas: {
    questionFields: SurveyFieldMeta[];
    matrixFields: SurveyFieldMeta[];
    systemFields: SurveyFieldMeta[];
    computedFields: SurveyFieldMeta[];
  };
  fieldMap: Map<string, SurveyFieldMeta>;
  onChange: (next: FilterRule) => void;
  onRemove: () => void;
}) {
  const meta = fieldMap.get(rule.field);
  const operators = meta ? getOperatorsForFieldKind(meta.kind) : getOperatorsForFieldKind("text");
  const isDate = meta?.kind === "date" || rule.field === "system:submittedAt";
  const isNumber = meta?.kind === "number";
  const isChoiceWithOptions = Boolean(meta?.options && meta.options.length > 0);
  const noValueNeeded = rule.operator === "isEmpty" || rule.operator === "isNotEmpty";

  const handleFieldChange = (newField: FieldRef) => {
    const newMeta = fieldMap.get(newField);
    const allowedOps = getOperatorsForFieldKind(newMeta?.kind ?? "text");
    const nextOp = allowedOps.includes(rule.operator) ? rule.operator : allowedOps[0];
    onChange({
      ...rule,
      field: newField,
      operator: nextOp,
      value: nextOp === "in" || nextOp === "notIn" ? [] : "",
      valueTo: "",
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
      {/* FIELD SELECT */}
      <select
        aria-label="Trường lọc"
        data-testid={`rb-filter-field-${rule.id}`}
        value={rule.field}
        onChange={(e) => handleFieldChange(e.target.value as FieldRef)}
        className="h-8 min-w-[180px] max-w-[260px] flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        <optgroup label="Câu hỏi khảo sát">
          {groupedMetas.questionFields.map((m) => (
            <option key={m.ref} value={m.ref}>
              {m.shortLabel}
            </option>
          ))}
        </optgroup>
        {groupedMetas.matrixFields.length > 0 && (
          <optgroup label="Hàng trong Ma trận">
            {groupedMetas.matrixFields.map((m) => (
              <option key={m.ref} value={m.ref}>
                {m.label}
              </option>
            ))}
          </optgroup>
        )}
        {groupedMetas.computedFields.length > 0 && (
          <optgroup label="Cột tự tạo / Công thức">
            {groupedMetas.computedFields.map((m) => (
              <option key={m.ref} value={m.ref}>
                {m.shortLabel}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label="Thông tin hệ thống">
          {groupedMetas.systemFields.map((m) => (
            <option key={m.ref} value={m.ref}>
              {m.shortLabel}
            </option>
          ))}
        </optgroup>
      </select>

      {/* OPERATOR SELECT */}
      <select
        aria-label="Toán tử lọc"
        data-testid={`rb-filter-op-${rule.id}`}
        value={rule.operator}
        onChange={(e) => {
          const nextOp = e.target.value as FilterOperator;
          onChange({
            ...rule,
            operator: nextOp,
            value:
              nextOp === "in" || nextOp === "notIn"
                ? Array.isArray(rule.value)
                  ? rule.value
                  : []
                : Array.isArray(rule.value)
                  ? rule.value.join(", ")
                  : rule.value ?? "",
          });
        }}
        className="h-8 w-44 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>

      {/* VALUE INPUT(S) */}
      {!noValueNeeded && (
        <div className="flex min-w-[180px] flex-1 flex-wrap items-center gap-1.5">
          {rule.operator === "between" ? (
            <>
              <input
                type={isDate ? "date" : isNumber ? "number" : "text"}
                step={isNumber ? "any" : undefined}
                value={String(rule.value ?? "")}
                onChange={(e) => onChange({ ...rule, value: e.target.value })}
                placeholder="Từ"
                className="h-8 w-32 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
              <span className="text-xs text-slate-400">đến</span>
              <input
                type={isDate ? "date" : isNumber ? "number" : "text"}
                step={isNumber ? "any" : undefined}
                value={String(rule.valueTo ?? "")}
                onChange={(e) => onChange({ ...rule, valueTo: e.target.value })}
                placeholder="Đến"
                className="h-8 w-32 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </>
          ) : (rule.operator === "in" || rule.operator === "notIn") && isChoiceWithOptions ? (
            <div className="flex flex-wrap items-center gap-1">
              {meta!.options!.map((opt) => {
                const selected = Array.isArray(rule.value)
                  ? rule.value.map(String)
                  : String(rule.value ?? "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                const checked = selected.includes(opt.text);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      const next = checked
                        ? selected.filter((x) => x !== opt.text)
                        : [...selected, opt.text];
                      onChange({ ...rule, value: next });
                    }}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                      checked
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>
          ) : (rule.operator === "equals" || rule.operator === "notEquals") && isChoiceWithOptions ? (
            <select
              aria-label="Giá trị đáp án"
              value={String(rule.value ?? "")}
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
              className="h-8 w-full min-w-[160px] rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">-- Chọn đáp án --</option>
              {meta!.options!.map((opt) => (
                <option key={opt.id} value={opt.text}>
                  {opt.text}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={isDate ? "date" : isNumber ? "number" : "text"}
              step={isNumber ? "any" : undefined}
              data-testid="rb-filter-value-input"
              value={Array.isArray(rule.value) ? rule.value.join(", ") : String(rule.value ?? "")}
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
              placeholder={
                rule.operator === "in" || rule.operator === "notIn"
                  ? "Các giá trị cách nhau bởi dấu phẩy (,)"
                  : rule.operator === "regex"
                    ? "Ví dụ: ^12[A-Z]"
                    : "Nhập giá trị lọc..."
              }
              className="h-8 w-full min-w-[160px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
            />
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
        title="Xóa điều kiện này"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

