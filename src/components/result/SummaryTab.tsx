"use client";

import BarChartOne from "@/components/charts/bar/BarChartOne";

type QuestionItem = {
  questionId?: number;
  QuestionId?: number;
  question?: string;
  type?: string;
  totalAnswered?: number;
  options?: {
    optionId: number;
    text: string;
    count: number;
    percent: number;
  }[];
  stats?: {
    average?: number;
    min?: number;
    max?: number;
    median?: number;
    minDate?: string;
    maxDate?: string;
  };
  topTexts?: { text: string; count: number }[];
  topProvinces?: { text: string; count: number; percent?: number }[];
  topWards?: { text: string; count: number; percent?: number }[];
  TopProvinces?: { text: string; count: number; percent?: number }[];
  TopWards?: { text: string; count: number; percent?: number }[];
};

function isChoiceType(t?: string) {
  return t === "SINGLE_CHOICE" || t === "MULTIPLE_CHOICE";
}

function summaryTypeCode(t?: string) {
  return String(t ?? "").trim().toUpperCase();
}

function asAddressTopRows(q: QuestionItem, key: "province" | "ward") {
  const rows =
    key === "province"
      ? (q.topProvinces ?? q.TopProvinces ?? [])
      : (q.topWards ?? q.TopWards ?? []);
  return [...rows]
    .filter((x) => String(x?.text ?? "").trim() !== "")
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, SUMMARY_TOP_TEXTS_DISPLAY_LIMIT);
}

