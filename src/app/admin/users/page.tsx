"use client";

import React, { useState, useEffect, useCallback } from "react";
import UserTable from "@/components/users/UserTable";
import UserFormModal from "@/components/users/UserFormModal";
import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";
import { API_USERS } from "@/lib/api";
import Pagination from "@/components/ui/pagination/Pagination";
import type { PagedResult } from "@/types/report";

// ======================
// TYPE
// ======================
export interface User {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  roleIds?: string[];
  roles?: string[];
  telegramChatId?: number | null;
}

// ======================
// GET TOKEN (FIX 401)
// ======================
const getToken = () => {
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")
  );
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

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

      // 🔥 HANDLE 401
      if (res.status === 401) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        window.location.href = "/signin";
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message =
          body && typeof body === "object" && "message" in body
            ? String(body.message)
            : `Không thể tải danh sách người dùng (${res.status})`;
        throw new Error(message);
      }

      const text = await res.text();

      if (!text) {
        setUsers([]);
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Phản hồi JSON không hợp lệ");
      }

      const result = data as PagedResult<User>;
      if (!Array.isArray(result.content) || typeof result.totalElements !== "number") {
        throw new Error("Dữ liệu người dùng không đúng định dạng");
      }
      if (result.totalPages > 0 && page > result.totalPages) {
        setPage(result.totalPages);
        return;
      }
      setUsers(result.content);
      setTotal(result.totalElements);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Lỗi không xác định"
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ======================
  // ACTIONS
  // ======================
  const handleCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Xác nhận xóa người dùng này?")) return;

    try {
      const token = getToken();

      const res = await fetch(`${API_USERS}/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        window.location.href = "/signin";
        return;
      }

      if (!res.ok) {
        throw new Error("Xóa thất bại");
      }

      // 🚀 update UI nhanh hơn (không cần fetch lại)
      if (users.length === 1 && page > 1) setPage(page - 1);
      else await fetchUsers();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Lỗi khi xóa"
      );
    }
  };

  const handleFormSubmit = () => {
    setIsModalOpen(false);
    fetchUsers();
  };

  // ======================
  // UI
  // ======================
  return (
    <div className="p-4 lg:p-6">

      {/* HEADER */}
      <div className="flex flex-col items-stretch gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Quản lý người dùng
          </h1>
          <p className="text-sm text-gray-500">
            Quản lý và phân quyền người dùng trong hệ thống
          </p>
        </div>

        <Button
          onClick={handleCreate}
          size="sm"
          className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
        >
          <PlusIcon className="w-5 h-5" />
          Thêm người dùng
        </Button>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex justify-center py-10 text-gray-500">
          Đang tải danh sách người dùng...
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="bg-red-100 text-red-600 p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* TABLE */}
      {!loading && !error && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4">
          <UserTable
            users={users}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <UserFormModal
          user={editingUser}
          onClose={() => setIsModalOpen(false)}
          onSubmitSuccess={handleFormSubmit}
        />
      )}
    </div>
  );
}
