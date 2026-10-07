"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";
import { useRouter } from "next/navigation";
import SurveyTable from "@/components/surveys/SurveyTable";
import SurveyFormModal from "@/components/surveys/SurveyFormModal";
import { API_SURVEYS } from "@/lib/api";
import Pagination from "@/components/ui/pagination/Pagination";
import SurveyAccessModal from "@/components/surveys/SurveyAccessModal";
import SurveyNameConfirmationModal from "@/components/surveys/SurveyNameConfirmationModal";
import { getUser } from "@/lib/auth";

export interface Survey {
  id: string;
  title: string;
  description: string;
  /** Không có từ API cũ → coi như đang mở */
  isActive?: boolean;
  creatorUser?: string | null;
  creatorUserId?: string | null;
}

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

export default function SurveyPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [accessSurvey, setAccessSurvey] = useState<Survey | null>(null);
  const [deleteSurvey, setDeleteSurvey] = useState<Survey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const pageSize = 10;
  const paginatedSurveys = surveys.slice((page - 1) * pageSize, page * pageSize);

  const router = useRouter();
  const currentUser = getUser();
  const canManageAccess = (survey: Survey) =>
    Boolean(currentUser && (
      currentUser.permissions.includes("survey_update_all") ||
      String(survey.creatorUserId) === String(currentUser.id)
    ));
  const canEdit = Boolean(currentUser?.permissions.some((permission) =>
    permission === "survey_update" || permission === "survey_update_all"));
  const canDelete = (survey: Survey) => Boolean(
    currentUser?.permissions.includes("survey_delete") &&
    (currentUser.permissions.includes("survey_update_all") ||
      String(survey.creatorUserId) === String(currentUser.id))
  );
  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(API_SURVEYS, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const raw = await res.json();
      const data: Survey[] = Array.isArray(raw)
        ? raw.map((s: Survey & { IsActive?: boolean }) => ({
            ...s,
            isActive: s.isActive ?? s.IsActive ?? true,
          }))
        : [];
      setSurveys(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const handleDelete = async (survey: Survey) => {
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`${API_SURVEYS}/${survey.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(message || `Không xóa được khảo sát (${response.status})`);
      }

      setSurveys((prev) => prev.filter((item) => item.id !== survey.id));
      setPage((current) => Math.min(current, Math.max(1, Math.ceil((surveys.length - 1) / pageSize))));
      setDeleteSurvey(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Không xóa được khảo sát.");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (id: string, nextActive: boolean) => {
    const token = getToken();
    if (!token) {
      alert("Phiên đăng nhập hết hạn.");
      return;
    }
    setTogglingId(id);
    try {
      const res = await fetch(`${API_SURVEYS}/${id}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        alert(t || `Không cập nhật được trạng thái (${res.status})`);
        return;
      }
      setSurveys((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: nextActive } : s))
      );
    } catch (e) {
      console.error(e);
      alert("Lỗi mạng khi cập nhật trạng thái.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col items-stretch gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Quản lý khảo sát
          </h1>
          <p className="text-sm text-gray-500">
            Danh sách và quản lý các cuộc khảo sát trực tuyến
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/survey/failsubmit"
            className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/70"
          >
            Phản hồi lỗi
          </Link>
          {currentUser?.permissions.includes("survey_create") && <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <PlusIcon className="w-5 h-5" /> Tạo khảo sát
          </Button>}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4">
        {loading ? (
          <div className="flex justify-center py-10 text-gray-500">
            Đang tải danh sách khảo sát...
          </div>
        ) : (
          <>
            <SurveyTable
              surveys={paginatedSurveys}
              togglingId={togglingId}
              onEdit={(id) => router.push(`/admin/survey/${id}/edit`)}
              onDelete={(survey) => { setDeleteError(""); setDeleteSurvey(survey); }}
              onToggleActive={handleToggleActive}
              onManageAccess={(survey) => canManageAccess(survey) && setAccessSurvey(survey)}
              canManageAccess={canManageAccess}
              canEdit={canEdit}
              canDelete={canDelete}
            />
            <Pagination page={page} pageSize={pageSize} total={surveys.length} onPageChange={setPage} />
          </>
        )}
      </div>

      {isModalOpen && (
        <SurveyFormModal
          onClose={() => setIsModalOpen(false)}
          onSubmitSuccess={fetchSurveys}
        />
      )}
      {accessSurvey && (
        <SurveyAccessModal
          survey={accessSurvey}
          onClose={() => setAccessSurvey(null)}
          onChanged={fetchSurveys}
        />
      )}
      {deleteSurvey && (
        <SurveyNameConfirmationModal
          heading="Xác nhận xóa khảo sát"
          actionText="xóa khảo sát"
          surveyTitle={deleteSurvey.title}
          confirmLabel="Xóa khảo sát"
          busy={deleting}
          error={deleteError}
          danger
          onCancel={() => { setDeleteSurvey(null); setDeleteError(""); }}
          onConfirm={() => handleDelete(deleteSurvey)}
        />
      )}
    </div>
  );
}
