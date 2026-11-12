"use client";

import React, { useState, useEffect } from "react";
import { User } from "@/app/admin/users/page";
import Modal from "@/components/ui/modal/Modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { API_ROLES, API_USERS } from "@/lib/api";
import { FiUser, FiShield, FiEye, FiEyeOff, FiCheck, FiSend, FiLock, FiAlertCircle } from "react-icons/fi";
import { Bot } from "lucide-react";

interface Role {
  id: string;
  name: string;
  description?: string;
}

const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("token");
};

interface UserFormModalProps {
  user: User | null;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export default function UserFormModal({
  user,
  onClose,
  onSubmitSuccess,
}: UserFormModalProps) {
  const isEditMode = !!user;

  // Tabs: 'identity' | 'roles' | 'bot'
  const [activeTab, setActiveTab] = useState<"identity" | "roles" | "bot">("identity");

  // Form Fields
  const [username, setUsername] = useState(user?.username || "");
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Multi-roles state
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(
    user?.roleIds || []
  );

  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [telegramChatId, setTelegramChatId] = useState(
    user?.telegramChatId?.toString() || ""
  );
  const [zaloChatId, setZaloChatId] = useState(user?.zaloChatId || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available roles & map user's current roles
  useEffect(() => {
    const controller = new AbortController();

    const fetchRoles = async () => {
      try {
        const token = getToken();
        if (!token) {
          window.location.href = "/signin";
          return;
        }

        const res = await fetch(API_ROLES, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          window.location.href = "/signin";
          return;
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          const loadedRoles = data as Role[];
          setRoles(loadedRoles);

          // If user has role names but roleIds wasn't populated:
          if (user?.roles && user.roles.length > 0) {
            const mappedIds = loadedRoles
              .filter((r) => user.roles?.includes(r.name))
              .map((r) => r.id);
            if (mappedIds.length > 0) {
              setSelectedRoleIds(mappedIds);
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Load roles error:", err);
      }
    };

    fetchRoles();
    return () => controller.abort();
  }, [user]);

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEditMode && (!username.trim() || !password)) {
      setError("Vui lòng điền tên đăng nhập và mật khẩu.");
      return;
    }

    if (password && password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }

    const normalizedTelegram = telegramChatId.trim();
    if (normalizedTelegram && (!/^\d+$/.test(normalizedTelegram) || Number(normalizedTelegram) <= 0)) {
      setError("Telegram Chat ID phải là số nguyên dương.");
      return;
    }

    const normalizedZalo = zaloChatId.trim();
    if (normalizedZalo && !/^[A-Za-z0-9._-]{1,100}$/.test(normalizedZalo)) {
      setError("Zalo Chat ID không hợp lệ.");
      return;
    }

    setLoading(true);

    const body = isEditMode
      ? {
          email: email.trim(),
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          ...(password && { password }),
          isActive,
          roleIds: selectedRoleIds,
          telegramChatId: normalizedTelegram ? Number(normalizedTelegram) : null,
          zaloChatId: normalizedZalo || null,
        }
      : {
          username: username.trim(),
          email: email.trim(),
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          password,
          roleIds: selectedRoleIds,
          telegramChatId: normalizedTelegram ? Number(normalizedTelegram) : null,
          zaloChatId: normalizedZalo || null,
        };

    const url = isEditMode ? `${API_USERS}/${user.id}` : API_USERS;
    const method = isEditMode ? "PUT" : "POST";

    try {
      const token = getToken();
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Lỗi khi ${isEditMode ? "cập nhật" : "tạo"} người dùng`);
      }

      onSubmitSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditMode ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
      description={
        isEditMode
          ? `Cập nhật thông tin, vai trò và kết nối cho @${user.username}`
          : "Khởi tạo tài khoản, thiết lập quyền hạn và cấu hình kết nối"
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step Navigation Tabs */}
        <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab("identity")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
              activeTab === "identity"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <FiUser size={13} />
            <span>Định danh & Hồ sơ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
              activeTab === "roles"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <FiShield size={13} />
            <span>Vai trò & Trạng thái</span>
            {selectedRoleIds.length > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-brand-500 text-[10px] text-white">
                {selectedRoleIds.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bot")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
              activeTab === "bot"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Bot className="size-3.5" />
            <span>Kênh Chatbot</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            <FiAlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: IDENTITY & PROFILE */}
        {activeTab === "identity" && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>
                  Tên đăng nhập <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isEditMode}
                  placeholder="admin_user"
                  required={!isEditMode}
                />
                {isEditMode && (
                  <p className="mt-1 text-[11px] text-gray-400">
                    Tên đăng nhập không thể thay đổi sau khi tạo.
                  </p>
                )}
              </div>

              <div>
                <Label>Họ và tên</Label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>
                  Địa chỉ Email <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <Label>Số điện thoại</Label>
                <Input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0912345678"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <Label>
                Mật khẩu{" "}
                {isEditMode ? (
                  <span className="text-xs font-normal text-gray-400">
                    (Để trống nếu không đổi)
                  </span>
                ) : (
                  <span className="text-rose-500">*</span>
                )}
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEditMode ? "•••••••• (Giữ nguyên mật khẩu cũ)" : "Ít nhất 8 ký tự"}
                  required={!isEditMode}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ROLES & STATUS */}
        {activeTab === "roles" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <Label>Phân quyền vai trò (Có thể chọn nhiều)</Label>
              <p className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">
                Tài khoản có thể đảm nhận nhiều vai trò cùng lúc (Ví dụ: vừa là Manager vừa là User).
              </p>

              {roles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                  Đang tải danh sách vai trò...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {roles.map((r) => {
                    const isSelected = selectedRoleIds.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleRole(r.id)}
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                          isSelected
                            ? "border-brand-500 bg-brand-50/80 shadow-xs dark:border-brand-500 dark:bg-brand-950/70"
                            : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            isSelected
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
                          }`}
                        >
                          {isSelected && <FiCheck size={12} strokeWidth={3} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                            {r.name}
                          </p>
                          {r.description && (
                            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                              {r.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Account Status Switch */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 dark:border-gray-700 dark:bg-gray-800">
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  Trạng thái hoạt động
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {isActive
                    ? "Tài khoản có thể đăng nhập và truy cập hệ thống bình thường"
                    : "Tài khoản bị tạm khóa, không thể đăng nhập"}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block size-4.5 transform rounded-full bg-white shadow-md transition ${
                    isActive ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: CHATBOT INTEGRATION */}
        {activeTab === "bot" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <Label>Telegram Chat ID</Label>
              <div className="relative">
                <FiSend
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-500"
                />
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Ví dụ: 123456789"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3 text-xs font-medium text-gray-800 focus:border-brand-500 focus:bg-white focus:outline-hidden dark:border-gray-800 dark:bg-gray-800/60 dark:text-white"
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                Gõ <code className="font-mono text-brand-600 dark:text-brand-400">/getid</code> gửi cho bot Telegram để nhận Chat ID của người dùng.
              </p>
            </div>

            <div>
              <Label>Zalo Chat ID</Label>
              <div className="relative">
                <Bot
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-blue-500"
                />
                <input
                  type="text"
                  value={zaloChatId}
                  onChange={(e) => setZaloChatId(e.target.value)}
                  placeholder="Ví dụ: 894320958123"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3 text-xs font-medium text-gray-800 focus:border-brand-500 focus:bg-white focus:outline-hidden dark:border-gray-800 dark:bg-gray-800/60 dark:text-white"
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                Nhắn tin với Zalo OA của hệ thống để đồng bộ nhận thông báo.
              </p>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 pt-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Hủy bỏ
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <span>{isEditMode ? "Lưu thay đổi" : "Tạo người dùng"}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
