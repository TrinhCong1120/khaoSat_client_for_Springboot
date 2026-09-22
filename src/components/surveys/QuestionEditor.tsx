"use client";

import { useState } from "react";
import {
  FiPlus,
  FiTrash2,
  FiSave,
  FiCheckSquare,
  FiCircle,
  FiChevronUp,
  FiChevronDown,
} from "react-icons/fi";
import { API_QUESTIONS } from "@/lib/api";

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

export default function QuestionEditor({ page, survey, setSurvey }: any) {
  const [savingMap, setSavingMap] = useState<{ [key: number]: string }>({});

  const isChoice = (type: number) => type === 1 || type === 2;

  const isAddressType = (type: number) => type === 6;

  // ======================
  // STATE UPDATE HELPER
  // ======================
  const updateSurveyState = (callback: any) => {
    const newPages = survey.pages.map((p: any) =>
      p.id === page.id ? callback(p) : p
    );

    setSurvey({ ...survey, pages: newPages });
  };

  // ======================
  // ORDERED QUESTIONS
  // ======================
  const questionsRaw = page?.questions || [];
  const questionsOrdered = questionsRaw
    .map((q: any, idx: number) => ({
      q,
      idx,
      orderIndex: Number(q?.orderIndex ?? q?.OrderIndex ?? idx + 1),
    }))
    .sort(
      (a: { orderIndex: number; idx: number }, b: { orderIndex: number; idx: number }) =>
        a.orderIndex - b.orderIndex || a.idx - b.idx
    )
    .map((x: { q: any }) => x.q);

  const normalizeOrderIndex = (ordered: any[]) => {
    const orderIndexById = new Map<number, number>();
    ordered.forEach((q: any, idx: number) => {
      orderIndexById.set(q.id, idx + 1);
    });

    updateSurveyState((p: any) => ({
      ...p,
      questions: (p.questions || []).map((q: any) => {
        const nextOrderIndex = orderIndexById.get(q.id);
        if (nextOrderIndex == null) return q;
        return {
          ...q,
          orderIndex: nextOrderIndex,
          // some backends/DBs may use PascalCase; keep it in sync just in case
          OrderIndex: nextOrderIndex,
        };
      }),
    }));
  };

  // ======================
  // REORDER QUESTIONS
  // ======================
  const moveQuestion = (qid: number, direction: -1 | 1) => {
    const fromIndex = questionsOrdered.findIndex((q: any) => q.id === qid);
    if (fromIndex < 0) return;

    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= questionsOrdered.length) return;

    const nextOrdered = [...questionsOrdered];
    const [item] = nextOrdered.splice(fromIndex, 1);
    nextOrdered.splice(toIndex, 0, item);
    normalizeOrderIndex(nextOrdered);
  };

  const setQuestionOrder = (qid: number, nextOrderIndex: number) => {
    const fromIndex = questionsOrdered.findIndex((q: any) => q.id === qid);
    if (fromIndex < 0) return;

    const toIndex = Math.max(
      0,
      Math.min(questionsOrdered.length - 1, nextOrderIndex - 1)
    );
    if (toIndex === fromIndex) return;

    const nextOrdered = [...questionsOrdered];
    const [item] = nextOrdered.splice(fromIndex, 1);
    nextOrdered.splice(toIndex, 0, item);
    normalizeOrderIndex(nextOrdered);
  };

  // ======================
  // ADD QUESTION
  // ======================
  const addQuestion = async () => {
    const res = await fetch(API_QUESTIONS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        pageId: page.id,
        questionText: "Câu hỏi mới",
        questionTypeId: 1,
        isRequired: false,
        orderIndex: (page.questions?.length || 0) + 1,
        description: "",
        options: [],
      }),
    });

    const data = await res.json();

    updateSurveyState((p: any) => ({
      ...p,
      questions: [
        ...(p.questions || []),
        { ...data, options: [], description: data.description || "" },
      ],
    }));
  };

  // ======================
  // SAVE QUESTION
  // ======================
  const saveQuestion = async (q: any) => {
    setSavingMap((prev) => ({ ...prev, [q.id]: "saving" }));

    const res = await fetch(`${API_QUESTIONS}/${q.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        questionText: q.questionText,
        questionTypeId: q.questionTypeId,
        isRequired: q.isRequired,
        orderIndex: q.orderIndex,
        description: q.description,
        options: isChoice(q.questionTypeId)
          ? q.options.map((o: any) => ({
              optionText: o.optionText,
            }))
          : [],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("❌ Save failed:", err);
      setSavingMap((prev) => ({ ...prev, [q.id]: "error" }));
      return;
    }

    setSavingMap((prev) => ({ ...prev, [q.id]: "saved" }));

    setTimeout(() => {
      setSavingMap((prev) => ({ ...prev, [q.id]: "" }));
    }, 2000);
  };

  const saveQuestionsOrder = async () => {
    // Lưu toàn bộ câu hỏi để đảm bảo `orderIndex` được backend cập nhật đồng bộ
    await Promise.all(questionsOrdered.map((q: any) => saveQuestion(q)));
  };

  // ======================
  // DELETE
  // ======================
  const deleteQuestion = async (qid: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) return;

    await fetch(`${API_QUESTIONS}/${qid}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    updateSurveyState((p: any) => ({
      ...p,
      questions: p.questions.filter((q: any) => q.id !== qid),
    }));
  };

  // ======================
  // UPDATE QUESTION
  // ======================
  const updateQuestion = (qid: number, field: string, value: any) => {
    updateSurveyState((p: any) => ({
      ...p,
      questions: p.questions.map((q: any) =>
        q.id === qid ? { ...q, [field]: value } : q
      ),
    }));
  };

  // ======================
  // ADD OPTION
  // ======================
  const addOption = (qid: number) => {
    updateSurveyState((p: any) => ({
      ...p,
      questions: p.questions.map((q: any) => {
        if (q.id !== qid) return q;

        return {
          ...q,
          options: [
            ...(q.options || []),
            { id: Date.now(), optionText: "Lựa chọn mới" },
          ],
        };
      }),
    }));
  };

  // ======================
  // UPDATE OPTION
  // ======================
  const updateOption = (qid: number, oid: number, value: string) => {
    updateSurveyState((p: any) => ({
      ...p,
      questions: p.questions.map((q: any) => {
        if (q.id !== qid) return q;

        return {
          ...q,
          options: (q.options || []).map((o: any) =>
            o.id === oid ? { ...o, optionText: value } : o
          ),
        };
      }),
    }));
  };

  // ======================
  // UI
  // ======================
  return (
    <div>
      {/* ADD QUESTION */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <button
          onClick={addQuestion}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-brand-500/20 text-sm font-semibold transition-all active:scale-95"
        >
          <FiPlus size={18} />
          Thêm câu hỏi
        </button>

        <button
          onClick={saveQuestionsOrder}
          className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-brand-500/50 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={questionsOrdered.length <= 0}
          title="Lưu thứ tự các câu hỏi"
        >
          <FiSave size={18} />
          Lưu thứ tự
        </button>
      </div>

      {questionsOrdered.map((q: any) => (
        <div
          key={q.id}
          className="border border-gray-100 dark:border-gray-800 rounded-2xl p-5 mb-6 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow"
        >
          {/* ORDER CONTROLS */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Vị trí
              </span>
              <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-sm font-black text-gray-500 dark:text-gray-300">
                {q.orderIndex ?? q.OrderIndex ?? "-"}
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => moveQuestion(q.id, -1)}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-400 hover:text-brand-500 hover:border-brand-500/50 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all"
                title="Chuyển lên"
              >
                <FiChevronUp size={18} />
              </button>
              <button
                onClick={() => moveQuestion(q.id, 1)}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-400 hover:text-brand-500 hover:border-brand-500/50 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all"
                title="Chuyển xuống"
              >
                <FiChevronDown size={18} />
              </button>

              <select
                value={Number(q.orderIndex ?? q.OrderIndex ?? 1)}
                onChange={(e) => setQuestionOrder(q.id, Number(e.target.value))}
                className="px-3 py-2 text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 outline-none focus:border-brand-500 transition-all cursor-pointer"
                title="Chọn thứ tự"
              >
                {Array.from({ length: questionsOrdered.length }).map((_, idx) => (
                  <option key={idx} value={idx + 1}>
                    Thứ tự: {idx + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TEXT */}
          <div className="mb-4">
            <input
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-white/90 placeholder-gray-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium"
              value={q.questionText}
              onChange={(e) =>
                updateQuestion(q.id, "questionText", e.target.value)
              }
              placeholder="Tiêu đề câu hỏi"
            />
          </div>

          {/* DESCRIPTION */}
          <div className="mb-4">
            <textarea
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 placeholder-gray-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none"
              placeholder="Mô tả hoặc hướng dẫn (không bắt buộc)"
              rows={2}
              value={q.description || ""}
              onChange={(e) =>
                updateQuestion(q.id, "description", e.target.value)
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* TYPE */}
            <div className="flex-1 min-w-[200px]">
              <select
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all cursor-pointer"
                value={q.questionTypeId}
                onChange={(e) => {
                  const val = Number(e.target.value);

                  updateSurveyState((p: any) => ({
                    ...p,
                    questions: p.questions.map((x: any) => {
                      if (x.id !== q.id) return x;

                      return {
                        ...x,
                        questionTypeId: val,
                        options: isChoice(val)
                          ? x.options?.length
                            ? x.options
                            : [
                                { id: Date.now(), optionText: "Lựa chọn 1" },
                                { id: Date.now() + 1, optionText: "Lựa chọn 2" },
                              ]
                          : [],
                      };
                    }),
                  }));
                }}
              >
                <option value={1}>Một lựa chọn (Radio)</option>
                <option value={2}>Nhiều lựa chọn (Checkbox)</option>
                <option value={3}>Trả lời ngắn (Text)</option>
                <option value={4}>Số học (Number)</option>
                <option value={5}>Ngày tháng (Date)</option>
                <option value={6}>Địa chỉ — Tỉnh/Thành, Xã/Phường (ADDRESS)</option>
              </select>
            </div>

            {isAddressType(q.questionTypeId) && (
              <p className="w-full text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-4 pl-0.5">
                Trên khảo sát công khai, người trả lời dùng ô tìm kiếm theo tên để chọn tỉnh/thành
                và xã/phường. Dữ liệu gửi lên server là{" "}
                <code className="text-[11px] bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  province
                </code>{" "}
                và{" "}
                <code className="text-[11px] bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  ward
                </code>
                {" "}(text).
              </p>
            )}

            {/* REQUIRED TOGGLE */}
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={q.isRequired}
                  onChange={(e) =>
                    updateQuestion(q.id, "isRequired", e.target.checked)
                  }
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500 rounded-full"></div>
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white/90">
                Bắt buộc
              </span>
            </label>
          </div>

          {/* OPTIONS */}
          {isChoice(q.questionTypeId) && (
            <div className="mb-6 space-y-3 pl-4 border-l-2 border-gray-100 dark:border-gray-800">
              {(q.options || []).map((o: any) => (
                <div key={o.id} className="flex items-center gap-3">
                  <div className="text-gray-400 shrink-0">
                    {q.questionTypeId === 1 ? (
                      <FiCircle size={16} />
                    ) : (
                      <FiCheckSquare size={16} />
                    )}
                  </div>

                  <input
                    className="flex-1 px-3 py-1.5 bg-transparent border-b border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-white/90 focus:border-brand-500 outline-none transition-all"
                    value={o.optionText}
                    onChange={(e) =>
                      updateOption(q.id, o.id, e.target.value)
                    }
                    placeholder="Tên lựa chọn"
                  />
                </div>
              ))}

              <button
                onClick={() => addOption(q.id)}
                className="text-xs font-semibold text-brand-500 hover:text-brand-600 mt-2 flex items-center gap-1 ml-7 transition-colors"
              >
                <FiPlus size={14} />
                Thêm lựa chọn
              </button>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              {savingMap[q.id] === "saving" && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  Đang lưu...
                </span>
              )}
              {savingMap[q.id] === "saved" && (
                <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <FiSave size={14} />
                  Đã lưu thành công
                </span>
              )}
              {savingMap[q.id] === "error" && (
                <span className="flex items-center gap-1.5 text-xs text-error-500 font-medium">
                  ❌ Lỗi khi lưu
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                title="Lưu câu hỏi"
                onClick={() => saveQuestion(q)}
                className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-all"
              >
                <FiSave size={20} />
              </button>

              <button
                title="Xóa câu hỏi"
                onClick={() => deleteQuestion(q.id)}
                className="p-2 text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-all"
              >
                <FiTrash2 size={20} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}