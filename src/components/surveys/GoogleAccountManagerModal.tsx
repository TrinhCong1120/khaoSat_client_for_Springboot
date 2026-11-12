"use client";

import React, { useEffect, useState, useCallback } from "react";
import Modal from "@/components/ui/modal/Modal";
import Button from "@/components/ui/button/Button";
import { API_GOOGLE_INTEGRATIONS } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { FiTrash2, FiPlus, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiExternalLink } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";

export interface GoogleConnectionItem {
  id: string;
  googleEmail: string;
  status: "ACTIVE" | "REVOKED" | "NEEDS_REAUTH" | string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAccountChange?: () => void;
  title?: string;
  description?: string;
  requiredNotice?: string;
}

export default function GoogleAccountManagerModal({
  isOpen,
  onClose,
  onAccountChange,
  title = "Quản lý tài khoản Google",
  description = "Kết nối tài khoản Google để tạo, chỉnh sửa và đồng bộ phản hồi Google Forms",
  requiredNotice,
}: Props) {
  const [connections, setConnections] = useState<GoogleConnectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const activeConnections = connections.filter((c) => c.status === "ACTIVE");
  const hasActiveConnection = activeConnections.length > 0;

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = getToken();
      if (!token) throw new Error("Chưa đăng nhập.");

      const res = await fetch(`${API_GOOGLE_INTEGRATIONS}/connections`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Không thể tải danh sách tài khoản Google.");
      }

      const data: GoogleConnectionItem[] = await res.json();
      setConnections(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchConnections();
    }
  }, [isOpen, fetchConnections]);

  const handleConnectNew = async () => {
    try {
      setActionLoading(true);
      setError("");
      const token = getToken();
      if (!token) throw new Error("Chưa đăng nhập.");

      const originParam = typeof window !== "undefined" ? `?origin=${encodeURIComponent(window.location.origin)}` : "";
      const res = await fetch(`${API_GOOGLE_INTEGRATIONS}/connect-url${originParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || "Không thể lấy URL kết nối Google.");
      }

      const { url } = await res.json();
      if (!url) throw new Error("URL OAuth rỗng.");

      // Open OAuth popup window
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        "GoogleOAuthConnect",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      // Listen for message from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "GOOGLE_OAUTH_SUCCESS") {
          window.removeEventListener("message", handleMessage);
          clearInterval(checkInterval);
          if (popup && !popup.closed) popup.close();
          void fetchConnections();
          if (onAccountChange) onAccountChange();
          setActionLoading(false);
        } else if (event.data?.type === "GOOGLE_OAUTH_ERROR") {
          window.removeEventListener("message", handleMessage);
          clearInterval(checkInterval);
          if (popup && !popup.closed) popup.close();
          setError(event.data.message || "Lỗi khi kết nối Google");
          setActionLoading(false);
        }
      };

      window.addEventListener("message", handleMessage);

      // Check for popup close or redirect fallback
      const checkInterval = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkInterval);
          window.removeEventListener("message", handleMessage);
          void fetchConnections();
          if (onAccountChange) onAccountChange();
          setActionLoading(false);
        }
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi kết nối Google");
      setActionLoading(false);
    }
  };

  const handleDisconnect = async (id: string, email: string) => {
    if (!confirm(`Bạn có chắc chắn muốn hủy kết nối tài khoản ${email}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const token = getToken();
      const res = await fetch(`${API_GOOGLE_INTEGRATIONS}/connections/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Không thể hủy kết nối.");
      }

      await fetchConnections();
      if (onAccountChange) onAccountChange();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi hủy kết nối");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
    >
      <div className="space-y-4">
        {!loading && hasActiveConnection ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <FiCheckCircle className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="font-medium leading-relaxed">
              Bạn đã kết nối tài khoản Google: <strong className="font-semibold">{activeConnections[0]?.googleEmail}</strong> (Đang hoạt động). Hệ thống sẽ dùng tài khoản này để thao tác trên biểu mẫu Google Forms.
            </p>
          </div>
        ) : requiredNotice ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            <FiAlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="font-medium leading-relaxed">{requiredNotice}</p>
          </div>
        ) : null}

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <FiAlertCircle className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Tài khoản đã liên kết ({connections.length})
          </span>
          <button
            type="button"
            onClick={fetchConnections}
            disabled={loading}
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6 text-sm text-gray-500">
            Đang tải danh sách tài khoản...
          </div>
        ) : connections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500 dark:border-gray-700">
            <FcGoogle className="mx-auto mb-2 text-3xl" />
            <p>Chưa có tài khoản Google nào được kết nối.</p>
            <p className="mt-1 text-xs text-gray-400">
              Hãy kết nối tài khoản để bắt đầu sử dụng Google Forms.
            </p>
          </div>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {connections.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-3 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:bg-gray-900"
              >
                <div className="flex items-center gap-3">
                  <FcGoogle className="text-2xl shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {c.googleEmail}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      {c.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <FiCheckCircle className="h-3 w-3" /> Đang hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <FiAlertCircle className="h-3 w-3" /> Cần cấp quyền lại
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDisconnect(c.id, c.googleEmail)}
                  disabled={actionLoading}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                  title="Hủy kết nối tài khoản"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleConnectNew}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 border-gray-200 py-2.5 text-sm font-medium hover:border-brand-500 hover:bg-brand-50/50 dark:border-gray-700 dark:hover:bg-brand-950/20"
          >
            <FcGoogle className="text-lg" />
            <span>Kết nối thêm tài khoản Google</span>
            <FiExternalLink className="h-3.5 w-3.5 text-gray-400 ml-1" />
          </Button>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
}
