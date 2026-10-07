"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/modal/Modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { API_ROLES } from "@/lib/api";

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

interface Role {
  id: string;
  name: string;
}

interface Props {
  role: Role | null;
  onClose: () => void;
  onSuccess: () => void;
}

const RoleFormModal: React.FC<Props> = ({
  role,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditMode = !!role;

  // ======================
  // SYNC DATA (FIX LỖI KHÔNG HIỆN NAME)
  // ======================
  useEffect(() => {
    console.log("ROLE RECEIVED:", role); // 🔥 debug

    if (role && role.name) {
      setName(role.name);
    } else {
      setName("");
    }
  }, [role]);

  // ======================
  // SUBMIT
  // ======================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Tên vai trò là bắt buộc");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const method = isEditMode ? "PUT" : "POST";
      const url = isEditMode
        ? `${API_ROLES}/${role?.id}`
        : API_ROLES;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Lưu thất bại");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Lỗi");
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // UI
  // ======================
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEditMode ? "Chỉnh sửa vai trò" : "Thêm vai trò"}
      description={isEditMode ? "Cập nhật thông tin và quyền hạn của vai trò" : "Thiết lập vai trò mới cho hệ thống"}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">

          {/* NAME */}
          <div>
            <Label>
              Tên vai trò <span className="text-error-500">*</span>
            </Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên vai trò"
              disabled={loading}
            />
          </div>

          {/* ERROR */}
          {error && (
            <p className="text-sm text-error-500">{error}</p>
          )}

          {/* BUTTONS */}
          <div className="flex justify-end gap-3 pt-4">

            {/* CANCEL */}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              size="sm"
            >
              Hủy
            </Button>

            {/* SAVE */}
            <Button type="submit" disabled={loading} size="sm">
              {loading
                ? "Đang lưu..."
                : isEditMode
                ? "Lưu"
                : "Thêm vai trò"}
            </Button>
          </div>

        </div>
      </form>
    </Modal>
  );
};

export default RoleFormModal;