/** API summary đôi khi trả QuestionId (PascalCase) thay vì questionId */
function getSummaryQuestionId(q: QuestionItem & Record<string, unknown>): number {
  const raw = q.questionId ?? q.QuestionId;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

/** Top text trong báo cáo: chỉ hiển thị N dòng có số lần cao nhất (5–7), không liệt kê hết */
const SUMMARY_TOP_TEXTS_DISPLAY_LIMIT = 7;

export default function SummaryTab({
  data,
}: {
  data: any;
  surveyId?: string;
}) {
  const safeData = data ?? {};
  const questions: QuestionItem[] = safeData.questions ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-blue-500 text-white rounded-xl">
          Tổng phản hồi: {safeData.totalResponses ?? 0}
        </div>
        <div className="p-5 bg-green-500 text-white rounded-xl">
          Tổng câu hỏi: {questions.length}
        </div>
        <div className="p-5 bg-purple-500 text-white rounded-xl">
          Có biểu đồ lựa chọn:{" "}
          {
            questions.filter(
              (q) => isChoiceType(summaryTypeCode(q.type)) && q.options?.length
            ).length
          }
        </div>
      </div>

      {questions.map((q, qi) => {
        const sqId = getSummaryQuestionId(q);
        return (
          <div
            key={Number.isFinite(sqId) ? sqId : `row-${qi}`}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-xl shadow"
          >
            <div className="flex flex-wrap justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-800 dark:text-white">
                {q.question ??
                  `Câu #${Number.isFinite(sqId) ? sqId : qi + 1}`}
              </h3>
              <span className="text-xs text-gray-500 uppercase">
                {summaryTypeCode(q.type) || "?"} · đã trả lời:{" "}
                {q.totalAnswered ?? 0}
              </span>
            </div>

            {isChoiceType(summaryTypeCode(q.type)) &&
              q.options &&
              q.options.length > 0 && (
                <BarChartOne
                  title={q.question ?? ""}
                  categories={q.options.map((o) => o.text)}
                  data={q.options.map((o) => o.count)}
                />
              )}

            {summaryTypeCode(q.type) === "NUMBER" && q.stats && (
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-2">
                {q.stats.average != null && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <dt className="text-gray-500">Trung bình</dt>
                    <dd className="font-semibold text-gray-900 dark:text-white">
                      {Number(q.stats.average).toLocaleString("vi-VN")}
                    </dd>
                  </div>
                )}
                {q.stats.min != null && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <dt className="text-gray-500">Min</dt>
                    <dd className="font-semibold">{q.stats.min}</dd>
                  </div>
                )}
                {q.stats.max != null && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <dt className="text-gray-500">Max</dt>
                    <dd className="font-semibold">{q.stats.max}</dd>
                  </div>
                )}
                {q.stats.median != null && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <dt className="text-gray-500">Trung vị</dt>
                    <dd className="font-semibold">{q.stats.median}</dd>
                  </div>
                )}
              </dl>
            )}

            {summaryTypeCode(q.type) === "DATE" &&
              q.stats &&
              (q.stats.minDate || q.stats.maxDate) && (
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1 mt-2">
                  {q.stats.minDate && (
                    <div>
                      <span className="text-gray-500">Sớm nhất: </span>
                      {new Date(q.stats.minDate).toLocaleString("vi-VN")}
                    </div>
                  )}
                  {q.stats.maxDate && (
                    <div>
                      <span className="text-gray-500">Muộn nhất: </span>
                      {new Date(q.stats.maxDate).toLocaleString("vi-VN")}
                    </div>
                  )}
                </div>
              )}

            {q.topTexts && q.topTexts.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500">
                      <th className="py-2 pr-4">Nội dung</th>
                      <th className="py-2 w-24">Số lần</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...q.topTexts]
                      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
                      .slice(0, SUMMARY_TOP_TEXTS_DISPLAY_LIMIT)
                      .map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-gray-100 dark:border-gray-800"
                        >
                          <td className="py-2 pr-4 text-gray-800 dark:text-gray-200">
                            {row.text}
                          </td>
                          <td className="py-2">{row.count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {summaryTypeCode(q.type) === "ADDRESS" && (
              <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="overflow-x-auto">
                  <p className="text-xs text-gray-500 mb-1 uppercase">Top tỉnh/thành</p>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500">
                        <th className="py-2 pr-4">Tên</th>
                        <th className="py-2 w-20">Số lần</th>
                        <th className="py-2 w-20">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asAddressTopRows(q, "province").map((row, i) => (
                        <tr
                          key={`tp-${i}`}
                          className="border-b border-gray-100 dark:border-gray-800"
                        >
                          <td className="py-2 pr-4 text-gray-800 dark:text-gray-200">
                            {row.text}
                          </td>
                          <td className="py-2">{row.count ?? 0}</td>
                          <td className="py-2">
                            {row.percent != null ? `${Number(row.percent).toFixed(2)}%` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="overflow-x-auto">
                  <p className="text-xs text-gray-500 mb-1 uppercase">Top xã/phường</p>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500">
                        <th className="py-2 pr-4">Tên</th>
                        <th className="py-2 w-20">Số lần</th>
                        <th className="py-2 w-20">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asAddressTopRows(q, "ward").map((row, i) => (
                        <tr
                          key={`tw-${i}`}
                          className="border-b border-gray-100 dark:border-gray-800"
                        >
                          <td className="py-2 pr-4 text-gray-800 dark:text-gray-200">
                            {row.text}
                          </td>
                          <td className="py-2">{row.count ?? 0}</td>
                          <td className="py-2">
                            {row.percent != null ? `${Number(row.percent).toFixed(2)}%` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!isChoiceType(summaryTypeCode(q.type)) &&
              summaryTypeCode(q.type) !== "NUMBER" &&
              summaryTypeCode(q.type) !== "DATE" &&
              (!q.topTexts || q.topTexts.length === 0) && (
                <p className="text-sm text-gray-400 italic mt-2">
                  Không có thống kê chi tiết cho loại câu này.
                </p>
              )}
          </div>
        );
      })}

      {questions.length === 0 && (
        <p className="text-center text-gray-400 py-8">
          Chưa có câu hỏi trong báo cáo.
        </p>
      )}
    </div>
  );
}
