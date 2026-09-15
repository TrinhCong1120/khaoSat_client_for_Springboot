"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DetailQuestionValue from "@/components/result/DetailQuestionValue";
import {
  isAddressQuestionType,
  parseAddressCodesFromAnswer,
} from "@/lib/vietnam-address-api";

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

export default function ResponseDetailPage() {
  const { id } = useParams();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [data, setData] = useState<any>(null);

  const load = async () => {
    const res = await fetch(`${API_URL}/survey/Results/response/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    const json = await res.json();
    setData(json);
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        Loading...
      </div>
    );
  }

  const pages = (data.pages ?? []) as any[];

  // Flatten for top statistics only
  const flatQuestions = pages
    .slice()
    .sort((a, b) => {
      const ao = a.orderIndex ?? a.order ?? 0;
      const bo = b.orderIndex ?? b.order ?? 0;
      return ao - bo;
    })
    .flatMap((p) => {
      const qs = (p.questions ?? []) as any[];
      return qs
        .slice()
        .sort((a, b) => {
          const ao = a.orderIndex ?? a.order ?? 0;
          const bo = b.orderIndex ?? b.order ?? 0;
          return ao - bo;
        })
        .map((q) => ({
          pageTitle: p.title,
          pageId: p.pageId,
          ...q,
        }));
    });

  const answeredCount = flatQuestions.filter((q) => {
    if (q.isApplicable === false) return false;
    if (isAddressQuestionType(q)) {
      const hasTextAddress =
        String(q.province ?? "").trim() !== "" &&
        String(q.ward ?? "").trim() !== "";
      if (hasTextAddress) return true;
      return (
        parseAddressCodesFromAnswer({
          value: q.value,
          province: q.province,
          ward: q.ward,
          provinceCode: q.provinceCode,
          wardCode: q.wardCode,
        }) != null
      );
    }
    return q.value !== null && q.value !== undefined && q.value !== "";
  }).length;
  const totalQuestions = flatQuestions.length;
  const notApplicableCount = flatQuestions.filter(
    (q) => q.isApplicable === false
  ).length;
  const unansweredCount = Math.max(
    0,
    totalQuestions - answeredCount - notApplicableCount
  );

  const sortedPages = pages.slice().sort((a, b) => {
    const ao = a.orderIndex ?? a.order ?? 0;
    const bo = b.orderIndex ?? b.order ?? 0;
    return ao - bo;
  });

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* BREADCRUMB-LIKE HEADER */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                Chi tiết phản hồi #{data.responseId}
              </h1>
              <div className="text-sm text-gray-500 mt-1">
                {data.submittedAt
                  ? new Date(data.submittedAt).toLocaleString("vi-VN")
                  : "-"}
              </div>
            </div>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
            <div className="text-3xl font-bold text-brand-600">
              {answeredCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">Câu trả lời đã ghi nhận</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
            <div className="text-3xl font-bold text-amber-600">
              {notApplicableCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">Không áp dụng</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
            <div className="text-3xl font-bold text-gray-500">
              {unansweredCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">Chưa trả lời</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
            <div className="text-3xl font-bold text-indigo-600">
              {totalQuestions}
            </div>
            <div className="text-xs text-gray-500 mt-1">Tổng câu hỏi</div>
          </div>
        </div>

        {/* ANSWERS BY PAGE */}
        {sortedPages.map((page: any, pageIndex: number) => {
          const pageQuestions = (page.questions ?? [])
            .slice()
            .sort((a: any, b: any) => {
              const ao = a.orderIndex ?? a.order ?? 0;
              const bo = b.orderIndex ?? b.order ?? 0;
              return ao - bo;
            });

          const isOnlyInputTypes =
            pageQuestions.length > 0 &&
            pageQuestions.every((q: any) =>
              ["SHORT_TEXT", "NUMBER", "DATE"].includes(q.type)
            ) &&
            !pageQuestions.some((q: any) => isAddressQuestionType(q));

          return (
            <div
              key={page.pageId ?? pageIndex}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
                  Page {pageIndex + 1}: {page.title || "Không có tiêu đề"}
                </h3>
              </div>

              {isOnlyInputTypes ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-gray-100 dark:border-gray-800">
                  {pageQuestions.map((q: any, idx: number) => (
                    <div
                      key={`${q.questionId ?? q.id ?? idx}`}
                      className={`p-4 border-b border-r border-gray-100 dark:border-gray-800 ${
                        q.isApplicable === false
                          ? "opacity-55 border-l-4 border-l-amber-300"
                          : ""
                      }`}
                    >
                      <div className="font-semibold text-gray-800 dark:text-white/90">
                        {idx + 1}. {q.question ?? `Trường ${idx + 1}`}
                      </div>
                      {q.description ? (
                        <div className="mt-1 text-xs text-gray-400 italic">
                          {q.description}
                        </div>
                      ) : null}
                      <div
                        className={`mt-2 break-words ${
                          q.isApplicable === false
                            ? "text-amber-600 dark:text-amber-300 italic font-medium"
                            : "font-semibold text-gray-800 dark:text-white/90"
                        }`}
                      >
                        <DetailQuestionValue q={q} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-[11px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-4 w-16">STT</th>
                        <th className="px-6 py-4">Câu hỏi</th>
                        <th className="px-6 py-4">Câu trả lời</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {pageQuestions.map((q: any, idx: number) => (
                        <tr
                          key={`${q.questionId ?? q.id ?? idx}`}
                          className={`hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors ${
                            q.isApplicable === false
                              ? "opacity-55"
                              : ""
                          }`}
                        >
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-50 text-brand-600 text-xs font-bold">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white/90">
                            <div>{q.question ?? "-"}</div>
                            {q.description ? (
                              <div className="mt-1 text-xs font-normal text-gray-400 italic">
                                {q.description}
                              </div>
                            ) : null}
                          </td>
                          <td
                            className={`px-6 py-4 ${
                              q.isApplicable === false
                                ? "text-amber-600 dark:text-amber-300 italic font-medium"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            <DetailQuestionValue q={q} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {sortedPages.length === 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
            <div className="text-center py-12 text-gray-400 italic">
              Không có dữ liệu câu trả lời
            </div>
          </div>
        )}
      </div>
    </div>
  );
}