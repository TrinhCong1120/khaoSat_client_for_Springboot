"use client";

import React, { useEffect, useState, useCallback } from "react";
import Modal from "@/components/ui/modal/Modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { API_GROUPS, API_SURVEYS, API_GOOGLE_SURVEYS_ROOT, API_GOOGLE_INTEGRATIONS } from "@/lib/api";
import { getToken } from "@/lib/auth";
import GoogleAccountManagerModal, { GoogleConnectionItem } from "./GoogleAccountManagerModal";
import { FcGoogle } from "react-icons/fc";
import { FiFileText, FiLink, FiPlus, FiSettings, FiExternalLink, FiRefreshCw, FiEdit3, FiList } from "react-icons/fi";

export interface GoogleDriveFormItem {
  id: string;
  name: string;
  editUrl: string;
  responderUri?: string;
  modifiedTime?: string;
  alreadyLinked: boolean;
  linkedSurveyId?: string;
}

interface Props {
  onClose: () => void;
  onSubmitSuccess: () => void;
  initialGroupId?: string;
}

type SurveySource = "INTERNAL" | "GOOGLE_FORMS";
type GoogleMode = "CREATE" | "LINK";

export default function SurveyFormModal({
  onClose,
  onSubmitSuccess,
  initialGroupId = "",
}: Props) {
  const [source, setSource] = useState<SurveySource>("INTERNAL");
  const [googleMode, setGoogleMode] = useState<GoogleMode>("CREATE");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [groupId, setGroupId] = useState(initialGroupId);
  const [googleFormUrlOrId, setGoogleFormUrlOrId] = useState("");
  const [connectionId, setConnectionId] = useState("");

  const [groups, setGroups] = useState<{ id: string; name: string; permissions: string[] }[]>([]);
  const [googleConnections, setGoogleConnections] = useState<GoogleConnectionItem[]>([]);
  const [showAccountManager, setShowAccountManager] = useState(false);

  const [availableForms, setAvailableForms] = useState<GoogleDriveFormItem[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [formsFetchError, setFormsFetchError] = useState("");
  const [manualInputMode, setManualInputMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFormsForConnection = useCallback(async (connId: string) => {
    if (!connId) {
      setAvailableForms([]);
      return;
    }
    try {
      setLoadingForms(true);
      setFormsFetchError("");
      const token = getToken();
      const res = await fetch(`${API_GOOGLE_SURVEYS_ROOT}/forms?connectionId=${connId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const list: GoogleDriveFormItem[] = await res.json();
        setAvailableForms(list);
        if (list.length === 0) {
          setManualInputMode(true);
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setFormsFetchError(errJson.message || "Không thể tải danh sách biểu mẫu từ Drive.");
        setManualInputMode(true);
      }
    } catch (e) {
      console.warn("Could not fetch forms for connection", e);
      setFormsFetchError("Không thể kết nối đến máy chủ.");
      setManualInputMode(true);
    } finally {
      setLoadingForms(false);
    }
  }, []);

  const fetchGroups = useCallback(() => {
    const token = getToken();
    void fetch(API_GROUPS, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không tải được group.");
        return response.json();
      })
      .then((rows) => setGroups((rows as typeof groups).filter((row) => row.permissions.includes("CREATE_SURVEY"))))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không tải được group."));
  }, []);

  const fetchGoogleConnections = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_GOOGLE_INTEGRATIONS}/connections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const list: GoogleConnectionItem[] = await res.json();
        setGoogleConnections(list);
        if (list.length > 0 && !connectionId) {
          const activeConn = list.find((c) => c.status === "ACTIVE") || list[0];
          setConnectionId(activeConn.id);
        }
      }
    } catch (e) {
      console.warn("Could not fetch google connections", e);
    }
  }, [connectionId]);

  useEffect(() => {
    fetchGroups();
    fetchGoogleConnections();
  }, [fetchGroups, fetchGoogleConnections]);

  useEffect(() => {
    if (source === "GOOGLE_FORMS" && googleMode === "LINK" && connectionId) {
      fetchFormsForConnection(connectionId);
    }
  }, [source, googleMode, connectionId, fetchFormsForConnection]);

  const handleSelectForm = (formUrlOrId: string) => {
    if (formUrlOrId === "__MANUAL__") {
      setManualInputMode(true);
      return;
    }
    setGoogleFormUrlOrId(formUrlOrId);
    const selected = availableForms.find((f) => f.editUrl === formUrlOrId || f.id === formUrlOrId);
    if (selected && !title.trim()) {
      setTitle(selected.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) {
      setError("Vui lòng chọn nhóm để tạo khảo sát.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const token = getToken();
      if (!token) throw new Error("Phiên làm việc hết hạn. Vui lòng đăng nhập lại.");

      if (source === "INTERNAL") {
        // Internal Survey Creation
        const response = await fetch(API_SURVEYS, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            description,
            groupId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Không thể tạo khảo sát. Vui lòng kiểm tra lại quyền hạn.");
        }

        onSubmitSuccess();
        onClose();
      } else {
        // Google Forms Survey Creation or Linking
        if (!connectionId) {
          throw new Error("Vui lòng kết nối và chọn tài khoản Google để tiếp tục.");
        }

        if (googleMode === "CREATE") {
          const response = await fetch(`${API_GOOGLE_SURVEYS_ROOT}/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title,
              description,
              groupId,
              connectionId,
            }),
          });

          if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            throw new Error(errJson.message || "Không thể tạo Google Form. Vui lòng kiểm tra lại kết nối.");
          }

          const createdSurvey = await response.json();
          // Open editUrl in new tab if available
          if (createdSurvey.googleIntegration?.editUrl) {
            window.open(createdSurvey.googleIntegration.editUrl, "_blank");
          }

          onSubmitSuccess();
          onClose();
        } else {
          // Link existing Google Form
          if (!googleFormUrlOrId.trim()) {
            throw new Error("Vui lòng nhập đường dẫn hoặc Form ID Google Forms.");
          }

          const response = await fetch(`${API_GOOGLE_SURVEYS_ROOT}/link`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: title.trim() || "Khảo sát Google Form",
              description,
              groupId,
              connectionId,
              googleFormUrlOrId: googleFormUrlOrId.trim(),
            }),
          });

          if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            throw new Error(errJson.message || "Không thể liên kết Google Form. Vui lòng kiểm tra lại quyền truy cập hoặc URL.");
          }

          onSubmitSuccess();
          onClose();
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Tạo khảo sát mới"
        description="Chọn hình thức khảo sát nội bộ hoặc tích hợp Google Forms"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* SOURCE SWITCH TABS */}
            <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setSource("INTERNAL")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${
                  source === "INTERNAL"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                <FiFileText className="text-sm" />
                <span>Khảo sát hệ thống</span>
              </button>

              <button
                type="button"
                onClick={() => setSource("GOOGLE_FORMS")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${
                  source === "GOOGLE_FORMS"
                    ? "bg-white text-purple-700 shadow-sm dark:bg-gray-900 dark:text-purple-400"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                <FcGoogle className="text-base" />
                <span>Google Forms</span>
              </button>
            </div>

            {/* GOOGLE FORMS OPTIONS */}
            {source === "GOOGLE_FORMS" && (
              <div className="space-y-3 rounded-xl border border-purple-100 bg-purple-50/40 p-3.5 dark:border-purple-900/30 dark:bg-purple-950/10">
                <div className="flex items-center gap-4 text-xs font-medium">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="googleMode"
                      checked={googleMode === "CREATE"}
                      onChange={() => setGoogleMode("CREATE")}
                      className="text-brand-600"
                    />
                    <span>Tạo Google Form mới</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="googleMode"
                      checked={googleMode === "LINK"}
                      onChange={() => setGoogleMode("LINK")}
                      className="text-brand-600"
                    />
                    <span>Liên kết Form có sẵn</span>
                  </label>
                </div>

                {/* Google Account Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Tài khoản Google <span className="text-error-500">*</span></Label>
                    <button
                      type="button"
                      onClick={() => setShowAccountManager(true)}
                      className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400"
                    >
                      <FiSettings className="h-3 w-3" /> Quản lý kết nối
                    </button>
                  </div>

                  {googleConnections.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 p-2.5 text-center text-xs dark:border-gray-700">
                      <p className="text-gray-500 mb-2">Chưa kết nối tài khoản Google nào</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAccountManager(true)}
                        className="mx-auto flex items-center gap-1.5 text-xs"
                      >
                        <FcGoogle /> Kết nối ngay
                      </Button>
                    </div>
                  ) : (
                    <select
                      value={connectionId}
                      onChange={(e) => {
                        const newConnId = e.target.value;
                        setConnectionId(newConnId);
                        setGoogleFormUrlOrId("");
                        if (newConnId) {
                          fetchFormsForConnection(newConnId);
                        }
                      }}
                      required
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    >
                      <option value="">Chọn tài khoản Google</option>
                      {googleConnections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.googleEmail} {c.status !== "ACTIVE" ? `(${c.status})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Link URL / Form ID if linking */}
                {googleMode === "LINK" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">
                        Biểu mẫu Google Forms <span className="text-error-500">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        {connectionId && (
                          <button
                            type="button"
                            onClick={() => fetchFormsForConnection(connectionId)}
                            disabled={loadingForms}
                            title="Tải lại danh sách từ Drive"
                            className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            <FiRefreshCw className={`h-3 w-3 ${loadingForms ? "animate-spin" : ""}`} />
                            <span>{loadingForms ? "Đang tải..." : "Làm mới"}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setManualInputMode((prev) => !prev)}
                          className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:underline dark:text-brand-400"
                        >
                          {manualInputMode ? (
                            <>
                              <FiList className="h-3 w-3" /> Chọn từ danh sách
                            </>
                          ) : (
                            <>
                              <FiEdit3 className="h-3 w-3" /> Nhập link thủ công
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {!manualInputMode ? (
                      <div>
                        <select
                          value={googleFormUrlOrId}
                          onChange={(e) => handleSelectForm(e.target.value)}
                          required
                          disabled={loadingForms || !connectionId}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
                        >
                          <option value="">
                            {!connectionId
                              ? "-- Vui lòng chọn tài khoản Google ở trên trước --"
                              : loadingForms
                              ? "⏳ Đang tải biểu mẫu từ Google Drive..."
                              : availableForms.length === 0
                              ? "-- Không tìm thấy biểu mẫu trong Drive --"
                              : `-- Chọn biểu mẫu từ Drive (${availableForms.length} biểu mẫu) --`}
                          </option>

                          {availableForms.map((f) => {
                            const dateStr = f.modifiedTime
                              ? new Date(f.modifiedTime).toLocaleDateString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "";
                            return (
                              <option
                                key={f.id}
                                value={f.editUrl}
                                disabled={f.alreadyLinked}
                              >
                                {f.name} {dateStr ? `(${dateStr})` : ""} {f.alreadyLinked ? "— [Đã liên kết]" : ""}
                              </option>
                            );
                          })}
                          <option value="__MANUAL__">✍️ Nhập link hoặc Form ID khác...</option>
                        </select>

                        {/* Selected Form Preview Badge */}
                        {availableForms.find((f) => f.editUrl === googleFormUrlOrId || f.id === googleFormUrlOrId) && (
                          <div className="mt-2 flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50/60 px-3 py-2 text-xs text-purple-900 dark:border-purple-800/40 dark:bg-purple-950/30 dark:text-purple-300">
                            <span className="truncate font-medium">
                              Đã chọn: <strong>{availableForms.find((f) => f.editUrl === googleFormUrlOrId || f.id === googleFormUrlOrId)?.name}</strong>
                            </span>
                            <a
                              href={availableForms.find((f) => f.editUrl === googleFormUrlOrId || f.id === googleFormUrlOrId)?.editUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 inline-flex shrink-0 items-center gap-1 font-semibold text-brand-600 hover:underline dark:text-brand-400"
                            >
                              Mở Google Form <FiExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}

                        {formsFetchError && (
                          <div className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] dark:border-amber-700/40 dark:bg-amber-900/20">
                            <p className="text-amber-700 dark:text-amber-400">
                              ⚠️ {formsFetchError}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setManualInputMode(true)}
                                className="text-brand-600 hover:underline dark:text-brand-400"
                              >
                                Nhập link thủ công →
                              </button>
                              <span className="text-amber-400">·</span>
                              <button
                                type="button"
                                onClick={() => setShowAccountManager(true)}
                                className="text-amber-700 hover:underline dark:text-amber-300 font-medium"
                              >
                                Kết nối lại tài khoản Google
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Input
                          className="mt-1 text-sm"
                          value={googleFormUrlOrId}
                          onChange={(e) => setGoogleFormUrlOrId(e.target.value)}
                          placeholder="https://docs.google.com/forms/d/.../edit"
                          required
                        />
                        <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
                          <span>Dán link chỉnh sửa Google Forms hoặc Form ID từ Drive.</span>
                          {availableForms.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setManualInputMode(false)}
                              className="text-brand-600 hover:underline dark:text-brand-400"
                            >
                              Quay lại danh sách chọn
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TITLE */}
            <div>
              <Label>
                Tiêu đề {source === "INTERNAL" || googleMode === "CREATE" ? <span className="text-error-500">*</span> : "(Tùy chọn)"}
              </Label>
              <Input
                className="mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={googleMode === "LINK" ? "Để trống nếu muốn tự lấy từ Google Form" : "Nhập tiêu đề khảo sát"}
                required={source === "INTERNAL" || googleMode === "CREATE"}
              />
            </div>

            {/* GROUP */}
            <div>
              <Label>Nhóm khảo sát <span className="text-error-500">*</span></Label>
              <select
                required
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">Chọn nhóm</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
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
              <div className="rounded-xl border border-error-200 bg-red-50 p-3 text-sm text-error-500 dark:border-error-500/20 dark:bg-red-500/10">
                {error}
              </div>
            )}

            {/* ACTIONS */}
            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
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
                disabled={loading || (source === "GOOGLE_FORMS" && googleConnections.length === 0)}
                size="sm"
                className={source === "GOOGLE_FORMS" ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                {loading
                  ? "Đang xử lý..."
                  : source === "GOOGLE_FORMS"
                  ? googleMode === "CREATE"
                    ? "Tạo và mở Google Form"
                    : "Liên kết Form"
                  : "Tạo mới"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {showAccountManager && (
        <GoogleAccountManagerModal
          isOpen={showAccountManager}
          onClose={() => setShowAccountManager(false)}
          onAccountChange={fetchGoogleConnections}
        />
      )}
    </>
  );
}
