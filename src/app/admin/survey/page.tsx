"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";
import { useRouter } from "next/navigation";
import SurveyTable from "@/components/surveys/SurveyTable";
import SurveyFormModal from "@/components/surveys/SurveyFormModal";

export interface Survey {
  id: number;
  title: string;
  description: string;
  /** Không có từ API cũ → coi như đang mở */
  isActive?: boolean;
}

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

export default function SurveyPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/survey`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const raw = await res.json();
      const data: Survey[] = Array.isArray(raw)
        ? raw.map((s: Survey & { IsActive?: boolean }) => ({
            ...s,
            isActive: s.isActive ?? s.IsActive ?? true,
          }))
        : [];
      setSurveys(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const handleDelete = async (id: number) => {
    if (!confirm("Xác nhận xóa khảo sát này?")) return;

    await fetch(`${API_URL}/survey/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    setSurveys((prev) => prev.filter((s) => s.id !== id));
  };

  const handleToggleActive = async (id: number, nextActive: boolean) => {
    const token = getToken();
    if (!token) {
      alert("Phiên đăng nhập hết hạn.");
      return;
    }
    setTogglingId(id);
    try {
      const res = await fetch(`${API_URL}/survey/${id}/active`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        alert(t || `Không cập nhật được trạng thái (${res.status})`);
        return;
      }
      setSurveys((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: nextActive } : s))
      );
    } catch (e) {
      console.error(e);
      alert("Lỗi mạng khi cập nhật trạng thái.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Quản lý khảo sát
          </h1>
          <p className="text-sm text-gray-500">
            Danh sách và quản lý các cuộc khảo sát trực tuyến
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/survey/failsubmit"
            className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/70"
          >
            Phản hồi lỗi
          </Link>
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <PlusIcon className="w-5 h-5" /> Tạo khảo sát
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4">
        {loading ? (
          <div className="flex justify-center py-10 text-gray-500">
            Đang tải danh sách khảo sát...
          </div>
        ) : (
          <SurveyTable
            surveys={surveys}
            togglingId={togglingId}
            onEdit={(id) => router.push(`/admin/survey/${id}/edit`)}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        )}
      </div>

      {isModalOpen && (
        <SurveyFormModal
          onClose={() => setIsModalOpen(false)}
          onSubmitSuccess={fetchSurveys}
        />
      )}
    </div>
  );
}