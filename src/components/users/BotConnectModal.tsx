"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/modal/Modal";
import Button from "@/components/ui/button/Button";
import { API_USERS } from "@/lib/api";
import { FiSend, FiCopy, FiCheck, FiRefreshCw, FiExternalLink } from "react-icons/fi";

const TELEGRAM_WEB_URL = "https://web.telegram.org/k/#@khaosat1120_bot";
const TELEGRAM_APP_URL_PREFIX = "https://t.me/khaosat1120_bot?start=link_";
const ZALO_BOT_URL = "https://zalo.me/1585703035743826375";

interface BotConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getToken = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
};

export default function BotConnectModal({ isOpen, onClose }: BotConnectModalProps) {
  const [channel, setChannel] = useState<"TELEGRAM" | "ZALO">("TELEGRAM");
  const [code, setCode] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCode = async (selectedChannel: "TELEGRAM" | "ZALO") => {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch(`${API_USERS}/me/bot-link-code?channel=${selectedChannel}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Không thể tạo mã liên kết (HTTP ${res.status})`);
      }

      const data = await res.json();
      setCode(data.code);
      setTimeLeft(data.expiresInSeconds || 600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCode(channel);
    }
  }, [isOpen, channel]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(`/link ${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-6">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
          <FiSend size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Liên kết Bot thông báo & Khảo sát
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tự động theo dõi khảo sát và nhận thống kê 24/7
          </p>
        </div>
      </div>

      {/* CHANNELS TAB */}
      <div className="mt-4 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => setChannel("TELEGRAM")}
          className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
            channel === "TELEGRAM"
              ? "bg-white text-brand-600 shadow-sm dark:bg-gray-900 dark:text-white"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          Telegram Bot
        </button>
        <button
          type="button"
          onClick={() => setChannel("ZALO")}
          className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
            channel === "ZALO"
              ? "bg-white text-brand-600 shadow-sm dark:bg-gray-900 dark:text-white"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          Zalo Bot
        </button>
      </div>

      {/* CONTENT */}
      <div className="mt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <FiRefreshCw className="size-6 animate-spin text-brand-500" />
            <span className="mt-2 text-xs">Đang tạo mã kết nối...</span>
          </div>
        ) : error ? (
          <div className="rounded-lg bg-error-50 p-3 text-xs text-error-600 dark:bg-error-950 dark:text-error-400">
            {error}
            <button
              onClick={() => fetchCode(channel)}
              className="mt-2 block font-medium underline"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Mã liên kết tài khoản của bạn (OTP):
            </span>

            {/* OTP CODE BOX */}
            <div className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 px-6 py-3 font-mono text-3xl font-extrabold tracking-widest text-brand-700 dark:border-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
              {code || "------"}
            </div>

            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
              <span>Hết hạn sau:</span>
              <span className={`font-mono font-medium ${timeLeft < 60 ? "text-error-500" : "text-gray-600 dark:text-gray-300"}`}>
                {formatTimer(timeLeft)}
              </span>
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-4 flex w-full flex-col gap-2">
              {channel === "TELEGRAM" ? (
                <>
                  <a
                    href={TELEGRAM_WEB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700"
                  >
                    <FiExternalLink /> Mở Telegram Web (@khaosat1120_bot)
                  </a>
                  {code && (
                    <a
                      href={`${TELEGRAM_APP_URL_PREFIX}${code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-xs font-medium text-sky-700 transition hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/50"
                    >
                      <FiSend /> Mở ứng dụng Telegram (Deep Link)
                    </a>
                  )}
                </>
              ) : (
                <a
                  href={ZALO_BOT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <FiExternalLink /> Mở Bot Khảo sát (Zalo)
                </a>
              )}

              <button
                type="button"
                onClick={handleCopy}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750"
              >
                {copied ? (
                  <>
                    <FiCheck className="text-success-500" /> Đã sao chép cú pháp: /link {code}!
                  </>
                ) : (
                  <>
                    <FiCopy /> Sao chép cú pháp: /link {code}
                  </>
                )}
              </button>
            </div>

            {/* STEPS */}
            <div className="mt-5 w-full rounded-lg bg-gray-50 p-3 text-left text-xs text-gray-600 dark:bg-gray-900/60 dark:text-gray-300">
              <p className="font-semibold text-gray-800 dark:text-white">Hướng dẫn kết nối:</p>
              <ol className="mt-1.5 list-decimal space-y-1.5 pl-4 text-[11px] text-gray-500 dark:text-gray-400">
                {channel === "TELEGRAM" ? (
                  <li>
                    Mở{" "}
                    <a
                      href={TELEGRAM_WEB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-semibold text-sky-600 underline hover:text-sky-700 dark:text-sky-400"
                    >
                      Telegram Web <FiExternalLink className="size-3" />
                    </a>{" "}
                    hoặc ứng dụng Telegram (tìm <span className="font-semibold text-gray-800 dark:text-gray-200">@khaosat1120_bot</span>).
                  </li>
                ) : (
                  <li>
                    Mở{" "}
                    <a
                      href={ZALO_BOT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-semibold text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                    >
                      Bot Khảo sát <FiExternalLink className="size-3" />
                    </a>{" "}
                    trên Zalo điện thoại hoặc Zalo Web / PC.
                  </li>
                )}
                <li>
                  Gửi tin nhắn cú pháp:{" "}
                  <code className="rounded bg-gray-200 px-1 py-0.5 font-mono font-semibold text-gray-900 dark:bg-gray-800 dark:text-gray-100">
                    /link {code}
                  </code>
                </li>
                <li>Bot sẽ lập tức xác nhận và mở Menu chức năng cho bạn!</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <Button variant="outline" size="sm" onClick={() => fetchCode(channel)} disabled={loading}>
          <FiRefreshCw className={`mr-1.5 ${loading ? "animate-spin" : ""}`} /> Tạo mã mới
        </Button>
        <Button variant="primary" size="sm" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Modal>
  );
}
