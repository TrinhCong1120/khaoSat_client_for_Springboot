"use client";

import React from "react";
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
} from "react-icons/fi";
import { QRCodeSVG } from "qrcode.react";
import { API_PUBLIC_SURVEYS, apiResource } from "@/lib/api";
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
};

type Props = {
  surveys: Survey[];
  onEdit: (id: string) => void;
  onDelete: (survey: Survey) => void;
  onManagePublication?: (survey: Survey) => void;
  onManageAccess?: (survey: Survey) => void;
  canManageAccess?: (survey: Survey) => boolean;
  canEdit?: (survey: Survey) => boolean;
  canDelete?: (survey: Survey) => boolean;
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
}: {
  survey: Survey;
  canEdit: boolean;
  canDelete: boolean;
  canManageAccess: boolean;
  onEdit: (id: string) => void;
  onDelete: (survey: Survey) => void;
  onManagePublication?: (survey: Survey) => void;
  onManageAccess?: (survey: Survey) => void;
}) {
  const [open, setOpen] = React.useState(false);
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

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open} aria-label={`Quản lý khảo sát ${survey.title}`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300">
        <FiSettings size={15} />
        <span>Quản lý</span>
        <FiChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 text-left shadow-xl dark:border-gray-700 dark:bg-gray-900">
          {canEdit && onManagePublication && <button role="menuitem" type="button" onClick={() => run(() => onManagePublication(survey))} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"><FiCalendar className="text-amber-500" /> Xuất bản và lên lịch</button>}
          {canManageAccess && onManageAccess && <button role="menuitem" type="button" onClick={() => run(() => onManageAccess(survey))} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"><FiUsers className="text-violet-500" /> Quyền truy cập</button>}
          <a role="menuitem" href={`/admin/survey/${survey.id}/result`} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"><FiBarChart2 className="text-success-500" /> Xem kết quả</a>
          {canEdit && <button role="menuitem" type="button" onClick={() => run(() => onEdit(survey.id))} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"><FiEdit3 className="text-brand-500" /> Chỉnh sửa</button>}
          {canDelete && <button role="menuitem" type="button" onClick={() => run(() => onDelete(survey))} className="mt-1 flex w-full items-center gap-3 border-t border-gray-100 px-3.5 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 dark:border-gray-800 dark:text-error-400 dark:hover:bg-error-500/10"><FiTrash2 /> Xóa khảo sát</button>}
        </div>
      )}
    </div>
  );
}

