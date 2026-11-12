"use client";

import React, { useMemo } from "react";
import { ArrowDown, ArrowUp, Layers, Plus, Sigma, TableProperties, Trash2 } from "lucide-react";
import type {
  FieldRef,
  GroupBySpec,
  GroupByTransform,
  MeasureAgg,
  MeasureSpec,
  ReportDefinition,
  SurveyFieldMeta,
} from "@/lib/report-engine";

type Props = {
  definition: ReportDefinition;
  onChange: (next: ReportDefinition) => void;
  fieldMetas: SurveyFieldMeta[];
};

const TRANSFORM_OPTIONS: Array<{ value: GroupByTransform; label: string }> = [
  { value: "exact", label: "Giá trị nguyên bản" },
  { value: "firstLetter", label: "Lấy chữ cái đầu (12A1 -> A)" },
  { value: "firstWord", label: "Lấy từ đầu tiên" },
  { value: "beforeDash", label: "Phần trước dấu gạch (-)" },
  { value: "afterDash", label: "Phần sau dấu gạch (-)" },
  { value: "multiChoiceSplit", label: "Tách từng đáp án chọn" },
  { value: "multiChoiceJoin", label: "Gộp nguyên tổ hợp chọn" },
  { value: "numberBin", label: "Chia khoảng số tự động" },
  { value: "dateDay", label: "Theo Ngày" },
  { value: "dateMonth", label: "Theo Tháng" },
  { value: "dateQuarter", label: "Theo Quý" },
  { value: "dateYear", label: "Theo Năm" },
  { value: "dateWeekday", label: "Theo Thứ (T2..CN)" },
  { value: "province", label: "Cấp Tỉnh/TP" },
  { value: "ward", label: "Cấp Xã/Phường" },
];

