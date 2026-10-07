"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiEye } from "react-icons/fi";
import ResponseAnswerCell from "@/components/result/ResponseAnswerCell";
import { API_RESPONSES } from "@/lib/api";

export default function ResponseListTab({ surveyId }: any) {
  const router = useRouter();

  const [data, setData] = useState<any[]>([]);

  const getToken = () =>
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${API_RESPONSES}/survey/${surveyId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const json = await res.json();
      setData(
        (Array.isArray(json) ? json : []).map((row: any) => ({
          ...row,
          responseId: row.responseId ?? row.id,
          answers: row.answers ?? [],
        }))
      );
    };

    load();
  }, [surveyId]);

  const preview =
    data.find((r) => r.answers && r.answers.length > 0)?.answers ||
    data[0]?.answers ||
    [];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
      
      {/* HEADER */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
          Danh sách phản hồi
        </h3>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          
          {/* HEAD */}
          <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-[11px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-6 py-4">STT</th>
              <th className="px-6 py-4">Thời gian</th>
              {preview.length === 0 && <th className="px-6 py-4">Nội dung xem trước</th>}

              {preview.map((q: any, i: number) => (
                <th key={i} className="px-6 py-4">
                  {q.question}
                </th>
              ))}

              <th className="px-6 py-4 text-center">Xem</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {data.map((r, i) => (
              <tr
                key={i}
                className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
              >
                {/* STT */}
                <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                  {i + 1}
                </td>

                {/* TIME */}
                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                  {r.submittedAt
                    ? new Date(r.submittedAt).toLocaleString("vi-VN")
                    : "-"}
                </td>
                {preview.length === 0 && <td className="max-w-md truncate px-6 py-4 text-gray-700 dark:text-gray-300" title={r.preview || ""}>{r.preview || "—"}</td>}

                {/* ANSWERS */}
                {preview.map((col: any, idx: number) => (
                  <td
                    key={idx}
                    className="px-6 py-4 text-gray-700 dark:text-gray-300"
                  >
                    <ResponseAnswerCell
                      column={col}
                      answer={r.answers?.[idx]}
                    />
                  </td>
                ))}

                {/* ACTION */}
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <button
                      onClick={() =>
                        router.push(
                          `/admin/survey/${r.responseId}/detail`
                        )
                      }
                      className="p-2 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-xl transition-all"
                    >
                      <FiEye size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* EMPTY */}
        {data.length === 0 && (
          <div className="text-center py-12 text-gray-400 italic">
            Không có dữ liệu phản hồi
          </div>
        )}
      </div>
    </div>
  );
}
