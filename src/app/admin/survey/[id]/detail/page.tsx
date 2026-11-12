"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiEdit3,
  FiExternalLink,
  FiEye,
  FiFileText,
  FiHelpCircle,
  FiLayers,
  FiLock,
  FiPieChart,
  FiShare2,
  FiShield,
  FiUnlock,
  FiUsers,
  FiX,
  FiBarChart2,
  FiRefreshCw,
} from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { QRCodeSVG } from "qrcode.react";

import ApiNotFound from "@/components/common/ApiNotFound";
import SurveyPublicationModal, {
  getSurveyStatusMeta,
  type PublishableSurvey,
  type SurveyStatus,
} from "@/components/surveys/SurveyPublicationModal";
import SurveyAccessModal from "@/components/surveys/SurveyAccessModal";
import GoogleAccountManagerModal from "@/components/surveys/GoogleAccountManagerModal";
import { API_REPORTS, API_SURVEYS, API_GOOGLE_INTEGRATIONS } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { SurveyDashboard } from "@/types/survey-dashboard";

type SurveyOption = {
  id: string;
  optionText: string;
  orderIndex?: number;
};

type SurveyQuestion = {
  id: string;
  questionText: string;
  questionTypeCode: string;
  description?: string | null;
  isRequired?: boolean;
  orderIndex?: number;
  options?: SurveyOption[];
};

type SurveyPageItem = {
  id: string;
  title: string;
  description?: string | null;
  openAt?: string | null;
  closeAt?: string | null;
  orderIndex?: number;
  questions?: SurveyQuestion[];
};

type SurveyDetail = {
  id: string;
  title: string;
  shareCode?: string | null;
  description?: string | null;
  creatorUser?: string | null;
  creatorUserId?: string | null;
  groupId?: string | null;
  canViewResponses?: boolean;
  canExportData?: boolean;
  canManagePublication?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canManageAccess?: boolean;
  createdAt?: string | null;
  status?: SurveyStatus | string | null;
  openAt?: string | null;
  closeAt?: string | null;
  pages?: SurveyPageItem[];
  scheduleWarnings?: string[];
  googleIntegration?: {
    id: string;
    provider: string;
    googleFormId: string;
    editUrl: string;
    responseUrl: string;
    syncStatus: string;
    lastSyncedAt?: string | null;
    lastSyncError?: string | null;
  } | null;
};

type AccessUser = {
  userId: string;
  username: string;
  email?: string | null;
  permissions: string[];
};

const permissionLabels: Record<string, string> = {
  VIEW: "Xem",
  EDIT: "Chỉnh sửa",
  VIEW_RESPONSES: "Xem kết quả",
  EXPORT_DATA: "Xuất dữ liệu",
  MANAGE_PUBLICATION: "Xuất bản",
  DELETE: "Xóa",
  MANAGE_ACCESS: "Phân quyền",
  MANAGE_GROUP: "Quản lý nhóm",
};

