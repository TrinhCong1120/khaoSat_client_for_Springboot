"use client";

import React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  FiEdit3,
  FiTrash2,
  FiBarChart2,
  FiExternalLink,
  FiX,
  FiCopy,
  FiUsers,
  FiCalendar,
  FiChevronDown,
  FiSettings,
  FiRefreshCw,
} from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { API_SURVEYS, API_GOOGLE_INTEGRATIONS } from "@/lib/api";
import { getToken } from "@/lib/auth";
import GoogleAccountManagerModal from "@/components/surveys/GoogleAccountManagerModal";
import { QRCodeSVG } from "qrcode.react";
import { getSurveyStatusMeta, type SurveyStatus } from "@/components/surveys/SurveyPublicationModal";

type Survey = {
  id: string;
  shareCode?: string | null;
  title: string;
  description: string | null;
  status?: SurveyStatus | string | null;
  openAt?: string | null;
  closeAt?: string | null;
  creatorUser?: string | null;
  creatorUserId?: string | null;
  canEdit: boolean;
  canDelete: boolean;
  canManageAccess: boolean;
  canManagePublication?: boolean;
  canViewResponses?: boolean;
  sharedDirectly?: boolean;
  groupId?: string;
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

type Props = {
  surveys: Survey[];
  onEdit: (id: string) => void;
  onDelete: (survey: Survey) => void;
  onManagePublication?: (survey: Survey) => void;
  onManageAccess?: (survey: Survey) => void;
  onMove?: (survey: Survey) => void;
  canMove?: (survey: Survey) => boolean;
  canManageAccess?: (survey: Survey) => boolean;
  canEdit?: (survey: Survey) => boolean;
  canDelete?: (survey: Survey) => boolean;
  onRefresh?: () => void;
};

function SurveyActions({
  survey,
  canEdit,
  canDelete,
  canManageAccess,
  onEdit,
  onDelete,
  onManagePublication,
  onManageAccess,
  onMove,
  canMove,
  onRefresh,
}: {
  survey: Survey;
  canEdit: boolean;
  canDelete: boolean;
  canManageAccess: boolean;
  onEdit: (id: string) => void;
  onDelete: (survey: Survey) => void;
  onManagePublication?: (survey: Survey) => void;
  onManageAccess?: (survey: Survey) => void;
  onMove?: (survey: Survey) => void;
  canMove?: boolean;
  onRefresh?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [googleBusy, setGoogleBusy] = React.useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  const handleEditGoogle = async () => {
    try {
      setGoogleBusy(true);
      const token = getToken();

      const directEditUrl =
        survey.googleIntegration?.editUrl ||
        (survey.googleIntegration?.googleFormId
          ? `https://docs.google.com/forms/d/${survey.googleIntegration.googleFormId}/edit`
          : null);

      // Kiểm tra trước: Nếu chưa có tài khoản Google nào liên kết -> mở ngay popup thêm tài khoản
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
        setIsGoogleModalOpen(true);
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
      console.warn("handleEditGoogle error:", err);
    } finally {
      setGoogleBusy(false);
    }
  };

  const handlePullSchema = async () => {
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
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Lỗi khi kéo cấu trúc");
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleSyncResponses = async () => {
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
      const statusText = data.isAcceptingResponses ? "Đang mở nhận phản hồi" : "Đã đóng";
      alert(`Đồng bộ thành công! Có ${data.syncedCount} phản hồi mới (Tổng: ${data.totalExternalCount}). Trạng thái Google Forms: ${statusText}.`);
      onRefresh?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Lỗi khi đồng bộ câu trả lời");
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open} aria-label={`Quản lý khảo sát ${survey.title}`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300">
        <FiSettings size={20} className="shrink-0" />
        <span>Quản lý</span>
        <FiChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-1.5 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 text-left shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <Link role="menuitem" href={"/admin/survey/" + survey.id + "/detail"} onClick={() => setOpen(false)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"><FiExternalLink className="text-brand-500" /> Xem chi tiết</Link>

          {/* Google Forms Specific Actions */}
          {survey.googleIntegration ? (
            <>
              {canEdit && (
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => run(handleEditGoogle)}
                  disabled={googleBusy}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/20"
                >
                  <FcGoogle className="text-base" /> Sửa trên Google Forms
                </button>
              )}
              {canEdit && (
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => run(handlePullSchema)}
                  disabled={googleBusy}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <FiRefreshCw className="text-blue-500" /> Kéo cấu trúc câu hỏi
                </button>
              )}
              {survey.canViewResponses && (
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => run(handleSyncResponses)}
                  disabled={googleBusy}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <FiRefreshCw className="text-emerald-500" /> Đồng bộ câu trả lời
                </button>
              )}
            </>
          ) : (
            canEdit && <button role="menuitem" type="button" onClick={() => run(() => onEdit(survey.id))} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"><FiEdit3 className="text-brand-500" /> Chỉnh sửa</button>
          )}

          {!survey.googleIntegration && survey.canManagePublication && onManagePublication && (
            <button role="menuitem" type="button" onClick={() => run(() => onManagePublication(survey))} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
              <FiCalendar className="text-amber-500" /> Xuất bản và lên lịch
            </button>
          )}
          {canManageAccess && onManageAccess && <button role="menuitem" type="button" onClick={() => run(() => onManageAccess(survey))} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"><FiUsers className="text-violet-500" /> Quyền truy cập</button>}
          {survey.canViewResponses ? (
            <Link
              role="menuitem"
              href={`/admin/survey/${survey.id}/result`}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <FiBarChart2 className="text-success-500" /> Xem kết quả
            </Link>
          ) : (
            <div
              role="menuitem"
              aria-disabled="true"
              title="Bạn chưa có quyền xem kết quả hoặc báo cáo của khảo sát này"
              className="flex w-full cursor-not-allowed items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-600 select-none"
            >
              <span className="flex items-center gap-3">
                <FiBarChart2 className="text-gray-300 dark:text-gray-700" /> Xem kết quả
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-600">(Cần quyền)</span>
            </div>
          )}
          {canMove && onMove && <button role="menuitem" type="button" onClick={() => run(() => onMove(survey))} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">Chuyển group</button>}
          {canDelete && <button role="menuitem" type="button" onClick={() => run(() => onDelete(survey))} className="mt-1 flex w-full items-center gap-3 border-t border-gray-100 px-3.5 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 dark:border-gray-800 dark:text-error-400 dark:hover:bg-error-500/10"><FiTrash2 /> Xóa khảo sát</button>}
        </div>
      )}

      {/* GOOGLE ACCOUNT CONNECTION MODAL */}
      <GoogleAccountManagerModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        title="Yêu cầu kết nối tài khoản Google"
        description="Để chỉnh sửa biểu mẫu trên Google Forms, bạn cần liên kết một tài khoản Google có thực."
        requiredNotice="Hệ thống cần tài khoản Google của bạn để cấp quyền chỉnh sửa biểu mẫu Google Forms trực tiếp từ Google Drive. Vui lòng kết nối tài khoản Google bên dưới."
        onAccountChange={() => {
          setIsGoogleModalOpen(false);
          void handleEditGoogle();
        }}
      />
    </div>
  );
}

export default function SurveyTable({
  surveys,
  onEdit,
  onDelete,
  onManagePublication,
  onManageAccess,
  onMove,
  canMove,
  canManageAccess,
  canEdit,
  canDelete,
  onRefresh,
}: Props) {
  const [mounted, setMounted] = React.useState(false);
  const [linkSurvey, setLinkSurvey] = React.useState<Survey | null>(null);
  const [copiedLink, setCopiedLink] = React.useState<string | null>(null);
  const [origin, setOrigin] = React.useState("");
  const shareRef = linkSurvey?.shareCode || linkSurvey?.id || "";
  const publicPath = `/survey/${encodeURIComponent(shareRef)}`;
  const fullShareUrl = origin ? `${origin}${publicPath}` : publicPath;

  React.useEffect(() => {
    setMounted(true);
    setOrigin(window.location.origin);
  }, []);

  const copyLink = async (link: string) => {
    try {
      const linkToCopy = link.startsWith("/")
        ? `${window.location.origin}${link}`
        : link;
      await navigator.clipboard.writeText(linkToCopy);
      setCopiedLink(link);
      window.setTimeout(() => setCopiedLink(null), 1800);
    } catch {
      alert("Không thể sao chép link. Vui lòng thử lại.");
    }
  };

  const googleShareUrl =
    linkSurvey?.googleIntegration?.responseUrl ||
    (linkSurvey?.googleIntegration?.googleFormId
      ? `https://docs.google.com/forms/d/e/${linkSurvey.googleIntegration.googleFormId}/viewform`
      : "");
  const hasGoogle = Boolean(linkSurvey?.googleIntegration && googleShareUrl);

  return (
    <>
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="hidden text-gray-500 dark:text-gray-400 md:block">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[52%]" />
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[14%]" />
          </colgroup>

          {/* HEADER */}
          <thead className="bg-gray-50 text-xs font-semibold text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-5 py-3.5">Khảo sát</th>
              <th className="px-4 py-3.5">Trạng thái</th>
              <th className="px-4 py-3.5">Người tạo</th>
              <th className="px-4 py-3.5 text-right">Thao tác</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {surveys.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-14 text-center text-sm text-gray-500">
                  Chưa có khảo sát trong phạm vi này.
                </td>
              </tr>
            ) : (
              surveys.map((s) => {
                const status = getSurveyStatusMeta(s.status);
                return (
                <tr
                  key={s.id}
                  className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="min-w-0 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Link href={"/admin/survey/" + s.id + "/detail"} className="truncate font-semibold text-gray-900 hover:text-brand-600 dark:text-white" title={s.title}>{s.title}</Link>
                      {s.googleIntegration && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                          <FcGoogle className="text-xs" /> Google Forms
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500" title={s.description || ""}>{s.description || "Chưa có mô tả"}</p>
                    <button type="button" onClick={() => setLinkSurvey(s)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300">Link công khai <FiExternalLink size={12} /></button>
                  </td>

                  {/* OPEN / CLOSE */}
                  <td className="px-4 py-4">
                    {!s.googleIntegration && s.canManagePublication && onManagePublication ? (
                      <button type="button" onClick={() => onManagePublication(s)} title="Quản lý xuất bản và lên lịch" className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:ring-2 hover:ring-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${status.className}`}>{status.label}</button>
                    ) : (
                      <span className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
                    )}
                  </td>

                  <td className="truncate px-4 py-4 text-xs text-gray-600 dark:text-gray-400" title={s.creatorUser || ""}>{s.creatorUser || "—"}</td>

                  {/* ACTIONS */}
                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <SurveyActions survey={s} canEdit={Boolean(canEdit?.(s))} canDelete={Boolean(canDelete?.(s))} canManageAccess={Boolean(onManageAccess && canManageAccess?.(s))} onEdit={onEdit} onDelete={onDelete} onManagePublication={onManagePublication} onManageAccess={onManageAccess} onMove={onMove} canMove={Boolean(canMove?.(s))} onRefresh={onRefresh} />
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-gray-100 text-gray-500 dark:divide-gray-800 dark:text-gray-400 md:hidden">
        {surveys.length === 0 ? <div className="px-5 py-10 text-center text-sm text-gray-500">Chưa có khảo sát trong phạm vi này.</div> : surveys.map((s) => { const status = getSurveyStatusMeta(s.status); return (
          <article key={s.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link href={"/admin/survey/" + s.id + "/detail"} className="line-clamp-2 font-semibold text-gray-900 dark:text-white">{s.title}</Link><p className="mt-1 text-xs text-gray-500">{s.creatorUser || "Chưa rõ người tạo"}</p></div>{!s.googleIntegration && s.canManagePublication && onManagePublication ? <button type="button" onClick={() => onManagePublication(s)} className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</button> : <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>}</div><p className="line-clamp-2 text-xs">{s.description || "Chưa có mô tả"}</p><div className="flex items-center justify-between gap-3"><button type="button" onClick={() => setLinkSurvey(s)} className="text-xs font-medium text-brand-600">Link công khai</button><SurveyActions survey={s} canEdit={Boolean(canEdit?.(s))} canDelete={Boolean(canDelete?.(s))} canManageAccess={Boolean(onManageAccess && canManageAccess?.(s))} onEdit={onEdit} onDelete={onDelete} onManagePublication={onManagePublication} onManageAccess={onManageAccess} onMove={onMove} canMove={Boolean(canMove?.(s))} onRefresh={onRefresh} /></div></article>
        ); })}
      </div>
      {mounted && linkSurvey && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="survey-link-dialog-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLinkSurvey(null);
          }}
        >
          <div className={`w-full ${hasGoogle ? "max-w-3xl" : "max-w-md"} rounded-2xl bg-white p-4 sm:p-5 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800`}>
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 id="survey-link-dialog-title" className="text-base font-semibold text-gray-900 dark:text-white">
                    Chia sẻ khảo sát
                  </h2>
                  {hasGoogle && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                      <FcGoogle className="text-xs" /> Google Forms
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400 mt-0.5">{linkSurvey.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setLinkSurvey(null)}
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
                          title={`Mã QR Website ${linkSurvey.title}`}
                        />
                        {linkSurvey.shareCode && (
                          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                            Mã: <strong className="font-semibold text-brand-600 dark:text-brand-400">{linkSurvey.shareCode}</strong>
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
                          onClick={() => setLinkSurvey(null)}
                          className="min-w-0 flex-1 rounded-lg border border-brand-200 bg-white px-2.5 py-1.5 text-left text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/30 dark:bg-gray-900 dark:text-brand-300"
                        >
                          <span className="block font-medium text-[9px] text-brand-600 dark:text-brand-400 leading-none">Mở tab mới ↗</span>
                          <span className="mt-0.5 block truncate font-mono text-[11px] leading-tight">{fullShareUrl}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => copyLink(fullShareUrl)}
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
                          title={`Mã QR Google Forms ${linkSurvey.title}`}
                        />
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[190px]" title={linkSurvey.googleIntegration?.googleFormId}>
                          ID: <span className="font-mono text-[10px] text-gray-600 dark:text-gray-300">{linkSurvey.googleIntegration?.googleFormId}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <div className="flex gap-1.5">
                        <a
                          href={googleShareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setLinkSurvey(null)}
                          className="min-w-0 flex-1 rounded-lg border border-purple-200 bg-white px-2.5 py-1.5 text-left text-xs font-semibold text-purple-700 transition hover:bg-purple-50 dark:border-purple-500/30 dark:bg-gray-900 dark:text-purple-300"
                        >
                          <span className="block font-medium text-[9px] text-purple-600 dark:text-purple-400 leading-none">Mở trên Google Forms ↗</span>
                          <span className="mt-0.5 block truncate font-mono text-[11px] leading-tight">{googleShareUrl}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => copyLink(googleShareUrl)}
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
                      title={`Mã QR mở khảo sát ${linkSurvey.title}`}
                    />
                  </div>
                  {linkSurvey.shareCode && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Mã chia sẻ: <strong className="font-semibold text-brand-600 dark:text-brand-400">{linkSurvey.shareCode}</strong>
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
                      onClick={() => setLinkSurvey(null)}
                      className="min-w-0 flex-1 rounded-lg border border-brand-200 bg-brand-50/70 px-3 py-2 text-left text-xs font-semibold text-brand-700 transition hover:bg-brand-100/70 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
                    >
                      <span className="block font-medium text-[9px] text-brand-600 dark:text-brand-400 leading-none">Mở trong tab mới ↗</span>
                      <span className="mt-0.5 block truncate font-mono text-[11px]">{fullShareUrl}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => copyLink(fullShareUrl)}
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
        </div>,
        document.body
      )}
    </div>
    </>
  );
}