export default function SurveyTable({
  surveys,
  onEdit,
  onDelete,
  onManagePublication,
  onManageAccess,
  canManageAccess,
  canEdit,
  canDelete,
}: Props) {
  const [linkSurvey, setLinkSurvey] = React.useState<Survey | null>(null);
  const [copiedLink, setCopiedLink] = React.useState<string | null>(null);
  const [origin, setOrigin] = React.useState("");
  const shareRef = linkSurvey?.shareCode || linkSurvey?.id || "";
  const publicPath = `/survey/${encodeURIComponent(shareRef)}`;

  React.useEffect(() => {
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

  return (
    <>
    <div className="rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="hidden text-gray-500 dark:text-gray-400 md:block">
        <table className="w-full table-fixed text-sm text-left">
          <colgroup>
            <col className="w-[7%]" />
            <col className="w-[24%]" />
            <col className="w-[27%]" />
            <col className="w-[16%]" />
            <col className="w-[11%]" />
            <col className="w-[15%]" />
          </colgroup>

          {/* HEADER */}
          <thead className="bg-gray-50 text-xs font-semibold text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="whitespace-nowrap px-3 py-4 align-middle">
                <span className="relative top-0.5">STT</span>
              </th>
              <th className="px-6 py-4">Tiêu đề</th>
              <th className="px-6 py-4">Mô tả</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4">
                <span className="whitespace-nowrap">API</span>{" "}
                <span className="whitespace-nowrap">Public</span>
              </th>
              <th className="px-6 py-4 text-right">Hành động</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {surveys.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 italic">
                  Không tìm thấy khảo sát nào.
                </td>
              </tr>
            ) : (
              surveys.map((s, index) => {
                const status = getSurveyStatusMeta(s.status);
                return (
                <tr
                  key={s.id}
                  className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* STT */}
                  <td className="px-2 py-4 font-mono text-xs text-gray-400 sm:px-3">
                    {index + 1}
                  </td>

                  {/* TITLE */}
                  <td className="min-w-0 px-2 py-4 sm:px-3">
                    <div className="truncate font-semibold text-gray-800 dark:text-white/90" title={s.title}>
                      {s.title}
                    </div>
                  </td>

                  {/* DESCRIPTION */}
                  <td className="min-w-0 px-2 py-4 sm:px-3">
                    <div className="truncate text-gray-500 dark:text-gray-400 text-xs" title={s.description || "—"}>
                      {s.description || "—"}
                    </div>
                  </td>

                  {/* OPEN / CLOSE */}
                  <td className="px-2 py-4 sm:px-3">
                    {canEdit?.(s) && onManagePublication ? (
                      <button type="button" onClick={() => onManagePublication(s)} title="Quản lý xuất bản và lên lịch" className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:ring-2 hover:ring-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${status.className}`}>{status.label}</button>
                    ) : (
                      <span className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
                    )}
                  </td>

                  {/* API PUBLIC */}
                  <td className="px-2 py-4 sm:px-3">
                    <button
                      type="button"
                      onClick={() => setLinkSurvey(s)}
                      className="group/link inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-brand-700 transition-colors hover:text-brand-600 dark:text-brand-300"
                    >
                      <span>Xem link</span>
                      <FiExternalLink size={14} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                    </button>
                  </td>

                  {/* ACTIONS */}
                  <td className="whitespace-nowrap px-1 py-4 text-right sm:px-2">
                    <SurveyActions survey={s} canEdit={Boolean(canEdit?.(s))} canDelete={Boolean(canDelete?.(s))} canManageAccess={Boolean(onManageAccess && canManageAccess?.(s))} onEdit={onEdit} onDelete={onDelete} onManagePublication={onManagePublication} onManageAccess={onManageAccess} />
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-gray-100 text-gray-500 dark:divide-gray-800 dark:text-gray-400 md:hidden">
        {surveys.length === 0 ? <div className="px-5 py-10 text-center text-sm text-gray-400">Không tìm thấy khảo sát nào.</div> : surveys.map((s, index) => { const status = getSurveyStatusMeta(s.status); return (
          <article key={s.id} className="space-y-4 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-gray-800 dark:text-white/90">{s.title}</p><p className="mt-1 text-xs text-gray-400">STT: {index + 1}</p></div>{canEdit?.(s) && onManagePublication ? <button type="button" onClick={() => onManagePublication(s)} className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</button> : <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>}</div><p className="line-clamp-2 text-xs">{s.description || "—"}</p><div className="flex items-center justify-between gap-3"><button type="button" onClick={() => setLinkSurvey(s)} className="text-xs font-bold text-brand-500">Xem link</button><SurveyActions survey={s} canEdit={Boolean(canEdit?.(s))} canDelete={Boolean(canDelete?.(s))} canManageAccess={Boolean(onManageAccess && canManageAccess?.(s))} onEdit={onEdit} onDelete={onDelete} onManagePublication={onManagePublication} onManageAccess={onManageAccess} /></div></article>
        ); })}
      </div>
      {linkSurvey && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="survey-link-dialog-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLinkSurvey(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="survey-link-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                  Xem khảo sát
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{linkSurvey.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setLinkSurvey(null)}
                aria-label="Đóng"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Mã QR link FE</p>
                <div className="rounded-xl bg-white p-2 shadow-sm">
                  <QRCodeSVG
                    value={origin ? `${origin}${publicPath}` : publicPath}
                    size={220}
                    level="H"
                    marginSize={4}
                    title={`Mã QR mở khảo sát ${linkSurvey.title}`}
                  />
                </div>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Mã chia sẻ: <strong className="font-semibold text-gray-800 dark:text-gray-200">{shareRef}</strong>
                </p>
                <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">Quét mã để mở trang khảo sát</p>
              </div>

              <div className="grid gap-3">
              {[
                {
                  label: "Xem API Public",
                  link: apiResource(API_PUBLIC_SURVEYS, shareRef),
                  className:
                    "border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20",
                },
                {
                  label: "Xem trang khảo sát",
                  link: origin ? `${origin}${publicPath}` : publicPath,
                  className:
                    "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
                },
              ].map((item) => (
                <div key={item.link} className="flex gap-2">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setLinkSurvey(null)}
                    className={`min-w-0 flex-1 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${item.className}`}
                  >
                    <span className="block">{item.label}</span>
                    <span className="mt-1 block break-all text-xs font-normal opacity-80">{item.link}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => copyLink(item.link)}
                    title="Sao chép link"
                    className="inline-flex min-w-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-gray-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                  >
                    {copiedLink === item.link ? "✓" : <FiCopy size={18} />}
                  </button>
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
