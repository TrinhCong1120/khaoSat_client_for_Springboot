"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiEye } from "react-icons/fi";
import DatePicker from "@/components/form/date-picker";
import ResponseAnswerCell from "@/components/result/ResponseAnswerCell";
import SearchableCodeSelect from "@/components/form/SearchableCodeSelect";
import { isAddressQuestionType } from "@/lib/vietnam-address-api";

const PROVINCES_API = "https://provinces.open-api.vn/api/v2";

function isChoiceQuestionTypeId(id: unknown): boolean {
  return id === 1 || id === 2;
}

function questionMetaForAddress(q: any) {
  return {
    questionTypeId: q?.questionTypeId,
    questionTypeCode: q?.questionTypeCode ?? q?.questionType?.code,
    type: q?.type ?? q?.questionType?.code,
  };
}

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");


function dayStartIso(d: string): string | undefined {
  if (!d) return undefined;
  return new Date(`${d}T00:00:00`).toISOString();
}

function dayEndIso(d: string): string | undefined {
  if (!d) return undefined;
  return new Date(`${d}T23:59:59.999`).toISOString();
}

export default function FilterTab({ surveyId }: any) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();

  const [survey, setSurvey] = useState<any>(null);
  const [result, setResult] = useState<any[]>([]);

  const [form, setForm] = useState<any>({
    questionId: "",
    optionId: "",
    text: "",
    number: "",
    date: "",
    fromDate: "",
    toDate: "",
    addressProvince: "",
    addressWard: "",
  });

  const [provinceOptions, setProvinceOptions] = useState<
    { code: number; name: string }[]
  >([]);
  const [wardOptions, setWardOptions] = useState<
    { code: number; name: string }[]
  >([]);
  const [wardsLoading, setWardsLoading] = useState(false);

  // ======================
  // LOAD SURVEY
  // ======================
  useEffect(() => {
    const loadSurvey = async () => {
      const res = await fetch(`${API_URL}/survey/${surveyId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      setSurvey(await res.json());
    };

    loadSurvey();
  }, [surveyId]);

  // ======================
  // GET QUESTIONS
  // ======================
  const allQuestions =
    survey?.pages?.flatMap((p: any) => p.questions || []) || [];

  const selectedQuestion = allQuestions.find(
    (q: any) => q.id === Number(form.questionId)
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`${PROVINCES_API}/`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { name: string; code: number }[]) => {
        if (cancelled) return;
        const list = (Array.isArray(data) ? data : []).map((p) => ({
          name: p.name,
          code: p.code,
        }));
        list.sort((a, b) => a.name.localeCompare(b.name, "vi"));
        setProvinceOptions(list);
      })
      .catch(() => {
        if (!cancelled) setProvinceOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const pc = form.addressProvince;
    if (!pc || !Number.isFinite(Number(pc))) {
      setWardOptions([]);
      return;
    }
    let cancelled = false;
    setWardsLoading(true);
    fetch(`${PROVINCES_API}/p/${Number(pc)}?depth=2`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: {
        wards?: { name: string; code: number }[];
        districts?: { wards?: { name: string; code: number }[] }[];
      }) => {
        if (cancelled) return;
        const flat: { name: string; code: number }[] = [];
        if (Array.isArray(data.wards) && data.wards.length) {
          flat.push(...data.wards);
        } else if (Array.isArray(data.districts)) {
          for (const d of data.districts) {
            if (d.wards?.length) flat.push(...d.wards);
          }
        }
        flat.sort((a, b) => a.name.localeCompare(b.name, "vi"));
        setWardOptions(flat);
      })
      .catch(() => {
        if (!cancelled) setWardOptions([]);
      })
      .finally(() => {
        if (!cancelled) setWardsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.addressProvince]);

  const buildFilterBody = (): Record<string, unknown> => {
    const body: Record<string, unknown> = {};
    const fromIso = dayStartIso(form.fromDate);
    const toIso = dayEndIso(form.toDate);
    if (fromIso) body.fromDate = fromIso;
    if (toIso) body.toDate = toIso;
    if (form.questionId) {
      body.questionId = Number(form.questionId);
      if (form.optionId) body.optionId = Number(form.optionId);
      if (form.text) body.text = form.text;
      if (form.number !== "" && form.number != null)
        body.number = Number(form.number);
      if (form.date) {
        body.date = new Date(`${form.date}T00:00:00`).toISOString();
      }
      const sq = allQuestions.find(
        (q: any) => q.id === Number(form.questionId)
      );
      if (sq && isAddressQuestionType(questionMetaForAddress(sq))) {
        if (form.addressProvince !== "" && form.addressProvince != null) {
          const n = Number(form.addressProvince);
          if (Number.isFinite(n)) {
            const pText = provinceOptions.find((p) => p.code === n)?.name;
            if (pText) body.province = pText;
          }
        }
        if (form.addressWard !== "" && form.addressWard != null) {
          const w = Number(form.addressWard);
          if (Number.isFinite(w)) {
            const wText = wardOptions.find((x) => x.code === w)?.name;
            if (wText) body.ward = wText;
          }
        }
      }
    }
    return body;
  };

  const handleFilter = async () => {
    const body = buildFilterBody();
    const res = await fetch(`${API_URL}/survey/Results/${surveyId}/filter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(body),
    });

    setResult(await res.json());
  };

  /** POST — survey_{id}_analysis_filtered.xlsx */
  const exportAnalysisFiltered = async () => {
    const body = buildFilterBody();
    const res = await fetch(
      `${API_URL}/survey/Results/${surveyId}/export-analysis-excel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `survey_${surveyId}_analysis_filtered.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ======================
  // UI
  // ======================
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-6 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        Lọc phản hồi
      </h2>

      {/* ================= TIME ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DatePicker
          id={`filter-from-date-${surveyId}`}
          placeholder="dd/mm/yyyy"
          defaultDate={form.fromDate || undefined}
          onChange={(_, dateStr) =>
            setForm((prev: typeof form) => ({
              ...prev,
              fromDate: dateStr as string,
            }))
          }
        />

        <DatePicker
          id={`filter-to-date-${surveyId}`}
          placeholder="dd/mm/yyyy"
          defaultDate={form.toDate || undefined}
          onChange={(_, dateStr) =>
            setForm((prev: typeof form) => ({
              ...prev,
              toDate: dateStr as string,
            }))
          }
        />
      </div>

      {/* ================= QUESTION ================= */}
      <select
        className="w-full border rounded-xl px-3 py-2"
        value={form.questionId}
        onChange={(e) =>
          setForm({
            ...form,
            questionId: e.target.value,
            optionId: "",
            text: "",
            number: "",
            date: "",
            addressProvince: "",
            addressWard: "",
          })
        }
      >
        <option value="">-- Tất cả câu hỏi --</option>
        {allQuestions.map((q: any) => (
          <option key={q.id} value={q.id}>
            {q.questionText}
          </option>
        ))}
      </select>

      {/* ================= INPUT ================= */}
      {selectedQuestion && (
        <div className="space-y-2">
          {isChoiceQuestionTypeId(selectedQuestion.questionTypeId) &&
            selectedQuestion.options?.length > 0 && (
            <select
              className="w-full border rounded-xl px-3 py-2"
              value={form.optionId}
              onChange={(e) =>
                setForm({ ...form, optionId: e.target.value })
              }
            >
              <option value="">-- Chọn đáp án --</option>
              {selectedQuestion.options.map((o: any) => (
                <option key={o.id} value={o.id}>
                  {o.optionText}
                </option>
              ))}
            </select>
          )}

          {isAddressQuestionType(questionMetaForAddress(selectedQuestion)) && (
            <div className="space-y-2 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
              <p className="text-xs text-gray-500">
                Lọc theo địa chỉ (để trống = không lọc theo tỉnh/xã)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <SearchableCodeSelect
                  className="[&_input]:rounded-xl"
                  aria-label="Tỉnh / Thành phố (lọc)"
                  placeholder="Gõ tìm tỉnh/thành…"
                  options={provinceOptions.map((p) => ({
                    code: p.code,
                    name: p.name,
                  }))}
                  value={
                    form.addressProvince === "" ||
                    !Number.isFinite(Number(form.addressProvince))
                      ? null
                      : Number(form.addressProvince)
                  }
                  onChange={(c) =>
                    setForm({
                      ...form,
                      addressProvince: c == null ? "" : String(c),
                      addressWard: "",
                    })
                  }
                  allowNull
                  nullLabel="— Tất cả tỉnh/thành —"
                />
                <SearchableCodeSelect
                  className="[&_input]:rounded-xl"
                  aria-label="Xã / Phường (lọc)"
                  placeholder={
                    !form.addressProvince
                      ? "Chọn tỉnh trước"
                      : wardsLoading
                        ? "Đang tải…"
                        : "Gõ tìm xã/phường…"
                  }
                  options={wardOptions.map((w) => ({
                    code: w.code,
                    name: w.name,
                  }))}
                  value={
                    form.addressWard === "" ||
                    !Number.isFinite(Number(form.addressWard))
                      ? null
                      : Number(form.addressWard)
                  }
                  onChange={(c) =>
                    setForm({
                      ...form,
                      addressWard: c == null ? "" : String(c),
                    })
                  }
                  disabled={
                    !form.addressProvince ||
                    wardsLoading ||
                    wardOptions.length === 0
                  }
                  allowNull
                  nullLabel="— Tất cả xã/phường —"
                />
              </div>
            </div>
          )}

          {selectedQuestion.questionTypeId === 3 && (
            <input
              placeholder="Nhập text..."
              className="w-full border rounded-xl px-3 py-2"
              value={form.text}
              onChange={(e) =>
                setForm({ ...form, text: e.target.value })
              }
            />
          )}

          {selectedQuestion.questionTypeId === 5 && (
            <input
              type="number"
              className="w-full border rounded-xl px-3 py-2"
              value={form.number}
              onChange={(e) =>
                setForm({ ...form, number: e.target.value })
              }
            />
          )}

          {selectedQuestion.questionTypeId === 6 && (
            <DatePicker
              id={`filter-question-date-${surveyId}`}
              placeholder="dd/mm/yyyy"
              defaultDate={form.date || undefined}
              onChange={(_, dateStr) =>
                setForm((prev: typeof form) => ({
                  ...prev,
                  date: dateStr as string,
                }))
              }
            />
          )}
        </div>
      )}

      {/* BUTTON */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          onClick={handleFilter}
          className="px-6 py-3 bg-brand-500 text-white rounded-xl"
        >
          Lọc dữ liệu
        </button>
        <button
          type="button"
          onClick={exportAnalysisFiltered}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm"
        >
          Xuất Excel phân tích (theo bộ lọc)
        </button>
      </div>

      {/* ================= RESULT (TABLE) ================= */}
      {(() => {
        const preview =
          result.find((r) => r.answers && r.answers.length > 0)?.answers ||
          result[0]?.answers ||
          [];

        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              {/* HEAD */}
              <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-[11px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Thời gian</th>

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
                {result.map((r, i) => (
                  <tr
                    key={i}
                    className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* STT */}
                    <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                      #{i + 1}
                    </td>

                    {/* TIME */}
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {r.submittedAt
                        ? new Date(r.submittedAt).toLocaleString("vi-VN")
                        : "-"}
                    </td>

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

            {result.length === 0 && (
              <div className="text-center py-12 text-gray-400 italic">
                Chưa có dữ liệu phản hồi
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}