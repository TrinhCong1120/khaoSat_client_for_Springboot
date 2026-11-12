"use client";

import React, { useState, useRef } from "react";
import Modal from "@/components/ui/modal/Modal";
import Button from "@/components/ui/button/Button";
import { AVATAR_PRESETS, AvatarPreset } from "./avatarPresets";
import { FiUpload, FiCheck, FiImage, FiSmile, FiTrash2 } from "react-icons/fi";

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string | null;
  username: string;
  onSaveAvatar: (newAvatarUrl: string | null) => Promise<void>;
}

export default function AvatarPickerModal({
  isOpen,
  onClose,
  currentAvatar,
  username,
  onSaveAvatar,
}: AvatarPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"preset" | "upload">("preset");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentAvatar);
  const [category, setCategory] = useState<string>("all");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filteredPresets =
    category === "all"
      ? AVATAR_PRESETS
      : AVATAR_PRESETS.filter((p) => p.category === category);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Vui lòng chọn định dạng file ảnh (PNG, JPG, WEBP, SVG)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Dung lượng ảnh tối đa là 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Nén ảnh bằng Canvas sang kích thước tối ưu 256x256 để đảm bảo tốc độ
        const canvas = document.createElement("canvas");
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Crop hình vuông chính giữa
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          const compressedDataUrl = canvas.toDataURL("image/webp", 0.85);
          setSelectedAvatar(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveAvatar(selectedAvatar);
      onClose();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Lỗi lưu avatar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Chọn ảnh đại diện
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tùy biến phong cách hiển thị avatar của bạn trên toàn hệ thống
          </p>
        </div>

        {/* Preview Current / Selected */}
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-brand-500 bg-gray-100 shadow-sm dark:bg-gray-800">
          {selectedAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedAvatar}
              alt="Avatar preview"
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-brand-600 font-bold text-white">
              {username?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="mt-4 flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => setActiveTab("preset")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
            activeTab === "preset"
              ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <FiSmile size={16} />
          Bộ sưu tập 3D / Memoji
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
            activeTab === "upload"
              ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <FiUpload size={16} />
          Tải ảnh từ máy
        </button>
      </div>

      {uploadError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          {uploadError}
        </div>
      )}

      {/* Tab 1: Presets */}
      {activeTab === "preset" && (
        <div className="mt-4">
          {/* Category Filter */}
          <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {[
              { id: "all", label: "Tất cả" },
              { id: "memoji", label: "Memoji Nghề nghiệp" },
              { id: "character", label: "Biểu tượng Vui nhộn" },
              { id: "gradient", label: "Gradient Trừu tượng" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  category === cat.id
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid of Avatars */}
          <div className="grid max-h-64 grid-cols-4 gap-3 overflow-y-auto p-1 sm:grid-cols-6">
            {filteredPresets.map((preset) => {
              const isSelected = selectedAvatar === preset.svgDataUri;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedAvatar(preset.svgDataUri)}
                  className={`group relative flex aspect-square flex-col items-center justify-center rounded-2xl border-2 p-1 transition-all hover:scale-105 ${
                    isSelected
                      ? "border-brand-600 bg-brand-50 shadow-md ring-2 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-950/40"
                      : "border-transparent bg-gray-50 hover:border-gray-200 hover:bg-white dark:bg-gray-900 dark:hover:border-gray-700"
                  }`}
                  title={preset.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preset.svgDataUri}
                    alt={preset.name}
                    className="size-11 object-contain transition-transform group-hover:scale-110"
                  />
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-brand-600 text-white shadow-xs">
                      <FiCheck size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Upload */}
      {activeTab === "upload" && (
        <div className="mt-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-8 text-center transition-all hover:border-brand-400 hover:bg-brand-50/20 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-brand-600"
          >
            <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-xs dark:bg-brand-950 dark:text-brand-400">
              <FiImage size={28} />
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              Nhấp để chọn ảnh hoặc kéo thả vào đây
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Hỗ trợ PNG, JPG, WebP, SVG (Tối đa 2MB, tự động cắt vuông)
            </p>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
        <div>
          {selectedAvatar && (
            <button
              type="button"
              onClick={() => setSelectedAvatar(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <FiTrash2 size={14} />
              Xóa avatar (dùng chữ cái)
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Hủy
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Đang lưu..." : "Áp dụng"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
