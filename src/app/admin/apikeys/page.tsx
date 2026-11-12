"use client";

import React, { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import Modal from "@/components/ui/modal/Modal";
import { getToken } from "@/lib/auth";
import {
  type ApiKeyListItem,
  apikeysAuthHeadersJson,
  apikeysErrorMessage,
  apikeysRedirect401,
  normalizeApiKeyRow,
  parseJsonRes,
} from "@/lib/apikeys";
import { API_CHATBOT } from "@/lib/api";
import Pagination from "@/components/ui/pagination/Pagination";
import type { PagedResult } from "@/types/report";
import {
  FiHome,
  FiChevronRight,
  FiKey,
  FiPlus,
  FiRefreshCw,
  FiAlertCircle,
  FiCopy,
  FiEdit3,
  FiSlash,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import Link from "next/link";

const CHATBOT_BASE = API_CHATBOT;

export default function ApiKeysUserPage() {
  const [keys, setKeys] = useState<ApiKeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [createdPlaintext, setCreatedPlaintext] = useState<{
    apiKey: string;
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const [editRow, setEditRow] = useState<ApiKeyListItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${CHATBOT_BASE}/apikeys?page=${page}`, {
        headers: apikeysAuthHeadersJson(),
      });
      if (res.status === 401) {
        apikeysRedirect401();
        return;
      }

      const data = await parseJsonRes(res);
      if (!res.ok) {
        throw new Error(apikeysErrorMessage(data, `Lỗi ${res.status}`));
      }

      const result = data as PagedResult<Record<string, unknown>>;
      if (result.totalPages > 0 && page > result.totalPages) {
        setPage(result.totalPages);
        return;
      }
      setKeys(result.content.map(normalizeApiKeyRow));
      setTotal(result.totalElements);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    try {
      const res = await fetch(`${CHATBOT_BASE}/apikeys`, {
        method: "POST",
        headers: apikeysAuthHeadersJson(),
        body: JSON.stringify({
          ...(newName.trim() ? { name: newName.trim() } : {}),
        }),
      });
      const data = await parseJsonRes(res);
      if (res.status === 401) {
        apikeysRedirect401();
        return;
      }
      if (!res.ok) {
        alert(apikeysErrorMessage(data, "Tạo key thất bại"));
        return;
      }
      const o = data as Record<string, unknown>;
      const key = o.apiKey ?? o.ApiKey;
      const msg = o.message ?? o.Message;
      setCreateOpen(false);
      setNewName("");
      if (typeof key === "string") {
        setCreatedPlaintext({
          apiKey: key,
          message:
            typeof msg === "string"
              ? msg
              : "Lưu key này — chỉ hiện một lần.",
        });
      }
      await fetchKeys();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi");
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const id = editRow.id;
    try {
      const res = await fetch(`${CHATBOT_BASE}/apikeys/${id}`, {
        method: "PUT",
        headers: apikeysAuthHeadersJson(),
        body: JSON.stringify({
          name: editName.trim() || undefined,
          isActive: editActive,
        }),
      });
      const data = await parseJsonRes(res);
      if (res.status === 401) {
        apikeysRedirect401();
        return;
      }
      if (!res.ok) {
        alert(apikeysErrorMessage(data, "Cập nhật thất bại"));
        return;
      }
      setEditRow(null);
      await fetchKeys();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi");
    }
  };

  const revoke = async (row: ApiKeyListItem) => {
    if (!confirm("Thu hồi API key này?")) return;
    try {
      const res = await fetch(`${CHATBOT_BASE}/apikeys/${row.id}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await parseJsonRes(res);
      if (res.status === 401) {
        apikeysRedirect401();
        return;
      }
      if (!res.ok) {
        alert(apikeysErrorMessage(data, "Thu hồi thất bại"));
        return;
      }
      await fetchKeys();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi");
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeKeys = keys.filter((k) => k.isActive && !k.revoked).length;
  const revokedKeys = keys.filter((k) => k.revoked).length;

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
        >
          <FiHome size={13} />
          <span>Trang chủ</span>
        </Link>
        <FiChevronRight size={12} className="text-gray-400" />
        <span className="font-semibold text-gray-800 dark:text-gray-200">
          API Keys
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
            <FiKey size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              API key của tôi
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Key dùng cho RAG / chatbot (header x-api-key)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setNewName(""); setCreateOpen(true); }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:opacity-95 hover:shadow-brand-500/25 cursor-pointer"
        >
          <FiPlus size={16} />
          <span>Tạo key mới</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tổng keys</p>
          <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{total}</p>
        </div>
        <div className="rounded-2xl border border-success-100 bg-success-50 p-4 shadow-xs dark:border-success-900/30 dark:bg-success-950/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-success-700 dark:text-success-400">Đang hoạt động</p>
          <p className="mt-1 text-2xl font-black text-success-800 dark:text-success-300">{activeKeys}</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 shadow-xs dark:border-rose-900/30 dark:bg-rose-950/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">Đã thu hồi</p>
          <p className="mt-1 text-2xl font-black text-rose-800 dark:text-rose-300">{revokedKeys}</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white p-12 dark:border-gray-800 dark:bg-gray-900">
          <div className="size-9 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Đang tải API keys...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/60 dark:bg-rose-950/30">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
            <FiAlertCircle size={24} />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Không thể tải dữ liệu</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{error}</p>
          <button
            type="button"
            onClick={fetchKeys}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700"
          >
            <FiRefreshCw size={13} />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-bold text-gray-800 dark:text-white/90">Danh sách API Keys</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{total} keys</span>
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-5 py-3.5 text-left">Prefix</th>
                    <th className="px-5 py-3.5 text-left">Tên</th>
                    <th className="px-5 py-3.5 text-left">Trạng thái</th>
                    <th className="px-5 py-3.5 text-left">Cập nhật</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {keys.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-xs italic">
                        Chưa có API key nào. Tạo key mới để bắt đầu.
                      </td>
                    </tr>
                  ) : (
                    keys.map((row) => (
                      <tr key={row.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5">
                          <code className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-mono text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {row.prefix}
                          </code>
                        </td>
                        <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300 text-xs">
                          {row.name || <span className="text-gray-400 italic">Không có tên</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          {row.revoked ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                              <FiXCircle size={11} /> Đã thu hồi
                            </span>
                          ) : row.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700 dark:bg-success-900/30 dark:text-success-300">
                              <FiCheckCircle size={11} /> Đang hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                              Tạm tắt
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-400 tabular-nums">
                          {row.updatedAt || row.createdAt || "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => { setEditRow(row); setEditName(row.name); setEditActive(row.isActive); }}
                              disabled={row.revoked}
                              title="Sửa"
                              className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <FiEdit3 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void revoke(row)}
                              disabled={row.revoked}
                              title="Thu hồi"
                              className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <FiSlash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
              {keys.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">Chưa có key.</div>
              ) : keys.map((row) => (
                <article key={row.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <code className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-700 dark:bg-gray-800 dark:text-gray-300">{row.prefix}</code>
                      <p className="mt-1 truncate text-sm text-gray-700 dark:text-gray-300">{row.name || <span className="text-gray-400 italic">Không có tên</span>}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${row.revoked ? "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" : row.isActive ? "bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300" : "bg-gray-100 text-gray-500"}`}>
                      {row.revoked ? "Đã thu hồi" : row.isActive ? "Hoạt động" : "Tạm tắt"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">Cập nhật: {row.updatedAt || row.createdAt || "—"}</p>
                  <div className="flex gap-3 text-xs">
                    <button type="button" className="font-semibold text-brand-600 disabled:opacity-40 hover:underline" onClick={() => { setEditRow(row); setEditName(row.name); setEditActive(row.isActive); }} disabled={row.revoked}>Sửa</button>
                    <button type="button" className="font-semibold text-rose-600 disabled:opacity-40 hover:underline" onClick={() => void revoke(row)} disabled={row.revoked}>Thu hồi</button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Pagination */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo API key"
        description="Tên gợi nhớ (tuỳ chọn)"
      >
        <div className="flex flex-col gap-4 px-6 pb-6">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tên gợi nhớ"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Huỷ</Button>
            <Button size="sm" onClick={() => void handleCreate()}>Tạo</Button>
          </div>
        </div>
      </Modal>

      {/* Created Key Modal */}
      <Modal
        isOpen={!!createdPlaintext}
        onClose={() => setCreatedPlaintext(null)}
        title="Khoá đã tạo"
        description={createdPlaintext?.message}
        className="max-w-lg"
      >
        <div className="flex flex-col gap-4 px-6 pb-6">
          <p className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-200">
            <FiAlertCircle size={15} className="shrink-0" />
            Chỉ hiển thị một lần. Hãy sao chép và lưu an toàn.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={createdPlaintext?.apiKey ?? ""}
              className="flex-1 font-mono text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 outline-none"
            />
            <Button
              size="sm"
              onClick={() => createdPlaintext?.apiKey && void handleCopy(createdPlaintext.apiKey)}
            >
              {copied ? "Đã copy!" : <><FiCopy size={14} /> Copy</>}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editRow}
        onClose={() => setEditRow(null)}
        title="Sửa API key"
        description={`Prefix: ${editRow?.prefix ?? ""}`}
      >
        <div className="flex flex-col gap-4 px-6 pb-6">
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-gray-700 dark:text-gray-300">Tên</span>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </label>
          <label className="inline-flex items-center gap-2.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={editActive}
              onChange={(e) => setEditActive(e.target.checked)}
              className="rounded border-gray-300 text-brand-600 w-4 h-4"
            />
            <span className="font-medium text-gray-700 dark:text-gray-300">Đang hoạt động</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditRow(null)}>Huỷ</Button>
            <Button size="sm" onClick={() => void saveEdit()}>Lưu</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
