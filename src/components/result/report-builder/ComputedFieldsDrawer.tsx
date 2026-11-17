"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  FunctionSquare,
  Globe,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  FORMULA_FUNCTION_CATALOG,
  getQuestionFormulaRefName,
  previewComputedField,
  toDisplayFormula,
  toStorageFormula,
  type BinMethod,
  type ComputedField,
  type ComputedFieldScope,
  type ComputedFieldStatus,
  type DatePartKind,
  type ExtractKind,
  type FieldRef,
  type SurveyFieldMeta,
} from "@/lib/report-engine";
import type { DatasetRecord, SurveyResultQuestion } from "@/types/report";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  computedFields: ComputedField[];
  statuses: ComputedFieldStatus[];
  onChange: (next: ComputedField[]) => void;
  records: DatasetRecord[];
  questions: SurveyResultQuestion[];
  fieldMetas: SurveyFieldMeta[];
  canManagePermanent?: boolean;
};

const EXTRACT_OPTIONS: Array<{ value: ExtractKind; label: string; desc: string }> = [
  { value: "firstLetter", label: "Chữ cái đầu tiên", desc: 'VD: "12A1" -> "A", "Kinh doanh" -> "K"' },
  { value: "firstWord", label: "Từ đầu tiên", desc: 'VD: "Nguyễn Văn An" -> "Nguyễn"' },
  { value: "beforeDash", label: "Phần trước dấu gạch (-)", desc: 'VD: "KD-01" -> "KD"' },
  { value: "afterDash", label: "Phần sau dấu gạch (-)", desc: 'VD: "12A - Chuyên" -> "Chuyên"' },
  { value: "province", label: "Tỉnh / Thành phố (Địa chỉ)", desc: "Lấy cấp Tỉnh/TP từ câu hỏi địa chỉ" },
  { value: "ward", label: "Xã / Phường (Địa chỉ)", desc: "Lấy cấp Xã/Phường từ câu hỏi địa chỉ" },
  { value: "regexGroup", label: "Trích xuất bằng Regex (Nâng cao)", desc: "Ví dụ: ([A-Za-z]+)" },
];

const DATE_PARTS: Array<{ value: DatePartKind; label: string }> = [
  { value: "day", label: "Theo Ngày (YYYY-MM-DD)" },
  { value: "month", label: "Theo Tháng (YYYY-MM)" },
  { value: "quarter", label: "Theo Quý (Q1/2026)" },
  { value: "year", label: "Theo Năm (YYYY)" },
  { value: "weekday", label: "Theo Thứ trong tuần (Thứ 2 .. CN)" },
  { value: "hour", label: "Theo Khung giờ nộp (HH:00)" },
];

