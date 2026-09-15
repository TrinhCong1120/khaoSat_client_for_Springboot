"use client";

import React, { useEffect, useState } from "react";
import FunctionTable from "@/components/functions/FunctionTable";
import PermissionMatrixModal from "@/components/functions/PermissionMatrixModal";

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

interface Func {
  id: number;
  name: string;
  code: string;
}

export default function FunctionsPage() {
  const [functions, setFunctions] = useState<Func[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFunction, setSelectedFunction] = useState<number | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ======================
  // FETCH FUNCTIONS
  // ======================
  const fetchFunctions = async () => {
    try {
      const res = await fetch(`${API_URL}/core/Functions`, {
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
    <div className="p-4 lg:p-6">

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
          <FunctionTable
            functions={functions}
            onPermission={(id: number) => setSelectedFunction(id)}
          />
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