const questionTypeLabels: Record<string, { label: string; color: string }> = {
  TEXT: { label: "Văn bản ngắn", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  TEXTAREA: { label: "Đoạn văn", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  NUMBER: { label: "Số", color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  DATE: { label: "Ngày tháng", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  SINGLE_CHOICE: { label: "Chọn 1", color: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  MULTIPLE_CHOICE: { label: "Chọn nhiều", color: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  RATING: { label: "Đánh giá sao", color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  ADDRESS: { label: "Địa chỉ", color: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
};

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "Không giới hạn";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function SurveyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const surveyId = String(id ?? "");

  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick stats
  const [dashboard, setDashboard] = useState<SurveyDashboard | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Access permissions list
  const [accessUsers, setAccessUsers] = useState<AccessUser[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  // Modals
  const [isPublicationModalOpen, setIsPublicationModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const fetchSurvey = useCallback(async () => {
    if (!surveyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_SURVEYS}/${encodeURIComponent(surveyId)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        throw new Error(`Không thể tải thông tin khảo sát (${res.status})`);
      }
      const data: SurveyDetail = await res.json();
      setSurvey(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    void fetchSurvey();
  }, [fetchSurvey]);

  // Load quick analytics if permitted
  useEffect(() => {
    if (!survey || !survey.canViewResponses) return;
    let active = true;
    setDashboardLoading(true);
    fetch(`${API_REPORTS}/survey/${encodeURIComponent(survey.id)}/dashboard?bucket=AUTO`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => (res.ok ? (res.json() as Promise<SurveyDashboard>) : null))
      .then((data) => {
        if (active && data) setDashboard(data);
      })
      .catch((cause) => console.error("Không tải được dashboard nhanh:", cause))
      .finally(() => {
        if (active) setDashboardLoading(false);
      });
    return () => {
      active = false;
    };
  }, [survey]);

  // Load access list if permitted
  const fetchAccessList = useCallback(() => {
    if (!survey || !survey.canManageAccess) return;
    setAccessLoading(true);
    fetch(`${API_SURVEYS}/${encodeURIComponent(survey.id)}/access`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => (res.ok ? (res.json() as Promise<AccessUser[]>) : []))
      .then((data) => setAccessUsers(data))
      .catch((cause) => console.error("Không tải được danh sách quyền:", cause))
      .finally(() => setAccessLoading(false));
  }, [survey]);

  useEffect(() => {
    fetchAccessList();
  }, [fetchAccessList]);

  const sortedPages = useMemo(() => {
    if (!survey?.pages) return [];
    return [...survey.pages].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [survey?.pages]);

  const totalQuestions = useMemo(() => {
    return sortedPages.reduce((acc, p) => acc + (p.questions?.length ?? 0), 0);
  }, [sortedPages]);

  const shareRef = survey?.shareCode || survey?.id || "";
  const publicPath = `/survey/${encodeURIComponent(shareRef)}`;
  const fullShareUrl = origin ? `${origin}${publicPath}` : publicPath;
  const googleShareUrl =
    survey?.googleIntegration?.responseUrl ||
    (survey?.googleIntegration?.googleFormId
      ? `https://docs.google.com/forms/d/e/${survey.googleIntegration.googleFormId}/viewform`
      : "");
  const hasGoogle = Boolean(survey?.googleIntegration && googleShareUrl);

  const copyShareLink = async (urlToCopy?: string) => {
    const targetUrl = urlToCopy || fullShareUrl;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedLink(targetUrl);
      setTimeout(() => setCopiedLink(null), 1800);
    } catch {
      alert("Không thể sao chép liên kết.");
    }
  };

  const handlePublicationChanged = (updated: PublishableSurvey) => {
    setSurvey((curr) => (curr ? { ...curr, ...updated, googleIntegration: curr.googleIntegration } : curr));
  };

  const [googleBusy, setGoogleBusy] = useState(false);
  const [isGoogleConnectModalOpen, setIsGoogleConnectModalOpen] = useState(false);

  const handleEditGoogleForm = async () => {
    if (!survey) return;
    try {
      setGoogleBusy(true);
      const token = getToken();

      const directEditUrl =
        survey.googleIntegration?.editUrl ||
        (survey.googleIntegration?.googleFormId
          ? `https://docs.google.com/forms/d/${survey.googleIntegration.googleFormId}/edit`
          : null);

      // Kiểm tra trước nếu người dùng chưa có tài khoản Google nào được liên kết
      let hasActiveConn = false;
      try {
        const connRes = await fetch(`${API_GOOGLE_INTEGRATIONS}/connections`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (connRes.ok) {
          const conns: any[] = await connRes.json();
          hasActiveConn = Array.isArray(conns) && conns.some((c) => c.status === "ACTIVE");
        }
      } catch (e) {
        console.warn("Could not check google connections", e);
      }

      if (!hasActiveConn) {
        setIsGoogleConnectModalOpen(true);
        return;
      }

      // Gọi cấp quyền ngầm trong nền
      try {
        const res = await fetch(`${API_SURVEYS}/${survey.id}/google/edit-access`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const targetUrl = data.editUrl || directEditUrl;
          if (targetUrl) {
            window.open(targetUrl, "_blank");
            return;
          }
        }
      } catch (err) {
        console.warn("Silent edit-access error:", err);
      }

      // Mở trực tiếp biểu mẫu Google Forms mà không làm phiền người dùng bằng popup lỗi kỹ thuật
      if (directEditUrl) {
        window.open(directEditUrl, "_blank");
      }
    } catch (err: unknown) {
      console.warn("handleEditGoogleForm error:", err);
    } finally {
      setGoogleBusy(false);
    }
  };

  const handlePullSchema = async () => {
    if (!survey) return;
    try {
      setGoogleBusy(true);
      const token = getToken();
      const res = await fetch(`${API_SURVEYS}/${survey.id}/google/pull-schema`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Không thể kéo cấu trúc.");
      }
      alert("Đã kéo cấu trúc câu hỏi từ Google Form thành công!");
      void fetchSurvey();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Lỗi khi kéo cấu trúc");
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleSyncResponses = async () => {
    if (!survey) return;
    try {
      setGoogleBusy(true);
      const token = getToken();
      const res = await fetch(`${API_SURVEYS}/${survey.id}/google/sync-responses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Không thể đồng bộ câu trả lời.");
      }
      const data = await res.json();
      alert(`Đồng bộ thành công! Có ${data.syncedCount} phản hồi mới (Tổng phản hồi: ${data.totalExternalCount}).`);
      void fetchSurvey();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Lỗi khi đồng bộ câu trả lời");
    } finally {
      setGoogleBusy(false);
    }
  };

  if (notFound) {
    return (
      <ApiNotFound
        title="Không tìm thấy khảo sát"
        description="Khảo sát này không tồn tại hoặc bạn không có quyền xem thông tin."
        href="/admin/survey"
        linkLabel="Quay lại danh sách khảo sát"
      />
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-44 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </main>
    );
  }

  if (error || !survey) {
    return (
      <main className="mx-auto max-w-[1500px] p-6">
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <h2 className="text-lg font-semibold">Đã xảy ra lỗi</h2>
          <p className="mt-2 text-sm">{error || "Không thể tải khảo sát"}</p>
          <button
            type="button"
            onClick={() => void fetchSurvey()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  const statusMeta = getSurveyStatusMeta(survey.status);

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6">
      {/* NAVIGATION & ACTION HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/survey"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <FiArrowLeft size={16} /> Danh sách khảo sát
          </Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Tổng quan & Xem trước</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <FiShare2 size={15} /> Chia sẻ & Mã QR
          </button>

          <a
            href={fullShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/70 px-4 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
          >
            <FiExternalLink size={15} /> Mở làm bài (Public)
          </a>

          {survey.googleIntegration ? (
            <>
              {survey.canEdit && (
                <button
                  type="button"
                  onClick={handleEditGoogleForm}
                  disabled={googleBusy}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-purple-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50"
                >
                  <FcGoogle size={16} /> Sửa trên Google Forms
                </button>
              )}
              {survey.canEdit && (
                <button
                  type="button"
                  onClick={handlePullSchema}
                  disabled={googleBusy}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-50"
                  title="Kéo cấu trúc câu hỏi mới nhất từ Google Forms về hệ thống"
                >
                  <FiRefreshCw size={14} className={googleBusy ? "animate-spin" : ""} /> Kéo cấu trúc
                </button>
              )}
              {survey.canViewResponses && (
                <button
                  type="button"
                  onClick={handleSyncResponses}
                  disabled={googleBusy}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 disabled:opacity-50"
                  title="Đồng bộ câu trả lời mới từ Google Forms về database"
                >
                  <FiRefreshCw size={14} className={googleBusy ? "animate-spin" : ""} /> Đồng bộ câu trả lời
                </button>
              )}
            </>
          ) : (
            survey.canEdit && (
              <Link
                href={`/admin/survey/${survey.id}/edit`}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <FiEdit3 size={15} /> Chỉnh sửa câu hỏi
              </Link>
            )
          )}
        </div>
      </div>

      {/* GOOGLE FORMS INTEGRATION CARD */}
      {survey.googleIntegration && (
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/70 to-indigo-50/50 p-5 shadow-sm dark:border-purple-900/40 dark:from-purple-950/20 dark:to-indigo-950/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-gray-800">
                <FcGoogle className="text-2xl" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Khảo sát tích hợp Google Forms</h3>
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                    {survey.googleIntegration.syncStatus}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Form ID: <code className="font-mono text-purple-700 dark:text-purple-400">{survey.googleIntegration.googleFormId}</code>
                  {survey.googleIntegration.lastSyncedAt && (
                    <span className="ml-2">
                      • Đồng bộ lần cuối: {new Date(survey.googleIntegration.lastSyncedAt).toLocaleString("vi-VN")}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={survey.googleIntegration.responseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-50 dark:border-purple-800 dark:bg-gray-900 dark:text-purple-300"
              >
                <FiExternalLink size={13} /> Link Google Form
              </a>
            </div>
          </div>
        </div>
      )}

      {/* SURVEY MAIN INFO BANNER */}
      <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
              {survey.shareCode && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 font-mono text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  Mã: <strong className="font-semibold text-brand-600 dark:text-brand-400">{survey.shareCode}</strong>
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              {survey.title}
            </h1>

            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {survey.description || "Chưa có mô tả cho khảo sát này."}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-right text-xs text-gray-500">
            <div>
              Người tạo: <strong className="font-semibold text-gray-800 dark:text-gray-200">{survey.creatorUser || "—"}</strong>
            </div>
            <div>Ngày tạo: {formatDateTime(survey.createdAt)}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {sortedPages.length} trang
              </span>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                {totalQuestions} câu hỏi
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TOP THREE TILES: QUICK ANALYTICS, PUBLICATION INFO, ACCESS/PERMISSIONS */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* TILE 1: BÁO CÁO NHANH */}
        <section className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <FiBarChart2 size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">Báo cáo nhanh</h2>
                  <p className="text-xs text-gray-500">Hiệu quả và lượt phản hồi</p>
                </div>
              </div>

              {survey.canViewResponses && (
                <Link
                  href={`/admin/survey/${survey.id}/result`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                >
                  Xem chi tiết ↗
                </Link>
              )}
            </div>

            {survey.canViewResponses ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FiEye size={13} /> Lượt xem
                  </div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                    {dashboardLoading ? "…" : (dashboard?.lifetime?.views ?? 0)}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FiCheckCircle size={13} /> Phản hồi
                  </div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {dashboardLoading ? "…" : (dashboard?.lifetime?.submissions ?? 0)}
                  </div>
                </div>

                <div className="col-span-2 rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FiPieChart size={13} /> Tỷ lệ gửi
                  </div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-brand-600 dark:text-brand-400">
                    {dashboardLoading
                      ? "…"
                      : dashboard?.lifetime?.views
                      ? `${Math.round(((dashboard?.lifetime?.submissions ?? 0) / dashboard.lifetime.views) * 100)}%`
                      : "0%"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/20">
                <FiLock className="mx-auto text-gray-400" size={20} />
                <p className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                  Bạn chưa có quyền xem báo cáo & phản hồi của khảo sát này.
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800">
            {survey.canViewResponses ? (
              <Link
                href={`/admin/survey/${survey.id}/result`}
                className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
              >
                <FiBarChart2 size={15} className="shrink-0" /> Xem báo cáo & kết quả
              </Link>
            ) : (
              <button
                type="button"
                disabled
                title="Yêu cầu quyền VIEW_RESPONSES để mở báo cáo"
                className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-400 dark:bg-gray-800 dark:text-gray-500"
              >
                <FiLock size={15} className="shrink-0" /> Báo cáo chi tiết (Chưa có quyền)
              </button>
            )}
          </div>
        </section>

        {/* TILE 2: THÔNG TIN XUẤT BẢN & LỊCH TRÌNH HOẶC TRẠNG THÁI GOOGLE FORMS */}
        {survey.googleIntegration ? (
          <section className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    <FcGoogle size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">Trạng thái Google Forms</h2>
                    <p className="text-xs text-gray-500">Đóng / mở tự động theo Google</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${getSurveyStatusMeta(survey.status).className}`}>
                    {getSurveyStatusMeta(survey.status).label}
                  </span>
                  {survey.googleIntegration.editUrl && (
                    <button
                      type="button"
                      onClick={handleEditGoogleForm}
                      disabled={googleBusy}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:underline dark:text-purple-400 cursor-pointer disabled:opacity-50"
                      title="Mở biểu mẫu trên Google Forms"
                    >
                      Mở Form ↗
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2.5 text-xs">
                <div className="rounded-xl bg-purple-50/60 p-3 text-purple-900 dark:bg-purple-950/30 dark:text-purple-200">
                  <p className="font-semibold text-xs mb-1">Cơ chế đóng / mở:</p>
                  <p className="leading-relaxed text-[11px] text-purple-800 dark:text-purple-300">
                    Khảo sát này liên kết với Google Forms nên <strong>không sử dụng lịch trình nội bộ</strong>. Trạng thái khảo sát tự động cập nhật theo cài đặt <em>&quot;Chấp nhận phản hồi&quot;</em> trên Google Forms.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800/40">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <FiClock size={13} className="text-emerald-500" /> Trạng thái hiện tại:
                  </span>
                  <strong className={`font-semibold ${survey.status === "OPEN" ? "text-emerald-600" : "text-rose-600"}`}>
                    {survey.status === "OPEN" ? "Đang mở (Nhận phản hồi)" : "Đã đóng (Ngừng nhận phản hồi)"}
                  </strong>
                </div>

                {survey.googleIntegration.lastSyncedAt && (
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800/40">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <FiRefreshCw size={13} className="text-blue-500" /> Đồng bộ lần cuối:
                    </span>
                    <strong className="font-semibold text-gray-800 dark:text-gray-200">
                      {new Date(survey.googleIntegration.lastSyncedAt).toLocaleString("vi-VN")}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={handleSyncResponses}
                disabled={googleBusy}
                className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300 dark:hover:bg-purple-500/20"
              >
                <FiRefreshCw size={14} className={googleBusy ? "animate-spin" : ""} />
                {googleBusy ? "Đang đồng bộ…" : "Đồng bộ từ Google"}
              </button>
            </div>
          </section>
        ) : (
          <section className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    <FiCalendar size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">Xuất bản & Lịch trình</h2>
                    <p className="text-xs text-gray-500">Khung thời gian khảo sát</p>
                  </div>
                </div>

                {survey.canManagePublication && (
                  <button
                    type="button"
                    onClick={() => setIsPublicationModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400"
                  >
                    Thiết lập ↗
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800/40">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <FiClock size={13} className="text-emerald-500" /> Bắt đầu mở:
                  </span>
                  <strong className="font-semibold text-gray-800 dark:text-gray-200">
                    {formatDateTime(survey.openAt)}
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800/40">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <FiClock size={13} className="text-rose-500" /> Kết thúc đóng:
                  </span>
                  <strong className="font-semibold text-gray-800 dark:text-gray-200">
                    {formatDateTime(survey.closeAt)}
                  </strong>
                </div>

                <div className="rounded-xl border border-gray-100 p-2.5 dark:border-gray-800">
                  <p className="font-medium text-gray-600 dark:text-gray-400 mb-1.5">Lịch trình theo trang ({sortedPages.length} trang):</p>
                  <div className="max-h-24 space-y-1.5 overflow-y-auto pr-1">
                    {sortedPages.map((page, idx) => (
                      <div key={page.id} className="flex items-center justify-between text-[11px] text-gray-500">
                        <span className="truncate max-w-[150px] font-medium text-gray-700 dark:text-gray-300">
                          {idx + 1}. {page.title || `Trang ${idx + 1}`}
                        </span>
                        <span>
                          {page.openAt || page.closeAt ? "Có lịch riêng" : "Theo toàn khảo sát"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800">
              {survey.canManagePublication ? (
                <button
                  type="button"
                  onClick={() => setIsPublicationModalOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                >
                  <FiCalendar size={15} className="shrink-0" /> Quản lý xuất bản & lên lịch
                </button>
              ) : (
                <div className="py-2 text-center text-xs text-gray-400 italic">
                  Bạn không có quyền quản lý lịch xuất bản
                </div>
              )}
            </div>
          </section>
        )}

        {/* TILE 3: PHÂN QUYỀN TRUY CẬP */}
        <section className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                  <FiShield size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">Phân quyền truy cập</h2>
                  <p className="text-xs text-gray-500">Thành viên có quyền trên khảo sát</p>
                </div>
              </div>

              {survey.canManageAccess && (
                <button
                  type="button"
                  onClick={() => setIsAccessModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400"
                >
                  Cấp quyền ↗
                </button>
              )}
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-xs dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Chủ sở hữu:</span>
                  <strong className="font-semibold text-gray-800 dark:text-gray-200">
                    {survey.creatorUser || "Không rõ"}
                  </strong>
                </div>
              </div>

              {survey.canManageAccess ? (
                <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      Tài khoản được cấp quyền ({accessUsers.length}):
                    </span>
                  </div>

                  {accessLoading ? (
                    <div className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                  ) : accessUsers.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Chưa chia sẻ quyền riêng cho tài khoản nào.</p>
                  ) : (
                    <div className="max-h-28 space-y-2 overflow-y-auto pr-1">
                      {accessUsers.map((user) => (
                        <div key={user.userId} className="rounded-lg border border-gray-100 bg-white p-2 text-xs dark:border-gray-800 dark:bg-gray-900">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{user.username}</span>
                            <span className="text-[10px] text-gray-400">{user.email || ""}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {user.permissions.map((p) => (
                              <span
                                key={p}
                                className="inline-block rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                              >
                                {permissionLabels[p] || p}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800/20">
                  Bạn không có quyền quản lý phân quyền khảo sát này.
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800">
            {survey.canManageAccess ? (
              <button
                type="button"
                onClick={() => setIsAccessModalOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20"
              >
                <FiUsers size={15} className="shrink-0" /> Quản lý danh sách phân quyền
              </button>
            ) : (
              <div className="py-2 text-center text-xs text-gray-400 italic">
                Chỉ người có quyền MANAGE_ACCESS mới có thể cấp quyền
              </div>
            )}
          </div>
        </section>
      </div>

      {/* SECTION 4: PREVIEW OF PAGES & QUESTIONS */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiLayers className="text-brand-500" /> Cấu trúc & Xem trước câu hỏi
            </h2>
            <p className="text-xs text-gray-500">
              Tổng cộng {sortedPages.length} trang và {totalQuestions} câu hỏi đã thiết lập
            </p>
          </div>

          {survey.canEdit && (
            <Link
              href={`/admin/survey/${survey.id}/edit`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Chỉnh sửa thứ tự / thêm câu hỏi ↗
            </Link>
          )}
        </div>

        {sortedPages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
            <FiFileText className="mx-auto text-gray-400" size={32} />
            <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">Chưa có câu hỏi nào</h3>
            <p className="mt-1 text-xs text-gray-500">Khảo sát này hiện chưa được cấu hình trang hoặc câu hỏi.</p>
            {survey.canEdit && (
              <Link
                href={`/admin/survey/${survey.id}/edit`}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
              >
                <FiEdit3 size={14} /> Thêm trang & câu hỏi ngay
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {sortedPages.map((page, pageIdx) => {
              const questions = page.questions ?? [];
              return (
                <div
                  key={page.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                        {pageIdx + 1}
                      </span>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {page.title || `Trang ${pageIdx + 1}`}
                        </h3>
                        {page.description && (
                          <p className="text-xs text-gray-500">{page.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      {questions.length} câu hỏi
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {questions.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400 italic">
                        Trang này chưa có câu hỏi nào.
                      </div>
                    ) : (
                      questions.map((q, qIdx) => {
                        const typeMeta = questionTypeLabels[q.questionTypeCode] || {
                          label: q.questionTypeCode,
                          color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                        };

                        return (
                          <div key={q.id} className="p-4 sm:p-5 hover:bg-gray-50/40 dark:hover:bg-white/[0.01]">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-bold text-gray-500">
                                    Câu {qIdx + 1}
                                  </span>
                                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${typeMeta.color}`}>
                                    {typeMeta.label}
                                  </span>
                                  {q.isRequired ? (
                                    <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                                      * Bắt buộc
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-gray-400">Tùy chọn</span>
                                  )}
                                </div>

                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {q.questionText}
                                </h4>

                                {q.description && (
                                  <p className="text-xs text-gray-500">{q.description}</p>
                                )}
                              </div>
                            </div>

                            {/* PREVIEW OF OPTIONS IF CHOICE TYPE */}
                            {Boolean(q.options && q.options.length > 0) && (
                              <div className="mt-3.5 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-1.5">
                                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                                  Các lựa chọn ({q.options?.length}):
                                </p>
                                <div className="grid gap-1.5 sm:grid-cols-2">
                                  {q.options?.map((opt, oIdx) => (
                                    <div
                                      key={opt.id}
                                      className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-1.5 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-800/30 dark:text-gray-300"
                                    >
                                      <span className="h-2 w-2 rounded-full bg-brand-400 shrink-0" />
                                      <span className="truncate">{opt.optionText}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SHARE / QR CODE MODAL */}
      {isShareModalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="survey-share-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsShareModalOpen(false);
          }}
        >
          <div className={`w-full ${hasGoogle ? "max-w-3xl" : "max-w-md"} rounded-2xl bg-white p-4 sm:p-5 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800`}>
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 id="survey-share-modal-title" className="text-base font-semibold text-gray-900 dark:text-white">
                    Chia sẻ khảo sát
                  </h3>
                  {hasGoogle && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                      <FcGoogle className="text-xs" /> Google Forms
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400 mt-0.5">{survey.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                aria-label="Đóng"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <FiX size={18} />
              </button>
            </div>

            {hasGoogle ? (
              /* DUAL VIEW FOR GOOGLE FORMS INTEGRATION */
              <div className="mt-3.5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* CARD 1: WEBSITE LINK & QR */}
                  <div className="flex flex-col justify-between rounded-xl border border-brand-100 bg-brand-50/30 p-3 dark:border-brand-900/40 dark:bg-brand-950/20">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-gray-900 dark:text-white">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-600 text-white text-[10px]">🌐</span>
                          <span>Link Website</span>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Tự động theo lịch
                        </span>
                      </div>

                      <div className="flex flex-col items-center rounded-lg border border-gray-100 bg-white p-2 dark:border-gray-800 dark:bg-gray-900 shadow-sm">
                        <QRCodeSVG
                          value={fullShareUrl}
                          size={120}
                          level="M"
                          marginSize={2}
                          title={`Mã QR Website ${survey.title}`}
                        />
                        {survey.shareCode && (
                          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                            Mã: <strong className="font-semibold text-brand-600 dark:text-brand-400">{survey.shareCode}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <div className="flex gap-1.5">
                        <a
                          href={fullShareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 flex-1 rounded-lg border border-brand-200 bg-white px-2.5 py-1.5 text-left text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/30 dark:bg-gray-900 dark:text-brand-300"
                        >
                          <span className="block font-medium text-[9px] text-brand-600 dark:text-brand-400 leading-none">Mở tab mới ↗</span>
                          <span className="mt-0.5 block truncate font-mono text-[11px] leading-tight">{fullShareUrl}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => copyShareLink(fullShareUrl)}
                          title="Sao chép link website"
                          className="inline-flex min-w-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-2 text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {copiedLink === fullShareUrl ? <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓</span> : <FiCopy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: GOOGLE FORMS LINK & QR */}
                  <div className="flex flex-col justify-between rounded-xl border border-purple-100 bg-purple-50/30 p-3 dark:border-purple-900/40 dark:bg-purple-950/20">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-gray-900 dark:text-white">
                          <FcGoogle className="text-sm" />
                          <span>Link Google Forms</span>
                        </div>
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                          Trực tiếp Google
                        </span>
                      </div>

                      <div className="flex flex-col items-center rounded-lg border border-gray-100 bg-white p-2 dark:border-gray-800 dark:bg-gray-900 shadow-sm">
                        <QRCodeSVG
                          value={googleShareUrl}
                          size={120}
                          level="M"
                          marginSize={2}
                          title={`Mã QR Google Forms ${survey.title}`}
                        />
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[190px]" title={survey.googleIntegration?.googleFormId}>
                          ID: <span className="font-mono text-[10px] text-gray-600 dark:text-gray-300">{survey.googleIntegration?.googleFormId}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <div className="flex gap-1.5">
                        <a
                          href={googleShareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 flex-1 rounded-lg border border-purple-200 bg-white px-2.5 py-1.5 text-left text-xs font-semibold text-purple-700 transition hover:bg-purple-50 dark:border-purple-500/30 dark:bg-gray-900 dark:text-purple-300"
                        >
                          <span className="block font-medium text-[9px] text-purple-600 dark:text-purple-400 leading-none">Mở trên Google Forms ↗</span>
                          <span className="mt-0.5 block truncate font-mono text-[11px] leading-tight">{googleShareUrl}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => copyShareLink(googleShareUrl)}
                          title="Sao chép link Google Forms"
                          className="inline-flex min-w-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-2 text-gray-600 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {copiedLink === googleShareUrl ? <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓</span> : <FiCopy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200/60 bg-amber-50/60 px-3 py-1.5 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                  💡 <strong>Lưu ý:</strong> Link Website tự động khóa theo lịch xuất bản. Link Google Forms điền trực tiếp trên máy chủ Google.
                </div>
              </div>
            ) : (
              /* SINGLE VIEW FOR REGULAR INTERNAL SURVEY */
              <div className="mt-4 space-y-3.5">
                <div className="flex flex-col items-center rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="rounded-lg bg-white p-2 shadow-sm">
                    <QRCodeSVG
                      value={fullShareUrl}
                      size={150}
                      level="M"
                      marginSize={2}
                      title={`Mã QR mở khảo sát ${survey.title}`}
                    />
                  </div>
                  {survey.shareCode && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Mã chia sẻ: <strong className="font-semibold text-brand-600 dark:text-brand-400">{survey.shareCode}</strong>
                    </p>
                  )}
                  <p className="mt-1 text-center text-[11px] text-gray-500 dark:text-gray-400">Quét mã bằng điện thoại để làm bài khảo sát</p>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Đường dẫn làm bài khảo sát
                  </label>
                  <div className="flex gap-1.5">
                    <a
                      href={fullShareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 rounded-lg border border-brand-200 bg-brand-50/70 px-3 py-2 text-left text-xs font-semibold text-brand-700 transition hover:bg-brand-100/70 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
                    >
                      <span className="block font-medium text-[9px] text-brand-600 dark:text-brand-400 leading-none">Mở trong tab mới ↗</span>
                      <span className="mt-0.5 block truncate font-mono text-[11px]">{fullShareUrl}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => copyShareLink(fullShareUrl)}
                      title="Sao chép link"
                      className="inline-flex min-w-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {copiedLink === fullShareUrl ? <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ Đã chép</span> : <FiCopy size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PUBLICATION MODAL */}
      {isPublicationModalOpen && (
        <SurveyPublicationModal
          survey={survey as PublishableSurvey}
          onClose={() => setIsPublicationModalOpen(false)}
          onChanged={(updated) => {
            handlePublicationChanged(updated);
            void fetchSurvey();
          }}
        />
      )}

      {/* ACCESS PERMISSIONS MODAL */}
      {isAccessModalOpen && (
        <SurveyAccessModal
          survey={{ id: survey.id, title: survey.title, canManageAccess: Boolean(survey.canManageAccess) }}
          onClose={() => setIsAccessModalOpen(false)}
          onChanged={() => {
            fetchAccessList();
            void fetchSurvey();
          }}
        />
      )}

      {/* GOOGLE ACCOUNT CONNECTION MODAL */}
      <GoogleAccountManagerModal
        isOpen={isGoogleConnectModalOpen}
        onClose={() => setIsGoogleConnectModalOpen(false)}
        title="Yêu cầu kết nối tài khoản Google"
        description="Để chỉnh sửa biểu mẫu trên Google Forms, bạn cần liên kết một tài khoản Google có thực."
        requiredNotice="Hệ thống cần tài khoản Google của bạn để cấp quyền chỉnh sửa biểu mẫu Google Forms trực tiếp từ Google Drive. Vui lòng kết nối tài khoản Google bên dưới."
        onAccountChange={() => {
          setIsGoogleConnectModalOpen(false);
          void handleEditGoogleForm();
        }}
      />
    </main>
  );
}
