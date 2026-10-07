"use client";

import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";

import {
  ChevronLeftIcon,
  EyeCloseIcon,
  EyeIcon,
} from "@/icons";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_AUTH } from "@/lib/api";

// ========================================
// TYPES
// ========================================

interface LoginResponse {
  token: string;
  id: string;
  username: string;
  roles: string[];
  permissions: string[];
}

// ========================================
// API ERROR HANDLER
// ========================================

function getApiErrorMessage(
  data: unknown,
  fallback: string
): string {
  if (data == null || data === "") {
    return fallback;
  }

  if (typeof data === "string") {
    // Không hiển thị nguyên trang HTML lỗi.
    if (
      data.trim().startsWith("<!DOCTYPE") ||
      data.trim().startsWith("<html")
    ) {
      return fallback;
    }

    return data;
  }

  if (typeof data === "object") {
    const o = data as Record<string, unknown>;

    if (typeof o.detail === "string" && o.detail.trim()) {
      return o.detail;
    }

    if (typeof o.message === "string" && o.message.trim()) {
      return o.message;
    }

    if (typeof o.title === "string" && o.title.trim()) {
      return o.title;
    }

    if (o.errors && typeof o.errors === "object") {
      const errors = Object.values(
        o.errors as Record<string, unknown>
      )
        .flat()
        .filter(
          (value): value is string =>
            typeof value === "string"
        );

      if (errors.length > 0) {
        return errors.join("; ");
      }
    }
  }

  return fallback;
}

// ========================================
// SIGN IN FORM
// ========================================

