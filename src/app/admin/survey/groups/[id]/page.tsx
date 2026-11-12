"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ChevronRight,
  Folder,
  LayoutList,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  ChartNoAxesCombined,
  Home,
  ShieldCheck,
  FolderTree,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { API_GROUPS, API_SURVEYS } from "@/lib/api";
import { getToken } from "@/lib/auth";
import Pagination from "@/components/ui/pagination/Pagination";
import SurveyTable from "@/components/surveys/SurveyTable";
import SurveyFormModal from "@/components/surveys/SurveyFormModal";
import SurveyAccessModal from "@/components/surveys/SurveyAccessModal";
import SurveyPublicationModal, {
  type PublishableSurvey,
} from "@/components/surveys/SurveyPublicationModal";
import SurveyNameConfirmationModal from "@/components/surveys/SurveyNameConfirmationModal";

type Group = { id: string; name: string; parentId: string | null; permissions: string[] };
type Member = { userId: string; username: string; permissions: string[] };
type User = { id: string; username: string };
type Survey = {
  id: string;
  title: string;
  description: string | null;
  groupId?: string;
  creatorUser?: string | null;
  status?: string | null;
  shareCode?: string | null;
  canEdit: boolean;
  canDelete: boolean;
  canManageAccess: boolean;
  canManagePublication?: boolean;
  canViewResponses?: boolean;
};
type SurveyPage = { content: Survey[]; totalElements: number; totalPages: number };
type Summary = {
  surveys: number;
  responses: number;
  rows: { surveyId: string; title: string; responses: number }[];
};
type Tab = "surveys" | "members" | "report";
type GroupDialog = { mode: "child" | "rename"; name: string } | null;

const rights = [
  "VIEW",
  "CREATE_CHILD",
  "CREATE_SURVEY",
  "EDIT",
  "VIEW_RESPONSES",
  "EXPORT_DATA",
  "MANAGE_PUBLICATION",
  "DELETE",
  "MANAGE_ACCESS",
  "MANAGE_GROUP",
] as const;

const labels: Record<string, string> = {
  VIEW: "Xem khảo sát",
  CREATE_CHILD: "Tạo nhóm con",
  CREATE_SURVEY: "Tạo khảo sát",
  EDIT: "Sửa khảo sát",
  VIEW_RESPONSES: "Xem phản hồi",
  EXPORT_DATA: "Xuất dữ liệu",
  MANAGE_PUBLICATION: "Xuất bản / khóa",
  DELETE: "Xóa khảo sát",
  MANAGE_ACCESS: "Quản lý quyền khảo sát",
  MANAGE_GROUP: "Quản lý nhóm",
};

