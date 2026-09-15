"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "react-icons/fi";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";

// ======================
// TYPES
// ======================
type MenuItem = {
  id: number;
  name: string;
  path?: string;
  parentId?: number | null;
  functionId?: number | null;
  orderIndex?: number;
  icon?: string;
  children?: MenuItem[];
};

type FunctionItem = {
  id: number;
  name: string;
  code: string;
};

// ======================
// API
// ======================
const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

async function api(url: string, options: any = {}) {
  const token = getToken();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}${url}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    }
  );

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/signin";
  }

  return res;
}

function sortByOrder(items: MenuItem[]) {
  return [...items].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
  );
}

/** Tìm danh sách anh em cùng cấp (đã sort) và parentId của một menu */
function getSiblingContext(
  tree: MenuItem[],
  id: number
): { siblings: MenuItem[]; parentId: number | null } | null {
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

// ======================
// TREE ITEM
// ======================
function TreeItem({
  item,
  selectedId,
  onSelect,
  refresh,
  menus,
  onMoveSibling,
  reordering,
}: {
  item: MenuItem;
  selectedId?: number;
  onSelect: (item: MenuItem) => void;
  refresh: () => void;
  menus: MenuItem[];
  onMoveSibling: (id: number, direction: "up" | "down") => void;
  reordering?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const isSelected = selectedId === item.id;
  const sortedChildren = useMemo(
    () => sortByOrder(item.children ?? []),
    [item.children]
  );
  const hasChildren = sortedChildren.length > 0;
  const childIds = sortedChildren.map((c) => c.id);

  const ctx = useMemo(
    () => getSiblingContext(menus, item.id),
    [menus, item.id]
  );
  const pos = ctx ? ctx.siblings.findIndex((s) => s.id === item.id) : -1;
  const canMoveUp = pos > 0;
  const canMoveDown =
    pos >= 0 && ctx != null && pos < ctx.siblings.length - 1;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const rowStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  } as const;

  const createChild = async (e: any) => {
    e.stopPropagation();

    await api("/core/menus", {
      method: "POST",
      body: JSON.stringify({
        name: "Menu con mới",
        parentId: item.id,
        orderIndex: 0,
      }),
    });

    refresh();
  };

  return (
    <div ref={setNodeRef} style={rowStyle} className="select-none">
      <div
        className={`flex items-center justify-between group px-2 py-2 rounded-xl transition-all cursor-pointer mb-1 gap-1
          ${
            isSelected
              ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        onClick={() => onSelect(item)}
      >
        {/* LEFT */}
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0 flex-1">
          <button
            type="button"
            title="Kéo để đổi thứ tự"
            className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-md cursor-grab active:cursor-grabbing touch-none
              ${isSelected ? "text-white/90 hover:bg-white/15" : "text-gray-400 hover:bg-black/5 dark:hover:bg-white/10"}`}
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <FiMenu size={14} />
          </button>

          <button
            type="button"
            className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors
              ${isSelected ? "text-white" : "text-gray-400"}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          >
            {hasChildren ? (
              open ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20" />
            )}
          </button>

          <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800"}`}>
            {hasChildren ? <FiFolder size={14} className={isSelected ? "text-white" : "text-brand-500"} /> : <FiFileText size={14} className={isSelected ? "text-white" : "text-gray-400"} />}
          </div>

          <span className="text-sm font-medium truncate">
            {item.name}
          </span>
        </div>

        {/* REORDER + ADD */}
        <div className="flex items-center gap-0.5 shrink-0">
          <div
            className={`flex flex-col rounded-md overflow-hidden border transition-opacity opacity-0 group-hover:opacity-100
              ${isSelected ? "border-white/30" : "border-gray-200 dark:border-gray-600"}`}
          >
            <button
              type="button"
              title="Lên"
              disabled={!canMoveUp || reordering}
              onClick={(e) => {
                e.stopPropagation();
                onMoveSibling(item.id, "up");
              }}
              className={`p-0.5 disabled:opacity-30 disabled:cursor-not-allowed
                ${isSelected ? "hover:bg-white/15" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              <FiArrowUp size={12} />
            </button>
            <button
              type="button"
              title="Xuống"
              disabled={!canMoveDown || reordering}
              onClick={(e) => {
                e.stopPropagation();
                onMoveSibling(item.id, "down");
              }}
              className={`p-0.5 disabled:opacity-30 disabled:cursor-not-allowed border-t
                ${isSelected ? "border-white/20 hover:bg-white/15" : "border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              <FiArrowDown size={12} />
            </button>
          </div>

          <button
            onClick={createChild}
            title="Thêm menu con"
            className={`p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100
              ${isSelected ? "bg-white/20 text-white hover:bg-white/30" : "bg-brand-500 text-white hover:bg-brand-600 shadow-sm"}`}
          >
            <FiPlus size={14} />
          </button>
        </div>
      </div>

      {/* CHILDREN */}
      {open && hasChildren && (
        <div className="ml-5 border-l border-gray-100 dark:border-gray-800 pl-2 mt-1 mb-2">
          <SortableContext
            items={childIds}
            strategy={verticalListSortingStrategy}
          >
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
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

// ======================
// PAGE
// ======================
export default function MenuManagerPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [functions, setFunctions] = useState<FunctionItem[]>([]);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [reordering, setReordering] = useState(false);

  const [form, setForm] = useState<any>({
    name: "",
    path: "",
    icon: "",
    parentId: null,
    functionId: null,
    orderIndex: 0,
  });
  const [loading, setLoading] = useState(false);

  const sortedRootMenus = useMemo(() => sortByOrder(menus), [menus]);
  const sortedRootIds = useMemo(
    () => sortedRootMenus.map((m) => m.id),
    [sortedRootMenus]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const persistSiblingOrder = async (
    siblings: MenuItem[],
    parentId: number | null
  ) => {
    const parentPayload = parentId === null ? null : parentId;
    await Promise.all(
      siblings.map((s, idx) =>
        api(`/core/menus/${s.id}`, {
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

  const moveSibling = async (id: number, direction: "up" | "down") => {
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
    const activeId = Number(active.id);
    const overId = Number(over.id);
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
    const res = await api("/core/menus/tree");
    setMenus(await res.json());
  };

  const fetchFunctions = async () => {
    const res = await api("/core/functions");
    setFunctions(await res.json());
  };

  useEffect(() => {
    fetchMenus();
    fetchFunctions();
  }, []);

  useEffect(() => {
    if (selected) {
      setForm({
        name: selected.name,
        path: selected.path || "",
        parentId: selected.parentId || null,
        functionId: selected.functionId || null,
        orderIndex: selected.orderIndex || 0,
        icon: selected.icon || "",
      });
    }
  }, [selected]);

  const updateMenu = async () => {
    if (!selected) return;

    setLoading(true);
    try {
      await api(`/core/menus/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      await fetchMenus();
      // Optionally update local selected to sync name changes in tree
      setSelected({ ...selected, ...form });
    } catch (error) {
      console.error("Update menu failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMenu = async () => {
    if (!selected) return;

    if (!window.confirm(`Bạn có chắc chắn muốn xóa menu "${selected.name}"? Hành động này không thể hoàn tác.`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await api(`/core/menus/${selected.id}`, {
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
    <div className="p-4 lg:p-8 max-w-(--breakpoint-2xl) mx-auto">
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Quản lý Menu
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Cấu trúc cây danh mục và hệ thống điều hướng của bạn
          </p>
        </div>

        <button
          onClick={async () => {
            await api("/core/menus", {
              method: "POST",
              body: JSON.stringify({
                name: "Danh mục mới",
                parentId: null,
              }),
            });
            fetchMenus();
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/20 text-sm font-semibold transition-all active:scale-95"
        >
          <FiPlus size={18} />
          Thêm Menu gốc
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT TREE */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm border-t-4 border-t-brand-500 overflow-hidden">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-50 dark:border-gray-800 pb-4">
            <FiGrid size={20} className="text-brand-500" />
            <h2 className="font-bold text-gray-800 dark:text-white/90">
              Cấu trúc cây
            </h2>
          </div>

          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-100 dark:scrollbar-thumb-gray-800">
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
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm italic">Chưa có menu nào</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT FORM */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm min-h-[500px] transition-all">
          {selected ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-4 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-brand-50 dark:bg-brand-500/10 rounded-xl">
                    <FiEdit3 size={18} className="text-brand-500" />
                  </div>
                  <h2 className="font-bold text-gray-800 dark:text-white/90">
                    Cấu hình chi tiết
                  </h2>
                </div>
                <div className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-mono text-gray-500 dark:text-gray-400">
                  ID: {selected.id}
                </div>
              </div>

              {/* NAME */}
              <div>
                <Label>Tên hiển thị <span className="text-error-500">*</span></Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="mt-1.5"
                  placeholder="Ví dụ: Trang chủ, Sản phẩm..."
                />
              </div>

              {/* PATH */}
              <div>
                <Label>Đường dẫn (Slug)</Label>
                <Input
                  value={form.path}
                  onChange={(e) =>
                    setForm({ ...form, path: e.target.value })
                  }
                  placeholder="Ví dụ: /home, /products"
                  className="mt-1.5"
                />
              </div>

              {/* FUNCTION */}
              <div>
                <Label>Chức năng liên kết</Label>
                <div className="relative mt-1.5">
                  <select
                    value={form.functionId || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        functionId: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all cursor-pointer appearance-none"
                  >
                    <option value="">-- Không có chức năng --</option>
                    {functions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.code})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                    <FiChevronDown size={14} />
                  </div>
                </div>
              </div>

              {/* ICON PICKER */}
              <div className="pt-2 border-t border-gray-50 dark:border-gray-800">
                <IconPicker
                  value={form.icon}
                  onChange={(icon) =>
                    setForm({ ...form, icon })
                  }
                />
              </div>

              {/* ACTIONS */}
              <div className="pt-6 flex items-center gap-3">
                <Button
                  onClick={updateMenu}
                  disabled={loading}
                  className="flex-1 shadow-lg shadow-brand-500/20"
                >
                  {loading ? "Đang lưu..." : (
                    <span className="flex items-center gap-2">
                      <FiSave size={18} />
                      Lưu thay đổi
                    </span>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={deleteMenu}
                  disabled={loading}
                  className="px-4 text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10 border-error-200 dark:border-error-500/20"
                >
                  <FiTrash2 size={18} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                <FiMousePointer size={24} className="text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                Chưa có menu nào được chọn
              </h3>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                Vui lòng chọn một mục từ cây menu bên trái để bắt đầu chỉnh sửa.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}