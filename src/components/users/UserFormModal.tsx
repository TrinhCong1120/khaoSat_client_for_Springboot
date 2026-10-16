"use client";

import React, { useState, useEffect } from "react";
import { User } from "@/app/admin/users/page";
import Modal from "@/components/ui/modal/Modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Checkbox from "@/components/form/input/Checkbox";
import { API_ROLES, API_USERS } from "@/lib/api";

interface Role {
  id: string;
  name: string;
}

const getToken = () => {
          return (
            localStorage.getItem("token") ||
            sessionStorage.getItem("token")
          );
        };

interface UserFormModalProps {
  user: User | null;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  user,
  onClose,
  onSubmitSuccess,
}) => {
  const isEditMode = !!user;

  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [telegramChatId, setTelegramChatId] = useState(
    user?.telegramChatId?.toString() || ""
  );

  // 🔥 chỉ chọn 1 role
  const [roleId, setRoleId] = useState<string | "">(
    user?.roleIds?.[0] || ""
  );

  const [roles, setRoles] = useState<Role[]>([]);
  const [isActive, setIsActive] = useState(user?.isActive ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ======================
  // 🔥 LOAD ROLES
  // ======================
  useEffect(() => {
    const controller = new AbortController();

    const fetchRoles = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        if (!token) {
          window.location.href = "/signin";
          return;
        }

        const res = await fetch(API_ROLES, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          window.location.href = "/signin";
          return;
        }

        const data: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const message =
            data && typeof data === "object" && "message" in data
              ? String(data.message)
              : `Không thể tải danh sách vai trò (${res.status})`;
          throw new Error(message);
        }
        if (!Array.isArray(data)) {
          throw new Error("Dữ liệu vai trò không đúng định dạng");
        }

        const loadedRoles = data as Role[];
        setRoles(loadedRoles);

        // ======================
        // 🔥 MAP ROLE NAME → ID
        // ======================
        if (user?.roles?.length) {
          const matched = loadedRoles.find(
            (r: Role) => r.name === user?.roles?.[0]
          );

          if (matched) {
            setRoleId(matched.id);
          }
        }

      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Load roles error:", err);
        setError(
          err instanceof TypeError
            ? "Không thể kết nối đến máy chủ. Vui lòng thử lại."
            : err instanceof Error
              ? err.message
              : "Không thể tải danh sách vai trò"
        );
      }
    };

    fetchRoles();
    return () => controller.abort();
  }, [user]);

  // ======================
  // SUBMIT
  // ======================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }
    const normalizedChatId = telegramChatId.trim();
    if (normalizedChatId && (!/^\d+$/.test(normalizedChatId) || Number(normalizedChatId) <= 0)) {
      setError("Telegram Chat ID phải là số nguyên dương");
      return;
    }
    const chatId = normalizedChatId ? Number(normalizedChatId) : null;
    setLoading(true);
    setError(null);

    const body = isEditMode
      ? {
          isActive,
          email,
          ...(password && { password }),
          roleIds: roleId ? [roleId] : [],
          telegramChatId: chatId,
        }
      : {
          username,
          email,
          password,
          roleIds: roleId ? [roleId] : [],
          telegramChatId: chatId,
        };

    const url = isEditMode
      ? `${API_USERS}/${user.id}`
      : API_USERS;

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
        throw new Error(
          data.message ||
            `Lỗi khi ${isEditMode ? "cập nhật" : "tạo"} người dùng`
        );
      }

      onSubmitSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Lỗi không xác định"
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // UI
  // ======================
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditMode ? "Chỉnh sửa người dùng" : "Thêm người dùng"}
      description={isEditMode ? "Cập nhật thông tin tài khoản người dùng" : "Tạo tài khoản mới cho hệ thống"}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">

          {/* USERNAME */}
          <div>
            <Label>
              Tên đăng nhập <span className="text-error-500">*</span>
            </Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isEditMode}
              required={!isEditMode}
            />
          </div>

          {/* PASSWORD */}
          <div>
            <Label>Email <span className="text-error-500">*</span></Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          {/* PASSWORD */}
          <div>
            <Label>
              Mật khẩu{" "}
              {isEditMode
                ? "(Để trống nếu không muốn thay đổi)"
                : <span className="text-error-500">*</span>}
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEditMode}
            />
          </div>

          <div>
            <Label>Telegram Chat ID</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="Nhắn /start cho bot để lấy Chat ID"
            />
            <p className="mt-1 text-xs text-gray-400">
              Để trống nếu tài khoản chưa liên kết Telegram.
            </p>
          </div>

          {/* 🔥 ROLE SELECT */}
          <div>
            <Label>
              Vai trò <span className="text-error-500">*</span>
            </Label>
            <select
              value={roleId}
              onChange={(e) =>
                setRoleId(e.target.value)
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-gray-800 dark:text-white outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              required
            >
              <option value="">-- Chọn vai trò --</option>

              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* ACTIVE */}
          {isEditMode && (
            <Checkbox
              label="Hoạt động"
              checked={isActive}
              onChange={setIsActive}
            />
          )}

          {/* ERROR */}
          {error && (
            <p className="text-sm text-error-500">{error}</p>
          )}

          {/* BUTTON */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              disabled={loading}
              size="sm"
            >
              Hủy
            </Button>

            <Button type="submit" disabled={loading} size="sm">
              {loading
                ? "Đang lưu..."
                : isEditMode
                ? "Lưu thay đổi"
                : "Thêm người dùng"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default UserFormModal;
