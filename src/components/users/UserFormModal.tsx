"use client";

import React, { useState, useEffect } from "react";
import { User } from "@/app/admin/users/page";
import Modal from "@/components/ui/modal/Modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Checkbox from "@/components/form/input/Checkbox";

interface Role {
  id: number;
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
  const [password, setPassword] = useState("");

  // 🔥 chỉ chọn 1 role
  const [roleId, setRoleId] = useState<number | "">(
    user?.roleIds?.[0] || ""
  );

  const [roles, setRoles] = useState<Role[]>([]);
  const [isActive, setIsActive] = useState(user?.isActive ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ======================
  // 🔥 LOAD ROLES
  // ======================
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        if (!token) {
          window.location.href = "/signin";
          return;
        }

        const res = await fetch(`${API_URL}/core/Roles`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Không thể tải danh sách vai trò");
        }

        const data = await res.json();
        setRoles(data);

        // ======================
        // 🔥 MAP ROLE NAME → ID
        // ======================
        if (user?.roles?.length) {
          const matched = data.find(
            (r: Role) => r.name === user?.roles?.[0]
          );

          if (matched) {
            setRoleId(matched.id);
          }
        }

      } catch (err) {
        console.error("Load roles error:", err);
      }
    };

    fetchRoles();
  }, [user]);

  // ======================
  // SUBMIT
  // ======================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body = isEditMode
      ? {
          isActive,
          ...(password && { password }),
          roleIds: roleId ? [roleId] : [],
        }
      : {
          username,
          password,
          roleIds: roleId ? [roleId] : [],
        };

    const url = isEditMode
      ? `${API_URL}/core/Users/${user.id}`
      : `${API_URL}/core/Users`;

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

          {/* 🔥 ROLE SELECT */}
          <div>
            <Label>
              Vai trò <span className="text-error-500">*</span>
            </Label>
            <select
              value={roleId}
              onChange={(e) =>
                setRoleId(Number(e.target.value))
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