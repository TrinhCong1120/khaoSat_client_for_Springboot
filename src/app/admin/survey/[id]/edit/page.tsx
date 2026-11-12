"use client";

import React, { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { FiAlertTriangle } from "react-icons/fi";

// Custom Hooks (Clean-Room Architecture: Logic decoupled from UI)
import { useSurveyEditorData } from "@/hooks/useSurveyEditorData";
import { useSurveyEditorActions } from "@/hooks/useSurveyEditorActions";

// New Clean-Room Builder Components
import BuilderHeader from "@/components/surveys/builder/BuilderHeader";
import BuilderStructureSidebar from "@/components/surveys/builder/BuilderStructureSidebar";
import BuilderMobileDrawer from "@/components/surveys/builder/BuilderMobileDrawer";
import BuilderCanvas from "@/components/surveys/builder/BuilderCanvas";
import BuilderQuestionPalette from "@/components/surveys/builder/BuilderQuestionPalette";
import BuilderConditionSection from "@/components/surveys/builder/BuilderConditionSection";

// Modals
import ConfirmModal from "@/components/ui/modal/ConfirmModal";
import SurveyAccessModal from "@/components/surveys/SurveyAccessModal";
import SurveyPublicationModal from "@/components/surveys/SurveyPublicationModal";
import GoogleAccountManagerModal from "@/components/surveys/GoogleAccountManagerModal";

// Heavy Component dynamic import (Vercel best practice: bundle-dynamic-imports)
const SurveyLivePreview = dynamic(
  () => import("@/components/surveys/SurveyLivePreview"),
  {
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
          <p className="text-xs font-semibold text-gray-500">Đang chuẩn bị bản xem trước...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export default function EditSurveyPage() {
  const params = useParams<{ id: string }>();
  const surveyId = String(params?.id ?? "");

  // 1. DATA LAYER
  const {
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
    isTreeCollapsed,
    setIsTreeCollapsed,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
  } = useSurveyEditorData(surveyId);

  // 2. ACTIONS LAYER
  const {
    savingMap,
    addPage,
    patchPage,
    deletePage,
    addQuestion,
    addChildQuestion,
    saveQuestion,
    deleteQuestion,
    duplicateQuestion,
    updateSurveyMeta,
  } = useSurveyEditorActions({
    survey,
    setSurvey,
    setActivePageId,
    setActiveQuestionId,
  });

  // 3. UI STATE
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Delete Page Modal State
  const [deletePageModal, setDeletePageModal] = useState<{
    isOpen: boolean;
    pageId: string | null;
  }>({
    isOpen: false,
    pageId: null,
  });
  const [isDeletingPage, setIsDeletingPage] = useState(false);

  // Delete Question Modal State
  const [deleteQuestionModal, setDeleteQuestionModal] = useState<{
    isOpen: boolean;
    questionId: string | null;
  }>({
    isOpen: false,
    questionId: null,
  });
  const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);

  // Handlers
  const handleSelectQuestion = useCallback(
    (questionId: string) => {
      setActiveQuestionId(questionId);
      const el = document.getElementById(`survey-question-${questionId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [setActiveQuestionId]
  );

  const confirmDeletePage = useCallback((pageId: string) => {
    setDeletePageModal({ isOpen: true, pageId });
  }, []);

  const executeDeletePage = useCallback(async () => {
    if (!deletePageModal.pageId) return;
    setIsDeletingPage(true);
    try {
      await deletePage(deletePageModal.pageId);
      setDeletePageModal({ isOpen: false, pageId: null });
    } finally {
      setIsDeletingPage(false);
    }
  }, [deletePageModal.pageId, deletePage]);

  const confirmDeleteQuestion = useCallback((questionId: string) => {
    setDeleteQuestionModal({ isOpen: true, questionId });
  }, []);

  const executeDeleteQuestion = useCallback(async () => {
    if (!deleteQuestionModal.questionId) return;
    setIsDeletingQuestion(true);
    try {
      await deleteQuestion(deleteQuestionModal.questionId);
      setDeleteQuestionModal({ isOpen: false, questionId: null });
    } finally {
      setIsDeletingQuestion(false);
    }
  }, [deleteQuestionModal.questionId, deleteQuestion]);

  const handlePaletteSelectType = useCallback(
    async (typeCode: string) => {
      if (!activePageId) return;
      if (typeCode === "AGGREGATION") {
        await addQuestion(activePageId, "NUMBER", {
          questionText: "Tiêu chí Tổng hợp mới",
          aggregationType: "SUM",
        });
      } else {
        await addQuestion(activePageId, typeCode);
      }
    },
    [activePageId, addQuestion]
  );

  const handleAddBottomQuestion = useCallback(async () => {
    if (!activePageId) return;
    await addQuestion(activePageId, "TEXT");
  }, [activePageId, addQuestion]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="size-10 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
          Đang tải dữ liệu khảo sát...
        </p>
      </div>
    );
  }

  // Error state
  if (error || !survey) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/50 dark:bg-rose-950/20 my-10">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
          <FiAlertTriangle size={22} />
        </div>
        <h2 className="text-base font-bold text-rose-900 dark:text-rose-200">
          Không thể tải khảo sát
        </h2>
        <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
          {error || "Khảo sát không tồn tại hoặc bạn không có quyền truy cập."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* 1. TOP BUILDER HEADER */}
      <BuilderHeader
        survey={survey}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isTreeCollapsed={isTreeCollapsed}
        setIsTreeCollapsed={setIsTreeCollapsed}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        onSaveSurvey={() => updateSurveyMeta({})}
        onOpenPublishModal={() => setIsPublishModalOpen(true)}
        onOpenAccessModal={() => setIsAccessModalOpen(true)}
        onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
      />

      {/* 2. MODE: LIVE PREVIEW */}
      {activeTab === "PREVIEW" ? (
        <div className="mx-auto max-w-4xl animate-in fade-in duration-200">
          <SurveyLivePreview survey={survey} conditions={conditions} />
        </div>
      ) : (
        /* 3. MODE: BUILDER CANVAS & SIDEBAR */
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* DESKTOP STRUCTURE SIDEBAR */}
          <BuilderStructureSidebar
            survey={survey}
            activePageId={activePageId}
            activeQuestionId={activeQuestionId}
            isCollapsed={isTreeCollapsed}
            onToggleCollapse={() => setIsTreeCollapsed((prev) => !prev)}
            onSelectPage={(pageId) => setActivePageId(pageId)}
            onAddPage={() => void addPage()}
            onDeletePage={confirmDeletePage}
            onSelectQuestion={handleSelectQuestion}
            onAddChildQuestion={(parent, pId) => void addChildQuestion(parent, pId)}
          />

          {/* MAIN FORM BUILDER CANVAS */}
          <BuilderCanvas
            survey={survey}
            activePage={activePage}
            activeQuestionId={activeQuestionId}
            onUpdatePage={patchPage}
            onDeletePage={confirmDeletePage}
            onUpdateQuestion={(qId, updates) => {
              setSurvey((cur) => {
                if (!cur) return cur;
                return {
                  ...cur,
                  pages: (cur.pages || []).map((p) => ({
                    ...p,
                    questions: (p.questions || []).map((q) =>
                      q.id === qId ? { ...q, ...updates } : q
                    ),
                  })),
                };
              });
            }}
            onSaveQuestion={saveQuestion}
            onDeleteQuestion={confirmDeleteQuestion}
            onDuplicateQuestion={(q) => activePageId && void duplicateQuestion(q, activePageId)}
            onAddChildQuestion={(parent) => activePageId && void addChildQuestion(parent, activePageId)}
            onOpenPalette={() => setIsPaletteOpen(true)}
            onAddBottomQuestion={handleAddBottomQuestion}
            savingMap={savingMap}
          >
            {/* CONDITIONAL LOGIC BRANCHING */}
            <BuilderConditionSection
              survey={survey}
              conditions={conditions}
              setConditions={setConditions}
            />
          </BuilderCanvas>
        </div>
      )}

      {/* 4. MOBILE BOTTOM SHEET DRAWER (SOLVES OVERLAPPING ON MOBILE) */}
      <BuilderMobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        survey={survey}
        activePageId={activePageId}
        activeQuestionId={activeQuestionId}
        onSelectPage={(pageId) => setActivePageId(pageId)}
        onAddPage={() => void addPage()}
        onDeletePage={confirmDeletePage}
        onSelectQuestion={handleSelectQuestion}
        onAddChildQuestion={(parent, pId) => void addChildQuestion(parent, pId)}
      />

      {/* 5. QUESTION TYPE PALETTE MODAL */}
      <BuilderQuestionPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelectType={handlePaletteSelectType}
      />

      {/* 6. CONFIRM DELETE PAGE MODAL */}
      <ConfirmModal
        isOpen={deletePageModal.isOpen}
        onClose={() => setDeletePageModal({ isOpen: false, pageId: null })}
        onConfirm={executeDeletePage}
        title="Xác nhận xóa trang"
        message="Xóa trang này cùng toàn bộ câu hỏi bên trong?"
        description="Các câu hỏi và dữ liệu liên quan trong trang này sẽ bị xóa vĩnh viễn khỏi khảo sát."
        confirmText="Xóa trang"
        variant="danger"
        isLoading={isDeletingPage}
      />

      {/* 7. CONFIRM DELETE QUESTION MODAL */}
      <ConfirmModal
        isOpen={deleteQuestionModal.isOpen}
        onClose={() => setDeleteQuestionModal({ isOpen: false, questionId: null })}
        onConfirm={executeDeleteQuestion}
        title="Xác nhận xóa câu hỏi"
        message="Bạn có chắc chắn muốn xóa câu hỏi này không?"
        description="Hành động này không thể hoàn tác. Mọi câu trả lời liên quan tới câu hỏi này cũng sẽ bị ảnh hưởng."
        confirmText="Xóa câu hỏi"
        cancelText="Hủy bỏ"
        variant="danger"
        isLoading={isDeletingQuestion}
      />

      {/* 8. SURVEY ACCESS MODAL */}
      {isAccessModalOpen && (
        <SurveyAccessModal
          survey={{ id: survey.id, title: survey.title, canManageAccess: true }}
          onClose={() => setIsAccessModalOpen(false)}
          onChanged={() => {}}
        />
      )}

      {/* 9. SURVEY PUBLICATION MODAL */}
      {isPublishModalOpen && (
        <SurveyPublicationModal
          survey={survey as any}
          onClose={() => setIsPublishModalOpen(false)}
          onChanged={(updatedSurvey) => setSurvey(updatedSurvey as any)}
        />
      )}

      {/* 10. GOOGLE ACCOUNT MANAGER MODAL */}
      {isGoogleModalOpen && (
        <GoogleAccountManagerModal
          isOpen={isGoogleModalOpen}
          onClose={() => setIsGoogleModalOpen(false)}
        />
      )}
    </div>
  );
}
