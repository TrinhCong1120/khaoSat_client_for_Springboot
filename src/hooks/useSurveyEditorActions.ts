"use client";

import { useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { API_SURVEYS, API_PAGES, API_QUESTIONS } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { SurveyData, PageItem, QuestionItem, OptionItem } from "./useSurveyEditorData";

export const QUESTION_TYPE_ID_MAP: Record<string, string> = {
  TEXT: "047e1a77-5658-4e37-bf8a-7c997e81718d",
  SINGLE_CHOICE: "23f9c539-d8dd-4905-8031-c6680a05f253",
  MULTIPLE_CHOICE: "afbb692d-213b-4498-b6d4-9a0a4978cfb4",
  NUMBER: "96683f47-4001-4159-b13d-3e9a23d403f4",
  DATE: "c1dd6bdc-36a6-42e7-8a8a-2882093c9666",
  ADDRESS: "9371b75b-7414-4eeb-8201-2340acb8ad87",
  MATRIX_SINGLE: "09394640-ba3d-4dc4-a9f4-19d79cbba9ea",
  MATRIX_MULTI: "79ad95fe-6111-485a-a207-c74de1e79e69",
  MATRIX_INPUT: "bd27b807-146f-4591-8bce-8895d966abf2",
  DYNAMIC_TABLE: "716c51d7-46bc-4223-9903-7cb5ade22b97",
};

interface UseSurveyEditorActionsProps {
  survey: SurveyData | null;
  setSurvey: Dispatch<SetStateAction<SurveyData | null>>;
  setActivePageId: Dispatch<SetStateAction<string | null>>;
  setActiveQuestionId?: Dispatch<SetStateAction<string | null>>;
}

export function useSurveyEditorActions({
  survey,
  setSurvey,
  setActivePageId,
  setActiveQuestionId,
}: UseSurveyEditorActionsProps) {
  const [savingMap, setSavingMap] = useState<Record<string, string>>({});
  const [isBusy, setIsBusy] = useState(false);

  // 1. UPDATE SURVEY META
  const updateSurveyMeta = useCallback(
    async (payload: Partial<SurveyData>) => {
      if (!survey?.id) return;
      setSurvey((cur) => (cur ? { ...cur, ...payload } : cur));
      try {
        const token = getToken();
        await fetch(`${API_SURVEYS}/${survey.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("Lỗi cập nhật khảo sát:", err);
      }
    },
    [survey?.id, setSurvey]
  );

  // 2. ADD PAGE
  const addPage = useCallback(async () => {
    if (!survey?.id) return null;
    setIsBusy(true);
    try {
      const nextOrder = (survey.pages?.length || 0) + 1;
      const token = getToken();
      const res = await fetch(API_PAGES, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          surveyId: survey.id,
          title: `Trang ${nextOrder}`,
          description: "",
          orderIndex: nextOrder,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Lỗi tạo trang mới:", errData);
        throw new Error(errData.message || `Không thể tạo trang mới (${res.status})`);
      }
      const newPage: PageItem = await res.json();
      setSurvey((cur) => {
        if (!cur) return cur;
        return {
          ...cur,
          pages: [...(cur.pages || []), { ...newPage, questions: [] }],
        };
      });
      setActivePageId(newPage.id);
      return newPage;
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsBusy(false);
    }
  }, [survey?.id, survey?.pages?.length, setSurvey, setActivePageId]);

  // 3. PATCH PAGE
  const patchPage = useCallback(
    async (pageId: string, payload: Partial<PageItem>) => {
      setSurvey((cur) => {
        if (!cur) return cur;
        return {
          ...cur,
          pages: (cur.pages || []).map((p) =>
            p.id === pageId ? { ...p, ...payload } : p
          ),
        };
      });

      try {
        const token = getToken();
        await fetch(`${API_PAGES}/${pageId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("Lỗi cập nhật trang:", err);
      }
    },
    [setSurvey]
  );

  // 4. DELETE PAGE
  const deletePage = useCallback(
    async (pageId: string) => {
      setIsBusy(true);
      try {
        const token = getToken();
        const res = await fetch(`${API_PAGES}/${pageId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Xóa trang thất bại");

        setSurvey((cur) => {
          if (!cur) return cur;
          const remaining = (cur.pages || []).filter((p) => p.id !== pageId);
          return { ...cur, pages: remaining };
        });

        setActivePageId((curActive) => {
          if (curActive !== pageId) return curActive;
          const remaining = (survey?.pages || []).filter((p) => p.id !== pageId);
          return remaining[0]?.id || null;
        });
      } finally {
        setIsBusy(false);
      }
    },
    [survey?.pages, setSurvey, setActivePageId]
  );

  // 5. ADD QUESTION
  const addQuestion = useCallback(
    async (
      pageId: string,
      typeCode: string = "TEXT",
      customProps: Partial<QuestionItem> = {}
    ) => {
      if (!survey) return null;
      setIsBusy(true);
      try {
        const targetPage = survey.pages?.find((p) => p.id === pageId);
        const nextOrder = (targetPage?.questions?.length || 0) + 1;

        const isChoice = ["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(typeCode);
        const isMatrix = [
          "MATRIX_SINGLE",
          "MATRIX_MULTI",
          "MATRIX_INPUT",
          "DYNAMIC_TABLE",
        ].includes(typeCode);

        let defaultMatrixConfig: string | null = null;
        if (isMatrix) {
          defaultMatrixConfig = JSON.stringify({
            rows: [
              { id: "r1", label: "Tiêu chí 1", orderIndex: 1 },
              { id: "r2", label: "Tiêu chí 2", orderIndex: 2 },
            ],
            columns: [
              { id: "c1", label: "Kém", score: 1, orderIndex: 1 },
              { id: "c2", label: "Trung bình", score: 2, orderIndex: 2 },
              { id: "c3", label: "Tốt", score: 3, orderIndex: 3 },
            ],
          });
        }

        let qTypeId =
          customProps.questionTypeId ||
          QUESTION_TYPE_ID_MAP[typeCode] ||
          QUESTION_TYPE_ID_MAP.TEXT;

        const payload = {
          pageId: pageId,
          questionText: (customProps.questionText?.trim() || "Câu hỏi mới").slice(0, 1000),
          questionTypeId: qTypeId,
          description: customProps.description || "",
          isRequired: Boolean(customProps.isRequired ?? false),
          orderIndex: nextOrder,
          parentId: customProps.parentId || null,
          weight: customProps.weight ?? 1.0,
          aggregationType:
            customProps.aggregationType ||
            (typeCode === "AGGREGATION" ? "SUM" : "NONE"),
          aggregationFormula: customProps.aggregationFormula || null,
          matrixConfig: customProps.matrixConfig || defaultMatrixConfig,
          options: isChoice
            ? [
                { optionText: "Lựa chọn 1", orderIndex: 1 },
                { optionText: "Lựa chọn 2", orderIndex: 2 },
              ]
            : [],
        };

        const token = getToken();
        const res = await fetch(API_QUESTIONS, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error("Lỗi tạo câu hỏi:", errData);
          throw new Error(errData.message || `Không thể tạo câu hỏi (${res.status})`);
        }

        const created: QuestionItem = await res.json();
        const createdWithMeta: QuestionItem = {
          ...created,
          questionTypeId: qTypeId,
          questionTypeCode: typeCode,
        };

        setSurvey((cur) => {
          if (!cur) return cur;
          return {
            ...cur,
            pages: (cur.pages || []).map((p) =>
              p.id === pageId
                ? { ...p, questions: [...(p.questions || []), createdWithMeta] }
                : p
            ),
          };
        });

        if (setActiveQuestionId) {
          setActiveQuestionId(created.id);
        }
        return createdWithMeta;
      } finally {
        setIsBusy(false);
      }
    },
    [survey, setSurvey, setActiveQuestionId]
  );

  // 6. QUICK ADD CHILD QUESTION (+ Con)
  const addChildQuestion = useCallback(
    async (parentQuestion: QuestionItem, pageId?: string) => {
      const targetPageId =
        pageId ||
        survey?.pages?.find((p) =>
          p.questions?.some((q) => q.id === parentQuestion.id)
        )?.id;

      if (!targetPageId) return null;

      // Count existing children of this parent
      const allQ = (survey?.pages || []).flatMap((p) => p.questions || []);
      const childCount = allQ.filter((q) => q.parentId === parentQuestion.id).length;

      return addQuestion(targetPageId, "NUMBER", {
        questionText: `Tiêu chí con ${childCount + 1}`,
        parentId: parentQuestion.id,
        weight: 1.0,
        aggregationType: "NONE",
      });
    },
    [survey, addQuestion]
  );

  // 7. SAVE QUESTION
  const saveQuestion = useCallback(
    async (question: QuestionItem) => {
      setSavingMap((prev) => ({ ...prev, [question.id]: "SAVING" }));
      try {
        let qTypeId =
          question.questionTypeId ||
          (question as any).type?.id ||
          (question as any).questionType?.id;
        if (!qTypeId && question.questionTypeCode) {
          qTypeId = QUESTION_TYPE_ID_MAP[question.questionTypeCode] || QUESTION_TYPE_ID_MAP.TEXT;
        }
        if (!qTypeId) {
          qTypeId = QUESTION_TYPE_ID_MAP.TEXT;
        }

        const payload = {
          id: question.id,
          questionText: (question.questionText?.trim() || "Câu hỏi").slice(0, 1000),
          description: question.description || "",
          questionTypeId: qTypeId,
          isRequired: Boolean(question.isRequired),
          orderIndex: question.orderIndex || 1,
          imageUrl: question.imageUrl || null,
          videoUrl: question.videoUrl || null,
          audioUrl: question.audioUrl || null,
          parentId: question.parentId || null,
          weight: question.weight ?? 1.0,
          aggregationType: question.aggregationType || "NONE",
          aggregationFormula: question.aggregationFormula || null,
          matrixConfig: question.matrixConfig || null,
          options: (question.options || []).map((o: OptionItem, idx: number) => ({
            id: o.id?.startsWith("opt_") ? null : o.id,
            optionText: o.optionText || `Lựa chọn ${idx + 1}`,
            imageUrl: o.imageUrl || null,
            orderIndex: idx + 1,
          })),
        };

        const token = getToken();
        const res = await fetch(`${API_QUESTIONS}/${question.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error("Lỗi lưu câu hỏi:", errData);
          throw new Error(errData.message || `Lưu câu hỏi thất bại (${res.status})`);
        }

        const updated: QuestionItem = await res.json();
        setSurvey((cur) => {
          if (!cur) return cur;
          return {
            ...cur,
            pages: (cur.pages || []).map((p) => ({
              ...p,
              questions: (p.questions || []).map((q) =>
                q.id === question.id ? { ...q, ...updated, questionTypeId: qTypeId } : q
              ),
            })),
          };
        });

        setSavingMap((prev) => ({ ...prev, [question.id]: "SAVED" }));
        setTimeout(() => {
          setSavingMap((prev) => {
            const next = { ...prev };
            delete next[question.id];
            return next;
          });
        }, 1500);
      } catch (err: any) {
        console.error("Lỗi lưu câu hỏi:", err);
        setSavingMap((prev) => ({ ...prev, [question.id]: "ERROR" }));
        throw err;
      }
    },
    [setSurvey]
  );

  // 8. DELETE QUESTION
  const deleteQuestion = useCallback(
    async (questionId: string) => {
      setIsBusy(true);
      try {
        const token = getToken();
        const res = await fetch(`${API_QUESTIONS}/${questionId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error("Lỗi xóa câu hỏi:", errData);
          throw new Error(errData.message || `Không thể xóa câu hỏi (${res.status})`);
        }

        setSurvey((cur) => {
          if (!cur) return cur;
          return {
            ...cur,
            pages: (cur.pages || []).map((p) => ({
              ...p,
              questions: (p.questions || []).filter((q) => q.id !== questionId),
            })),
          };
        });
      } finally {
        setIsBusy(false);
      }
    },
    [setSurvey]
  );

  // 9. DUPLICATE QUESTION
  const duplicateQuestion = useCallback(
    async (sourceQuestion: QuestionItem, pageId: string) => {
      return addQuestion(pageId, sourceQuestion.questionTypeCode, {
        questionText: `${sourceQuestion.questionText || "Câu hỏi"} (Bản sao)`,
        description: sourceQuestion.description,
        isRequired: sourceQuestion.isRequired,
        parentId: sourceQuestion.parentId,
        weight: sourceQuestion.weight,
        aggregationType: sourceQuestion.aggregationType,
        matrixConfig: sourceQuestion.matrixConfig,
        validationRules: sourceQuestion.validationRules,
        options: (sourceQuestion.options || []).map((o, idx) => ({
          id: `opt_dup_${idx}`,
          optionText: o.optionText,
          imageUrl: o.imageUrl,
          orderIndex: idx + 1,
        })),
      });
    },
    [addQuestion]
  );

  return {
    isBusy,
    savingMap,
    updateSurveyMeta,
    addPage,
    patchPage,
    deletePage,
    addQuestion,
    addChildQuestion,
    saveQuestion,
    deleteQuestion,
    duplicateQuestion,
  };
}

