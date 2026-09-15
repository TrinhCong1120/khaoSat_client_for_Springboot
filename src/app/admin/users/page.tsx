"use client";

import React, { useState, useEffect, useCallback } from "react";
import UserTable from "@/components/users/UserTable";
import UserFormModal from "@/components/users/UserFormModal";
import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";

// ======================
// TYPE
// ======================
export interface User {
  id: number;
  username: string;
  isActive: boolean;
  roleIds?: number[];
  roles?: string[];
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

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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

      const res = await fetch(`${API_URL}/core/Users`, {
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
        throw new Error(`Error ${res.status}`);
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

      setUsers(data.data || data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Lỗi không xác định"
      );
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

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

  const handleDelete = async (userId: number) => {
    if (!confirm("Xác nhận xóa người dùng này?")) return;

    try {
      const token = getToken();

      const res = await fetch(`${API_URL}/core/Users/${userId}`, {
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
      setUsers((prev) => prev.filter((u) => u.id !== userId));
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
      <div className="flex justify-between items-center mb-6">
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
          className="inline-flex items-center gap-2"
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