"use client";

import React, { useEffect, useState, useCallback } from "react";
import Button from "@/components/ui/button/Button";
import RoleTable from "@/components/roles/RoleTable";
import RoleFormModal from "@/components/roles/RoleFormModal";
import { PlusIcon } from "@/icons";
import { API_ROLES } from "@/lib/api";
import Pagination from "@/components/ui/pagination/Pagination";
import type { PagedResult } from "@/types/report";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);

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
    <div className="p-4 lg:p-6">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col items-stretch gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Quản lý vai trò
          </h1>
          <p className="text-sm text-gray-500">
            Quản lý các vai trò và quyền hạn trong hệ thống
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 sm:w-auto"
        >
          <PlusIcon className="w-4 h-4" />
          Thêm vai trò
        </Button>
      </div>

      {/* ===== CARD ===== */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Danh sách vai trò
          </h2>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="text-center text-gray-500 text-theme-sm">
              Đang tải danh sách vai trò...
            </div>
          ) : (
            <>
              <RoleTable
                roles={roles}
                onEdit={(r) => {
                  setEditingRole(r);
                  setIsModalOpen(true);
                }}
                onDelete={handleDelete}
              />
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      {/* ===== MODAL ===== */}
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
