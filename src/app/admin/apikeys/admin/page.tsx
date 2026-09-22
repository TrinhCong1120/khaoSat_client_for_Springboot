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

const CHATBOT_BASE = API_CHATBOT;

export default function ApiKeysAdminPage() {
  const [keys, setKeys] = useState<ApiKeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editRow, setEditRow] = useState<ApiKeyListItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${CHATBOT_BASE}/apikeys/admin`, {
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

      const arr = Array.isArray(data) ? data : [];
      setKeys(arr.map((x) => normalizeApiKeyRow(x as Record<string, unknown>)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchKeys();
  }, [fetchKeys]);

  const saveEdit = async () => {
    if (!editRow) return;
    const id = editRow.id;
    try {
      const res = await fetch(`${CHATBOT_BASE}/apikeys/admin/${id}`, {
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
    if (!confirm("Thu hồi API key này (admin)?")) return;
    try {
      const res = await fetch(`${CHATBOT_BASE}/apikeys/admin/${row.id}/revoke`, {
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

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Quản lý API key (admin)
        </h1>
        <p className="text-sm text-gray-500">
          Xem và thu hồi mọi key trong hệ thống
        </p>
      </div>

      {loading && <div className="text-gray-500">Đang tải...</div>}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                <th className="px-4 py-3 font-medium">Người dùng</th>
                <th className="px-4 py-3 font-medium">Prefix</th>
                <th className="px-4 py-3 font-medium">Tên</th>
                <th className="px-4 py-3 font-medium">Hoạt động</th>
                <th className="px-4 py-3 font-medium">Thu hồi</th>
                <th className="px-4 py-3 font-medium">Cập nhật</th>
                <th className="px-4 py-3 font-medium w-40">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-gray-500 text-center">
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                keys.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 dark:border-gray-800/80"
                  >
                    <td className="px-4 py-3">{row.userId ?? "—"}</td>
                    <td className="px-4 py-3 font-mono">{row.prefix}</td>
                    <td className="px-4 py-3">{row.name || "—"}</td>
                    <td className="px-4 py-3">{row.isActive ? "Có" : "Không"}</td>
                    <td className="px-4 py-3">{row.revoked ? "Có" : "Không"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {row.updatedAt || row.createdAt || "—"}
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <button
                        type="button"
                        className="text-brand-600 hover:underline text-xs font-medium"
                        onClick={() => {
                          setEditRow(row);
                          setEditName(row.name);
                          setEditActive(row.isActive);
                        }}
                        disabled={row.revoked}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:underline text-xs font-medium"
                        onClick={() => void revoke(row)}
                        disabled={row.revoked}
                      >
                        Thu hồi
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={!!editRow}
        onClose={() => setEditRow(null)}
        title="Sửa API key (admin)"
        description={`Prefix: ${editRow?.prefix ?? ""} · User: ${editRow?.userId ?? "—"}`}
      >
        <div className="flex flex-col gap-4 px-6 pb-6">
          <label className="block text-sm">
            <span className="text-gray-600 dark:text-gray-400">Tên</span>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={editActive}
              onChange={(e) => setEditActive(e.target.checked)}
              className="rounded border-gray-300 text-brand-600"
            />
            <span>Đang hoạt động</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditRow(null)}>
              Huỷ
            </Button>
            <Button size="sm" onClick={() => void saveEdit()}>
              Lưu
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
