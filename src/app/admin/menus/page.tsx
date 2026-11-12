"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import IconPicker from "@/components/IconPicker";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FiChevronDown,
  FiChevronRight,
  FiPlus,
  FiGrid,
  FiEdit3,
  FiTrash2,
  FiSave,
  FiFolder,
  FiFileText,
  FiMousePointer,
  FiArrowUp,
  FiArrowDown,
  FiMenu,
  FiHome,
  FiSearch,
  FiLayers,
  FiShield,
  FiLink,
  FiMaximize2,
  FiMinimize2,
  FiX,
  FiCheck,
} from "react-icons/fi";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { API_FUNCTIONS, API_MENUS } from "@/lib/api";

// ======================
// TYPES
// ======================
type MenuItem = {
  id: string;
  name: string;
  path?: string;
  parentId?: string | null;
  functionId?: string | null;
  orderIndex?: number;
  icon?: string;
  children?: MenuItem[];
};

type FunctionItem = {
  id: string;
  name: string;
  code: string;
};

// ======================
// API
// ======================
const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

async function api(url: string, options: any = {}) {
  const token = getToken();

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/signin";
  }

  return res;
}

function sortByOrder(items: MenuItem[]) {
  return [...items].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
}

/** Tìm danh sách anh em cùng cấp (đã sort) và parentId của một menu */
function getSiblingContext(
  tree: MenuItem[],
  id: string
): { siblings: MenuItem[]; parentId: string | null } | null {
  const atRoot = tree.find((m) => m.id === id);
  if (atRoot) {
    return { siblings: sortByOrder(tree), parentId: null };
  }
  for (const m of tree) {
    const ch = m.children;
    if (!ch?.length) continue;
    if (ch.some((c) => c.id === id)) {
      return { siblings: sortByOrder(ch), parentId: m.id };
    }
    const nested = getSiblingContext(ch, id);
    if (nested) return nested;
  }
  return null;
}

function menuPayload(m: MenuItem, overrides: Partial<MenuItem> = {}) {
  return {
    name: m.name,
    path: m.path || "",
    parentId: m.parentId ?? null,
    functionId: m.functionId ?? null,
    orderIndex: m.orderIndex ?? 0,
    icon: m.icon || "",
    ...overrides,
  };
}

/** Đếm toàn bộ menu đệ quy */
function countAllMenus(items: MenuItem[]): {
  total: number;
  rootCount: number;
  subCount: number;
  linkedCount: number;
} {
  let total = 0;
  let rootCount = items.length;
  let subCount = 0;
  let linkedCount = 0;

  function traverse(list: MenuItem[], depth: number) {
    for (const item of list) {
      total++;
      if (depth > 0) subCount++;
      if (item.functionId) linkedCount++;
      if (item.children && item.children.length > 0) {
        traverse(item.children, depth + 1);
      }
    }
  }

  traverse(items, 0);
  return { total, rootCount, subCount, linkedCount };
}

