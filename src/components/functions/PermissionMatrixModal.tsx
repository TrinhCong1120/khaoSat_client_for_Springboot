"use client";

import React, { useCallback, useEffect, useState } from "react";
import Modal from "@/components/ui/modal/Modal";
import Checkbox from "@/components/form/input/Checkbox";
import { API_FUNCTIONS } from "@/lib/api";

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

// ======================
// TYPES (ĐÚNG THEO API)
// ======================
interface Permission {
  permissionID: string;
  type: string;
  isActive: boolean;
}

interface Row {
  functionID: string;
  functionName: string;
  roleID: string;
  roleName: string;
  permissions: Permission[];
}

const PermissionMatrixModal = ({
  functionId,
  onClose,
}: {
  functionId: string;
  onClose: () => void;
}) => {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  // ======================
  // LOAD DATA
  // ======================
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `${API_FUNCTIONS}/${functionId}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      const json = await res.json();

      // 🔥 FIX NULL / UNDEFINED
      const safeData = (Array.isArray(json) ? json : []).map((row: Row) => ({
        ...row,
        permissions: row.permissions || [],
      }));

      setData(safeData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [functionId]);

  useEffect(() => {
    if (functionId) fetchData();
  }, [fetchData, functionId]);

  // ======================
  // UPDATE PERMISSION
  // ======================
  const handleToggle = async (
    roleId: string,
    permissionId: string,
    isActive: boolean
  ) => {
    try {
      await fetch(`${API_FUNCTIONS}/update-permission`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          roleId,
          permissionId,
          isActive,
        }),
      });

      // ⚡ UPDATE UI NGAY
      setData((prev) =>
        prev.map((row) =>
          row.roleID === roleId
            ? {
                ...row,
                permissions: row.permissions.map((p) =>
                  p.permissionID === permissionId
                    ? { ...p, isActive }
                    : p
                ),
              }
            : row
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const permissionTypes = data?.[0]?.permissions?.map((permission) => permission.type) || [];

  // ======================
  // UI
  // ======================
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Phân quyền - ${data?.[0]?.functionName || ""}`}
      className="max-w-4xl"
    >
      {loading ? (
        <div className="flex justify-center py-10 text-gray-500">
          Đang tải dữ liệu...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            
            {/* HEADER */}
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-b dark:border-gray-800">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Vai trò</th>
                {permissionTypes.map((type) => (
                  <th
                    key={type}
                    className="whitespace-nowrap px-4 py-3 text-center font-semibold uppercase"
                  >
                    {type}
                  </th>
                ))}
              </tr>
            </thead>

            {/* BODY */}
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {data.map((row) => (
                <tr
                  key={row.roleID}
                  className="bg-white dark:bg-gray-900 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  {/* ROLE */}
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {row.roleName}
                  </td>

                  {/* PERMISSIONS */}
                  {permissionTypes.map((type) => {
                    const permission = row.permissions.find((item) => item.type === type);
                    return (
                      <td key={type} className="px-4 py-3 text-center">
                        {permission ? (
                          <div className="flex justify-center">
                            <Checkbox
                              checked={permission.isActive}
                              onChange={(checked: boolean) =>
                                handleToggle(row.roleID, permission.permissionID, checked)
                              }
                            />
                          </div>
                        ) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};

export default PermissionMatrixModal;
