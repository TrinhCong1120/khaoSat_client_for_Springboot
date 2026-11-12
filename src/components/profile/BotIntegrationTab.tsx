"use client";

import React, { useState, useEffect } from "react";
import {
  UserProfile,
  generateBotOtpCode,
  unlinkBotAccount,
  toggleBotNotifications,
  BotLinkCodeResponse,
} from "@/lib/profile-service";
import Button from "@/components/ui/button/Button";
import {
  FiSend,
  FiCopy,
  FiCheck,
  FiExternalLink,
  FiTrash2,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiBell,
} from "react-icons/fi";
import { Bot } from "lucide-react";

interface BotIntegrationTabProps {
  user: UserProfile;
  onProfileUpdated: (updatedUser: UserProfile) => void;
}

const TELEGRAM_WEB_URL = "https://web.telegram.org/k/#@khaosat1120_bot";
const TELEGRAM_APP_URL_PREFIX = "https://t.me/khaosat1120_bot?start=link_";
const ZALO_BOT_URL = "https://zalo.me/1585703035743826375";

export default function BotIntegrationTab({ user, onProfileUpdated }: BotIntegrationTabProps) {
  const [telegramCode, setTelegramCode] = useState<BotLinkCodeResponse | null>(null);
  const [zaloCode, setZaloCode] = useState<BotLinkCodeResponse | null>(null);
  const [telegramTimeLeft, setTelegramTimeLeft] = useState(600);
  const [zaloTimeLeft, setZaloTimeLeft] = useState(600);

  const [loadingChannel, setLoadingChannel] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isNotifEnabled, setIsNotifEnabled] = useState(user.botNotificationEnabled ?? true);
  const [isTogglingNotif, setIsTogglingNotif] = useState(false);

  // Telegram Timer
  useEffect(() => {
    if (!telegramCode || telegramTimeLeft <= 0) return;
    const t = setInterval(() => setTelegramTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [telegramCode, telegramTimeLeft]);

  // Zalo Timer
  useEffect(() => {
    if (!zaloCode || zaloTimeLeft <= 0) return;
    const t = setInterval(() => setZaloTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [zaloCode, zaloTimeLeft]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate OTP
  const handleGenerateCode = async (channel: "TELEGRAM" | "ZALO") => {
    setLoadingChannel(channel);
    setActionMsg(null);
    try {
      const data = await generateBotOtpCode(channel);
      if (channel === "TELEGRAM") {
        setTelegramCode(data);
        setTelegramTimeLeft(data.expiresInSeconds || 600);
      } else {
        setZaloCode(data);
        setZaloTimeLeft(data.expiresInSeconds || 600);
      }
    } catch (err: unknown) {
      setActionMsg({
        type: "error",
        text: err instanceof Error ? err.message : `Lỗi tạo mã ${channel}`,
      });
    } finally {
      setLoadingChannel(null);
    }
  };

  // Unlink
  const handleUnlink = async (channel: "TELEGRAM" | "ZALO") => {
    if (!confirm(`Bạn có chắc chắn muốn ngắt kết nối với Bot ${channel}?`)) return;

    setLoadingChannel(`unlink_${channel}`);
    setActionMsg(null);
    try {
      const updated = await unlinkBotAccount(channel);
      onProfileUpdated(updated);
      if (channel === "TELEGRAM") setTelegramCode(null);
      if (channel === "ZALO") setZaloCode(null);
      setActionMsg({
        type: "success",
        text: `Đã hủy liên kết thành công với Bot ${channel}`,
      });
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: unknown) {
      setActionMsg({
        type: "error",
        text: err instanceof Error ? err.message : `Lỗi hủy liên kết ${channel}`,
      });
    } finally {
      setLoadingChannel(null);
    }
  };

  // Toggle notification
  const handleToggleNotif = async () => {
    const nextState = !isNotifEnabled;
    setIsTogglingNotif(true);
    setActionMsg(null);
    try {
      const updated = await toggleBotNotifications(nextState);
      setIsNotifEnabled(nextState);
      onProfileUpdated(updated);
      setActionMsg({
        type: "success",
        text: nextState
          ? "Đã bật nhận thông báo qua Chatbot"
          : "Đã tạm dừng nhận thông báo qua Chatbot",
      });
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: unknown) {
      setActionMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Không thể cập nhật tùy chọn thông báo",
      });
    } finally {
      setIsTogglingNotif(false);
    }
  };

  const isTelegramLinked = user.telegramChatId != null;
  const isZaloLinked = user.zaloChatId != null && user.zaloChatId.trim() !== "";

  return (
    <div className="space-y-6">
      {/* Alert Notification */}
      {actionMsg && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl p-4 text-xs font-semibold ${
            actionMsg.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
          }`}
        >
          {actionMsg.type === "success" ? (
            <FiCheckCircle size={18} className="shrink-0 text-emerald-600" />
          ) : (
            <FiAlertCircle size={18} className="shrink-0 text-rose-600" />
          )}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Grid: 2 Cards (Telegram & Zalo) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ================= TELEGRAM CARD ================= */}
        <div className="flex flex-col justify-between rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:p-7">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-500 dark:bg-sky-950/50 dark:text-sky-400">
                  <FiSend size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Telegram Bot
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Nhận thông báo khảo sát & báo cáo tức thì
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  isTelegramLinked
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    isTelegramLinked ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                  }`}
                />
                {isTelegramLinked ? "Đã liên kết" : "Chưa liên kết"}
              </span>
            </div>

            {/* Content Body */}
            <div className="py-5">
              {isTelegramLinked ? (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-sky-50/60 p-4 dark:bg-sky-950/30">
                    <p className="text-xs font-semibold text-sky-900 dark:text-sky-200">
                      Tài khoản đã sẵn sàng nhận thông báo
                    </p>
                    <p className="mt-1 font-mono text-xs text-sky-700 dark:text-sky-300">
                      Telegram Chat ID: <span className="font-bold">{user.telegramChatId}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={TELEGRAM_WEB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:border-sky-300 hover:text-sky-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-sky-600 dark:hover:text-sky-300"
                    >
                      <FiExternalLink size={14} />
                      Mở Chat với Bot
                    </a>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnlink("TELEGRAM")}
                      disabled={loadingChannel === "unlink_TELEGRAM"}
                      className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <FiTrash2 size={14} className="mr-1" />
                      {loadingChannel === "unlink_TELEGRAM" ? "Đang hủy..." : "Hủy liên kết"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Kết nối tài khoản Telegram để nhận ngay thông báo khi có phản hồi mới,
                    truy vấn nhanh số liệu khảo sát mọi lúc mọi nơi.
                  </p>

                  {telegramCode ? (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 dark:border-sky-900/50 dark:bg-sky-950/30">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          Mã xác thực 6 số:
                        </span>
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          Hết hạn sau: {formatTimer(telegramTimeLeft)}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-center gap-2">
                        <div className="rounded-xl bg-white px-4 py-2 font-mono text-2xl font-black tracking-widest text-sky-600 shadow-xs dark:bg-gray-900 dark:text-sky-400">
                          {telegramCode.code}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(`/link ${telegramCode.code}`, "tg_cmd")}
                          className="flex size-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                          title="Sao chép cú pháp /link"
                        >
                          {copiedKey === "tg_cmd" ? (
                            <FiCheck size={18} className="text-emerald-500" />
                          ) : (
                            <FiCopy size={18} />
                          )}
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 pt-2">
                        <a
                          href={`${TELEGRAM_APP_URL_PREFIX}${telegramCode.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-sky-600"
                        >
                          <FiSend size={14} />
                          Mở Telegram (Tự động liên kết)
                        </a>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleGenerateCode("TELEGRAM")}
                      disabled={loadingChannel === "TELEGRAM"}
                      className="rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      {loadingChannel === "TELEGRAM" ? (
                        <FiRefreshCw size={14} className="mr-1.5 animate-spin" />
                      ) : (
                        <FiSend size={14} className="mr-1.5" />
                      )}
                      Tạo mã kết nối Telegram
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= ZALO CARD ================= */}
        <div className="flex flex-col justify-between rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:p-7">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <Bot className="size-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Zalo OA Bot
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tra cứu báo cáo và khảo sát trực tiếp qua Zalo
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  isZaloLinked
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    isZaloLinked ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                  }`}
                />
                {isZaloLinked ? "Đã liên kết" : "Chưa liên kết"}
              </span>
            </div>

            {/* Content Body */}
            <div className="py-5">
              {isZaloLinked ? (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-blue-50/60 p-4 dark:bg-blue-950/30">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                      Tài khoản đã sẵn sàng nhận tin nhắn Zalo
                    </p>
                    <p className="mt-1 font-mono text-xs text-blue-700 dark:text-blue-300">
                      Zalo User ID: <span className="font-bold">{user.zaloChatId}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={ZALO_BOT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:text-blue-300"
                    >
                      <FiExternalLink size={14} />
                      Mở Zalo OA
                    </a>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnlink("ZALO")}
                      disabled={loadingChannel === "unlink_ZALO"}
                      className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <FiTrash2 size={14} className="mr-1" />
                      {loadingChannel === "unlink_ZALO" ? "Đang hủy..." : "Hủy liên kết"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Liên kết qua Zalo Official Account để nhận các thông báo đẩy
                    và xem thống kê khảo sát tiện lợi mỗi ngày.
                  </p>

                  {zaloCode ? (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          Mã xác thực 6 số:
                        </span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          Hết hạn sau: {formatTimer(zaloTimeLeft)}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-center gap-2">
                        <div className="rounded-xl bg-white px-4 py-2 font-mono text-2xl font-black tracking-widest text-blue-600 shadow-xs dark:bg-gray-900 dark:text-blue-400">
                          {zaloCode.code}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(`/link ${zaloCode.code}`, "zalo_cmd")}
                          className="flex size-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                          title="Sao chép cú pháp /link"
                        >
                          {copiedKey === "zalo_cmd" ? (
                            <FiCheck size={18} className="text-emerald-500" />
                          ) : (
                            <FiCopy size={18} />
                          )}
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 pt-2">
                        <a
                          href={ZALO_BOT_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
                        >
                          <FiExternalLink size={14} />
                          Mở Zalo và gửi /link {zaloCode.code}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleGenerateCode("ZALO")}
                      disabled={loadingChannel === "ZALO"}
                      className="rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      {loadingChannel === "ZALO" ? (
                        <FiRefreshCw size={14} className="mr-1.5 animate-spin" />
                      ) : (
                        <Bot className="mr-1.5 size-4" />
                      )}
                      Tạo mã kết nối Zalo
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= NOTIFICATION PREFERENCES CARD ================= */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <FiBell size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Tùy chọn nhận thông báo qua Chatbot
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tự động gửi tin nhắn báo cáo khi có người điền khảo sát của bạn
              </p>
            </div>
          </div>

          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={isNotifEnabled}
              disabled={isTogglingNotif}
              onChange={handleToggleNotif}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-brand-600 peer-focus:outline-hidden dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] dark:border-gray-600" />
            <span className="ml-3 text-xs font-semibold text-gray-700 dark:text-gray-300">
              {isNotifEnabled ? "Đang bật" : "Đang tắt"}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
