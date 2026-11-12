"use client";

import React, { useState } from "react";
import {
  FiGitBranch,
  FiChevronDown,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiAlertCircle,
} from "react-icons/fi";
import ConfirmModal from "@/components/ui/modal/ConfirmModal";
import { API_CONDITIONS } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { SurveyData, SurveyConditionItem, PageItem, QuestionItem } from "@/hooks/useSurveyEditorData";

interface BuilderConditionSectionProps {
  survey: SurveyData | null;
  conditions: SurveyConditionItem[];
  setConditions: React.Dispatch<React.SetStateAction<SurveyConditionItem[]>>;
}

export default function BuilderConditionSection({
  survey,
  conditions,
  setConditions,
}: BuilderConditionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    sourceQuestionId: "",
    targetType: "QUESTION" as "QUESTION" | "PAGE",
    targetQuestionId: "",
    targetPageId: "",
    sourceValueIds: [] as string[],
    action: "SHOW" as "SHOW" | "HIDE",
  });

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "warning",
  });

  const showAlert = (message: string, title: string = "Thông báo", variant: "warning" | "danger" | "info" = "warning") => {
    setAlertModal({ isOpen: true, title, message, variant });
  };

  const allQuestions: QuestionItem[] = (survey?.pages || []).flatMap((p) => p.questions || []);
  const sourceQuestion = allQuestions.find((q) => q.id === form.sourceQuestionId);

  const getQuestionText = (id?: string | null) => {
    if (!id) return "";
    return allQuestions.find((q) => q.id === id)?.questionText || `Q${id}`;
  };

  const getPageText = (pageId?: string | null) => {
    if (!pageId) return "";
    const pIdx = (survey?.pages || []).findIndex((p) => p.id === pageId);
    const p = (survey?.pages || []).find((page) => page.id === pageId);
    if (pIdx === -1) return p?.title || `Trang (${pageId.slice(0, 8)}...)`;
    return `Trang ${pIdx + 1}: ${p?.title || "Không có tiêu đề"}`;
  };

  const getSourceValueDisplay = (c: SurveyConditionItem) => {
    if (!c.sourceValue) return "";
    const q = allQuestions.find((item) => item.id === c.sourceQuestionId);
    if (!q) return c.sourceValue;
    if (q.questionTypeCode === "ADDRESS") return c.sourceValue;
    if (q.options?.length) {
      const ids = c.sourceValue.split(",").map((s) => s.trim());
      const texts = ids.map((id) => {
        const opt = q.options?.find((o) => o.id === id || o.optionText === id);
        return opt?.optionText || id;
      });
      return texts.join(", ");
    }
    return c.sourceValue;
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      sourceQuestionId: "",
      targetType: "QUESTION",
      targetQuestionId: "",
      targetPageId: "",
      sourceValueIds: [],
      action: "SHOW",
    });
  };

  const handleSaveCondition = async () => {
    if (!form.sourceQuestionId) {
      showAlert("Vui lòng chọn câu hỏi nguồn", "Thiếu thông tin");
      return;
    }
    if (form.targetType === "QUESTION" && !form.targetQuestionId) {
      showAlert("Vui lòng chọn câu hỏi đích", "Thiếu thông tin");
      return;
    }
    if (form.targetType === "PAGE" && !form.targetPageId) {
      showAlert("Vui lòng chọn trang đích", "Thiếu thông tin");
      return;
    }
    if (form.targetType === "PAGE") {
      const sourceQuestionPage = (survey?.pages || []).find((p) =>
        (p.questions || []).some((q) => q.id === form.sourceQuestionId)
      );
      if (sourceQuestionPage && sourceQuestionPage.id === form.targetPageId) {
        showAlert(
          "Trang đích không được trùng với trang chứa câu hỏi nguồn! (Không thể ẩn/hiện chính trang mà người dùng đang trả lời)",
          "Quy tắc không hợp lệ",
          "danger"
        );
        return;
      }
    }
    if (form.targetType === "QUESTION" && form.sourceQuestionId === form.targetQuestionId) {
      showAlert("Câu hỏi nguồn và câu hỏi đích không được trùng nhau!", "Quy tắc không hợp lệ", "danger");
      return;
    }
    if (!form.sourceValueIds.length) {
      showAlert("Vui lòng chọn ít nhất 1 đáp án điều kiện", "Thiếu thông tin");
      return;
    }

    const payload = {
      sourceQuestionId: String(form.sourceQuestionId),
      targetType: form.targetType,
      targetQuestionId: form.targetType === "QUESTION" ? String(form.targetQuestionId) : null,
      targetPageId: form.targetType === "PAGE" ? String(form.targetPageId) : null,
      sourceValue: form.sourceValueIds.join(","),
      action: form.action,
    };

    try {
      const token = getToken();
      const endpoint = editingId ? `${API_CONDITIONS}/${editingId}` : API_CONDITIONS;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Lưu điều kiện thất bại";
        try {
          const errData = await res.json();
          msg = errData.message || errData.error || msg;
        } catch {
          const raw = await res.text();
          if (raw) msg = raw;
        }
        showAlert(msg, "Lỗi lưu điều kiện", "danger");
        return;
      }

      const saved = await res.json();
      setConditions((cur) =>
        editingId ? cur.map((c) => (c.id === editingId ? saved : c)) : [...cur, saved]
      );
      resetForm();
    } catch (err: unknown) {
      showAlert(err instanceof Error ? err.message : "Lỗi hệ thống", "Lỗi lưu điều kiện", "danger");
    }
  };

  const executeDeleteCondition = async () => {
    if (!deleteModal.id) return;
    setIsDeleting(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_CONDITIONS}/${deleteModal.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể xóa điều kiện");

      setConditions((cur) => cur.filter((c) => c.id !== deleteModal.id));
      setDeleteModal({ isOpen: false, id: null });
    } catch (err: unknown) {
      showAlert(err instanceof Error ? err.message : "Xóa thất bại", "Lỗi", "danger");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 overflow-hidden transition-all">
      {/* ACCORDION HEADER */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:bg-gray-50/70 dark:hover:bg-gray-800/40"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
            <FiGitBranch size={17} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Quy tắc Điều kiện & Phân nhánh Logic
            </h3>
            <p className="text-xs text-gray-400">
              {conditions.length} quy tắc ẩn/hiện câu hỏi hoặc trang theo câu trả lời
            </p>
          </div>
        </div>

        <FiChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* ACCORDION BODY */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-800 space-y-6">
          {/* LIST OF EXISTING CONDITIONS */}
          {conditions.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Các quy tắc đang áp dụng ({conditions.length})
              </h4>
              <div className="space-y-2">
                {conditions.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-950/40 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Nếu [{getQuestionText(c.sourceQuestionId)}] chọn đáp án
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-bold">
                        {getSourceValueDisplay(c)}
                      </span>
                      <span>➔</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md ${
                          c.action === "SHOW"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                        }`}
                      >
                        {c.action === "SHOW" ? "HIỆN" : "ẨN"}
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {c.targetType === "PAGE"
                          ? `[${getPageText(c.targetPageId)}]`
                          : `[Câu: ${getQuestionText(c.targetQuestionId)}]`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(c.id || null);
                          const sq = allQuestions.find((q) => q.id === c.sourceQuestionId);
                          let values = c.sourceValue ? c.sourceValue.split(",").map((s) => s.trim()) : [];
                          if (sq?.options?.length) {
                            values = values.map((val) => {
                              const opt = sq.options?.find((o) => o.id === val || o.optionText === val);
                              return opt ? String(opt.id) : val;
                            });
                          }
                          setForm({
                            sourceQuestionId: c.sourceQuestionId,
                            targetType: (c.targetType as "QUESTION" | "PAGE") || "QUESTION",
                            targetQuestionId: c.targetQuestionId || "",
                            targetPageId: c.targetPageId || "",
                            sourceValueIds: values,
                            action: (c.action as "SHOW" | "HIDE") || "SHOW",
                          });
                        }}
                        className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg transition"
                      >
                        <FiEdit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteModal({ isOpen: true, id: c.id || null })}
                        className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg transition"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADD / EDIT FORM */}
          <div className="rounded-2xl border border-purple-200/80 bg-purple-50/20 p-4 sm:p-5 dark:border-purple-900/40 dark:bg-purple-950/10 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
              {editingId ? "Chỉnh sửa điều kiện" : "Thêm điều kiện logic mới"}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* SOURCE QUESTION */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  1. Câu hỏi nguồn (Điều kiện kích hoạt):
                </label>
                <select
                  value={form.sourceQuestionId}
                  onChange={(e) =>
                    setForm({ ...form, sourceQuestionId: e.target.value, sourceValueIds: [] })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:border-brand-500"
                >
                  <option value="">-- Chọn câu hỏi nguồn --</option>
                  {allQuestions
                    .filter((q) =>
                      ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "ADDRESS"].includes(q.questionTypeCode || "")
                    )
                    .map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.questionText || `Câu ${q.id}`}
                      </option>
                    ))}
                </select>
              </div>

              {/* TARGET TYPE & ACTION */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  2. Đối tượng áp dụng điều kiện:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, targetType: "QUESTION", targetPageId: "" })}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                      form.targetType === "QUESTION"
                        ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                        : "border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    Áp dụng cho Câu hỏi
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, targetType: "PAGE", targetQuestionId: "" })}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                      form.targetType === "PAGE"
                        ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                        : "border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    Áp dụng cho Trang
                  </button>
                </div>
              </div>
            </div>

            {/* OPTIONS VALUE SELECTOR */}
            {sourceQuestion && sourceQuestion.options && sourceQuestion.options.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Khi người dùng chọn đáp án:
                </label>
                <div className="flex flex-wrap gap-2">
                  {sourceQuestion.options.map((opt) => {
                    const optId = String(opt.id);
                    const isChecked = form.sourceValueIds.includes(optId);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                          isChecked
                            ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                            : "border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...form.sourceValueIds, optId]
                              : form.sourceValueIds.filter((v) => v !== optId);
                            setForm({ ...form, sourceValueIds: next });
                          }}
                          className="size-3.5 rounded text-brand-500"
                        />
                        <span>{opt.optionText}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ADDRESS VALUE INPUT (IF ADDRESS QUESTION) */}
            {sourceQuestion && sourceQuestion.questionTypeCode === "ADDRESS" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Khi người dùng chọn Tỉnh / Thành phố:
                </label>
                <input
                  type="text"
                  value={form.sourceValueIds.join(", ")}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sourceValueIds: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Nhập tên Tỉnh/Thành phố (ví dụ: Hà Nội, Đà Nẵng, TP. Hồ Chí Minh)..."
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:border-brand-500"
                />
              </div>
            )}

            {/* ACTION & TARGET SELECTION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Hành động:
                </label>
                <select
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value as "SHOW" | "HIDE" })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="SHOW">HIỆN đối tượng đích</option>
                  <option value="HIDE">ẨN đối tượng đích</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {form.targetType === "PAGE" ? "Trang đích:" : "Câu hỏi đích:"}
                </label>
                {form.targetType === "PAGE" ? (
                  <select
                    value={form.targetPageId}
                    onChange={(e) => setForm({ ...form, targetPageId: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none cursor-pointer"
                  >
                    <option value="">-- Chọn trang đích --</option>
                    {(survey?.pages || []).map((p, idx) => {
                      const isCurrentPage = (p.questions || []).some((q) => q.id === form.sourceQuestionId);
                      return (
                        <option key={p.id} value={p.id} disabled={isCurrentPage}>
                          Trang {idx + 1}: {p.title || "Không có tiêu đề"} {isCurrentPage ? "(Trang hiện tại - Không thể chọn)" : ""}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <select
                    value={form.targetQuestionId}
                    onChange={(e) => setForm({ ...form, targetQuestionId: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none cursor-pointer"
                  >
                    <option value="">-- Chọn câu hỏi đích --</option>
                    {allQuestions
                      .filter((q) => q.id !== form.sourceQuestionId)
                      .map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.questionText || `Câu ${q.id}`}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex items-center justify-end gap-2 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
                >
                  Hủy sửa
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveCondition}
                className="flex items-center gap-1.5 px-5 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-brand-600 active:scale-95 transition"
              >
                {editingId ? <FiEdit2 size={13} /> : <FiPlus size={13} />}
                <span>{editingId ? "Cập nhật điều kiện" : "Thêm điều kiện"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDeleteCondition}
        title="Xác nhận xóa điều kiện"
        message="Bạn có chắc chắn muốn xóa quy tắc điều kiện này?"
        description="Sau khi xóa, logic phân nhánh này sẽ không còn tác dụng khi người dùng làm khảo sát."
        confirmText="Xóa điều kiện"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* ALERT MODAL */}
      <ConfirmModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        cancelText={null}
        confirmText="Đã hiểu"
        variant={alertModal.variant}
      />
    </section>
  );
}

