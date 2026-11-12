"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { API_SURVEYS, API_CONDITIONS } from "@/lib/api";
import { getToken } from "@/lib/auth";

export interface OptionItem {
  id: string;
  optionText?: string;
  imageUrl?: string | null;
  orderIndex?: number;
}

export interface QuestionItem {
  id: string;
  questionText?: string;
  description?: string;
  questionTypeId?: string;
  questionTypeCode?: string;
  isRequired?: boolean;
  orderIndex?: number;
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  parentId?: string | null;
  weight?: number | null;
  aggregationType?: string | null;
  aggregationFormula?: string | null;
  matrixConfig?: string | null;
  options?: OptionItem[];
  validationRules?: any[] | Record<string, unknown> | null;
}

export interface PageItem {
  id: string;
  title?: string;
  description?: string;
  orderIndex?: number;
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  questions?: QuestionItem[];
}

export interface SurveyConditionItem {
  id?: string;
  sourceQuestionId: string;
  targetType?: "QUESTION" | "PAGE" | string;
  targetQuestionId?: string | null;
  targetPageId?: string | null;
  action: "SHOW" | "HIDE" | string;
  sourceValue?: string;
}

export interface SurveyData {
  id: string;
  title: string;
  code?: string;
  description?: string;
  imageUrl?: string | null;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  targetCount?: number | null;
  requireLogin?: boolean;
  allowPublic?: boolean;
  surveyType?: string;
  validationRevision?: number;
  revision?: number;
  pages?: PageItem[];
  conditions?: SurveyConditionItem[];
}

export function useSurveyEditorData(surveyId: string) {
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [conditions, setConditions] = useState<SurveyConditionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor mode & navigation state
  const [activeTab, setActiveTab] = useState<"BUILDER" | "PREVIEW">("BUILDER");
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  // UI state
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Fetch full survey
  const fetchSurvey = useCallback(async () => {
    if (!surveyId) return;
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      const res = await fetch(`${API_SURVEYS}/${surveyId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Không tải được thông tin khảo sát (${res.status})`);
      }

      const data: SurveyData = await res.json();
      setSurvey(data);

      // Auto-select first page if activePageId not set or invalid
      if (data.pages && data.pages.length > 0) {
        setActivePageId((current) => {
          const exists = data.pages?.some((p) => p.id === current);
          return exists && current ? current : data.pages![0].id;
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi tải khảo sát");
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  // Fetch survey conditions
  const fetchConditions = useCallback(async () => {
    if (!surveyId) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_CONDITIONS}/survey/${surveyId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setConditions(data);
        }
      }
    } catch {
      // ignore condition fetch fail
    }
  }, [surveyId]);

  useEffect(() => {
    void fetchSurvey();
    void fetchConditions();
  }, [fetchSurvey, fetchConditions]);

  // Derived state
  const activePage = useMemo(() => {
    if (!survey?.pages || !activePageId) return null;
    return survey.pages.find((p) => p.id === activePageId) || survey.pages[0] || null;
  }, [survey?.pages, activePageId]);

  const allQuestions = useMemo(() => {
    return (survey?.pages || []).flatMap((p) => p.questions || []);
  }, [survey?.pages]);

  const parentQuestions = useMemo(() => {
    return allQuestions.filter(
      (q) => q.aggregationType && q.aggregationType !== "NONE" && !q.parentId
    );
  }, [allQuestions]);

  return {
    survey,
    setSurvey,
    conditions,
    setConditions,
    loading,
    error,
    activeTab,
    setActiveTab,
    activePageId,
    setActivePageId,
    activeQuestionId,
    setActiveQuestionId,
    activePage,
    allQuestions,
    parentQuestions,
    isTreeCollapsed,
    setIsTreeCollapsed,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    refetch: fetchSurvey,
  };
}