// ======================
// TREE ITEM COMPONENT
// ======================
function TreeItem({
  item,
  selectedId,
  onSelect,
  refresh,
  menus,
  onMoveSibling,
  reordering,
  searchQuery,
  expandedIds,
  onToggleExpand,
}: {
  item: MenuItem;
  selectedId?: string;
  onSelect: (item: MenuItem) => void;
  refresh: () => void;
  menus: MenuItem[];
  onMoveSibling: (id: string, direction: "up" | "down") => void;
  reordering?: boolean;
  searchQuery?: string;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const isOpen = expandedIds.has(item.id);
  const isSelected = selectedId === item.id;
  const sortedChildren = useMemo(
    () => sortByOrder(item.children ?? []),
    [item.children]
  );
  const hasChildren = sortedChildren.length > 0;
  const childIds = sortedChildren.map((c) => c.id);

  const ctx = useMemo(() => getSiblingContext(menus, item.id), [menus, item.id]);
  const pos = ctx ? ctx.siblings.findIndex((s) => s.id === item.id) : -1;
  const canMoveUp = pos > 0;
  const canMoveDown = pos >= 0 && ctx != null && pos < ctx.siblings.length - 1;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const rowStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  } as const;

  const createChild = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await api(API_MENUS, {
      method: "POST",
      body: JSON.stringify({
        name: "Menu con mới",
        parentId: item.id,
        orderIndex: 0,
      }),
    });
    refresh();
    if (!isOpen) onToggleExpand(item.id);
  };

  const matchesSearch =
    searchQuery &&
    (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.path && item.path.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div ref={setNodeRef} style={rowStyle} className="select-none">
      <div
        className={`group mb-1 flex items-center justify-between gap-1.5 rounded-xl px-2.5 py-2 transition-all cursor-pointer ${
          isSelected
            ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
            : matchesSearch
              ? "bg-amber-50/80 text-gray-900 ring-1 ring-amber-300 dark:bg-amber-950/30 dark:text-gray-100 dark:ring-amber-800"
              : "text-gray-700 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-gray-800/60"
        }`}
        onClick={() => onSelect(item)}
      >
        {/* LEFT PART: Drag Handle, Toggle arrow, Icon, Name, Badge */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {/* Drag Handle */}
          <button
            type="button"
            title="Kéo thả để sắp xếp vị trí"
            className={`flex size-7 shrink-0 items-center justify-center rounded-lg cursor-grab active:cursor-grabbing touch-none transition ${
              isSelected
                ? "text-white/80 hover:bg-white/20"
                : "text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-gray-700"
            }`}
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <FiMenu size={14} />
          </button>

          {/* Toggle Expand/Collapse Button */}
          <button
            type="button"
            aria-label={isOpen ? "Thu gọn menu con" : "Mở rộng menu con"}
            className={`flex size-6 shrink-0 items-center justify-center rounded-md transition ${
              isSelected ? "text-white" : "text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(item.id);
            }}
          >
            {hasChildren ? (
              isOpen ? (
                <FiChevronDown size={14} />
              ) : (
                <FiChevronRight size={14} />
              )
            ) : (
              <div className="size-1.5 rounded-full bg-current opacity-30" />
            )}
          </button>

          {/* Icon Preview */}
          <div
            className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
              isSelected ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800"
            }`}
          >
            {hasChildren ? (
              <FiFolder
                size={14}
                className={isSelected ? "text-white" : "text-brand-500"}
              />
            ) : (
              <FiFileText
                size={14}
                className={isSelected ? "text-white" : "text-gray-400"}
              />
            )}
          </div>

          {/* Title & Slug */}
          <div className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold sm:text-sm">
              {item.name}
            </span>
            {item.path && (
              <span
                className={`block truncate font-mono text-[10px] ${
                  isSelected ? "text-white/80" : "text-gray-400"
                }`}
              >
                {item.path}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT PART: Actions (Move Up, Move Down, Add Child) */}
        <div className="flex shrink-0 items-center gap-1">
          {item.functionId && (
            <span
              title="Có gắn quyền chức năng"
              className={`hidden sm:inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                isSelected
                  ? "bg-white/20 text-white"
                  : "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
              }`}
            >
              <FiShield size={10} />
            </span>
          )}

          {/* Move Up/Down Controls */}
          <div
            className={`flex flex-col rounded-md overflow-hidden border transition-opacity opacity-0 group-hover:opacity-100 ${
              isSelected
                ? "border-white/30 bg-white/10"
                : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            }`}
          >
            <button
              type="button"
              title="Di chuyển lên trên"
              disabled={!canMoveUp || reordering}
              onClick={(e) => {
                e.stopPropagation();
                onMoveSibling(item.id, "up");
              }}
              className={`p-1 disabled:opacity-30 disabled:cursor-not-allowed ${
                isSelected
                  ? "hover:bg-white/20 text-white"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              <FiArrowUp size={11} />
            </button>
            <button
              type="button"
              title="Di chuyển xuống dưới"
              disabled={!canMoveDown || reordering}
              onClick={(e) => {
                e.stopPropagation();
                onMoveSibling(item.id, "down");
              }}
              className={`p-1 disabled:opacity-30 disabled:cursor-not-allowed border-t ${
                isSelected
                  ? "border-white/20 hover:bg-white/20 text-white"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              <FiArrowDown size={11} />
            </button>
          </div>

          {/* Add Child Menu Button */}
          <button
            type="button"
            onClick={createChild}
            title="Thêm menu con trực thuộc"
            className={`flex size-7 items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition shadow-2xs ${
              isSelected
                ? "bg-white/20 text-white hover:bg-white/30"
                : "bg-brand-500 text-white hover:bg-brand-600 shadow-brand-500/20"
            }`}
          >
            <FiPlus size={13} />
          </button>
        </div>
      </div>

      {/* CHILDREN LIST */}
      {isOpen && hasChildren && (
        <div className="ml-5 border-l-2 border-gray-100 pl-2 mt-1 mb-2 dark:border-gray-800">
          <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
            {sortedChildren.map((child) => (
              <TreeItem
                key={child.id}
                item={child}
                selectedId={selectedId}
                onSelect={onSelect}
                refresh={refresh}
                menus={menus}
                onMoveSibling={onMoveSibling}
                reordering={reordering}
                searchQuery={searchQuery}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

// ======================
// MAIN PAGE COMPONENT
// ======================
export default function MenuManagerPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [functions, setFunctions] = useState<FunctionItem[]>([]);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [reordering, setReordering] = useState(false);
  const [searchTree, setSearchTree] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [form, setForm] = useState<any>({
    name: "",
    path: "",
    icon: "",
    parentId: null,
    functionId: null,
    orderIndex: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const sortedRootMenus = useMemo(() => sortByOrder(menus), [menus]);
  const sortedRootIds = useMemo(
    () => sortedRootMenus.map((m) => m.id),
    [sortedRootMenus]
  );

  const selectedSequence = selected
    ? (getSiblingContext(menus, selected.id)?.siblings.findIndex(
        (item) => item.id === selected.id
      ) ?? -1) + 1
    : 0;

  // Stats calculation
  const stats = useMemo(() => countAllMenus(menus), [menus]);

  // Helper to expand / collapse all
  const expandAll = () => {
    const all = new Set<string>();
    function collect(list: MenuItem[]) {
      for (const item of list) {
        all.add(item.id);
        if (item.children) collect(item.children);
      }
    }
    collect(menus);
    setExpandedIds(all);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Initially expand root menus
  useEffect(() => {
    if (menus.length > 0 && expandedIds.size === 0) {
      setExpandedIds(new Set(menus.map((m) => m.id)));
    }
  }, [menus]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const persistSiblingOrder = async (
    siblings: MenuItem[],
    parentId: string | null
  ) => {
    const parentPayload = parentId === null ? null : parentId;
    await Promise.all(
      siblings.map((s, idx) =>
        api(`${API_MENUS}/${s.id}`, {
          method: "PUT",
          body: JSON.stringify(
            menuPayload(s, {
              orderIndex: idx,
              parentId: parentPayload,
            })
          ),
        })
      )
    );
  };

  const moveSibling = async (id: string, direction: "up" | "down") => {
    const ctx = getSiblingContext(menus, id);
    if (!ctx) return;
    const sorted = ctx.siblings;
    const pos = sorted.findIndex((s) => s.id === id);
    if (pos < 0) return;
    const swapWith = direction === "up" ? pos - 1 : pos + 1;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    const reordered = arrayMove(sorted, pos, swapWith);
    setReordering(true);
    try {
      await persistSiblingOrder(reordered, ctx.parentId);
      await fetchMenus();
    } finally {
      setReordering(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const ctxA = getSiblingContext(menus, activeId);
    const ctxB = getSiblingContext(menus, overId);
    if (!ctxA || !ctxB || ctxA.parentId !== ctxB.parentId) return;
    const siblings = ctxA.siblings;
    const oldIndex = siblings.findIndex((s) => s.id === activeId);
    const newIndex = siblings.findIndex((s) => s.id === overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    const reordered = arrayMove(siblings, oldIndex, newIndex);
    setReordering(true);
    try {
      await persistSiblingOrder(reordered, ctxA.parentId);
      await fetchMenus();
    } finally {
      setReordering(false);
    }
  };

  const fetchMenus = async () => {
    const res = await api(`${API_MENUS}/tree`);
    setMenus(await res.json());
  };

  const fetchFunctions = async () => {
    const res = await api(API_FUNCTIONS);
    setFunctions(await res.json());
  };

  useEffect(() => {
    void fetchMenus();
    void fetchFunctions();
  }, []);

  useEffect(() => {
    if (selected) {
      setForm({
        name: selected.name,
        path: selected.path || "",
        icon: selected.icon || "",
        parentId: selected.parentId ?? null,
        functionId: selected.functionId ?? null,
        orderIndex: selected.orderIndex ?? 0,
      });
      setSaveSuccess(false);
    }
  }, [selected]);

  const updateMenu = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await api(`${API_MENUS}/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify(menuPayload(selected, form)),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        await fetchMenus();
        setSelected((prev) => (prev ? { ...prev, ...form } : null));
      } else {
        const err = await res.json();
        alert(err.message || "Cập nhật menu thất bại");
      }
    } catch (error) {
      console.error("Update menu failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMenu = async () => {
    if (!selected) return;
    if (
      !confirm(
        `Xác nhận xóa danh mục "${selected.name}"? Thao tác này sẽ xóa vĩnh viễn menu này.`
      )
    )
      return;

    setLoading(true);
    try {
      const res = await api(`${API_MENUS}/${selected.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSelected(null);
        await fetchMenus();
      } else {
        const err = await res.json();
        alert(err.message || "Không thể xóa menu. Vui lòng kiểm tra lại.");
      }
    } catch (error) {
      console.error("Delete menu failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
        >
          <FiHome size={13} />
          <span>Trang chủ</span>
        </Link>
        <FiChevronRight size={12} className="text-gray-400" />
        <span className="font-semibold text-gray-800 dark:text-gray-200">Quản lý Menu</span>
      </nav>

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-xs ring-1 ring-brand-500/15 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-400/20">
            <FiGrid size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Quản lý Menu hệ thống
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              Cấu trúc cây danh mục điều hướng, liên kết phân quyền và thứ tự hiển thị.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            await api(API_MENUS, {
              method: "POST",
              body: JSON.stringify({
                name: "Danh mục mới",
                parentId: null,
              }),
            });
            fetchMenus();
          }}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-xs font-semibold text-white shadow-xs shadow-brand-500/20 transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:scale-95 sm:text-sm"
        >
          <FiPlus size={16} />
          <span>Thêm Menu gốc</span>
        </button>
      </header>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Tổng số menu
            </span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <FiGrid size={14} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {stats.total}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">Tất cả các cấp</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Menu gốc
            </span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <FiFolder size={14} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {stats.rootCount}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">Cấp điều hướng cao nhất</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Menu con
            </span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <FiLayers size={14} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {stats.subCount}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">Lồng trong menu cha</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Gắn quyền
            </span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <FiShield size={14} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {stats.linkedCount}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">Có liên kết chức năng</p>
        </div>
      </div>

      {/* Main 2-column Grid */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: DnD Tree */}
        <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 lg:col-span-5">
          {/* Tree Header & Quick Actions */}
          <div className="border-b border-gray-100 p-4 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiGrid size={17} className="text-brand-500" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                  Cấu trúc phân cấp
                </h2>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Mở rộng tất cả menu"
                  onClick={expandAll}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  <FiMaximize2 size={13} />
                </button>
                <button
                  type="button"
                  title="Thu gọn tất cả menu"
                  onClick={collapseAll}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  <FiMinimize2 size={13} />
                </button>
              </div>
            </div>

            {/* Tree Search Input */}
            <div className="relative mt-3">
              <FiSearch
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={searchTree}
                onChange={(e) => setSearchTree(e.target.value)}
                placeholder="Tìm menu trong cây..."
                className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-8 pr-7 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-100"
              />
              {searchTree && (
                <button
                  type="button"
                  onClick={() => setSearchTree("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <FiX size={12} />
                </button>
              )}
            </div>
          </div>

          {/* DnD Tree Scroll Area */}
          <div className="max-h-[640px] space-y-1 overflow-y-auto p-3.5 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
            {menus.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedRootIds}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedRootMenus.map((m) => (
                    <TreeItem
                      key={m.id}
                      item={m}
                      menus={menus}
                      selectedId={selected?.id}
                      onSelect={setSelected}
                      refresh={fetchMenus}
                      onMoveSibling={moveSibling}
                      reordering={reordering}
                      searchQuery={searchTree}
                      expandedIds={expandedIds}
                      onToggleExpand={toggleExpand}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <div className="py-14 text-center text-gray-400">
                <FiFolder size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-xs italic">Chưa có danh mục menu nào</p>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Configuration Form */}
        <section className="min-h-[500px] rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:p-6 lg:col-span-7">
          {selected ? (
            <div className="space-y-6">
              {/* Form Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <FiEdit3 size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                      Cấu hình chi tiết
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ID: <span className="font-mono">{selected.id}</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  Thứ tự STT: {selectedSequence}
                </div>
              </div>

              {saveSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <FiCheck size={14} />
                  <span>Đã lưu các thay đổi cấu hình menu thành công!</span>
                </div>
              )}

              {/* NAME */}
              <div>
                <Label>
                  Tên hiển thị <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1.5"
                  placeholder="Ví dụ: Trang chủ, Báo cáo khảo sát, Quản lý..."
                />
              </div>

              {/* PATH */}
              <div>
                <Label>Đường dẫn điều hướng (URL Slug)</Label>
                <div className="relative mt-1.5">
                  <Input
                    value={form.path}
                    onChange={(e) => setForm({ ...form, path: e.target.value })}
                    placeholder="Ví dụ: /admin/survey, /admin/users..."
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-gray-400">
                    <FiLink size={14} />
                  </div>
                </div>
              </div>

              {/* FUNCTION LINK */}
              <div>
                <Label>Chức năng phân quyền liên kết</Label>
                <div className="relative mt-1.5">
                  <select
                    value={form.functionId || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        functionId: e.target.value ? e.target.value : null,
                      })
                    }
                    className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white px-3.5 pr-10 text-xs text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:text-sm"
                  >
                    <option value="">-- Không yêu cầu quyền (Công khai) --</option>
                    {functions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.code})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-gray-400">
                    <FiChevronDown size={14} />
                  </div>
                </div>
              </div>

              {/* ICON PICKER */}
              <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
                <Label>Biểu tượng danh mục</Label>
                <div className="mt-2">
                  <IconPicker
                    value={form.icon}
                    onChange={(icon) => setForm({ ...form, icon })}
                  />
                </div>
              </div>

              {/* FORM ACTIONS */}
              <div className="flex items-center gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
                <Button
                  onClick={updateMenu}
                  disabled={loading || !form.name.trim()}
                  className="flex-1 shadow-xs shadow-brand-500/20"
                >
                  {loading ? (
                    "Đang lưu..."
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <FiSave size={16} />
                      <span>Lưu thay đổi</span>
                    </span>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={deleteMenu}
                  disabled={loading}
                  className="px-4 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                  title="Xóa danh mục menu này"
                >
                  <FiTrash2 size={16} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[440px] flex-col items-center justify-center text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800">
                <FiMousePointer size={26} />
              </div>
              <h3 className="mt-3 text-sm font-bold text-gray-800 dark:text-gray-200">
                Chưa chọn danh mục nào
              </h3>
              <p className="mt-1 max-w-xs text-xs text-gray-400">
                Vui lòng nhấp vào một mục trong cây menu bên trái để xem và chỉnh sửa thông tin chi
                tiết.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
