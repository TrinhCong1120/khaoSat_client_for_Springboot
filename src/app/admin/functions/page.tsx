"use client";

import React, { useEffect, useState } from "react";
import FunctionTable from "@/components/functions/FunctionTable";
import PermissionMatrixModal from "@/components/functions/PermissionMatrixModal";
import { API_FUNCTIONS } from "@/lib/api";
import Pagination from "@/components/ui/pagination/Pagination";

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
  const pageSize = 10;
  const paginatedFunctions = functions.slice((page - 1) * pageSize, page * pageSize);

  // ======================
  // FETCH FUNCTIONS
  // ======================
  const fetchFunctions = async () => {
    try {
      const res = await fetch(API_FUNCTIONS, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await res.json();
      setFunctions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunctions();
  }, []);

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
              functions={paginatedFunctions}
              onPermission={(id: string) => setSelectedFunction(id)}
            />
            <Pagination page={page} pageSize={pageSize} total={functions.length} onPageChange={setPage} />
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
