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
import SurveyPublicationModal, { type PublishableSurvey, type SurveyStatus } from "@/components/surveys/SurveyPublicationModal";
import { getUser } from "@/lib/auth";
import { withSurveyActions } from "@/lib/surveyActions";
import type { PagedResult } from "@/types/report";

export interface Survey {
  id: string;
  shareCode?: string | null;
  title: string;
  description: string | null;
  status?: SurveyStatus | string | null;
  openAt?: string | null;
  closeAt?: string | null;
  creatorUser?: string | null;
  creatorUserId?: string | null;
  canEdit: boolean;
  canDelete: boolean;
  canManageAccess: boolean;
}

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

export default function SurveyPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [accessSurvey, setAccessSurvey] = useState<Survey | null>(null);
  const [publicationSurvey, setPublicationSurvey] = useState<Survey | null>(null);
  const [deleteSurvey, setDeleteSurvey] = useState<Survey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const pageSize = 10;

  const router = useRouter();
  const currentUser = getUser();
  const canManageAccess = (survey: Survey) => survey.canManageAccess;
  const canEdit = (survey: Survey) => survey.canEdit;
  const canDelete = (survey: Survey) => survey.canDelete;
  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_SURVEYS}/page?page=${page}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: PagedResult<Survey> = await res.json();
      if (data.totalPages > 0 && page > data.totalPages) {
        setPage(data.totalPages);
        return;
      }
      setSurveys(data.content.map(withSurveyActions));
      setTotal(data.totalElements);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

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

      setDeleteSurvey(null);
      if (surveys.length === 1 && page > 1) setPage(page - 1);
      else await fetchSurveys();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Không xóa được khảo sát.");
    } finally {
      setDeleting(false);
    }
  };

  const handlePublicationChanged = (updated: PublishableSurvey) => {
    setSurveys((current) => current.map((survey) => survey.id === updated.id ? { ...survey, ...updated } : survey));
    setPublicationSurvey((current) => current?.id === updated.id ? { ...current, ...updated } : current);
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
              surveys={surveys}
              onEdit={(id) => router.push(`/admin/survey/${id}/edit`)}
              onDelete={(survey) => { setDeleteError(""); setDeleteSurvey(survey); }}
              onManagePublication={setPublicationSurvey}
              onManageAccess={(survey) => canManageAccess(survey) && setAccessSurvey(survey)}
              canManageAccess={canManageAccess}
              canEdit={canEdit}
              canDelete={canDelete}
            />
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
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
      {publicationSurvey && (
        <SurveyPublicationModal
          survey={publicationSurvey}
          onClose={() => setPublicationSurvey(null)}
          onChanged={handlePublicationChanged}
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
