"use client";

import React, { useState } from "react";
import { changeMyPassword, ChangePasswordPayload } from "@/lib/profile-service";
import Button from "@/components/ui/button/Button";
import {
  FiLock,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiX,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiKey,
} from "react-icons/fi";

export default function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password Strength Calculation
  const hasMinLength = newPassword.length >= 6;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const passedCount = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  const strengthConfig = (() => {
    if (!newPassword) return { percent: 0, label: "Chưa nhập", color: "bg-gray-200 dark:bg-gray-700", text: "text-gray-400" };
    if (passedCount <= 2) return { percent: 25, label: "Rất yếu", color: "bg-red-500", text: "text-red-500" };
    if (passedCount === 3) return { percent: 50, label: "Trung bình", color: "bg-amber-500", text: "text-amber-500" };
    if (passedCount === 4) return { percent: 75, label: "Khá mạnh", color: "bg-blue-500", text: "text-blue-500" };
    return { percent: 100, label: "Rất mạnh", color: "bg-emerald-500", text: "text-emerald-500" };
  })();

  const isMatching = newPassword && confirmPassword && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword) {
      setErrorMsg("Vui lòng nhập mật khẩu hiện tại");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Xác nhận mật khẩu mới không khớp");
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMsg("Mật khẩu mới không được trùng với mật khẩu hiện tại");
      return;
    }

    setLoading(true);
    try {
      const payload: ChangePasswordPayload = {
        currentPassword,
        newPassword,
        confirmPassword,
      };

      const res = await changeMyPassword(payload);
      setSuccessMsg(res.message || "Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Form đổi mật khẩu */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:p-8 lg:col-span-2">
        <div className="mb-6 border-b border-gray-100 pb-4 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Đổi mật khẩu
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Cập nhật mật khẩu định kỳ giúp bảo vệ tài khoản và dữ liệu khảo sát
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
          {/* Mật khẩu hiện tại */}
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
              Mật khẩu hiện tại <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <FiLock size={16} />
              </div>
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại của bạn"
                required
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-11 pl-10 text-sm font-medium text-gray-900 transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showCurrent ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          {/* Mật khẩu mới */}
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
              Mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <FiKey size={16} />
              </div>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                required
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-11 pl-10 text-sm font-medium text-gray-900 transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showNew ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {newPassword && (
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 dark:text-gray-400">Độ mạnh mật khẩu:</span>
                  <span className={`font-bold ${strengthConfig.text}`}>{strengthConfig.label}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={`h-full transition-all duration-300 ${strengthConfig.color}`}
                    style={{ width: `${strengthConfig.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Xác nhận mật khẩu mới */}
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
              Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <FiLock size={16} />
              </div>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                required
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-11 pl-10 text-sm font-medium text-gray-900 transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>

            {confirmPassword && (
              <p
                className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold ${
                  isMatching ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {isMatching ? <FiCheck size={13} /> : <FiX size={13} />}
                <span>{isMatching ? "Mật khẩu xác nhận khớp" : "Mật khẩu xác nhận chưa khớp"}</span>
              </p>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading || !newPassword || !confirmPassword || !isMatching}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold shadow-xs"
            >
              <FiShield size={16} />
              <span>{loading ? "Đang xử lý..." : "Cập nhật mật khẩu mới"}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Cột phải: Tiêu chuẩn & Lời khuyên bảo mật */}
      <div className="space-y-6">
        <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
            <div className="flex size-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <FiShield size={16} />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Tiêu chuẩn mật khẩu
            </h3>
          </div>

          <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
            <li className="flex items-center gap-2">
              {hasMinLength ? (
                <FiCheck size={14} className="text-emerald-500" />
              ) : (
                <span className="size-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
              )}
              <span className={hasMinLength ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>
                Tối thiểu 6 ký tự
              </span>
            </li>
            <li className="flex items-center gap-2">
              {hasUpper ? (
                <FiCheck size={14} className="text-emerald-500" />
              ) : (
                <span className="size-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
              )}
              <span className={hasUpper ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>
                Ít nhất 1 chữ in hoa (A-Z)
              </span>
            </li>
            <li className="flex items-center gap-2">
              {hasLower ? (
                <FiCheck size={14} className="text-emerald-500" />
              ) : (
                <span className="size-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
              )}
              <span className={hasLower ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>
                Ít nhất 1 chữ in thường (a-z)
              </span>
            </li>
            <li className="flex items-center gap-2">
              {hasNumber ? (
                <FiCheck size={14} className="text-emerald-500" />
              ) : (
                <span className="size-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
              )}
              <span className={hasNumber ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>
                Ít nhất 1 chữ số (0-9)
              </span>
            </li>
            <li className="flex items-center gap-2">
              {hasSpecial ? (
                <FiCheck size={14} className="text-emerald-500" />
              ) : (
                <span className="size-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
              )}
              <span className={hasSpecial ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>
                Ký tự đặc biệt (!@#$%...)
              </span>
            </li>
          </ul>

          <div className="mt-5 rounded-2xl bg-amber-50/70 p-3.5 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <p className="font-semibold">Mẹo an toàn:</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              Không sử dụng lại mật khẩu của các dịch vụ khác. Sau khi đổi thành công, phiên đăng nhập hiện tại sẽ tiếp tục được duy trì an toàn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