export default function ComputedFieldsDrawer({
  isOpen,
  onClose,
  computedFields,
  statuses,
  onChange,
  records,
  questions,
  fieldMetas,
  canManagePermanent = true,
}: Props) {
  const [editorTab, setEditorTab] = useState<"guided" | "formula">("guided");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<ComputedFieldScope>("temporary");
  const [guidedMode, setGuidedMode] = useState<"extract" | "bin" | "datePart">("extract");
  const [sourceField, setSourceField] = useState<FieldRef>(
    fieldMetas.find((f) => f.ref.startsWith("question:"))?.ref ?? "system:submittedAt"
  );
  const [extractType, setExtractType] = useState<ExtractKind>("firstLetter");
  const [regexPattern, setRegexPattern] = useState("([A-Za-z]+)");
  const [binMethod, setBinMethod] = useState<BinMethod>("equalWidth");
  const [binCount, setBinCount] = useState<number>(5);
  const [binStep, setBinStep] = useState<string>("");
  const [edgesText, setEdgesText] = useState("0, 5, 8, 10");
  const [labelsText, setLabelsText] = useState("Mức thấp, Mức trung bình, Mức cao");
  const [datePart, setDatePart] = useState<DatePartKind>("month");

  const [displayFormula, setDisplayFormula] = useState("");
  const formulaInputRef = useRef<HTMLTextAreaElement>(null);

  const questionsById = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  const draftField = useMemo<ComputedField>(() => {
    const id = editingId ?? "preview_draft";
    const safeName = name.trim() || "Cột tự tạo mới";
    if (editorTab === "formula") {
      return {
        id,
        name: safeName,
        scope,
        kind: "formula",
        expression: toStorageFormula(displayFormula, questions),
      };
    }
    if (guidedMode === "extract") {
      return {
        id,
        name: safeName,
        scope,
        kind: "extract",
        sourceField,
        extractType,
        pattern: extractType === "regexGroup" ? regexPattern : undefined,
      };
    }
    if (guidedMode === "bin") {
      const edges = edgesText
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n));
      const labels = labelsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        id,
        name: safeName,
        scope,
        kind: "bin",
        sourceField,
        method: binMethod,
        binCount,
        step: binStep ? Number(binStep) : undefined,
        edges: binMethod === "customEdges" ? edges : undefined,
        labels: binMethod === "customEdges" ? labels : undefined,
      };
    }
    return {
      id,
      name: safeName,
      scope,
      kind: "datePart",
      sourceField,
      part: datePart,
    };
  }, [
    binCount,
    binMethod,
    binStep,
    datePart,
    displayFormula,
    editingId,
    edgesText,
    editorTab,
    extractType,
    guidedMode,
    labelsText,
    name,
    questions,
    regexPattern,
    scope,
    sourceField,
  ]);

  const preview = useMemo(() => {
    const prior = computedFields.filter((c) => c.id !== editingId);
    if (draftField.kind === "formula" && !draftField.expression.trim()) {
      return { rows: [], status: { fieldId: draftField.id, fieldName: draftField.name, runtimeErrorCount: 0, sampleErrors: [] } };
    }
    return previewComputedField(draftField, records, questionsById, prior, 5);
  }, [computedFields, draftField, editingId, questionsById, records]);

  if (!isOpen) return null;

  const insertAtCursor = (snippet: string) => {
    const el = formulaInputRef.current;
    if (!el) {
      setDisplayFormula((prev) => `${prev}${snippet}`);
      return;
    }
    const start = el.selectionStart ?? displayFormula.length;
    const end = el.selectionEnd ?? displayFormula.length;
    const next = displayFormula.slice(0, start) + snippet + displayFormula.slice(end);
    setDisplayFormula(next);
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setScope("temporary");
    setDisplayFormula("");
  };

  const handleToggleScope = (cf: ComputedField) => {
    if (!canManagePermanent) return;
    const nextScope: ComputedFieldScope = cf.scope === "permanent" ? "temporary" : "permanent";
    onChange(
      computedFields.map((item) =>
        item.id === cf.id ? { ...item, scope: nextScope } : item
      )
    );
  };

  const handleSaveField = () => {
    const finalName = name.trim();
    if (!finalName) return;
    if (draftField.kind === "formula" && preview.status.syntaxError) return;

    const newId = editingId ?? `cf_${Math.random().toString(36).slice(2, 9)}`;
    const fieldToSave: ComputedField = { ...draftField, id: newId, name: finalName, scope };
    if (editingId) {
      onChange(computedFields.map((c) => (c.id === editingId ? fieldToSave : c)));
    } else {
      onChange([...computedFields, fieldToSave]);
    }
    resetForm();
  };

  const handleEdit = (cf: ComputedField) => {
    setEditingId(cf.id);
    setName(cf.name);
    setScope(cf.scope ?? "temporary");
    if (cf.kind === "formula") {
      setEditorTab("formula");
      setDisplayFormula(toDisplayFormula(cf.expression, questions));
    } else {
      setEditorTab("guided");
      setGuidedMode(cf.kind);
      setSourceField(cf.sourceField);
      if (cf.kind === "extract") {
        setExtractType(cf.extractType);
        if (cf.pattern) setRegexPattern(cf.pattern);
      } else if (cf.kind === "bin") {
        setBinMethod(cf.method);
        if (cf.binCount) setBinCount(cf.binCount);
        if (cf.step) setBinStep(String(cf.step));
        if (cf.edges) setEdgesText(cf.edges.join(", "));
        if (cf.labels) setLabelsText(cf.labels.join(", "));
      } else if (cf.kind === "datePart") {
        setDatePart(cf.part);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-8">
        <div className="flex w-screen max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-indigo-50 p-2 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                <FunctionSquare size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Cột tự tạo & Công thức động (Computed Fields)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dùng ngay cột tự tạo để lọc, gom nhóm hoặc tính chỉ số thống kê.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>

          {/* BODY */}
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {/* EXISTING LIST */}
            {computedFields.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Danh sách cột đã tạo ({computedFields.length})
                </h3>
                <div className="space-y-1.5">
                  {computedFields.map((cf) => {
                    const st = statuses.find((s) => s.fieldId === cf.id);
                    return (
                      <div
                        key={cf.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/50"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">{cf.name}</span>
                            <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                              {cf.kind === "formula" ? "Công thức Excel" : cf.kind}
                            </span>
                            {cf.scope === "permanent" ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                title="Cột vĩnh viễn: Tự động dùng trên toàn khảo sát (Tab 2, Tab 3, Tab 4 & Xuất Excel)"
                              >
                                <Globe size={10} />
                                Vĩnh viễn
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 rounded-md bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                title="Cột tạm thời: Chỉ dùng trong mẫu báo cáo tùy chỉnh này"
                              >
                                <Clock size={10} />
                                Tạm thời
                              </span>
                            )}
                            {st && (st.syntaxError || st.runtimeErrorCount > 0) && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                                <AlertTriangle size={10} />
                                {st.syntaxError ? st.syntaxError : `${st.runtimeErrorCount} dòng lỗi`}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                            {cf.kind === "formula"
                              ? toDisplayFormula(cf.expression, questions)
                              : `${cf.sourceField} (${cf.kind})`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {canManagePermanent && (
                            <button
                              type="button"
                              onClick={() => handleToggleScope(cf)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                              title={
                                cf.scope === "permanent"
                                  ? "Chuyển thành cột tạm thời"
                                  : "Nâng cấp thành cột vĩnh viễn toàn khảo sát"
                              }
                            >
                              <ArrowLeftRight size={11} />
                              {cf.scope === "permanent" ? "Hạ tạm thời" : "Lên vĩnh viễn"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEdit(cf)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => onChange(computedFields.filter((x) => x.id !== cf.id))}
                            className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CREATOR FORM */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="inline-flex rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    data-testid="cf-tab-guided"
                    onClick={() => setEditorTab("guided")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      editorTab === "guided"
                        ? "bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-indigo-300"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Sparkles size={13} /> Tách & Biến đổi nhanh
                  </button>
                  <button
                    type="button"
                    data-testid="cf-tab-formula"
                    onClick={() => setEditorTab("formula")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      editorTab === "formula"
                        ? "bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-indigo-300"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <FunctionSquare size={13} /> Công thức Excel (Nâng cao)
                  </button>
                </div>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>

              {/* NAME INPUT */}
              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tên cột mới
                </label>
                <input
                  type="text"
                  data-testid="cf-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Nhóm ký tự đầu, Mức đánh giá, Tháng nộp..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              {/* SCOPE SELECTION */}
              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phạm vi áp dụng
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScope("temporary")}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition ${
                      scope === "temporary"
                        ? "border-indigo-500 bg-indigo-50/70 text-indigo-950 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-200"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Clock size={13} className={scope === "temporary" ? "text-indigo-600" : "text-slate-400"} />
                      Tạm thời (Mẫu này)
                    </div>
                    <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                      Chỉ dùng trong mẫu báo cáo hiện tại.
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={!canManagePermanent}
                    onClick={() => setScope("permanent")}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition ${
                      !canManagePermanent
                        ? "cursor-not-allowed opacity-50 border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
                        : scope === "permanent"
                        ? "border-purple-500 bg-purple-50/70 text-purple-950 dark:border-purple-500 dark:bg-purple-950/40 dark:text-purple-200"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                    }`}
                    title={
                      !canManagePermanent
                        ? "Chỉ người quản trị/tạo khảo sát mới được tạo cột vĩnh viễn"
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Globe size={13} className={scope === "permanent" ? "text-purple-600" : "text-slate-400"} />
                      Vĩnh viễn (Toàn khảo sát)
                    </div>
                    <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                      Hiện ở Tab 2, Tab 3, Tab 4 & File Excel.
                    </p>
                  </button>
                </div>
              </div>

              {editorTab === "guided" ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Loại biến đổi
                      </label>
                      <select
                        value={guidedMode}
                        onChange={(e) => setGuidedMode(e.target.value as "extract" | "bin" | "datePart")}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                      >
                        <option value="extract">Tách chuỗi / Địa chỉ</option>
                        <option value="bin">Chia khoảng giá trị số</option>
                        <option value="datePart">Trích xuất Ngày / Tháng / Quý</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Dữ liệu nguồn
                      </label>
                      <select
                        value={sourceField}
                        onChange={(e) => setSourceField(e.target.value as FieldRef)}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                      >
                        {fieldMetas
                          .filter((m) => !m.ref.startsWith("computed:"))
                          .map((m) => (
                            <option key={m.ref} value={m.ref}>
                              {m.label}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {guidedMode === "extract" && (
                    <div className="space-y-2">
                      <select
                        value={extractType}
                        onChange={(e) => setExtractType(e.target.value as ExtractKind)}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                      >
                        {EXTRACT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label} — {o.desc}
                          </option>
                        ))}
                      </select>
                      {extractType === "regexGroup" && (
                        <input
                          type="text"
                          value={regexPattern}
                          onChange={(e) => setRegexPattern(e.target.value)}
                          placeholder="Regex group, ví dụ: ([A-Za-z]+)"
                          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                        />
                      )}
                    </div>
                  )}

                  {guidedMode === "bin" && (
                    <div className="space-y-2">
                      <select
                        value={binMethod}
                        onChange={(e) => setBinMethod(e.target.value as BinMethod)}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                      >
                        <option value="equalWidth">Chia khoảng đều tự động theo dữ liệu thật</option>
                        <option value="customEdges">Nhập ngưỡng & nhãn tùy chỉnh</option>
                      </select>
                      {binMethod === "equalWidth" ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="number"
                            min={2}
                            max={15}
                            value={binCount}
                            onChange={(e) => setBinCount(Number(e.target.value) || 5)}
                            placeholder="Số khoảng (mặc định 5)"
                            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
                          />
                          <input
                            type="number"
                            step="any"
                            value={binStep}
                            onChange={(e) => setBinStep(e.target.value)}
                            placeholder="Bước nhảy cố định (tùy chọn)"
                            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={edgesText}
                            onChange={(e) => setEdgesText(e.target.value)}
                            placeholder="Các mốc số, VD: 0, 5, 8, 10"
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
                          />
                          <input
                            type="text"
                            value={labelsText}
                            onChange={(e) => setLabelsText(e.target.value)}
                            placeholder="Nhãn tương ứng, VD: Thấp, Trung bình, Cao"
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {guidedMode === "datePart" && (
                    <select
                      value={datePart}
                      onChange={(e) => setDatePart(e.target.value as DatePartKind)}
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                    >
                      {DATE_PARTS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Biểu thức công thức (tự lưu dưới dạng [#id])
                      </label>
                      {preview.status.syntaxError ? (
                        <span className="text-[11px] font-bold text-rose-600">
                          {preview.status.syntaxError}
                        </span>
                      ) : displayFormula.trim() ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 size={12} /> Cú pháp hợp lệ
                        </span>
                      ) : null}
                    </div>
                    <textarea
                      ref={formulaInputRef}
                      rows={3}
                      data-testid="cf-formula-textarea"
                      value={displayFormula}
                      onChange={(e) => setDisplayFormula(e.target.value)}
                      placeholder='Ví dụ: IF(AVG([Câu 1], [Câu 2]) >= 8, "Cao", "Bình thường")'
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-mono text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>

                  {/* QUICK INSERT FIELDS */}
                  <div>
                    <p className="mb-1 text-[11px] font-semibold text-slate-500">
                      Bấm để chèn trường dữ liệu:
                    </p>
                    <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                      {fieldMetas
                        .filter((m) => !m.ref.startsWith("computed:"))
                        .map((m) => (
                          <button
                            key={m.ref}
                            type="button"
                            onClick={() => {
                              if (m.ref === "system:submittedAt") insertAtCursor("[Thời gian nộp]");
                              else if (m.ref === "system:durationMs") insertAtCursor("[Thời lượng]");
                              else if (m.ref === "system:totalScore") insertAtCursor("[Tổng điểm]");
                              else if (m.matrixRowLabel && m.questionId) {
                                const q = questionsById.get(m.questionId);
                                const refName = q ? getQuestionFormulaRefName(q) : m.questionId;
                                insertAtCursor(`[${refName}].[${m.matrixRowLabel}]`);
                              } else if (m.questionId) {
                                const q = questionsById.get(m.questionId);
                                const refName = q ? getQuestionFormulaRefName(q) : m.label;
                                insertAtCursor(`[${refName}]`);
                              } else {
                                insertAtCursor(`[${m.label}]`);
                              }
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          >
                            +{m.shortLabel}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* FUNCTION HELPER CHIPS */}
                  <div>
                    <p className="mb-1 text-[11px] font-semibold text-slate-500">
                      Hàm hỗ trợ (bấm để chèn):
                    </p>
                    <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                      {FORMULA_FUNCTION_CATALOG.slice(0, 18).map((fn) => (
                        <button
                          key={fn.name}
                          type="button"
                          title={`${fn.signature} — ${fn.description} (VD: ${fn.example})`}
                          onClick={() => insertAtCursor(`${fn.name}(`)}
                          className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300"
                        >
                          {fn.name}()
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* LIVE 5-ROW PREVIEW */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Xem trước 5 phản hồi đầu tiên
                </p>
                {preview.rows.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Nhập cấu hình hoặc công thức để xem trước kết quả trên dữ liệu thật.
                  </p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] text-slate-500 dark:border-slate-800">
                        <th className="py-1 pr-2">Đầu vào</th>
                        <th className="py-1">Kết quả cột mới</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {preview.rows.map((pr) => (
                        <tr key={pr.recordId}>
                          <td className="max-w-[220px] truncate py-1.5 pr-2 text-slate-500">
                            {pr.inputsSummary}
                          </td>
                          <td
                            className={`py-1.5 font-semibold ${
                              pr.error
                                ? "text-rose-600"
                                : "text-slate-900 dark:text-slate-100"
                            }`}
                          >
                            {pr.output}
                            {pr.error && pr.error !== pr.output && (
                              <span className="ml-1.5 text-[10px] font-normal text-rose-500">
                                ({pr.error})
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  data-testid="cf-save-btn"
                  disabled={
                    !name.trim() ||
                    (editorTab === "formula" &&
                      (!displayFormula.trim() || Boolean(preview.status.syntaxError)))
                  }
                  onClick={handleSaveField}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  <Plus size={14} />
                  {editingId ? "Cập nhật cột" : "Thêm cột tự tạo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

