"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiEye,
  FiEdit3,
  FiSave,
  FiShare2,
  FiUsers,
  FiLayers,
  FiMenu,
  FiArrowUp,
} from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import type { SurveyData } from "@/hooks/useSurveyEditorData";

interface BuilderHeaderProps {
  survey: SurveyData | null;
  activeTab: "BUILDER" | "PREVIEW";
  setActiveTab: (tab: "BUILDER" | "PREVIEW") => void;
  isTreeCollapsed: boolean;
  setIsTreeCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenMobileDrawer: () => void;
  onSaveSurvey: () => void;
  onOpenPublishModal: () => void;
  onOpenAccessModal: () => void;
  onOpenGoogleModal?: () => void;
  isSaving?: boolean;
}

export default function BuilderHeader({
  survey,
  activeTab,
  setActiveTab,
  isTreeCollapsed,
  setIsTreeCollapsed,
  onOpenMobileDrawer,
  onSaveSurvey,
  onOpenPublishModal,
  onOpenAccessModal,
  onOpenGoogleModal,
  isSaving = false,
}: BuilderHeaderProps) {
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);
  const [isFloating, setIsFloating] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return;
      const rect = headerRef.current.getBoundingClientRect();
      // AdminHeader is sticky at top with height ~72px.
      // When the bottom of the BuilderHeader scrolls past 72px, activate the floating Figma dock!
      setIsFloating(rect.bottom <= 72);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        ref={headerRef}
        className="relative z-10 mb-5 rounded-2xl border border-gray-200/90 bg-white p-3 sm:p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 transition-all"
      >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* LEFT: BACK BUTTON, TITLE & SURVEY CODE */}
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/survey")}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition"
            title="Quay lại danh sách khảo sát"
          >
            <FiArrowLeft size={16} />
          </button>

          {/* TOGGLE STRUCTURE BUTTON (DESKTOP) */}
          <button
            type="button"
            onClick={() => setIsTreeCollapsed((prev) => !prev)}
            className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
              isTreeCollapsed
                ? "border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 shadow-xs"
                : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            }`}
            title={isTreeCollapsed ? "Mở Cấu trúc Khảo sát" : "Thu gọn Cấu trúc Khảo sát"}
          >
            <FiLayers size={14} />
            <span>{isTreeCollapsed ? "Mở Cấu trúc" : "Thu gọn"}</span>
          </button>

          {/* TOGGLE STRUCTURE BUTTON (MOBILE) */}
          <button
            type="button"
            onClick={onOpenMobileDrawer}
            className="inline-flex lg:hidden items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 text-xs font-bold transition active:scale-95"
            title="Mở danh sách trang và câu hỏi"
          >
            <FiMenu size={14} />
            <span>Cấu trúc ({survey?.pages?.length || 0})</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                {survey?.title || "Đang tải khảo sát..."}
              </h1>
              {survey?.code && (
                <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  #{survey.code}
                </span>
              )}
            </div>
            <p className="hidden sm:block text-[11px] text-gray-400 truncate">
              {survey?.pages?.length || 0} trang •{" "}
              {(survey?.pages || []).reduce(
                (acc, p) => acc + (p.questions?.length || 0),
                0
              )}{" "}
              tiêu chí đánh giá
            </p>
          </div>
        </div>

        {/* CENTER: MODE SWITCHER (BUILDER vs LIVE PREVIEW) */}
        <div className="flex items-center rounded-xl bg-gray-100 p-1 dark:bg-gray-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("BUILDER")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
              activeTab === "BUILDER"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <FiEdit3 size={13} className="shrink-0" />
            <span className="whitespace-nowrap">Thiết kế</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PREVIEW")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
              activeTab === "PREVIEW"
                ? "bg-brand-500 text-white shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <FiEye size={13} className="shrink-0" />
            <span className="whitespace-nowrap">Xem trước</span>
          </button>
        </div>

        {/* RIGHT: ACTION BUTTONS */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenGoogleModal && (
            <button
              type="button"
              onClick={onOpenGoogleModal}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 whitespace-nowrap shrink-0 transition"
              title="Liên kết tài khoản Google Forms"
            >
              <FcGoogle size={15} className="shrink-0" />
              <span className="whitespace-nowrap">Google</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAccessModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 whitespace-nowrap shrink-0 transition"
            title="Cấu hình phân quyền khảo sát"
          >
            <FiUsers size={13} className="shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Phân quyền</span>
          </button>

          <button
            type="button"
            onClick={onOpenPublishModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 whitespace-nowrap shrink-0 transition"
            title="Xuất bản và hẹn lịch mở khảo sát"
          >
            <FiShare2 size={13} className="shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Xuất bản</span>
          </button>

          <button
            type="button"
            onClick={onSaveSurvey}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-600 active:scale-95 whitespace-nowrap shrink-0 transition disabled:opacity-50"
            title="Lưu khảo sát"
          >
            {isSaving ? (
              <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent shrink-0" />
            ) : (
              <FiSave size={14} className="shrink-0" />
            )}
            <span className="whitespace-nowrap">{isSaving ? "Đang lưu..." : "Lưu"}</span>
          </button>
        </div>
      </div>
    </header>

      {/* ============================================================== */}
      {/* FIGMA-STYLE FLOATING BOTTOM TOOLBAR (DOCKS WHEN HEADER SCROLLS OFF) */}
      {/* ============================================================== */}
      {isFloating && (
        <aside
          role="toolbar"
          aria-label="Thanh công cụ khảo sát nhanh"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-2 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/90 dark:border-gray-700/80 shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 max-w-[96vw] whitespace-nowrap select-none"
        >
          {/* STRUCTURE TOGGLE */}
          <button
            type="button"
            onClick={() => setIsTreeCollapsed((prev) => !prev)}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-brand-400 text-xs font-bold whitespace-nowrap shrink-0 transition"
            title={isTreeCollapsed ? "Mở Cấu trúc Khảo sát" : "Thu gọn Cấu trúc"}
          >
            <FiLayers size={14} className={`shrink-0 ${isTreeCollapsed ? "text-gray-500" : "text-brand-600"}`} />
            <span className="hidden xl:inline whitespace-nowrap">{isTreeCollapsed ? "Mở Cấu trúc" : "Cấu trúc"}</span>
          </button>

          <button
            type="button"
            onClick={onOpenMobileDrawer}
            className="flex lg:hidden items-center gap-1 px-2.5 py-1.5 rounded-xl border border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 text-xs font-bold whitespace-nowrap shrink-0 transition"
            title="Mở cấu trúc khảo sát"
          >
            <FiMenu size={14} className="shrink-0" />
          </button>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />

          {/* SURVEY TITLE & SAVE STATUS */}
          <div className="flex items-center gap-1.5 min-w-0 max-w-[150px] sm:max-w-[220px] md:max-w-[300px] shrink">
            {isSaving ? (
              <span className="size-2 rounded-full bg-amber-500 animate-ping shrink-0" />
            ) : (
              <span className="size-2 rounded-full bg-emerald-500 shrink-0" title="Tất cả thay đổi đã được lưu" />
            )}
            <span className="truncate text-xs font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">
              {survey?.title || "Khảo sát"}
            </span>
          </div>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />

          {/* FIGMA-STYLE MODE SWITCHER: THIẾT KẾ / XEM TRƯỚC */}
          <div className="flex items-center rounded-xl bg-gray-100/90 p-0.5 dark:bg-gray-800/90 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("BUILDER")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap shrink-0 transition ${
                activeTab === "BUILDER"
                  ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
              title="Chế độ Thiết kế"
            >
              <FiEdit3 size={12} className="shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Thiết kế</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("PREVIEW")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap shrink-0 transition ${
                activeTab === "PREVIEW"
                  ? "bg-brand-500 text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
              title="Chế độ Xem trước trực tiếp"
            >
              <FiEye size={12} className="shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Xem trước</span>
            </button>
          </div>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />

          {/* ACTIONS: ACCESS, PUBLISH */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {onOpenGoogleModal && (
              <button
                type="button"
                onClick={onOpenGoogleModal}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 text-xs font-bold whitespace-nowrap shrink-0 transition flex items-center gap-1"
                title="Google Forms"
              >
                <FcGoogle size={14} className="shrink-0" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenAccessModal}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold whitespace-nowrap shrink-0 transition flex items-center gap-1.5"
              title="Phân quyền khảo sát"
            >
              <FiUsers size={13} className="shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Phân quyền</span>
            </button>

            <button
              type="button"
              onClick={onOpenPublishModal}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold whitespace-nowrap shrink-0 transition flex items-center gap-1.5"
              title="Xuất bản khảo sát"
            >
              <FiShare2 size={13} className="shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Xuất bản</span>
            </button>

            {/* SAVE BUTTON */}
            <button
              type="button"
              onClick={onSaveSurvey}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-600 active:scale-95 whitespace-nowrap shrink-0 transition disabled:opacity-50"
              title="Lưu khảo sát"
            >
              {isSaving ? (
                <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent shrink-0" />
              ) : (
                <FiSave size={13} className="shrink-0" />
              )}
              <span className="whitespace-nowrap">{isSaving ? "Lưu..." : "Lưu"}</span>
            </button>

            {/* QUICK SCROLL TO TOP */}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 shrink-0 transition"
              title="Cuộn lên đầu trang"
            >
              <FiArrowUp size={14} className="shrink-0" />
            </button>
          </div>
        </aside>
      )}
    </>
  );
}

