"use client";

import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/** ASP.NET Core có thể trả về chuỗi JSON thuần, ProblemDetails (detail/title), hoặc { message } */
function getApiErrorMessage(data: unknown, fallback: string): string {
  if (data == null || data === "") return fallback;
  if (typeof data === "string") return data;
  if (typeof data === "object" && data !== null) {
    const o = data as Record<string, unknown>;
    if (typeof o.detail === "string" && o.detail.trim()) return o.detail;
    if (typeof o.message === "string" && o.message.trim()) return o.message;
    if (typeof o.title === "string" && o.title.trim()) {
      const t = o.title.trim();
      if (t !== "Bad Request" && t !== "Unauthorized") return t;
    }
    const errs = o.errors;
    if (errs && typeof errs === "object") {
      const parts = Object.values(errs as Record<string, string[]>)
        .flat()
        .filter((x): x is string => typeof x === "string");
      if (parts.length) return parts.join("; ");
    }
    if (typeof o.title === "string") return o.title;
  }
  return fallback;
}

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // ======================
  // AUTO REDIRECT nếu đã login
  // ======================
  useEffect(() => {
    localStorage.clear();
    sessionStorage.clear();
  }, []);

  // ======================
  // HANDLE LOGIN
  // ======================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      let data: unknown;
      const contentType = res.headers.get("content-type") || "";
      try {
        if (contentType.includes("application/json")) {
          data = await res.json();
        } else {
          const text = await res.text();
          data = text.trim() ? text : null;
        }
      } catch {
        throw new Error("Response không hợp lệ từ server");
      }

      if (!res.ok) {
        setError(
          getApiErrorMessage(data, "Đăng nhập thất bại")
        );
        return;
      }

    // ======================
    // ✅ LƯU TRỰC TIẾP LOCAL STORAGE
    // ======================
    const storage = isChecked ? localStorage : sessionStorage;

    const ok = data as {
      token: string;
      id: number;
      username: string;
      roles: string[];
      permissions: string[];
    };
    storage.setItem("token", ok.token);
    storage.setItem("user", JSON.stringify({
      id: ok.id,
      username: ok.username,
      roles: ok.roles,
      permissions: ok.permissions,
    }));


    window.dispatchEvent(new Event("userChanged"));
      // ======================
      // REDIRECT
      // ======================
      router.push("/admin");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // UI
  // ======================
  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      {/* BACK */}
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeftIcon />
          Quay lại trang chủ
        </Link>
      </div>

      {/* FORM */}
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-6">
            <h1 className="mb-2 font-semibold text-2xl">Đăng nhập</h1>
            <p className="text-sm text-gray-500">
              Nhập tên đăng nhập và mật khẩu của bạn
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="space-y-6">
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
                <Label>
                  Tên đăng nhập <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Nhập tên đăng nhập"
                  value={username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUsername(e.target.value)
                  }
                />
              </div>

              {/* PASSWORD */}
              <div>
                <Label>
                  Mật khẩu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPassword(e.target.value)
                    }
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                  </span>
                </div>
              </div>

              {/* REMEMBER */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isChecked}
                    onChange={(checked: boolean) =>
                      setIsChecked(checked)
                    }
                  />
                  <span className="text-sm">Ghi nhớ đăng nhập</span>
                </div>

                <Link
                  href="/reset-password"
                  className="text-sm text-blue-500"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              {/* BUTTON */}
              <Button
                type="submit"
                className="w-full"
                size="sm"
                disabled={loading}
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}