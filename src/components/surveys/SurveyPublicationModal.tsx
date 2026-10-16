"use client";

import { useState } from "react";
import { FiCalendar, FiClock, FiLock, FiSend, FiUnlock, FiX } from "react-icons/fi";
import Modal from "@/components/ui/modal/Modal";
import DateTimePicker from "@/components/form/DateTimePicker";
import { API_SURVEYS } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/apiError";
import { getToken } from "@/lib/auth";

export type SurveyStatus = "DRAFT" | "SCHEDULED" | "OPEN" | "CLOSED";

export type PublishableSurvey = {
  id: string;
  title: string;
  description?: string | null;
  status?: SurveyStatus | string | null;
  openAt?: string | null;
  closeAt?: string | null;
  scheduleWarnings?: string[];
};

const statusMeta: Record<SurveyStatus, { label: string; className: string; description: string }> = {
  DRAFT: {
    label: "Bản nháp",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    description: "Chưa xuất bản và chưa thể truy cập từ trang công khai.",
  },
  SCHEDULED: {
    label: "Lên lịch",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    description: "Đã xuất bản và sẽ tự mở theo lịch đã thiết lập.",
  },
  OPEN: {
    label: "Đang mở",
    className: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
    description: "Người tham gia hiện có thể truy cập và gửi câu trả lời.",
  },
  CLOSED: {
    label: "Đã đóng",
    className: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300",
    description: "Khảo sát đã bị khóa hoặc đã hết thời gian mở.",
  },
};

export function getSurveyStatusMeta(status?: string | null) {
  return statusMeta[String(status || "DRAFT").toUpperCase() as SurveyStatus] || statusMeta.DRAFT;
}

const toInputDate = (value?: string | null) => value ? value.slice(0, 16) : "";
const toApiDate = (value: string) => value ? `${value}:00` : null;