export default function SurveyGroupDetailPage() {
  const router = useRouter();
  const { id: groupId } = useParams<{ id: string }>();
  const [groups, setGroups] = useState<Group[]>([]);
  const selected = groupId;
  const [tab, setTab] = useState<Tab>("surveys");
  const [groupDialog, setGroupDialog] = useState<GroupDialog>(null);
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [surveyPage, setSurveyPage] = useState(1);
  const [surveyTotal, setSurveyTotal] = useState(0);
  const [surveysLoading, setSurveysLoading] = useState(false);
  const [createSurveyOpen, setCreateSurveyOpen] = useState(false);
  const [accessSurvey, setAccessSurvey] = useState<Survey | null>(null);
  const [publicationSurvey, setPublicationSurvey] = useState<Survey | null>(null);
  const [deleteSurvey, setDeleteSurvey] = useState<Survey | null>(null);
  const [deleteSurveyError, setDeleteSurveyError] = useState("");
  const [moveSurvey, setMoveSurvey] = useState<Survey | null>(null);
  const [moveTarget, setMoveTarget] = useState("");

  const [members, setMembers] = useState<Member[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [found, setFound] = useState<User[]>([]);
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [summary, setSummary] = useState<Summary | null>(null);

  const current = groups.find((group) => group.id === selected);
  const canManageGroup = current?.permissions.includes("MANAGE_GROUP") ?? false;
  const headers = useCallback(
    () => ({
      Authorization: "Bearer " + getToken(),
      "Content-Type": "application/json",
    }),
    []
  );

  const loadGroups = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(API_GROUPS, {
        headers: headers(),
        signal: signal ?? AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Không tải được danh sách nhóm.");
      const rows = (await response.json()) as Group[];
      setGroups(rows);
    },
    [headers]
  );

  const loadSurveys = useCallback(
    async (id: string, page: number, signal?: AbortSignal) => {
      const response = await fetch(
        API_SURVEYS + "/page?page=" + page + "&groupId=" + encodeURIComponent(id),
        {
          headers: headers(),
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
            : AbortSignal.timeout(15000),
        }
      );
      if (!response.ok) throw new Error("Không tải được khảo sát trong nhóm.");
      const data = (await response.json()) as SurveyPage;
      if (signal?.aborted) return;
      setSurveys(data.content);
      setSurveyTotal(data.totalElements);
      if (page > Math.max(1, data.totalPages)) setSurveyPage(Math.max(1, data.totalPages));
    },
    [headers]
  );

  const loadMembers = useCallback(
    async (id: string, signal?: AbortSignal) => {
      const response = await fetch(API_GROUPS + "/" + id + "/access", {
        headers: headers(),
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
          : AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Không tải được thành viên của nhóm.");
      const rows = (await response.json()) as Member[];
      if (signal?.aborted) return;
      setMembers(rows);
      setDraft(Object.fromEntries(rows.map((row) => [row.userId, row.permissions])));
    },
    [headers]
  );

  const loadSummary = useCallback(
    async (id: string, signal?: AbortSignal) => {
      const response = await fetch(
        API_GROUPS + "/dashboard?groupId=" + encodeURIComponent(id),
        {
          headers: headers(),
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
            : AbortSignal.timeout(15000),
        }
      );
      if (!response.ok) throw new Error("Không tải được báo cáo của nhóm.");
      const data = (await response.json()) as Summary;
      if (!signal?.aborted) setSummary(data);
    },
    [headers]
  );

  useEffect(() => {
    void loadGroups()
      .catch((cause) => setError(String(cause)))
      .finally(() => setGroupsLoading(false));
  }, [loadGroups]);

  useEffect(() => {
    if (!selected || tab !== "surveys") return;
    const controller = new AbortController();
    setSurveysLoading(true);
    void loadSurveys(selected, surveyPage, controller.signal)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(String(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setSurveysLoading(false);
      });
    return () => controller.abort();
  }, [selected, surveyPage, tab, loadSurveys]);

  useEffect(() => {
    if (!selected || tab !== "members" || !canManageGroup) return;
    const controller = new AbortController();
    void loadMembers(selected, controller.signal).catch((cause) => {
      if (!controller.signal.aborted) setError(String(cause));
    });
    return () => controller.abort();
  }, [selected, tab, canManageGroup, loadMembers]);

  useEffect(() => {
    if (!selected || tab !== "report") return;
    const controller = new AbortController();
    void loadSummary(selected, controller.signal).catch((cause) => {
      if (!controller.signal.aborted) setError(String(cause));
    });
    return () => controller.abort();
  }, [selected, tab, loadSummary]);

  const ancestors = useMemo(() => {
    const path: Group[] = [];
    let item = current;
    while (item) {
      path.unshift(item);
      item = groups.find((group) => group.id === item?.parentId);
    }
    return path;
  }, [current, groups]);

  const perform = async (url: string, method: string, body?: unknown) => {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const signal = AbortSignal.timeout(15000);
      const response = await fetch(url, {
        method,
        headers: headers(),
        signal,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok)
        throw new Error((await response.json().catch(() => null))?.message || "Thao tác thất bại.");
      return response;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Thao tác thất bại.");
      return null;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const submitGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (!groupDialog || !groupDialog.name.trim() || !selected) return;
    if (groupDialog.mode === "rename") {
      if (
        await perform(API_GROUPS + "/" + selected, "PUT", {
          name: groupDialog.name.trim(),
        })
      ) {
        setGroupDialog(null);
        await loadGroups();
      }
      return;
    }
    const response = await perform(API_GROUPS, "POST", {
      name: groupDialog.name.trim(),
      parentId: selected,
    });
    if (response) {
      setGroupDialog(null);
      await loadGroups();
      const created = (await response.json()) as Group;
      router.push("/admin/survey/groups/" + created.id);
    }
  };

  const removeGroup = async () => {
    if (!selected) return;
    if (await perform(API_GROUPS + "/" + selected, "DELETE")) {
      setDeleteGroupOpen(false);
      await loadGroups();
      router.push("/admin/survey/groups");
    }
  };

  const searchUser = async () => {
    if (!memberQuery.trim() || !selected) return;
    setError("");
    try {
      const response = await fetch(
        API_GROUPS +
          "/" +
          selected +
          "/users/search?q=" +
          encodeURIComponent(memberQuery.trim()),
        { headers: headers(), signal: AbortSignal.timeout(15000) }
      );
      if (!response.ok)
        throw new Error("Không tìm được tài khoản. Nhập chính xác username hoặc email.");
      setFound((await response.json()) as User[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tìm được tài khoản.");
    }
  };

  const saveMember = async (userId: string) => {
    if (!current) return;
    const response = await perform(API_GROUPS + "/" + current.id + "/access/" + userId, "PUT", {
      permissions: draft[userId] ?? [],
    });
    if (response) await loadMembers(current.id);
  };

  const removeMember = async (userId: string) => {
    if (!current) return;
    if (await perform(API_GROUPS + "/" + current.id + "/access/" + userId, "DELETE")) {
      await loadMembers(current.id);
      setFound((rows) => rows.filter((row) => row.id !== userId));
    }
  };

  const deleteSelectedSurvey = async () => {
    if (!deleteSurvey || !selected) return;
    setBusy(true);
    setDeleteSurveyError("");
    try {
      const signal = AbortSignal.timeout(15000);
      const response = await fetch(API_SURVEYS + "/" + deleteSurvey.id, {
        method: "DELETE",
        headers: headers(),
        signal,
      });
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => null))?.message || "Không xóa được khảo sát."
        );
      setDeleteSurvey(null);
      await loadSurveys(selected, surveyPage, signal);
    } catch (cause) {
      setDeleteSurveyError(cause instanceof Error ? cause.message : "Không xóa được khảo sát.");
    } finally {
      setBusy(false);
    }
  };

  const moveSelectedSurvey = async () => {
    if (!moveSurvey || !moveTarget || !selected) return;
    setBusy(true);
    setError("");
    try {
      const signal = AbortSignal.timeout(15000);
      const response = await fetch(API_SURVEYS + "/" + moveSurvey.id + "/group", {
        method: "PUT",
        headers: headers(),
        signal,
        body: JSON.stringify({ groupId: moveTarget }),
      });
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => null))?.message || "Không chuyển được khảo sát."
        );
      setMoveSurvey(null);
      setMoveTarget("");
      await loadSurveys(selected, surveyPage, signal);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không chuyển được khảo sát.");
    } finally {
      setBusy(false);
    }
  };

  const exportReport = async () => {
    if (!selected) return;
    setError("");
    try {
      const response = await fetch(
        API_GROUPS + "/dashboard/surveys.xlsx?groupId=" + encodeURIComponent(selected),
        { headers: headers(), signal: AbortSignal.timeout(15000) }
      );
      if (!response.ok) throw new Error("Không xuất được dữ liệu của nhóm.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "bao-cao-nhom.xlsx";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không xuất được dữ liệu.");
    }
  };

  const candidates = [
    ...members.map((member) => ({ id: member.userId, username: member.username })),
    ...found.filter((user) => !members.some((member) => member.userId === user.id)),
  ];

  const canMove = (survey: Survey) =>
    groups.some(
      (group) =>
        group.id === survey.groupId && group.permissions.includes("MANAGE_GROUP")
    ) &&
    groups.some(
      (group) =>
        group.id !== survey.groupId && group.permissions.includes("MANAGE_GROUP")
    );

  const tabs: { key: Tab; Icon: typeof LayoutList; title: string }[] = [
    { key: "surveys", Icon: LayoutList, title: "Khảo sát trong nhóm" },
    ...(canManageGroup ? [{ key: "members" as Tab, Icon: Users, title: "Thành viên & Phân quyền" }] : []),
    { key: "report", Icon: ChartNoAxesCombined, title: "Báo cáo thống kê" },
  ];

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
        >
          <Home size={13} />
          <span>Trang chủ</span>
        </Link>
        <ChevronRight size={12} className="text-gray-400" />
        <Link
          href="/admin/survey"
          className="transition-colors hover:text-brand-600 dark:hover:text-brand-400"
        >
          Khảo sát
        </Link>
        <ChevronRight size={12} className="text-gray-400" />
        <Link
          href="/admin/survey/groups"
          className="transition-colors hover:text-brand-600 dark:hover:text-brand-400"
        >
          Nhóm khảo sát
        </Link>
        {ancestors.map((group) => (
          <span key={group.id} className="inline-flex items-center gap-2">
            <ChevronRight size={12} className="text-gray-400" />
            <Link
              href={"/admin/survey/groups/" + group.id}
              className={`transition-colors hover:text-brand-600 dark:hover:text-brand-400 ${
                group.id === selected ? "font-semibold text-gray-900 dark:text-white" : ""
              }`}
            >
              {group.name}
            </Link>
          </span>
        ))}
      </nav>

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-xs ring-1 ring-brand-500/15 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-400/20">
            <Folder size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {current?.name ?? "Chi tiết nhóm"}
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              Khảo sát, thành viên được phân quyền và dữ liệu báo cáo thuộc nhóm này.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/survey/groups"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-xs transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800/80 sm:text-sm"
          >
            <FolderTree size={16} />
            <span>Tất cả nhóm</span>
          </Link>
          <Link
            href="/admin/survey"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-xs transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800/80 sm:text-sm"
          >
            <LayoutList size={16} />
            <span>Tất cả khảo sát</span>
          </Link>
        </div>
      </header>

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 backdrop-blur-xs dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setError("")}
            className="rounded-lg p-1 text-red-400 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/50"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {!current ? (
        <section className="rounded-2xl border border-gray-200/80 bg-white p-12 text-center text-gray-500 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <Folder size={36} className="mx-auto mb-3 text-gray-400" />
          <p className="text-base font-semibold text-gray-800 dark:text-gray-200">
            {groupsLoading
              ? "Đang tải dữ liệu nhóm..."
              : "Không tìm thấy nhóm hoặc bạn không có quyền truy cập."}
          </p>
        </section>
      ) : (
        <>
          {/* Group Overview Hero Card */}
          <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 border border-brand-200/60 dark:border-brand-500/20">
                    <ShieldCheck size={13} />
                    {current.permissions.length} quyền hiệu lực
                  </span>
                  {!current.parentId && (
                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                      Nhóm gốc
                    </span>
                  )}
                </div>

                <h2 className="mt-2.5 break-words text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
                  {current.name}
                </h2>

                <details className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <summary className="cursor-pointer font-medium hover:text-brand-600 dark:hover:text-brand-400">
                    Xem danh sách các quyền được cấp cho nhóm này
                  </summary>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/40">
                    {current.permissions.map((right) => (
                      <span
                        key={right}
                        className="rounded-md border border-gray-200/60 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        {labels[right] ?? right}
                      </span>
                    ))}
                  </div>
                </details>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {current.permissions.includes("CREATE_CHILD") && (
                  <button
                    type="button"
                    onClick={() => setGroupDialog({ mode: "child", name: "" })}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 sm:text-sm"
                  >
                    <Plus size={16} />
                    <span>Tạo nhóm con</span>
                  </button>
                )}

                {canManageGroup && (
                  <>
                    <button
                      type="button"
                      onClick={() => setGroupDialog({ mode: "rename", name: current.name })}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 sm:text-sm"
                    >
                      <Pencil size={15} />
                      <span>Đổi tên</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteGroupOpen(true)}
                      aria-label="Xóa nhóm"
                      title="Xóa nhóm rỗng"
                      className="inline-flex size-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 shadow-2xs transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-red-900/50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-800" role="tablist">
            {tabs.map(({ key, Icon, title }) => {
              const active = tab === key;
              return (
                <button
                  type="button"
                  key={key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(key)}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 border-b-2 px-4 text-xs font-semibold transition focus-visible:outline-none sm:text-sm ${
                    active
                      ? "border-brand-500 text-brand-600 dark:text-brand-400"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <Icon size={16} />
                  <span>{title}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Surveys */}
          {tab === "surveys" && (
            <section
              role="tabpanel"
              aria-label="Khảo sát trong nhóm"
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Danh sách khảo sát
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {surveyTotal} khảo sát được gán trực tiếp vào nhóm này
                  </p>
                </div>

                {current.permissions.includes("CREATE_SURVEY") && (
                  <button
                    type="button"
                    onClick={() => setCreateSurveyOpen(true)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-xs font-semibold text-white shadow-xs shadow-brand-500/20 transition hover:bg-brand-600 sm:text-sm"
                  >
                    <Plus size={16} />
                    <span>Tạo khảo sát</span>
                  </button>
                )}
              </div>

              {surveysLoading ? (
                <div
                  className="space-y-3 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900"
                  aria-label="Đang tải khảo sát"
                >
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
                    />
                  ))}
                </div>
              ) : (
                <>
                  <SurveyTable
                    surveys={surveys}
                    onEdit={(id) => router.push("/admin/survey/" + id + "/edit")}
                    onDelete={(survey) => {
                      setDeleteSurveyError("");
                      setDeleteSurvey(survey);
                    }}
                    onManagePublication={setPublicationSurvey}
                    onManageAccess={setAccessSurvey}
                    onMove={(survey) => {
                      setMoveSurvey(survey);
                      setMoveTarget("");
                    }}
                    canMove={canMove}
                    canManageAccess={(survey) => survey.canManageAccess}
                    canEdit={(survey) => survey.canEdit}
                    canDelete={(survey) => survey.canDelete}
                  />
                  <Pagination
                    page={surveyPage}
                    pageSize={10}
                    total={surveyTotal}
                    onPageChange={setSurveyPage}
                  />
                </>
              )}
            </section>
          )}

          {/* TAB 2: Members & Permissions */}
          {tab === "members" && canManageGroup && (
            <section
              role="tabpanel"
              aria-label="Thành viên nhóm"
              className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Thành viên và phân quyền
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Quyền được cấp tại nhóm này sẽ tự động kế thừa xuống các nhóm con bên trong.
                  </p>
                </div>
                <span className="rounded-lg bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                  {members.length} thành viên đang có quyền
                </span>
              </div>

              {/* Search User Input */}
              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={memberQuery}
                    onChange={(event) => setMemberQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void searchUser();
                    }}
                    placeholder="Nhập chính xác username hoặc email tài khoản cần thêm..."
                    className="h-10.5 w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-10 pr-3.5 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-100 sm:text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void searchUser()}
                  className="inline-flex min-h-10.5 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-xs font-semibold text-white shadow-xs shadow-brand-500/20 transition hover:bg-brand-600 sm:text-sm"
                >
                  <Search size={16} />
                  <span>Tìm kiếm tài khoản</span>
                </button>
              </div>

              {candidates.length === 0 ? (
                <div className="py-14 text-center">
                  <Users size={32} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Chưa có thành viên nào
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Hãy tìm tài khoản bằng username hoặc email để tiến hành cấp quyền.
                  </p>
                </div>
              ) : (
                <div className="mt-6 divide-y divide-gray-100 dark:divide-gray-800">
                  {candidates.map((user) => {
                    const existing = members.some((member) => member.userId === user.id);
                    const userRights = draft[user.id] ?? [];
                    return (
                      <div key={user.id} className="py-4.5 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-gray-100 font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {user.username}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {userRights.length} quyền được chọn tại nhóm
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busy || !userRights.length}
                              onClick={() => void saveMember(user.id)}
                              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-600 disabled:opacity-40"
                            >
                              <CheckCircle2 size={14} />
                              <span>Lưu quyền</span>
                            </button>
                            {existing && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void removeMember(user.id)}
                                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 shadow-2xs transition hover:bg-red-50 dark:border-red-900/60 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/40"
                              >
                                <span>Thu hồi</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Permissions Checkbox Grid */}
                        <details className="mt-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-950/40">
                          <summary className="cursor-pointer text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                            Cấu hình chi tiết các quyền trong nhóm này
                          </summary>
                          <div className="mt-3.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {rights.map((right) => {
                              const canGrant = current.permissions.includes(right);
                              const isChecked = userRights.includes(right);
                              return (
                                <label
                                  key={right}
                                  className={`flex min-h-9 items-center gap-2.5 rounded-lg border px-3 text-xs font-medium transition ${
                                    canGrant
                                      ? isChecked
                                        ? "border-brand-200 bg-brand-50/50 text-brand-900 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
                                        : "border-gray-200/80 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                                      : "border-transparent text-gray-400 opacity-60"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={!canGrant}
                                    onChange={(event) =>
                                      setDraft((old) => ({
                                        ...old,
                                        [user.id]: event.target.checked
                                          ? [...(old[user.id] ?? []), right]
                                          : (old[user.id] ?? []).filter(
                                              (value) => value !== right
                                            ),
                                      }))
                                    }
                                    className="size-4 rounded accent-brand-500"
                                  />
                                  <span>{labels[right] ?? right}</span>
                                </label>
                              );
                            })}
                          </div>
                        </details>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* TAB 3: Report */}
          {tab === "report" && (
            <section
              role="tabpanel"
              aria-label="Báo cáo nhóm"
              className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Báo cáo số liệu nhóm
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Tổng hợp các khảo sát mà bạn có quyền xem kết quả phản hồi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void exportReport()}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 sm:text-sm"
                >
                  <FileSpreadsheet size={16} />
                  <span>Xuất file Excel</span>
                </button>
              </div>

              {/* KPI cards in report */}
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Tổng số khảo sát
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {summary?.surveys ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Tổng lượt phản hồi đã thu thập
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-brand-600 dark:text-brand-400">
                    {summary?.responses ?? 0}
                  </p>
                </div>
              </div>

              {/* Survey Rows List */}
              <div className="mt-6 divide-y divide-gray-100 dark:divide-gray-800">
                {summary?.rows.map((row) => (
                  <div
                    key={row.surveyId}
                    className="flex items-center justify-between gap-4 py-3.5 transition hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                  >
                    <Link
                      href={"/admin/survey/" + row.surveyId + "/result"}
                      className="min-w-0 font-medium text-gray-800 transition hover:text-brand-600 dark:text-gray-200 dark:hover:text-brand-400 text-sm"
                    >
                      {row.title}
                    </Link>
                    <span className="inline-flex shrink-0 items-center rounded-lg bg-gray-100 px-3 py-1 font-mono text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {row.responses} phản hồi
                    </span>
                  </div>
                ))}
                {summary && summary.rows.length === 0 && (
                  <p className="py-12 text-center text-sm text-gray-400">
                    Chưa có khảo sát nào bạn được cấp quyền xem phản hồi trong nhóm này.
                  </p>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* Group Create/Rename Modal */}
      {groupDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="group-dialog-title"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-xs"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setGroupDialog(null);
          }}
        >
          <form
            onSubmit={(event) => void submitGroup(event)}
            className="w-full max-w-md rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="group-dialog-title"
                  className="text-lg font-bold text-gray-900 dark:text-white"
                >
                  {groupDialog.mode === "rename" ? "Đổi tên nhóm" : "Tạo nhóm con"}
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {groupDialog.mode === "child"
                    ? "Nhóm con trực thuộc: " + current?.name
                    : "Đặt tên ngắn gọn, dễ nhận biết."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGroupDialog(null)}
                aria-label="Đóng"
                className="rounded-xl border border-gray-200/80 p-2 text-gray-400 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Tên nhóm <span className="text-red-500">*</span>
              </label>
              <input
                required
                maxLength={255}
                value={groupDialog.name}
                onChange={(event) =>
                  setGroupDialog({ ...groupDialog, name: event.target.value })
                }
                placeholder="Nhập tên nhóm..."
                className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setGroupDialog(null)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 sm:text-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={busy || !groupDialog.name.trim()}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-brand-500 px-4 text-xs font-semibold text-white shadow-xs shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-40 sm:text-sm"
              >
                {busy ? "Đang lưu..." : groupDialog.mode === "rename" ? "Lưu thay đổi" : "Tạo nhóm"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Group Modal */}
      {deleteGroupOpen && current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-group-title"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-500/20 dark:bg-red-950/50 dark:text-red-400">
              <Trash2 size={20} />
            </div>

            <h2
              id="delete-group-title"
              className="mt-4 text-lg font-bold text-gray-900 dark:text-white"
            >
              Xác nhận xóa nhóm rỗng?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300 sm:text-sm">
              Nhóm <strong className="text-gray-900 dark:text-white">“{current.name}”</strong> chỉ
              có thể xóa khi không còn nhóm con hoặc khảo sát nào bên trong.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteGroupOpen(false)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 sm:text-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void removeGroup()}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-xs font-semibold text-white shadow-xs shadow-red-600/20 transition hover:bg-red-700 disabled:opacity-40 sm:text-sm"
              >
                {busy ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Survey Sub-Modals */}
      {createSurveyOpen && (
        <SurveyFormModal
          initialGroupId={current?.id}
          onClose={() => setCreateSurveyOpen(false)}
          onSubmitSuccess={() => {
            if (selected) void loadSurveys(selected, surveyPage);
          }}
        />
      )}
      {accessSurvey && (
        <SurveyAccessModal
          survey={accessSurvey}
          onClose={() => setAccessSurvey(null)}
          onChanged={() => {
            if (selected) void loadSurveys(selected, surveyPage);
          }}
        />
      )}
      {publicationSurvey && (
        <SurveyPublicationModal
          survey={publicationSurvey}
          onClose={() => setPublicationSurvey(null)}
          onChanged={(updated: PublishableSurvey) =>
            setSurveys((rows) =>
              rows.map((row) => (row.id === updated.id ? { ...row, ...updated } : row))
            )
          }
        />
      )}
      {deleteSurvey && (
        <SurveyNameConfirmationModal
          heading="Xác nhận xóa khảo sát"
          actionText="xóa khảo sát"
          surveyTitle={deleteSurvey.title}
          confirmLabel="Xóa khảo sát"
          busy={busy}
          error={deleteSurveyError}
          danger
          onCancel={() => setDeleteSurvey(null)}
          onConfirm={deleteSelectedSurvey}
        />
      )}
      {moveSurvey && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="move-survey-title"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <h2
              id="move-survey-title"
              className="text-lg font-bold text-gray-900 dark:text-white"
            >
              Chuyển nhóm khảo sát
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{moveSurvey.title}</p>

            <div className="mt-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Nhóm đích <span className="text-red-500">*</span>
              </label>
              <select
                value={moveTarget}
                onChange={(event) => setMoveTarget(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              >
                <option value="">-- Chọn nhóm đích --</option>
                {groups
                  .filter(
                    (group) =>
                      group.id !== moveSurvey.groupId &&
                      group.permissions.includes("MANAGE_GROUP")
                  )
                  .map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMoveSurvey(null)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 sm:text-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={busy || !moveTarget}
                onClick={() => void moveSelectedSurvey()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-xs font-semibold text-white shadow-xs shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-40 sm:text-sm"
              >
                <span>Chuyển nhóm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
