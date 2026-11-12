"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Folder,
  FolderPlus,
  LayoutList,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Home,
  Layers,
  FolderTree,
  AlertCircle,
  ShieldCheck,
  CornerDownRight,
} from "lucide-react";
import { API_GROUPS } from "@/lib/api";
import { getPermissions, getToken } from "@/lib/auth";

type Group = { id: string; name: string; parentId: string | null; permissions: string[] };
type Dialog = { mode: "root" | "child" | "rename"; group: Group | null; name: string } | null;

export default function SurveyGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [deleteGroup, setDeleteGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [canRoot, setCanRoot] = useState(false);

  const headers = useCallback(
    () => ({ Authorization: "Bearer " + getToken(), "Content-Type": "application/json" }),
    []
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(API_GROUPS, {
        headers: headers(),
        signal: signal ?? AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Không tải được danh sách nhóm.");
      setGroups((await response.json()) as Group[]);
    },
    [headers]
  );

  useEffect(() => {
    setCanRoot(getPermissions().includes("survey_update_all"));
    void load()
      .catch((cause) => setError(String(cause)))
      .finally(() => setLoading(false));
  }, [load]);

  const rows = useMemo(() => {
    const byParent = new Map<string, Group[]>();
    const visible = new Set(groups.map((group) => group.id));
    for (const group of groups) {
      const parent = group.parentId && visible.has(group.parentId) ? group.parentId : "root";
      byParent.set(parent, [...(byParent.get(parent) ?? []), group]);
    }
    const result: { group: Group; depth: number }[] = [];
    const visit = (parent: string, depth: number) => {
      for (const group of byParent.get(parent) ?? []) {
        result.push({ group, depth });
        visit(group.id, depth + 1);
      }
    };
    visit("root", 0);
    return result.filter(({ group }) =>
      group.name.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))
    );
  }, [groups, search]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = groups.length;
    const rootCount = groups.filter((g) => !g.parentId).length;
    const subCount = total - rootCount;
    return { total, rootCount, subCount };
  }, [groups]);

  const request = async (url: string, method: string, body?: unknown) => {
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
      await load(signal);
      return response;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Thao tác thất bại.");
      return null;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!dialog?.name.trim()) return;
    if (dialog.mode === "rename" && dialog.group) {
      if (await request(API_GROUPS + "/" + dialog.group.id, "PUT", { name: dialog.name.trim() })) {
        setDialog(null);
      }
      return;
    }
    const response = await request(API_GROUPS, "POST", {
      name: dialog.name.trim(),
      parentId: dialog.mode === "child" ? dialog.group?.id : null,
    });
    if (response) {
      const created = (await response.json()) as Group;
      setDialog(null);
      router.push("/admin/survey/groups/" + created.id);
    }
  };

  const remove = async () => {
    if (deleteGroup && (await request(API_GROUPS + "/" + deleteGroup.id, "DELETE"))) {
      setDeleteGroup(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
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
        <span className="font-semibold text-gray-800 dark:text-gray-200">Nhóm khảo sát</span>
      </nav>

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-xs ring-1 ring-brand-500/15 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-400/20">
            <FolderTree size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Nhóm khảo sát
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              Cấu trúc phân cấp cây thư mục khảo sát, thành viên và phân quyền truy cập.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            href="/admin/survey"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-xs transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800/80 sm:text-sm whitespace-nowrap"
          >
            <LayoutList size={16} />
            <span>Danh sách khảo sát</span>
          </Link>

          {canRoot && (
            <button
              type="button"
              onClick={() => setDialog({ mode: "root", group: null, name: "" })}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-xs font-semibold text-white shadow-xs shadow-brand-500/20 transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40 sm:text-sm whitespace-nowrap"
            >
              <Plus size={16} />
              <span>Tạo nhóm gốc</span>
            </button>
          )}
        </div>
      </header>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4.5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Tổng số nhóm
            </p>
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Folder size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {stats.total}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Nhóm bạn có thể truy cập</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4.5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Nhóm gốc (Root)
            </p>
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Layers size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {stats.rootCount}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Cấp phân loại cao nhất</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4.5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Nhóm con (Sub-groups)
            </p>
            <span className="flex size-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <FolderTree size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {stats.subCount}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Kế thừa quyền từ nhóm cha</p>
        </div>
      </div>

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

      {/* Tree Section */}
      <section
        className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900"
        aria-label="Danh sách nhóm"
      >
        {/* Search & Actions Bar */}
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-gray-800">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Cấu trúc cây danh mục</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Nhấn vào tên nhóm để quản lý khảo sát, thành viên và phân quyền
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm kiếm theo tên nhóm..."
              className="h-10.5 w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-10 pr-3.5 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700/80 dark:bg-gray-950/60 dark:text-gray-100 dark:focus:bg-gray-950 sm:text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="space-y-3 p-6" aria-label="Đang tải danh sách nhóm">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/60"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800">
              <Folder size={28} />
            </div>
            <p className="text-base font-semibold text-gray-800 dark:text-gray-200">
              {search ? "Không tìm thấy nhóm phù hợp" : "Chưa có nhóm nào"}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {search
                ? "Thử tìm kiếm với một từ khóa khác."
                : "Các nhóm bạn được cấp quyền sẽ xuất hiện tại đây."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
            {rows.map(({ group, depth }) => {
              const parent = groups.find((item) => item.id === group.parentId);
              const isRoot = !group.parentId;

              return (
                <div
                  key={group.id}
                  className="group flex min-w-0 items-center justify-between gap-3 px-4 py-3 transition hover:bg-gray-50/80 sm:px-5 dark:hover:bg-gray-800/30"
                >
                  <div
                    className="flex min-w-0 flex-1 items-center gap-3"
                    style={{ paddingLeft: `${Math.min(depth, 5) * 20}px` }}
                  >
                    {depth > 0 && (
                      <CornerDownRight
                        size={15}
                        className="shrink-0 text-gray-300 dark:text-gray-600"
                      />
                    )}

                    <Link
                      href={"/admin/survey/groups/" + group.id}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl shadow-xs ${
                          isRoot
                            ? "bg-brand-50 text-brand-600 ring-1 ring-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-400/20"
                            : "bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700/60"
                        }`}
                      >
                        <Folder size={18} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="truncate text-sm font-semibold text-gray-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400"
                            title={group.name}
                          >
                            {group.name}
                          </span>

                          {isRoot ? (
                            <span className="inline-flex shrink-0 items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 whitespace-nowrap">
                              GỐC
                            </span>
                          ) : (
                            <span className="inline-flex shrink-0 items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400 whitespace-nowrap">
                              CẤP {depth + 1}
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                          {parent
                            ? `Nằm trong: ${parent.name}`
                            : group.parentId
                              ? "Nhóm được chia sẻ trực tiếp"
                              : "Thư mục gốc"}
                        </p>
                      </div>

                      <ChevronRight
                        size={16}
                        className="ml-auto shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-gray-600"
                      />
                    </Link>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    {group.permissions.includes("CREATE_CHILD") && (
                      <button
                        type="button"
                        aria-label={"Tạo nhóm con trong " + group.name}
                        title="Tạo nhóm con"
                        onClick={() => setDialog({ mode: "child", group, name: "" })}
                        className="flex size-9 items-center justify-center rounded-xl border border-gray-200/80 bg-white text-gray-600 shadow-2xs transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                      >
                        <FolderPlus size={16} />
                      </button>
                    )}

                    {group.permissions.includes("MANAGE_GROUP") && (
                      <>
                        <button
                          type="button"
                          aria-label={"Đổi tên " + group.name}
                          title="Đổi tên nhóm"
                          onClick={() =>
                            setDialog({ mode: "rename", group, name: group.name })
                          }
                          className="flex size-9 items-center justify-center rounded-xl border border-gray-200/80 bg-white text-gray-600 shadow-2xs transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          aria-label={"Xóa " + group.name}
                          title="Xóa nhóm rỗng"
                          onClick={() => setDeleteGroup(group)}
                          className="flex size-9 items-center justify-center rounded-xl border border-gray-200/80 bg-white text-gray-400 shadow-2xs transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-red-900/50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Create / Rename Dialog */}
      {dialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="group-dialog-title"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-xs"
        >
          <form
            onSubmit={(event) => void save(event)}
            className="w-full max-w-md rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="group-dialog-title"
                  className="text-lg font-bold text-gray-900 dark:text-white"
                >
                  {dialog.mode === "rename"
                    ? "Đổi tên nhóm"
                    : dialog.mode === "child"
                      ? "Tạo nhóm con"
                      : "Tạo nhóm gốc"}
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {dialog.mode === "child"
                    ? `Nhóm con trực thuộc: "${dialog.group?.name}"`
                    : "Đặt tên ngắn gọn, rõ ràng để dễ phân biệt."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDialog(null)}
                aria-label="Đóng"
                className="rounded-xl border border-gray-200/80 p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 dark:border-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
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
                autoFocus
                maxLength={255}
                value={dialog.name}
                onChange={(event) => setDialog({ ...dialog, name: event.target.value })}
                placeholder="Nhập tên nhóm..."
                className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 sm:text-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={busy || !dialog.name.trim()}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-brand-500 px-4 text-xs font-semibold text-white shadow-xs shadow-brand-500/20 transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40 sm:text-sm"
              >
                {busy ? "Đang lưu..." : dialog.mode === "rename" ? "Lưu thay đổi" : "Tạo nhóm"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteGroup && (
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
              Bạn có chắc chắn muốn xóa nhóm{" "}
              <strong className="text-gray-900 dark:text-white">“{deleteGroup.name}”</strong>?
              Nhóm chỉ có thể xóa khi không còn nhóm con hoặc khảo sát nào bên trong.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteGroup(null)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 sm:text-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove()}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-xs font-semibold text-white shadow-xs shadow-red-600/20 transition hover:bg-red-700 disabled:opacity-40 sm:text-sm"
              >
                {busy ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