export default function SignInForm() {
  const router = useRouter();

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ========================================
  // REMEMBER LOGIN
  // ========================================

  useEffect(() => {
    // Không xóa toàn bộ localStorage/sessionStorage.
    // Chỉ đọc trạng thái ghi nhớ trước đó.

    const remembered =
      localStorage.getItem("rememberMe") === "true";

    setIsChecked(remembered);
  }, []);

  // ========================================
  // HANDLE LOGIN
  // ========================================

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (loading) return;

    setError(null);

    const trimmedUsername = username.trim();

    // Validate
    if (!trimmedUsername || !password) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    setLoading(true);

    try {
      // ====================================
      // API URL
      // ====================================

      // API_AUTH được lấy từ @/lib/api.
      const loginUrl = `${API_AUTH}/login`;

      // ====================================
      // REQUEST
      // ====================================

      const response = await fetch(loginUrl, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify({
          username: trimmedUsername,
          password: password,
          rememberMe: isChecked,
        }),
      });

      // ====================================
      // RESPONSE
      // ====================================

      const contentType =
        response.headers.get("content-type") || "";

      const rawResponse = await response.text();

      let data: unknown = null;

      if (rawResponse.trim()) {
        if (contentType.includes("application/json")) {
          try {
            data = JSON.parse(rawResponse);
          } catch {
            throw new Error(
              "Server trả về JSON không hợp lệ"
            );
          }
        } else {
          // Một số API có thể trả về JSON
          // nhưng thiếu Content-Type.
          try {
            data = JSON.parse(rawResponse);
          } catch {
            data = rawResponse;
          }
        }
      }

      // ====================================
      // HTTP ERROR
      // ====================================

      if (!response.ok) {
        console.error("Login request failed", {
          status: response.status,
          statusText: response.statusText,
          contentType,
        });

        let fallback = `Đăng nhập thất bại (HTTP ${response.status})`;

        switch (response.status) {
          case 400:
            fallback = "Dữ liệu đăng nhập không hợp lệ";
            break;

          case 401:
            fallback =
              "Tên đăng nhập hoặc mật khẩu không chính xác";
            break;

          case 403:
            fallback =
              "Truy cập bị từ chối (403). Vui lòng kiểm tra cấu hình bảo mật của Gateway hoặc Auth Service.";
            break;

          case 404:
            fallback =
              "Không tìm thấy API đăng nhập. Vui lòng kiểm tra đường dẫn.";
            break;

          case 429:
            fallback =
              "Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau.";
            break;

          case 500:
          case 502:
          case 503:
          case 504:
            fallback =
              "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.";
            break;
        }

        setError(
          getApiErrorMessage(data, fallback)
        );

        return;
      }

      // ====================================
      // VALIDATE LOGIN RESPONSE
      // ====================================

      if (
        typeof data !== "object" ||
        data === null ||
        !("token" in data) ||
        typeof data.token !== "string" ||
        !data.token
      ) {
        throw new Error(
          "Phản hồi đăng nhập không chứa token hợp lệ"
        );
      }

      const result = data as LoginResponse;

      // ====================================
      // SAVE AUTH DATA
      // ====================================

      const storage = isChecked
        ? localStorage
        : sessionStorage;

      const otherStorage = isChecked
        ? sessionStorage
        : localStorage;

      // Xóa phiên cũ ở vị trí lưu trữ còn lại.
      otherStorage.removeItem("token");
      otherStorage.removeItem("user");

      storage.setItem("token", result.token);

      storage.setItem(
        "user",
        JSON.stringify({
          id: result.id,
          username: result.username,
          roles: result.roles,
          permissions: result.permissions,
        })
      );

      // Lưu lựa chọn ghi nhớ đăng nhập.
      localStorage.setItem(
        "rememberMe",
        String(isChecked)
      );

      // ====================================
      // NOTIFY APPLICATION
      // ====================================

      window.dispatchEvent(
        new Event("userChanged")
      );

      // ====================================
      // REDIRECT
      // ====================================

      router.push("/admin");

    } catch (err) {
      console.error("Login error:", err);

      if (err instanceof TypeError) {
        setError(
          "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng hoặc API."
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Đã xảy ra lỗi khi đăng nhập");
      }

    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // UI
  // ========================================

  return (
    <div className="flex min-w-0 flex-1 flex-col px-1 sm:px-6 lg:w-1/2 lg:px-10">

      {/* BACK */}
      <div className="mx-auto mb-8 w-full max-w-md pt-2 sm:pt-10">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-gray-600 transition-colors hover:text-brand-700 dark:text-gray-300 dark:hover:text-brand-300"
        >
          <ChevronLeftIcon />
          Quay lại trang chủ
        </Link>
      </div>

      {/* FORM */}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pb-10">

        <div>

          {/* HEADER */}
          <div className="mb-6">
            <h1 className="mb-2 text-3xl font-semibold text-gray-900 dark:text-white">
              Đăng nhập
            </h1>

            <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
              Nhập tên đăng nhập và mật khẩu của bạn
            </p>
          </div>

          <form onSubmit={handleLogin}>

            <div className="space-y-6">

              {/* ERROR MESSAGE */}
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                >
                  {error}
                </div>
              )}

              {/* USERNAME */}
              <div>
                <Label htmlFor="signin-username">
                  Tên đăng nhập{" "}
                  <span className="text-red-500">*</span>
                </Label>

                <Input
                  id="signin-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Nhập tên đăng nhập…"
                  value={username}
                  onChange={(
                    e: React.ChangeEvent<HTMLInputElement>
                  ) => setUsername(e.target.value)}
                />
              </div>

              {/* PASSWORD */}
              <div>
                <Label htmlFor="signin-password">
                  Mật khẩu{" "}
                  <span className="text-red-500">*</span>
                </Label>

                <div className="relative">

                  <Input
                    id="signin-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu…"
                    value={password}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => setPassword(e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  >
                    {showPassword ? (
                      <EyeIcon />
                    ) : (
                      <EyeCloseIcon />
                    )}
                  </button>

                </div>
              </div>

              {/* REMEMBER PASSWORD */}
              <div className="flex flex-col gap-3 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">

                <div>
                  <Checkbox
                    id="remember-me"
                    label="Ghi nhớ đăng nhập"
                    checked={isChecked}
                    onChange={(checked: boolean) =>
                      setIsChecked(checked)
                    }
                  />

                </div>

                <Link
                  href="/reset-password"
                  className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
                >
                  Quên mật khẩu?
                </Link>

              </div>

              {/* SUBMIT BUTTON */}
              <Button
                type="submit"
                className="w-full"
                size="sm"
                disabled={loading}
              >
                {loading
                  ? "Đang đăng nhập…"
                  : "Đăng nhập"}
              </Button>

            </div>

          </form>

        </div>

      </div>

    </div>
  );

};
