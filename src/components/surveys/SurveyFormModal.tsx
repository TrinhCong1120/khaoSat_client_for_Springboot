"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/modal/Modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { API_SURVEYS } from "@/lib/api";

interface Props {
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export default function SurveyFormModal({
  onClose,
  onSubmitSuccess,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const getToken = () =>
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

      const token = getToken();

      if (!token) {
        throw new Error("Phiên làm việc hết hạn. Vui lòng đăng nhập lại.");
      }

      const response = await fetch(API_SURVEYS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Không thể tạo khảo sát. Vui lòng kiểm tra lại quyền hạn.");
      }

      onSubmitSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title="Tạo khảo sát mới"
      description="Thiết lập các thông tin cơ bản cho cuộc khảo sát trực tuyến"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* TITLE */}
          <div>
            <Label>Tiêu đề <span className="text-error-500">*</span></Label>
            <Input
              className="mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề khảo sát"
              required
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <Label>Mô tả</Label>
            <Input
              className="mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả ngắn cho khảo sát"
            />
          </div>

          {/* ERROR */}
          {error && (
            <div className="p-3 text-sm text-error-500 bg-red-50 dark:bg-red-500/10 border border-error-200 dark:border-error-500/20 rounded-xl">
              {error}
            </div>
          )}

          {/* ACTION */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              size="sm"
              disabled={loading}
            >
              Hủy
            </Button>

            <Button
              type="submit"
              disabled={loading}
              size="sm"
            >
              {loading ? "Đang xử lý..." : "Tạo mới"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}