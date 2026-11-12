"use client";

import React, { useEffect, useState, useCallback } from "react";
import RoleTable from "@/components/roles/RoleTable";
import RoleFormModal from "@/components/roles/RoleFormModal";
import { PlusIcon } from "@/icons";
import { API_ROLES } from "@/lib/api";
import Pagination from "@/components/ui/pagination/Pagination";
import type { PagedResult } from "@/types/report";
import { FiHome, FiChevronRight, FiShield, FiRefreshCw, FiAlertCircle } from "react-icons/fi";
import Link from "next/link";

export interface Role {
  id: string;
  name: string;
}

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_ROLES}/page?page=${page}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: PagedResult<Role> = await res.json();
      if (data.totalPages > 0 && page > data.totalPages) {
        setPage(data.totalPages);
        return;
      }
      setRoles(data.content);
      setTotal(data.totalElements);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleDelete = async (id: string) => {
    if (!confirm("Xác nhận xóa vai trò này?")) return;

    await fetch(`${API_ROLES}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    if (roles.length === 1 && page > 1) setPage(page - 1);
    else await fetchRoles();
  };

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
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
          Quản lý vai trò
        </span>
      </nav>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
              <FiShield size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Quản lý vai trò
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Quản lý các vai trò và quyền hạn trong hệ thống
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setEditingRole(null); setIsModalOpen(true); }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:opacity-95 hover:shadow-brand-500/25 cursor-pointer"
        >
          <PlusIcon className="size-4" />
          <span>Thêm vai trò</span>
        </button>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tổng vai trò</p>
          <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{total}</p>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Trang hiện tại</p>
          <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{page}</p>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Trong trang</p>
          <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{roles.length}</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white p-12 dark:border-gray-800 dark:bg-gray-900">
          <div className="size-9 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Đang tải danh sách vai trò...
          </p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/60 dark:bg-rose-950/30">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
            <FiAlertCircle size={24} />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Không thể tải dữ liệu</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{error}</p>
          <button
            type="button"
            onClick={fetchRoles}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700"
          >
            <FiRefreshCw size={13} />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="space-y-4">
          {/* Section header */}
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-bold text-gray-800 dark:text-white/90">
                Danh sách vai trò
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                {total} vai trò
              </span>
            </div>
            <RoleTable
              roles={roles}
              onEdit={(r) => {
                setEditingRole(r);
                setIsModalOpen(true);
              }}
              onDelete={handleDelete}
            />
          </div>

          {/* Pagination */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <RoleFormModal
          key={editingRole?.id || "create"}
          role={editingRole}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRole(null);
          }}
          onSuccess={fetchRoles}
        />
      )}
    </div>
  );
}
