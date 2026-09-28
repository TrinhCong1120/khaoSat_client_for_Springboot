"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import SummaryTab from "@/components/result/SummaryTab";
import ResponseListTab from "@/components/result/ResponseListTab";
import FilterTab from "@/components/result/FilterTab";
import { API_REPORTS } from "@/lib/api";
import ApiNotFound from "@/components/common/ApiNotFound";

function normalizeReport(raw: any) {
  if (!raw || !Array.isArray(raw.questions)) return raw;
  return {
    ...raw,
    questions: raw.questions.map((question: any) => ({
      ...question,
      question: question.question ?? question.questionText,
      type: question.type ?? question.questionTypeCode,
      options: question.options ?? question.choiceStatistics?.options?.map((option: any) => ({
        optionId: option.optionId,
        text: option.text ?? option.optionText,
        count: option.count,
        percent: option.percent ?? option.percentage,
      })),
      stats: question.stats ?? question.numberStatistics,
      topTexts:
        question.topTexts ??
        question.textStatistics?.topAnswers?.map((answer: any) => ({
          text: answer.text ?? answer.answer,
          count: answer.count,
        })),
      topProvinces:
        question.topProvinces ?? question.addressStatistics?.topProvinces,
      topWards: question.topWards ?? question.addressStatistics?.topWards,
    })),
  };
}

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

export default function SurveyDashboard() {
  const { id } = useParams();
  const surveyId = String(id ?? "");
  const [tab, setTab] = useState("list");
  const [summary, setSummary] = useState<any>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // ================= LOAD SUMMARY (GET /api/Results/{id}/summary) =================
  const loadSummary = async () => {
    setSummaryError(null);
    try {
      const res = await fetch(`${API_REPORTS}/survey/${surveyId}/statistics`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        setSummaryError(`Tải thống kê thất bại (${res.status})`);
        return;
      }
      setSummary(normalizeReport(await res.json()));
    } catch {
      setSummaryError("Lỗi mạng khi tải thống kê");
    }
  };

  /** GET — xuất dữ liệu thô: survey_{id}_responses.xlsx */
  const exportExcelRaw = async () => {
    const res = await fetch(`${API_REPORTS}/survey/${surveyId}/responses.xlsx`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `survey_${surveyId}_responses.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  /** GET — báo cáo phân tích: survey_{id}_analysis.xlsx */
  const exportAnalysisExcel = async () => {
    const res = await fetch(
      `${API_REPORTS}/survey/${surveyId}/analysis.xlsx`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `survey_${surveyId}_analysis.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!surveyId) return;
    loadSummary();
  }, [surveyId]);

  if (notFound) {
    return <ApiNotFound title="Không tìm thấy khảo sát" description="Không tìm thấy dữ liệu thống kê cho khảo sát này." href="/admin/survey" linkLabel="Về danh sách khảo sát" />;
  }

  if (summaryError) {
    return (
      <div className="p-10 text-center text-red-500">
        {summaryError}
      </div>
    );
  }

  if (!summary)
    return (
      <div className="p-10 text-center text-gray-500">
        Đang tải dữ liệu...
      </div>
    );

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5">
          
          <div className="flex justify-between items-center">
            <div>
              {/* 🔥 TÊN KHẢO SÁT */}
              <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
                {summary.surveyName}
              </h1>

              <div className="mt-2 text-sm text-gray-500">
                👤 Tổng số phản hồi:{" "}
                <b className="text-gray-800 dark:text-white/90">
                  {summary.totalResponses}
                </b>
              </div>
            </div>

            {/* EXPORT */}
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={exportExcelRaw}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl shadow"
              >
                Xuất Excel (dữ liệu thô)
              </button>
              <button
                type="button"
                onClick={exportAnalysisExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow"
              >
                Xuất Excel (phân tích)
              </button>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "list", label: "Danh sách" },
            { key: "summary", label: "Báo cáo" },
            { key: "filter", label: "Lọc" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg font-medium ${
                tab === t.key
                  ? "bg-brand-500 text-white"
                  : "bg-white border text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="min-h-[400px]">
          {tab === "summary" && (
            <SummaryTab data={summary} surveyId={surveyId} />
          )}
          {tab === "list" && <ResponseListTab surveyId={surveyId} />}
          {tab === "filter" && <FilterTab surveyId={surveyId} />}
        </div>
      </div>
    </div>
  );
}
