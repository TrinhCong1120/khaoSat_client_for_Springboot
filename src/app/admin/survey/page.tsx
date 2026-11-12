"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";
import { useRouter } from "next/navigation";
import SurveyTable from "@/components/surveys/SurveyTable";
import SurveyFormModal from "@/components/surveys/SurveyFormModal";
import { API_GROUPS, API_SURVEYS } from "@/lib/api";
import Pagination from "@/components/ui/pagination/Pagination";
import SurveyAccessModal from "@/components/surveys/SurveyAccessModal";
import SurveyNameConfirmationModal from "@/components/surveys/SurveyNameConfirmationModal";
import SurveyPublicationModal, { type PublishableSurvey, type SurveyStatus } from "@/components/surveys/SurveyPublicationModal";
import { withSurveyActions } from "@/lib/surveyActions";
import type { PagedResult } from "@/types/report";
import { getPermissions } from "@/lib/auth";

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
  canViewResponses?: boolean;
  canExportData?: boolean;
  canManagePublication?: boolean;
  groupId?: string;
  sharedDirectly?: boolean;
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
  const [groups, setGroups] = useState<{ id: string; name: string; permissions: string[] }[]>([]);
  const [groupFilter, setGroupFilter] = useState("");
  const [filterReady, setFilterReady] = useState(false);
  const [accessSurvey, setAccessSurvey] = useState<Survey | null>(null);
  const [publicationSurvey, setPublicationSurvey] = useState<Survey | null>(null);
  const [deleteSurvey, setDeleteSurvey] = useState<Survey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [moveSurvey, setMoveSurvey] = useState<Survey | null>(null);
  const [moveTarget, setMoveTarget] = useState("");
  const [moveError, setMoveError] = useState("");
  const [canManageFailed, setCanManageFailed] = useState(false);
  const pageSize = 10;

  const router = useRouter();
  useEffect(() => setCanManageFailed(getPermissions().includes("survey_failed_manage")), []);
  const canManageAccess = (survey: Survey) => survey.canManageAccess;
  const canEdit = (survey: Survey) => survey.canEdit;
  const canDelete = (survey: Survey) => survey.canDelete;
  const canMove = (survey: Survey) => groups.some((group) => group.id === survey.groupId && group.permissions.includes("MANAGE_GROUP"))
    && groups.some((group) => group.id !== survey.groupId && group.permissions.includes("MANAGE_GROUP"));
  const canCreate = groups.some((group) => group.permissions.includes("CREATE_SURVEY"));
  const scopeName = groupFilter === "shared" ? "Được chia sẻ riêng"
    : groups.find((group) => group.id === groupFilter)?.name ?? "Tất cả khảo sát";
  const changeFilter = (value: string) => {
    setPage(1);
    setGroupFilter(value);
    const url = new URL(window.location.href);
    if (value && value !== "shared") url.searchParams.set("groupId", value);
    else url.searchParams.delete("groupId");
    window.history.replaceState(null, "", url.pathname + url.search);
  };
  useEffect(() => {
    void fetch(API_GROUPS, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Không tải được group.")))
      .then((rows) => setGroups(rows as typeof groups))
      .catch((cause) => console.error(cause));
  }, []);
  useEffect(() => {
    setGroupFilter(new URLSearchParams(window.location.search).get("groupId") ?? "");
    setFilterReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const isGoogleConnected = params.get("google_connected") === "true";
    const isGoogleError = params.get("google_error") === "true";

    if (isGoogleConnected || isGoogleError) {
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage(
            {
              type: isGoogleConnected ? "GOOGLE_OAUTH_SUCCESS" : "GOOGLE_OAUTH_ERROR",
              message: params.get("reason") || undefined,
            },
            "*"
          );
        } catch {}
        window.close();
        return;
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("google_connected");
      url.searchParams.delete("google_error");
      url.searchParams.delete("reason");
      window.history.replaceState(null, "", url.pathname + (url.search || ""));
    }
  }, []);
  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true);

      const filter = groupFilter === "shared" ? "&shared=true" : groupFilter ? `&groupId=${encodeURIComponent(groupFilter)}` : "";
      const res = await fetch(`${API_SURVEYS}/page?page=${page}${filter}`, {
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
  }, [page, groupFilter]);

  useEffect(() => {
    if (filterReady) void fetchSurveys();
  }, [fetchSurveys, filterReady]);

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

  const handleMove = async () => {
    if (!moveSurvey || !moveTarget) return;
    setMoveError("");
    const response = await fetch(`${API_SURVEYS}/${moveSurvey.id}/group`, {
      method: "PUT", headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: moveTarget }),
    });
    if (!response.ok) { setMoveError((await response.json().catch(() => null))?.message || "Không chuyển được khảo sát."); return; }
    setMoveSurvey(null); setMoveTarget(""); await fetchSurveys();
  };

  const handlePublicationChanged = (updated: PublishableSurvey) => {
    setSurveys((current) => current.map((survey) => survey.id === updated.id ? { ...survey, ...updated } : survey));
    setPublicationSurvey((current) => current?.id === updated.id ? { ...current, ...updated } : current);
  };

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Quản lý khảo sát
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Xem, cập nhật và quản lý quyền của các khảo sát bạn được truy cập.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/survey/groups" className="inline-flex min-h-10 items-center rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Quản lý nhóm</Link>
          {canManageFailed && <Link
            href="/admin/survey/failsubmit"
            className="inline-flex min-h-10 items-center rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Phản hồi lỗi
          </Link>}
          {canCreate && <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <PlusIcon className="w-5 h-5" /> Tạo khảo sát
          </Button>}
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">{scopeName}</h2>
            <p className="mt-0.5 text-sm text-gray-500">{loading ? "Đang tải..." : total + " khảo sát"}</p></div>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">Phạm vi hiển thị
          <select value={groupFilter} onChange={(event) => changeFilter(event.target.value)} className="min-h-10 min-w-48 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option value="">Tất cả được xem</option><option value="shared">Được chia sẻ riêng</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
        </div>
        {loading || !filterReady ? (
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900" aria-label="Đang tải danh sách khảo sát">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />)}
          </div>
        ) : (
          <>
            <SurveyTable
              surveys={surveys}
              onEdit={(id) => router.push(`/admin/survey/${id}/edit`)}
              onDelete={(survey) => { setDeleteError(""); setDeleteSurvey(survey); }}
              onManagePublication={setPublicationSurvey}
              onManageAccess={(survey) => canManageAccess(survey) && setAccessSurvey(survey)}
              onMove={(survey) => { setMoveSurvey(survey); setMoveTarget(""); setMoveError(""); }}
              canMove={canMove}
              canManageAccess={canManageAccess}
              canEdit={canEdit}
              canDelete={canDelete}
              onRefresh={fetchSurveys}
            />
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </>
        )}
      </section>

      {isModalOpen && (
        <SurveyFormModal
          initialGroupId={groupFilter && groupFilter !== "shared" ? groupFilter : undefined}
          onClose={() => setIsModalOpen(false)}
          onSubmitSuccess={fetchSurveys}
        />
      )}
      {moveSurvey && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-xl bg-white p-5 dark:bg-gray-900"><h2 className="font-semibold">Chuyển group: {moveSurvey.title}</h2><select value={moveTarget} onChange={(event) => setMoveTarget(event.target.value)} className="mt-4 w-full rounded-lg border px-3 py-2 dark:bg-gray-950"><option value="">Chọn group đích</option>{groups.filter((group) => group.id !== moveSurvey.groupId && group.permissions.includes("MANAGE_GROUP")).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>{moveError && <p role="alert" className="mt-2 text-sm text-red-600">{moveError}</p>}<div className="mt-4 flex justify-end gap-2"><button onClick={() => setMoveSurvey(null)} className="rounded-lg border px-3 py-2">Hủy</button><button disabled={!moveTarget} onClick={() => void handleMove()} className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-40">Chuyển</button></div></div></div>}
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
    </main>
  );
}