const AGG_LABELS: Record<MeasureAgg, string> = {
  count: "Số lượng (N)",
  percentOfTotal: "% Tổng số",
  percentOfOption: "% Chọn đáp án",
  avg: "Trung bình (AVG)",
  sum: "Tổng cộng (SUM)",
  median: "Trung vị (MEDIAN)",
  min: "Nhỏ nhất (MIN)",
  max: "Lớn nhất (MAX)",
  stddev: "Độ lệch chuẩn (STDDEV)",
  p90: "Phân vị 90 (P90)",
};

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function BuilderConfigPanel({ definition, onChange, fieldMetas }: Props) {
  const fieldMap = useMemo(() => new Map(fieldMetas.map((m) => [m.ref, m])), [fieldMetas]);

  const numericAndSystemFields = useMemo(
    () =>
      fieldMetas.filter(
        (m) => m.kind === "number" || m.kind === "computed" || m.kind === "matrix" || m.ref.startsWith("system:")
      ),
    [fieldMetas]
  );

  const choiceFields = useMemo(
    () => fieldMetas.filter((m) => m.kind === "choice" && m.options && m.options.length > 0),
    [fieldMetas]
  );

  const addGroupBy = () => {
    if (definition.groupBy.length >= 3) return;
    const candidate =
      fieldMetas.find((f) => !definition.groupBy.some((g) => g.field === f.ref)) ?? fieldMetas[0];
    if (!candidate) return;
    const defaultTransform: GroupByTransform =
      candidate.kind === "date"
        ? "dateDay"
        : candidate.questionTypeCode === "MULTIPLE_CHOICE"
          ? "multiChoiceSplit"
          : candidate.kind === "number"
            ? "numberBin"
            : "exact";
    const nextGroup: GroupBySpec = {
      id: makeId("gb"),
      field: candidate.ref,
      label: candidate.shortLabel,
      transform: defaultTransform,
    };
    onChange({ ...definition, groupBy: [...definition.groupBy, nextGroup] });
  };

  const moveGroup = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= definition.groupBy.length) return;
    const copy = [...definition.groupBy];
    const [removed] = copy.splice(idx, 1);
    copy.splice(target, 0, removed);
    onChange({ ...definition, groupBy: copy });
  };

  const addMeasure = () => {
    const numField = numericAndSystemFields[0];
    const next: MeasureSpec = numField
      ? {
          id: makeId("m"),
          field: numField.ref,
          agg: "avg",
          label: `TB ${numField.shortLabel}`,
          highlightBest: true,
        }
      : {
          id: makeId("m"),
          field: "responses",
          agg: "count",
          label: "Số phản hồi (N)",
          highlightBest: true,
        };
    onChange({ ...definition, measures: [...definition.measures, next] });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* GROUP BY CARD */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-50 p-1.5 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              <Layers size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Gom nhóm theo (Group By · Tối đa 3 chiều)
              </h3>
              <p className="text-[11px] text-slate-500">
                Chọn câu hỏi & cách trích nhóm (không cần viết công thức).
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={definition.groupBy.length >= 3}
            data-testid="rb-add-groupby-btn"
            onClick={addGroupBy}
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-40 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
          >
            <Plus size={13} /> Thêm chiều
          </button>
        </div>

        <div className="space-y-2">
          {definition.groupBy.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500 dark:border-slate-800">
              Chưa chọn chiều gom nhóm — bảng sẽ tính 1 dòng Tổng toàn bộ tập lọc.
            </p>
          ) : (
            definition.groupBy.map((gb, idx) => (
              <div
                key={gb.id}
                className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/50"
              >
                <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
                  Cấp {idx + 1}
                </span>
                <select
                  aria-label={`Trường gom nhóm cấp ${idx + 1}`}
                  data-testid={`rb-groupby-field-${idx}`}
                  value={gb.field}
                  onChange={(e) => {
                    const f = e.target.value as FieldRef;
                    const meta = fieldMap.get(f);
                    const next = [...definition.groupBy];
                    next[idx] = {
                      ...gb,
                      field: f,
                      label: meta?.shortLabel ?? gb.label,
                    };
                    onChange({ ...definition, groupBy: next });
                  }}
                  className="h-8 min-w-[140px] flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-900"
                >
                  {fieldMetas.map((m) => (
                    <option key={m.ref} value={m.ref}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <select
                  aria-label={`Kiểu biến đổi nhóm cấp ${idx + 1}`}
                  data-testid={`rb-groupby-transform-${idx}`}
                  value={gb.transform}
                  onChange={(e) => {
                    const next = [...definition.groupBy];
                    next[idx] = { ...gb, transform: e.target.value as GroupByTransform };
                    onChange({ ...definition, groupBy: next });
                  }}
                  className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
                >
                  {TRANSFORM_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveGroup(idx, -1)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-800"
                    title="Lên cấp trên"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === definition.groupBy.length - 1}
                    onClick={() => moveGroup(idx, 1)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-800"
                    title="Xuống cấp dưới"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...definition,
                        groupBy: definition.groupBy.filter((_, i) => i !== idx),
                      })
                    }
                    className="rounded p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Xóa chiều gom nhóm"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* VIEW OPTIONS STRIP */}
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
          {definition.groupBy.length >= 2 && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300">
              <input
                type="checkbox"
                data-testid="rb-pivot-toggle"
                checked={definition.viewOptions.pivot}
                onChange={(e) =>
                  onChange({
                    ...definition,
                    viewOptions: { ...definition.viewOptions, pivot: e.target.checked },
                  })
                }
                className="rounded border-slate-300 text-indigo-600"
              />
              <TableProperties size={13} /> Bảng chéo 2 chiều (Pivot)
            </label>
          )}
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={definition.viewOptions.includeGrandTotal}
              onChange={(e) =>
                onChange({
                  ...definition,
                  viewOptions: { ...definition.viewOptions, includeGrandTotal: e.target.checked },
                })
              }
              className="rounded border-slate-300"
            />
            Hiện dòng Tổng chung
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={definition.viewOptions.showEmptyGroups}
              onChange={(e) =>
                onChange({
                  ...definition,
                  viewOptions: { ...definition.viewOptions, showEmptyGroups: e.target.checked },
                })
              }
              className="rounded border-slate-300"
            />
            Hiện nhóm trống
          </label>
        </div>
      </section>

      {/* MEASURES CARD */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-emerald-50 p-1.5 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Sigma size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Chỉ số cần tính (Measures)
              </h3>
              <p className="text-[11px] text-slate-500">
                Chọn đồng thời nhiều phép tính (N, AVG, MEDIAN, MIN, MAX, STDDEV, P90, %…).
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="rb-add-measure-btn"
            onClick={addMeasure}
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <Plus size={13} /> Thêm chỉ số
          </button>
        </div>

        <div className="space-y-2">
          {definition.measures.map((m, idx) => {
            const selectedMeta = m.field === "responses" ? null : fieldMap.get(m.field);
            const showOptionPicker = m.agg === "percentOfOption";

            return (
              <div
                key={m.id}
                className="space-y-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/50"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* AGGREGATION SELECT */}
                  <select
                    aria-label={`Phép tính chỉ số ${idx + 1}`}
                    data-testid={`rb-measure-agg-${idx}`}
                    value={m.agg}
                    onChange={(e) => {
                      const nextAgg = e.target.value as MeasureAgg;
                      let nextField = m.field;
                      let nextTargetOption = m.targetOptionText;

                      if (nextAgg === "count" || nextAgg === "percentOfTotal") {
                        nextField = "responses";
                      } else if (nextAgg === "percentOfOption") {
                        if (nextField === "responses" || !fieldMap.get(nextField)?.options?.length) {
                          const firstChoice = choiceFields[0];
                          if (firstChoice) {
                            nextField = firstChoice.ref;
                            nextTargetOption = firstChoice.options?.[0]?.text ?? "";
                          }
                        }
                      } else if (nextField === "responses") {
                        nextField = numericAndSystemFields[0]?.ref ?? fieldMetas[0]?.ref ?? "system:totalScore";
                      }

                      const fLabel =
                        nextField === "responses"
                          ? "phiếu"
                          : fieldMap.get(nextField)?.shortLabel ?? "";
                      const autoLabel =
                        nextAgg === "count"
                          ? "Số phiếu (N)"
                          : nextAgg === "percentOfTotal"
                            ? "Tỷ lệ (%)"
                            : nextAgg === "percentOfOption"
                              ? `% ${nextTargetOption || fLabel}`
                              : `${nextAgg.toUpperCase()} ${fLabel}`;

                      const next = [...definition.measures];
                      next[idx] = {
                        ...m,
                        agg: nextAgg,
                        field: nextField,
                        targetOptionText: nextTargetOption,
                        label: autoLabel,
                      };
                      onChange({ ...definition, measures: next });
                    }}
                    className="h-8 w-40 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-900"
                  >
                    {(Object.keys(AGG_LABELS) as MeasureAgg[]).map((aggKey) => (
                      <option key={aggKey} value={aggKey}>
                        {AGG_LABELS[aggKey]}
                      </option>
                    ))}
                  </select>

                  {/* FIELD SELECT (when not count/percentOfTotal) */}
                  {m.agg !== "count" && m.agg !== "percentOfTotal" && (
                    <select
                      aria-label={`Nguồn chỉ số ${idx + 1}`}
                      data-testid={`rb-measure-field-${idx}`}
                      value={m.field}
                      onChange={(e) => {
                        const nextField = e.target.value as FieldRef;
                        const meta = fieldMap.get(nextField);
                        const firstOpt = meta?.options?.[0]?.text;
                        const next = [...definition.measures];
                        next[idx] = {
                          ...m,
                          field: nextField,
                          targetOptionText: m.agg === "percentOfOption" ? firstOpt : undefined,
                          label:
                            m.agg === "percentOfOption"
                              ? `% ${firstOpt || meta?.shortLabel || ""}`
                              : `${m.agg.toUpperCase()} ${meta?.shortLabel ?? ""}`,
                        };
                        onChange({ ...definition, measures: next });
                      }}
                      className="h-8 min-w-[140px] flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium outline-none dark:border-slate-700 dark:bg-slate-900"
                    >
                      {(m.agg === "percentOfOption" ? choiceFields : fieldMetas).map((fm) => (
                        <option key={fm.ref} value={fm.ref}>
                          {fm.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* TARGET OPTION PICKER */}
                  {showOptionPicker && selectedMeta?.options && (
                    <select
                      aria-label="Đáp án cần tính tỷ lệ"
                      value={m.targetOptionText ?? ""}
                      onChange={(e) => {
                        const optTxt = e.target.value;
                        const next = [...definition.measures];
                        next[idx] = {
                          ...m,
                          targetOptionText: optTxt,
                          label: `% ${optTxt}`,
                        };
                        onChange({ ...definition, measures: next });
                      }}
                      className="h-8 w-36 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
                    >
                      {selectedMeta.options.map((o) => (
                        <option key={o.id} value={o.text}>
                          {o.text}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* REMOVE */}
                  {definition.measures.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...definition,
                          measures: definition.measures.filter((_, i) => i !== idx),
                        })
                      }
                      className="ml-auto rounded p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      title="Xóa chỉ số"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <input
                    type="text"
                    value={m.label ?? ""}
                    onChange={(e) => {
                      const next = [...definition.measures];
                      next[idx] = { ...m, label: e.target.value };
                      onChange({ ...definition, measures: next });
                    }}
                    placeholder="Tên hiển thị cột..."
                    className="h-7 w-44 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium outline-none dark:border-slate-700 dark:bg-slate-900"
                  />

                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-1 text-emerald-700 dark:text-emerald-300">
                      <input
                        type="checkbox"
                        checked={Boolean(m.highlightBest)}
                        onChange={(e) => {
                          const next = [...definition.measures];
                          next[idx] = { ...m, highlightBest: e.target.checked };
                          onChange({ ...definition, measures: next });
                        }}
                        className="rounded border-slate-300"
                      />
                      Highlight cao nhất
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1 text-amber-700 dark:text-amber-300">
                      <input
                        type="checkbox"
                        checked={Boolean(m.highlightWorst)}
                        onChange={(e) => {
                          const next = [...definition.measures];
                          next[idx] = { ...m, highlightWorst: e.target.checked };
                          onChange({ ...definition, measures: next });
                        }}
                        className="rounded border-slate-300"
                      />
                      Highlight thấp nhất
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

