"use client";

import React, { useEffect, useState } from "react";
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
  permissionID: number;
  action: string;
  isActive: boolean;
}

interface Row {
  functionID: number;
  functionName: string;
  roleID: number;
  roleName: string;
  permissions: Permission[];
}

const PermissionMatrixModal = ({
  functionId,
  onClose,
}: any) => {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  // ======================
  // LOAD DATA
  // ======================
  const fetchData = async () => {
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
      const safeData = (json || []).map((row: any) => ({
        ...row,
        permissions: row.permissions || [],
      }));

      setData(safeData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (functionId) fetchData();
  }, [functionId]);

  // ======================
  // UPDATE PERMISSION
  // ======================
  const handleToggle = async (
    roleId: number,
    permissionId: number,
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

  // ======================
  // GET ACTIONS (SORT)
  // ======================
  const order = ["view", "create", "update", "delete"];

  const actions =
    data?.[0]?.permissions
      ?.map((p) => p.action)
      .sort((a, b) => order.indexOf(a) - order.indexOf(b)) || [];

  // ======================
  // UI
  // ======================
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Phân quyền - ${data?.[0]?.functionName || ""}`}
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
                <th className="px-4 py-3 font-semibold">Vai trò</th>
                {actions.map((action) => (
                  <th
                    key={action}
                    className="px-4 py-3 text-center uppercase font-semibold"
                  >
                    {action === "view" ? "Xem" :
                     action === "create" ? "Thêm" :
                     action === "update" ? "Sửa" :
                     action === "delete" ? "Xóa" : action}
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
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {row.roleName}
                  </td>

                  {/* PERMISSIONS */}
                  {row.permissions?.map((p) => (
                    <td
                      key={p.permissionID}
                      className="text-center px-4 py-3"
                    >
                      <div className="flex justify-center">
                        <Checkbox
                          checked={p.isActive}
                          onChange={(checked: boolean) =>
                            handleToggle(
                              row.roleID,
                              p.permissionID,
                              checked
                            )
                          }
                        />
                      </div>
                    </td>
                  ))}
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