"use client";

import React, { useState } from "react";
import { UserProfile, updateMyProfile, UpdateProfilePayload } from "@/lib/profile-service";
import Button from "@/components/ui/button/Button";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiLock,
  FiShield,
  FiCopy,
  FiCheck,
  FiSave,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";

interface ProfileInfoTabProps {
  user: UserProfile;
  onProfileUpdated: (updatedUser: UserProfile) => void;
}

export default function ProfileInfoTab({ user, onProfileUpdated }: ProfileInfoTabProps) {
  const [fullName, setFullName] = useState(user.fullName || "");
  const [email, setEmail] = useState(user.email || "");
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || "");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: UpdateProfilePayload = {
        fullName: fullName.trim() || undefined,
        email: email.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
      };

      const updated = await updateMyProfile(payload);
      onProfileUpdated(updated);
      setSuccessMsg("Cập nhật thông tin hồ sơ thành công!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Cột trái: Form chỉnh sửa chính */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:p-8 lg:col-span-2">
        <div className="mb-6 border-b border-gray-100 pb-4 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Thông tin cá nhân
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Cập nhật chi tiết hồ sơ để hiển thị trong các khảo sát và báo cáo
          </p>
        </div>

        {successMsg && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <FiCheckCircle size={18} className="shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            <FiAlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Họ và tên */}
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
              Họ và tên hiển thị
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <FiUser size={16} />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên của bạn..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-sm font-medium text-gray-900 transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Tên này sẽ hiển thị ở góc trên ứng dụng và trong lịch sử hoạt động
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
              Địa chỉ Email
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <FiMail size={16} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten.nguoidung@example.com"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-sm font-medium text-gray-900 transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Dùng để nhận các báo cáo khảo sát và khôi phục tài khoản
            </p>
          </div>

          {/* Số điện thoại */}
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
              Số điện thoại
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <FiPhone size={16} />
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0912 345 678"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-sm font-medium text-gray-900 transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold shadow-xs"
            >
              <FiSave size={16} />
              <span>{loading ? "Đang lưu thay đổi..." : "Lưu thay đổi"}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Cột phải: Thông tin hệ thống không đổi (Read-only System Info) */}
      <div className="space-y-6">
        <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 border-b border-gray-100 pb-3 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Thông tin hệ thống
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Các thông số kỹ thuật gắn liền với tài khoản của bạn
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Tên đăng nhập */}
            <div>
              <p className="font-semibold text-gray-500 dark:text-gray-400">Tên đăng nhập</p>
              <div className="mt-1 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 font-mono font-medium text-gray-800 dark:bg-gray-800/80 dark:text-gray-200">
                <span>{user.username}</span>
                <span className="rounded-md bg-gray-200/60 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  Cố định
                </span>
              </div>
            </div>

            {/* Vai trò */}
            <div>
              <p className="font-semibold text-gray-500 dark:text-gray-400">Vai trò & Quyền hạn</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {user.roles && user.roles.length > 0 ? (
                  user.roles.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                    >
                      <FiShield size={12} />
                      {r}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">Người dùng thông thường</span>
                )}
              </div>
            </div>

            {/* Trạng thái tài khoản */}
            <div>
              <p className="font-semibold text-gray-500 dark:text-gray-400">Trạng thái tài khoản</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="flex size-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Đang hoạt động (Active)
                </span>
              </div>
            </div>

            {/* User ID (UUID) */}
            <div>
              <p className="font-semibold text-gray-500 dark:text-gray-400">Mã tài khoản (User ID)</p>
              <div className="mt-1 flex items-center justify-between rounded-xl bg-gray-50 p-2 font-mono text-[11px] text-gray-600 dark:bg-gray-800/80 dark:text-gray-300">
                <span className="truncate pr-2">{user.id}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="rounded-lg p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                  title="Sao chép ID"
                >
                  {copiedId ? <FiCheck size={14} className="text-emerald-500" /> : <FiCopy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
