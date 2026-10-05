"use client";

import React from "react";
import {
  FiEdit3,
  FiTrash2,
  FiBarChart2,
  FiExternalLink,
  FiUnlock,
  FiLock,
  FiX,
  FiCopy,
} from "react-icons/fi";
import { API_PUBLIC_SURVEYS } from "@/lib/api";

type Survey = {
  id: number;
  title: string;
  description: string;
  isActive?: boolean;
};

type Props = {
  surveys: Survey[];
  togglingId: number | null;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, nextActive: boolean) => void | Promise<void>;
};

export default function SurveyTable({
  surveys,
  togglingId,
  onEdit,
  onDelete,
  onToggleActive,
}: Props) {
  const [linkSurvey, setLinkSurvey] = React.useState<Survey | null>(null);
  const [copiedLink, setCopiedLink] = React.useState<string | null>(null);
  const [origin, setOrigin] = React.useState("");

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
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-gray-900 transition-all">
      <div className="hidden overflow-hidden text-gray-500 dark:text-gray-400 md:block">
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
          <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-[11px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Tiêu đề</th>
              <th className="px-6 py-4">Mô tả</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4">API Public</th>
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
              surveys.map((s) => {
                const open = s.isActive !== false;
                const busy = togglingId === s.id;
                return (
                <tr
                  key={s.id}
                  className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* ID */}
                  <td className="px-2 py-4 font-mono text-xs text-gray-400 sm:px-3">
                    #{s.id}
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
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggleActive(s.id, !open)}
                      title={open ? "Nhấn để đóng khảo sát" : "Nhấn để mở lại"}
                      className={`inline-flex whitespace-nowrap items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
                        open
                          ? "border-success-200 bg-success-50 text-success-700 hover:bg-success-100 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400 dark:hover:bg-success-500/15"
                          : "border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                    >
                      {busy ? (
                        <span className="size-3.5 animate-pulse rounded-full bg-current opacity-60" />
                      ) : open ? (
                        <FiUnlock className="size-3.5 shrink-0" />
                      ) : (
                        <FiLock className="size-3.5 shrink-0" />
                      )}
                      {busy ? "…" : open ? "Đang mở" : "Đã đóng"}
                    </button>
                  </td>

                  {/* API PUBLIC */}
                  <td className="px-2 py-4 sm:px-3">
                    <button
                      type="button"
                      onClick={() => setLinkSurvey(s)}
                      className="inline-flex whitespace-nowrap items-center gap-1.5 text-brand-500 hover:text-brand-600 font-bold text-xs uppercase tracking-tight transition-colors group/link"
                    >
                      <span>Xem link</span>
                      <FiExternalLink size={14} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                    </button>
                  </td>

                  {/* ACTIONS */}
                  <td className="whitespace-nowrap px-1 py-4 text-right sm:px-2">
                    <div className="flex justify-end gap-0.5">
                      
                      {/* RESULT */}
                      <a
                        href={`/admin/survey/${s.id}/result`}
                        title="Xem kết quả"
                        className="p-1.5 text-success-500 hover:bg-success-50 dark:hover:bg-success-500/10 rounded-xl transition-all"
                      >
                        <FiBarChart2 size={18} />
                      </a>

                      {/* EDIT */}
                      <button
                        onClick={() => onEdit(s.id)}
                        title="Chỉnh sửa"
                        className="p-1.5 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-xl transition-all"
                      >
                        <FiEdit3 size={18} />
                      </button>

                      {/* DELETE */}
                      <button
                        onClick={() => onDelete(s.id)}
                        title="Xóa"
                        className="p-1.5 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-xl transition-all"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-gray-100 text-gray-500 dark:divide-gray-800 dark:text-gray-400 md:hidden">
        {surveys.length === 0 ? <div className="px-5 py-10 text-center text-sm text-gray-400">Không tìm thấy khảo sát nào.</div> : surveys.map((s) => { const open = s.isActive !== false; const busy = togglingId === s.id; return (
          <article key={s.id} className="space-y-4 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-gray-800 dark:text-white/90">{s.title}</p><p className="mt-1 font-mono text-xs text-gray-400">#{s.id}</p></div><button type="button" disabled={busy} onClick={() => onToggleActive(s.id, !open)} className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${open ? "border-success-200 bg-success-50 text-success-700" : "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>{busy ? "…" : open ? "Đang mở" : "Đã đóng"}</button></div><p className="line-clamp-2 text-xs">{s.description || "—"}</p><div className="flex items-center justify-between gap-3"><button type="button" onClick={() => setLinkSurvey(s)} className="text-xs font-bold text-brand-500">Xem link</button><div className="flex gap-1.5"><a href={`/admin/survey/${s.id}/result`} aria-label="Xem kết quả" className="rounded-xl p-2 text-success-500 hover:bg-success-50"><FiBarChart2 size={18} /></a><button onClick={() => onEdit(s.id)} aria-label="Chỉnh sửa" className="rounded-xl p-2 text-brand-500 hover:bg-brand-50"><FiEdit3 size={18} /></button><button onClick={() => onDelete(s.id)} aria-label="Xóa" className="rounded-xl p-2 text-error-500 hover:bg-error-50"><FiTrash2 size={18} /></button></div></div></article>
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
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(origin ? `${origin}/survey/${linkSurvey.id}` : `/survey/${linkSurvey.id}`)}`}
                    alt={`Mã QR mở khảo sát ${linkSurvey.title}`}
                    width={220}
                    height={220}
                  />
                </div>
                <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">Quét mã để mở trang khảo sát</p>
              </div>

              <div className="grid gap-3">
              {[
                {
                  label: "Xem API Public",
                  link: `${API_PUBLIC_SURVEYS}/${linkSurvey.id}`,
                  className:
                    "border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20",
                },
                {
                  label: "Xem trang khảo sát",
                  link: origin ? `${origin}/survey/${linkSurvey.id}` : `/survey/${linkSurvey.id}`,
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