export default function SurveyPublicationModal({
  survey,
  onClose,
  onChanged,
}: {
  survey: PublishableSurvey;
  onClose: () => void;
  onChanged: (survey: PublishableSurvey) => void;
}) {
  const [current, setCurrent] = useState(survey);
  const [openAt, setOpenAt] = useState(toInputDate(survey.openAt));
  const [closeAt, setCloseAt] = useState(toInputDate(survey.closeAt));
  const [busy, setBusy] = useState<"SAVE" | "PUBLISH" | "LOCK" | "UNLOCK" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const meta = getSurveyStatusMeta(current.status);

  const updateSchedule = async () => {
    if (openAt && closeAt && closeAt <= openAt) {
      throw new Error("Thời gian đóng phải sau thời gian mở.");
    }
    const token = getToken();
    if (!token) throw new Error("Phiên đăng nhập đã hết hạn.");

    const response = await fetch(`${API_SURVEYS}/${current.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: current.title,
        description: current.description ?? null,
        openAt: toApiDate(openAt),
        closeAt: toApiDate(closeAt),
      }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(getApiErrorMessage(body, `Không lưu được lịch (${response.status})`));
    return body as PublishableSurvey;
  };

  const saveSchedule = async () => {
    setBusy("SAVE");
    setError("");
    setSuccess("");
    try {
      const updated = await updateSchedule();
      setCurrent(updated);
      setOpenAt(toInputDate(updated.openAt));
      setCloseAt(toInputDate(updated.closeAt));
      onChanged(updated);
      setSuccess("Đã lưu lịch xuất bản.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không lưu được lịch xuất bản.");
    } finally {
      setBusy(null);
    }
  };

  const changeStatus = async (action: "PUBLISH" | "LOCK" | "UNLOCK") => {
    setBusy(action);
    setError("");
    setSuccess("");
    try {
      const scheduled = await updateSchedule();
      setCurrent(scheduled);
      onChanged(scheduled);
      const token = getToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn.");
      const response = await fetch(`${API_SURVEYS}/${current.id}/status`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(getApiErrorMessage(body, `Không cập nhật được trạng thái (${response.status})`));
      const updated = { ...scheduled, ...body } as PublishableSurvey;
      setCurrent(updated);
      setOpenAt(toInputDate(updated.openAt));
      setCloseAt(toInputDate(updated.closeAt));
      onChanged(updated);
      setSuccess(action === "PUBLISH" ? "Đã xuất bản khảo sát." : action === "LOCK" ? "Đã khóa khảo sát." : "Đã mở lại khảo sát.");
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Không cập nhật được trạng thái khảo sát.");
    } finally {
      setBusy(null);
    }
  };

  const status = String(current.status || "DRAFT").toUpperCase() as SurveyStatus;
  const primaryAction = status === "DRAFT"
    ? { action: "PUBLISH" as const, label: "Lưu và xuất bản", icon: FiSend }
    : status === "CLOSED"
      ? { action: "UNLOCK" as const, label: "Lưu và mở lại", icon: FiUnlock }
      : { action: "LOCK" as const, label: "Khóa khảo sát", icon: FiLock };
  const PrimaryIcon = primaryAction.icon;

  return (
    <Modal isOpen onClose={onClose} blocking={busy != null} title="Xuất bản và lên lịch" description={current.title} className="max-w-2xl">
      <div className="space-y-5">
        <section className="flex items-start justify-between gap-4 border-b border-gray-100 pb-5 dark:border-gray-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{meta.description}</p>
          </div>
          <FiClock className="mt-1 shrink-0 text-gray-400" size={22} />
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <FiCalendar className="text-brand-500" /> Lịch hoạt động
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="survey-open-at" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Mở từ</label>
              <div className="mt-1.5 flex items-center gap-2">
                <DateTimePicker id="survey-open-at" value={openAt} onChange={setOpenAt} placeholder="Chọn ngày và giờ mở" disabled={busy != null} />
                <button type="button" onClick={() => setOpenAt("")} disabled={!openAt || busy != null} title="Xóa giờ mở" aria-label="Xóa giờ mở" className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:border-error-200 hover:bg-error-50 hover:text-error-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-500 disabled:cursor-not-allowed disabled:opacity-35 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-error-500/10 dark:hover:text-error-400"><FiX size={18} /></button>
              </div>
            </div>
            <div>
              <label htmlFor="survey-close-at" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Đóng lúc</label>
              <div className="mt-1.5 flex items-center gap-2">
                <DateTimePicker id="survey-close-at" value={closeAt} onChange={setCloseAt} placeholder="Chọn ngày và giờ đóng" disabled={busy != null} />
                <button type="button" onClick={() => setCloseAt("")} disabled={!closeAt || busy != null} title="Xóa giờ đóng" aria-label="Xóa giờ đóng" className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:border-error-200 hover:bg-error-50 hover:text-error-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-500 disabled:cursor-not-allowed disabled:opacity-35 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-error-500/10 dark:hover:text-error-400"><FiX size={18} /></button>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">Để trống mốc thời gian nếu không muốn giới hạn. Thời gian được hiểu theo múi giờ Việt Nam.</p>
        </section>

        {current.scheduleWarnings?.length ? (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            {current.scheduleWarnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        ) : null}
        {error && <p role="alert" className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-300">{error}</p>}
        {success && <p role="status" className="rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-300">{success}</p>}

        <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end dark:border-gray-800">
          <button type="button" onClick={onClose} disabled={busy != null} className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Đóng</button>
          <button type="button" onClick={() => void saveSchedule()} disabled={busy != null} className="h-11 rounded-xl border border-brand-200 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50 dark:border-brand-500/30 dark:text-brand-300 dark:hover:bg-brand-500/10">{busy === "SAVE" ? "Đang lưu…" : "Lưu lịch"}</button>
          <button type="button" onClick={() => void changeStatus(primaryAction.action)} disabled={busy != null} className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition disabled:opacity-50 ${primaryAction.action === "LOCK" ? "bg-error-600 hover:bg-error-700" : "bg-brand-600 hover:bg-brand-700"}`}>
            <PrimaryIcon size={16} /> {busy === primaryAction.action ? "Đang xử lý…" : primaryAction.label}
          </button>
        </div>
      </div>
    </Modal>
  );
}
