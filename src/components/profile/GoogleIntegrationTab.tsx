"use client";

import React, { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/button/Button";
import { API_GOOGLE_INTEGRATIONS } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  FiTrash2,
  FiPlus,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiShield,
  FiExternalLink,
  FiHelpCircle,
  FiFileText,
  FiClock,
  FiCheck,
} from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";

export interface GoogleConnectionItem {
  id: string;
  googleEmail: string;
  status: "ACTIVE" | "REVOKED" | "NEEDS_REAUTH" | string;
  createdAt: string;
  updatedAt: string;
}

interface GoogleIntegrationTabProps {
  onConnectionsChange?: (count: number) => void;
}

export default function GoogleIntegrationTab({ onConnectionsChange }: GoogleIntegrationTabProps) {
  const [connections, setConnections] = useState<GoogleConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
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
      onConnectionsChange?.(data.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [onConnectionsChange]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleConnectNew = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMsg(null);
      const token = getToken();
      if (!token) throw new Error("Chưa đăng nhập.");

      const originParam =
        typeof window !== "undefined"
          ? `?origin=${encodeURIComponent(window.location.origin)}`
          : "";
      const res = await fetch(`${API_GOOGLE_INTEGRATIONS}/connect-url${originParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || "Không thể lấy URL kết nối Google.");
      }

      const { url } = await res.json();
      if (!url) throw new Error("URL xác thực OAuth Google rỗng.");

      // Open OAuth popup window centered
      const width = 520;
      const height = 640;
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
          setSuccessMsg("Kết nối tài khoản Google thành công!");
          void fetchConnections();
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
          setActionLoading(false);
        }
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi kết nối Google");
      setActionLoading(false);
    }
  };

  const handleDisconnect = async (id: string, email: string) => {
    if (!confirm(`Bạn có chắc chắn muốn hủy kết nối tài khoản Google "${email}"?`)) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setSuccessMsg(null);
      const token = getToken();
      const res = await fetch(`${API_GOOGLE_INTEGRATIONS}/connections/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Không thể hủy kết nối.");
      }

      setSuccessMsg(`Đã hủy liên kết tài khoản ${email}.`);
      await fetchConnections();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi hủy kết nối");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Notification Alerts */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <FiAlertCircle className="size-5 shrink-0 text-red-600 dark:text-red-400" />
          <p className="flex-1 font-medium">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs font-semibold hover:underline"
          >
            Đóng
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <FiCheck className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="flex-1 font-medium">{successMsg}</p>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-xs font-semibold hover:underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Main Connection Management Card */}
      <div className="rounded-3xl border border-gray-200/90 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 ring-8 ring-purple-50/50 dark:bg-purple-950/50 dark:ring-purple-950/30">
              <FcGoogle className="size-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                Tài khoản Google liên kết
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Quản lý các tài khoản Google dùng để tạo, chỉnh sửa và đồng bộ Google Forms
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchConnections}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/80 disabled:opacity-50"
            >
              <FiRefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </button>

            <Button
              type="button"
              onClick={handleConnectNew}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50"
            >
              <FiPlus size={15} />
              <span>Kết nối tài khoản mới</span>
            </Button>
          </div>
        </div>

        {/* List of Connected Accounts */}
        <div className="mt-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="size-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              <p className="text-xs font-semibold text-gray-400">
                Đang tải danh sách tài khoản Google...
              </p>
            </div>
          ) : connections.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-800 sm:p-12">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 dark:bg-gray-800/60">
                <FcGoogle size={36} />
              </div>
              <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
                Chưa có tài khoản Google nào được liên kết
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Kết nối tài khoản Google của bạn để tự động xuất bản khảo sát sang Google Forms, đồng bộ câu hỏi hai chiều và nhận phản hồi trực tiếp.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleConnectNew}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 transition hover:bg-purple-700 disabled:opacity-50"
                >
                  <FcGoogle size={18} />
                  <span>Đăng nhập với Google</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {connections.map((c) => (
                <div
                  key={c.id}
                  className="group relative flex items-center justify-between rounded-2xl border border-gray-200/90 bg-gray-50/50 p-4 transition-all hover:border-purple-300 hover:bg-white hover:shadow-sm dark:border-gray-800 dark:bg-gray-800/40 dark:hover:border-purple-700/60 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-xs ring-1 ring-gray-200/80 dark:bg-gray-900 dark:ring-gray-700">
                      <FcGoogle size={24} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                          {c.googleEmail}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                        {c.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <FiCheckCircle size={12} /> Đang hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                            <FiAlertCircle size={12} /> Cần cấp quyền lại
                          </span>
                        )}
                        <span className="text-gray-300 dark:text-gray-700">•</span>
                        <span>
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleDateString("vi-VN")
                            : "Vừa kết nối"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDisconnect(c.id, c.googleEmail)}
                    disabled={actionLoading}
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 disabled:opacity-50"
                    title={`Hủy kết nối ${c.googleEmail}`}
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Google Forms Features & Capabilities Highlights */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <FiFileText size={18} />
          </div>
          <h3 className="mt-3.5 text-sm font-bold text-gray-900 dark:text-white">
            Tạo & Kéo biểu mẫu
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            Tạo mới Google Form trực tiếp từ hệ thống hoặc kéo cấu trúc câu hỏi từ biểu mẫu sẵn có về hệ thống khảo sát của bạn.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
            <FiRefreshCw size={18} />
          </div>
          <h3 className="mt-3.5 text-sm font-bold text-gray-900 dark:text-white">
            Đồng bộ phản hồi tự động
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            Dữ liệu câu trả lời của người điền trên Google Forms được đồng bộ tự động về cơ sở dữ liệu để phục vụ phân tích & báo cáo.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <FiClock size={18} />
          </div>
          <h3 className="mt-3.5 text-sm font-bold text-gray-900 dark:text-white">
            Đóng/Mở theo Google
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            Khảo sát Google Form không sử dụng lịch trình nội bộ. Trạng thái khảo sát tự động cập nhật đóng/mở theo cài đặt của Google Form.
          </p>
        </div>
      </div>

      {/* Security & Scopes Information Banner */}
      <div className="flex items-start gap-4 rounded-2xl border border-gray-200/80 bg-gray-50/70 p-5 dark:border-gray-800 dark:bg-gray-800/30">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-gray-700 shadow-xs dark:bg-gray-900 dark:text-gray-300">
          <FiShield size={18} className="text-brand-600 dark:text-brand-400" />
        </div>
        <div className="space-y-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
          <h4 className="font-bold text-gray-900 dark:text-white">
            Bảo mật & Quyền truy cập Google
          </h4>
          <p>
            Hệ thống chỉ yêu cầu các quyền cần thiết: truy cập biểu mẫu Google Forms và đọc phản hồi từ các biểu mẫu bạn chọn. Token truy cập được mã hóa an toàn và bạn có thể hủy kết nối bất kỳ lúc nào tại đây.
          </p>
        </div>
      </div>
    </div>
  );
}
