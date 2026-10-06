"use client";

import { useEffect, useState } from "react";
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
import ValidationRulesEditor from "@/components/surveys/ValidationRulesEditor";
import MediaUploader from "@/components/surveys/MediaUploader";

const QUESTION_TYPE_CODES: Record<number, string> = {
  1: "SINGLE_CHOICE",
  2: "MULTIPLE_CHOICE",
  3: "TEXT",
  4: "NUMBER",
  5: "DATE",
  6: "ADDRESS",
};

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

export default function QuestionEditor({ page, survey, setSurvey }: any) {
  const [savingMap, setSavingMap] = useState<{ [key: number]: string }>({});

  const isChoice = (type: number) => type === 1 || type === 2;

  const isAddressType = (type: number) => type === 6;

  const getValidOrderIndex = (question: any, fallback: number) => {
    const rawOrderIndex = question?.orderIndex ?? question?.OrderIndex;
    const orderIndex =
      typeof rawOrderIndex === "string" && rawOrderIndex.trim() === ""
        ? NaN
        : Number(rawOrderIndex);

    return Number.isInteger(orderIndex) && orderIndex > 0
      ? orderIndex
      : fallback;
  };

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
      orderIndex: getValidOrderIndex(q, idx + 1),
    }))
    .sort(
      (a: { orderIndex: number; idx: number }, b: { orderIndex: number; idx: number }) =>
        a.orderIndex - b.orderIndex || a.idx - b.idx
    )
    .map((x: { q: any }) => x.q);

  // Backend có thể trả về orderIndex rỗng. Tự chuẩn hóa ngay trên state để
  // giao diện và mọi request lưu câu hỏi luôn có thứ tự hợp lệ.
  useEffect(() => {
    const orderIndexById = new Map<number, number>();
    questionsOrdered.forEach((question: any, index: number) => {
      orderIndexById.set(question.id, index + 1);
    });

    const needsUpdate = questionsRaw.some((question: any) => {
      const orderIndex = orderIndexById.get(question.id);
      return (
        orderIndex != null &&
        (Number(question.orderIndex) !== orderIndex ||
          Number(question.OrderIndex) !== orderIndex)
      );
    });

    if (!needsUpdate) return;

    updateSurveyState((p: any) => ({
      ...p,
      questions: (p.questions || []).map((question: any) => {
        const orderIndex = orderIndexById.get(question.id);
        return orderIndex == null
          ? question
          : { ...question, orderIndex, OrderIndex: orderIndex };
      }),
    }));
  }, [page?.id, page?.questions]);

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

    return ordered.map((q: any, idx: number) => ({
      ...q,
      orderIndex: idx + 1,
      OrderIndex: idx + 1,
    }));
  };

  const persistQuestionOrder = async (ordered: any[]) => {
    await Promise.all(
      ordered.map((q: any, index: number) =>
        saveQuestion({ ...q, orderIndex: index + 1, OrderIndex: index + 1 }, index + 1)
      )
    );
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
    const normalized = normalizeOrderIndex(nextOrdered);
    void persistQuestionOrder(normalized);
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
    const normalized = normalizeOrderIndex(nextOrdered);
    void persistQuestionOrder(normalized);
  };

  // ======================
  // ADD QUESTION
  // ======================
  const addQuestion = async (insertAt?: number) => {
    const currentQuestions = Array.isArray(questionsOrdered)
      ? questionsOrdered
      : [];
    const requestedInsertAt = Number.isInteger(insertAt)
      ? Number(insertAt)
      : currentQuestions.length;
    const insertIndex = Math.max(
      0,
      Math.min(requestedInsertAt, currentQuestions.length)
    );
    const nextOrderIndex = Number.isFinite(insertIndex)
      ? insertIndex + 1
      : 1;

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
        orderIndex: nextOrderIndex,
        description: "",
        options: [],
      }),
    });

    if (!res.ok) {
      const message = await res.text().catch(() => "");
      alert(message || `Không thể thêm câu hỏi (${res.status})`);
      return;
    }

    const data = await res.json();

    const nextQuestions = [...currentQuestions];
    nextQuestions.splice(insertIndex, 0, {
      ...data,
      options: [],
      description: data.description || "",
      orderIndex: insertIndex + 1,
    });
    const normalizedQuestions = nextQuestions.map((question: any, index: number) => ({
      ...question,
      orderIndex: index + 1,
      OrderIndex: index + 1,
    }));

    updateSurveyState((p: any) => {
      return {
        ...p,
        questions: normalizedQuestions,
      };
    });
    void persistQuestionOrder(normalizedQuestions);
  };

  // ======================
  // SAVE QUESTION
  // ======================
  const saveQuestion = async (q: any, orderIndexOverride?: number) => {
    setSavingMap((prev) => ({ ...prev, [q.id]: "saving" }));

    const orderIndex = orderIndexOverride ?? getValidOrderIndex(
      q,
      Math.max(
        1,
        questionsOrdered.findIndex((question: any) => question.id === q.id) + 1
      )
    );

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
        orderIndex,
        description: q.description,
        imageUrl: q.imageUrl ?? null,
        videoUrl: q.videoUrl ?? null,
        audioUrl: q.audioUrl ?? null,
        options: isChoice(q.questionTypeId)
          ? (q.options || []).map((o: any) => ({
              ...(o.id && Number(o.id) < 1000000000000 ? { id: o.id } : {}),
              optionText: o.optionText,
              imageUrl: o.imageUrl ?? null,
              videoUrl: o.videoUrl ?? null,
              audioUrl: o.audioUrl ?? null,
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

    const remainingQuestions = questionsOrdered
      .filter((q: any) => q.id !== qid)
      .map((q: any, index: number) => ({ ...q, orderIndex: index + 1, OrderIndex: index + 1 }));

    updateSurveyState((p: any) => ({
      ...p,
      questions: remainingQuestions,
    }));
    void persistQuestionOrder(remainingQuestions);
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

  const deleteOption = (qid: number, oid: number) => {
    updateSurveyState((p: any) => ({
      ...p,
      questions: p.questions.map((q: any) => q.id !== qid ? q : ({
        ...q,
        options: (q.options || []).filter((o: any) => o.id !== oid),
      })),
    }));
  };

  const updateOptionMedia = (qid: number, oid: number, field: string, value: string) => {
    updateSurveyState((p: any) => ({
      ...p,
      questions: p.questions.map((q: any) => q.id !== qid ? q : ({
        ...q,
        options: (q.options || []).map((o: any) => o.id === oid ? { ...o, [field]: value } : o),
      })),
    }));
  };

  // ======================
  // UI
  // ======================
  return (
    <div>

      {questionsOrdered.map((q: any, questionIndex: number) => (
        <div key={q.id} id={`survey-question-${q.id}`} className="scroll-mt-24">
          {questionIndex > 0 && (
            <div className="group flex h-8 items-center justify-center">
              <button
                type="button"
                onClick={() => addQuestion(questionIndex)}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 opacity-0 transition-opacity hover:bg-brand-500 hover:text-white focus:opacity-100 group-hover:opacity-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
              >
                <FiPlus size={13} />
                Thêm câu hỏi ở đây
              </button>
            </div>
          )}
          <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-5 mb-6 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
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
                  const questionTypeCode = QUESTION_TYPE_CODES[val];

                  updateSurveyState((p: any) => ({
                    ...p,
                    questions: p.questions.map((x: any) => {
                      if (x.id !== q.id) return x;

                      return {
                        ...x,
                        questionTypeId: val,
                        questionTypeCode,
                        questionType: x.questionType
                          ? { ...x.questionType, id: val, code: questionTypeCode }
                          : x.questionType,
                        // Rule cũ thuộc loại câu hỏi trước nên không còn hợp lệ.
                        validationRules: [],
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
                <option value={1}>Một lựa chọn</option>
                <option value={2}>Nhiều lựa chọn</option>
                <option value={3}>Trả lời ngắn</option>
                <option value={4}>Số</option>
                <option value={5}>Ngày tháng</option>
                <option value={6}>Địa chỉ — Tỉnh/thành, Xã/phường</option>
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
                  <div className="shrink-0 text-gray-400">
                    {q.questionTypeId === 1 ? (
                      <FiCircle size={16} />
                    ) : (
                      <FiCheckSquare size={16} />
                    )}
                  </div>

                  <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                    <input
                      className="min-w-0 w-full px-3 py-1.5 bg-transparent border-b border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-white/90 focus:border-brand-500 outline-none transition-all"
                      value={o.optionText}
                      onChange={(e) =>
                        updateOption(q.id, o.id, e.target.value)
                      }
                      placeholder="Tên lựa chọn"
                    />
                    {Number.isSafeInteger(Number(o.id)) && Number(o.id) > 0 && Number(o.id) < 1000000000000 ? (
                      <MediaUploader
                        compact
                        ownerType="OPTION"
                        ownerId={Number(o.id)}
                        values={o}
                        onChange={(field, value) => updateOptionMedia(q.id, o.id, field, value)}
                      />
                    ) : (
                      <p className="text-right text-[11px] text-gray-400">Lưu câu hỏi trước khi tải tệp đa phương tiện.</p>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteOption(q.id, o.id)}
                      title="Xóa lựa chọn"
                      aria-label="Xóa lựa chọn"
                      className="col-start-3 row-start-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:hover:bg-red-500/10"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
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

          <div className="mb-5">
            <MediaUploader
              ownerType="QUESTION"
              ownerId={Number(q.id)}
              values={q}
              onChange={(field, value) => updateQuestion(q.id, field, value)}
            />
          </div>

          <ValidationRulesEditor
            questionId={q.id}
            questionTypeId={Number(q.questionTypeId)}
            questionTypeCode={QUESTION_TYPE_CODES[Number(q.questionTypeId)]}
            revision={survey?.validationRevision ?? survey?.revision}
            rules={q.validationRules}
            onChange={(validationRules) => updateQuestion(q.id, "validationRules", validationRules)}
          />

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
        </div>
      ))}

      {/* ADD QUESTION AT THE END OF THE PAGE */}
      <div className="flex justify-center border-t border-dashed border-gray-200 pt-5 dark:border-gray-700">
        <button
          type="button"
          onClick={() => void addQuestion()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-600 transition-all hover:bg-brand-500 hover:text-white active:scale-[0.99] dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500 dark:hover:text-white sm:w-auto"
        >
          <FiPlus size={18} />
          Thêm câu hỏi cuối trang
        </button>
      </div>
    </div>
  );
}
