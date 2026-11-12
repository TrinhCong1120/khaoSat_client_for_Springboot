"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import UserStatsCards from "@/components/users/UserStatsCards";
import UserFilterBar from "@/components/users/UserFilterBar";
import UserTable from "@/components/users/UserTable";
import UserFormModal from "@/components/users/UserFormModal";
import DeleteUserConfirmModal from "@/components/users/DeleteUserConfirmModal";
import Pagination from "@/components/ui/pagination/Pagination";
import { API_USERS, API_ROLES } from "@/lib/api";
import type { PagedResult } from "@/types/report";
import { PlusIcon } from "@/icons";
import { FiHome, FiChevronRight, FiUsers, FiRefreshCw, FiAlertCircle } from "react-icons/fi";
import Link from "next/link";

// ======================
// USER TYPE
// ======================
export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  roleIds?: string[];
  roles?: string[];
  telegramChatId?: number | null;
  zaloChatId?: string | null;
  botNotificationEnabled?: boolean;
}

const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("token");
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "inactive">("all");
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  // ======================
  // FETCH USERS
  // ======================
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        window.location.href = "/signin";
        return;
      }

      const res = await fetch(`${API_USERS}/page?page=${page}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        window.location.href = "/signin";
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Không thể tải danh sách người dùng (${res.status})`);
      }

      const data = await res.json();
      const result = data as PagedResult<User>;
      if (!Array.isArray(result.content)) {
        throw new Error("Dữ liệu người dùng không đúng định dạng");
      }

      setUsers(result.content);
      setTotal(result.totalElements);

      // Collect available roles from response
      const roleSet = new Set<string>();
      result.content.forEach((u) => {
        u.roles?.forEach((r) => roleSet.add(r));
      });
      if (roleSet.size > 0) {
        setAvailableRoles(Array.from(roleSet));
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [page]);

  // Load all roles for filter dropdown
  useEffect(() => {
    const fetchAllRoles = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const res = await fetch(API_ROLES, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            const names = list.map((r: { name: string }) => r.name);
            setAvailableRoles((prev) => Array.from(new Set([...prev, ...names])));
          }
        }
      } catch (err) {
        console.error("Fetch all roles error:", err);
      }
    };
    fetchAllRoles();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ======================
  // FILTERING LOGIC
  // ======================
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (u.fullName || "").toLowerCase().includes(q);
        const matchesUsername = u.username.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesPhone = (u.phoneNumber || "").includes(q);
        if (!matchesName && !matchesUsername && !matchesEmail && !matchesPhone) {
          return false;
        }
      }

      // 2. Role Filter
      if (selectedRole !== "all") {
        if (!u.roles?.includes(selectedRole)) {
          return false;
        }
      }

      // 3. Status Filter
      if (selectedStatus === "active" && !u.isActive) return false;
      if (selectedStatus === "inactive" && u.isActive) return false;

      return true;
    });
  }, [users, searchQuery, selectedRole, selectedStatus]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedRole("all");
    setSelectedStatus("all");
  };

  // ======================
  // ACTIONS
  // ======================
  const handleCreate = () => {
    setEditingUser(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsFormModalOpen(true);
  };

  const handleDeleteRequest = (user: User) => {
    setDeleteConfirmUser(user);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;
    setIsDeleting(true);

    try {
      const token = getToken();
      const res = await fetch(`${API_USERS}/${deleteConfirmUser.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Không thể xóa tài khoản. Vui lòng thử lại.");
      }

      setDeleteConfirmUser(null);
      if (users.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await fetchUsers();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi khi xóa người dùng");
    } finally {
      setIsDeleting(false);
    }
  };

  // Instant switch toggle with Optimistic UI Update
  const handleToggleStatus = async (userId: string, newStatus: boolean) => {
    const prevUsers = [...users];

    // Optimistic Update
    setUsers((current) =>
      current.map((u) => (u.id === userId ? { ...u, isActive: newStatus } : u))
    );
    setTogglingUserId(userId);

    try {
      const token = getToken();
      const res = await fetch(`${API_USERS}/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Cập nhật trạng thái không thành công");
      }
    } catch (err) {
      console.error(err);
      // Revert optimistic update
      setUsers(prevUsers);
      alert(err instanceof Error ? err.message : "Lỗi khi đổi trạng thái");
    } finally {
      setTogglingUserId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
        >
          <FiHome size={13} />
          <span>Trang chủ</span>
        </Link>
        <FiChevronRight size={12} className="text-gray-400" />
        <span className="font-semibold text-gray-800 dark:text-gray-200">
          Quản lý người dùng
        </span>
      </nav>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
              <FiUsers size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Quản lý người dùng
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Quản lý tài khoản, hỗ trợ đa vai trò và kết nối bot thông báo tức thời
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:opacity-95 hover:shadow-brand-500/25 cursor-pointer"
        >
          <PlusIcon className="size-4" />
          <span>Thêm người dùng</span>
        </button>
      </div>

      {/* Quick KPI Stats Cards */}
      <UserStatsCards users={users} totalElements={total} />

      {/* Filter and Search Bar */}
      <UserFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        roles={availableRoles}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onReset={handleResetFilters}
        totalResults={filteredUsers.length}
      />

      {/* Loading Skeleton */}
      {loading && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white p-12 dark:border-gray-800 dark:bg-gray-900">
          <div className="size-9 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Đang tải dữ liệu người dùng...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/60 dark:bg-rose-950/30">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
            <FiAlertCircle size={24} />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Không thể tải dữ liệu</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{error}</p>
          <button
            type="button"
            onClick={fetchUsers}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700"
          >
            <FiRefreshCw size={13} />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Main Table */}
      {!loading && !error && (
        <div className="space-y-4">
          <UserTable
            users={filteredUsers}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onToggleStatus={handleToggleStatus}
            isTogglingId={togglingUserId}
          />

          {/* Pagination */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* User Form Modal (Create / Edit) */}
      {isFormModalOpen && (
        <UserFormModal
          user={editingUser}
          onClose={() => setIsFormModalOpen(false)}
          onSubmitSuccess={() => {
            setIsFormModalOpen(false);
            fetchUsers();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteUserConfirmModal
        isOpen={!!deleteConfirmUser}
        user={deleteConfirmUser}
        isDeleting={isDeleting}
        onClose={() => setDeleteConfirmUser(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
