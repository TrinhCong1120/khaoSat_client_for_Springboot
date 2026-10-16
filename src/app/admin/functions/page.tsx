"use client";

import React, { useCallback, useEffect, useState } from "react";
import FunctionTable from "@/components/functions/FunctionTable";
import PermissionMatrixModal from "@/components/functions/PermissionMatrixModal";
import { API_FUNCTIONS } from "@/lib/api";
import Pagination from "@/components/ui/pagination/Pagination";
import type { PagedResult } from "@/types/report";

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

interface Func {
  id: string;
  name: string;
  code: string;
}

export default function FunctionsPage() {
  const [functions, setFunctions] = useState<Func[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // ======================
  // FETCH FUNCTIONS
  // ======================
  const fetchFunctions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_FUNCTIONS}/page?page=${page}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: PagedResult<Func> = await res.json();
      if (data.totalPages > 0 && page > data.totalPages) {
        setPage(data.totalPages);
        return;
      }
      setFunctions(data.content);
      setTotal(data.totalElements);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchFunctions();
  }, [fetchFunctions]);

  // ======================
  // UI
  // ======================
  return (
    <div className="p-3 sm:p-4 lg:p-6">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Phân quyền chức năng
        </h1>
        <p className="text-sm text-gray-500">
          Quản lý và thiết lập quyền hạn cho từng chức năng trong hệ thống
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4">
        {loading ? (
          <div className="flex justify-center py-10 text-gray-500">
            Đang tải dữ liệu...
          </div>
        ) : (
          <>
            <FunctionTable
              functions={functions}
              onPermission={(id: string) => setSelectedFunction(id)}
            />
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* MODAL */}
      {selectedFunction && (
        <PermissionMatrixModal
          functionId={selectedFunction}
          onClose={() => setSelectedFunction(null)}
        />
      )}
    </div>
  );
}
