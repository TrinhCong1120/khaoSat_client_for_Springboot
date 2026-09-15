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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/";
const CHATBOT_BASE = `${API_URL.replace(/\/$/, "")}/chatbot`;

export default function ApiKeysUserPage() {
  const [keys, setKeys] = useState<ApiKeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [createdPlaintext, setCreatedPlaintext] = useState<{
    apiKey: string;
    message: string;
  } | null>(null);

  const [editRow, setEditRow] = useState<ApiKeyListItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${CHATBOT_BASE}/apikeys`, {
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

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            API key của tôi
          </h1>
          <p className="text-sm text-gray-500">
            Key dùng cho RAG / chatbot (header x-api-key)
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setNewName("");
            setCreateOpen(true);
          }}
        >
          Tạo key mới
        </Button>
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
                  <td colSpan={6} className="px-4 py-8 text-gray-500 text-center">
                    Chưa có key.
                  </td>
                </tr>
              ) : (
                keys.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 dark:border-gray-800/80"
                  >
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
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Huỷ
            </Button>
            <Button size="sm" onClick={() => void handleCreate()}>
              Tạo
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!createdPlaintext}
        onClose={() => setCreatedPlaintext(null)}
        title="Khoá đã tạo"
        description={createdPlaintext?.message}
        className="max-w-lg"
      >
        <div className="flex flex-col gap-4 px-6 pb-6">
          <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg px-3 py-2">
            Chỉ hiển thị một lần. Hãy sao chép và lưu an toàn.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={createdPlaintext?.apiKey ?? ""}
              className="flex-1 font-mono text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
            />
            <Button
              size="sm"
              onClick={() => {
                if (createdPlaintext?.apiKey) {
                  void navigator.clipboard.writeText(createdPlaintext.apiKey);
                }
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!editRow}
        onClose={() => setEditRow(null)}
        title="Sửa API key"
        description={`Prefix: ${editRow?.prefix ?? ""}`}
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
