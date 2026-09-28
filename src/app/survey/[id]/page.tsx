"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DatePicker from "@/components/form/date-picker";
import ProvinceWardSelect from "@/components/form/ProvinceWardSelect";
import type { ProvinceWardValue } from "@/components/form/ProvinceWardSelect";
import {
  buildPublicSurveySubmitAnswers,
  getQuestionTypeCode,
} from "@/types/survey";
import { isAddressQuestionType } from "@/lib/vietnam-address-api";
import { API_PUBLIC_SURVEYS } from "@/lib/api";
import { persistFailedSurveyRecord } from "@/lib/failedSurveyStorage";

export default function PublicSurvey() {
  const { id } = useParams();
  const [survey, setSurvey] = useState<any>(null);
  const [answers, setAnswers] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "not-found">("loading");

  const parseSourceValueTokens = (sourceValue: string) =>
    String(sourceValue || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const hasNonBlank = (v: unknown) => String(v ?? "").trim().length > 0;

  useEffect(() => {
    if (!id) return;

    setLoadState("loading");
    fetch(`${API_PUBLIC_SURVEYS}/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) return null;
          throw new Error(`Survey request failed: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const surveyData = data?.data ?? data;
        if (!surveyData || typeof surveyData !== "object" || !Array.isArray(surveyData.pages)) {
          setSurvey({ pages: [], conditions: [] });
          setLoadState("not-found");
          return;
        }

        surveyData.pages = surveyData.pages || [];
        surveyData.conditions = surveyData.conditions || [];
        setSurvey(surveyData);
        setLoadState("ready");
      })
      .catch(() => {
        setSurvey({ pages: [], conditions: [] });
        setLoadState("not-found");
      });
  }, [id]);

  useEffect(() => {
    if (!survey?.pages) return;
    setAnswers((prev: any) => {
      let changed = false;
      const next = { ...prev };
      for (const page of survey.pages) {
        for (const q of page.questions || []) {
          if (!isAddressQuestionType(q)) continue;
          if (next[q.id] != null) continue;
          next[q.id] = {
            questionId: q.id,
            provinceCode: 48,
            wardCode: null,
            province: "",
            ward: "",
          };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [survey]);

  const parseConditionOptionIds = (sourceValue: string) =>
    String(sourceValue || "")
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((x) => Number.isFinite(x) && x > 0);

  const isEnabled = (questionId: number) => {
    if (!survey.conditions?.length) return true;

    const related = survey.conditions.filter(
      (c: any) => c.targetQuestionId === questionId
    );

    if (related.length === 0) return true;

    let enabled = true;

    for (const c of related) {
      const answer = answers[c.sourceQuestionId];
      if (!answer) continue;

      let matched = false;
      const sourceQuestion = survey.pages
        .flatMap((p: any) => p.questions)
        .find((q: any) => q.id === c.sourceQuestionId);
      const sourceTypeCode = getQuestionTypeCode(sourceQuestion || {});

      if (sourceTypeCode === "ADDRESS" || isAddressQuestionType(sourceQuestion || {})) {
        const tokens = parseSourceValueTokens(c.sourceValue);
        if (tokens.length > 0) {
          const province = String(answer.province ?? "").trim();
          const ward = String(answer.ward ?? "").trim();
          matched = tokens.some((t) => t === province || t === ward);
        }
      } else if (answer.optionIds?.length) {
        const conditionOptionIds = parseConditionOptionIds(c.sourceValue);

        if (conditionOptionIds.length > 0) {
          matched = conditionOptionIds.some((oid) =>
            answer.optionIds.includes(oid)
          );
        } else {
          const selectedOptions = sourceQuestion?.options?.filter((o: any) =>
            answer.optionIds.includes(o.id)
          );

          matched = selectedOptions?.some(
            (o: any) => o.optionText === c.sourceValue
          );
        }
      }

      if (answer.answerText) {
        matched = answer.answerText === c.sourceValue;
      }

      const action = String(c.action || "").toUpperCase();
      if (action === "SHOW" && !matched) {
        enabled = false;
      }
      if (action === "HIDE" && matched) {
        enabled = false;
      }
    }

    return enabled;
  };

  const updateAnswer = (qid: number, value: any, type: string) => {
    setAnswers((prev: any) => ({
      ...prev,
      [qid]: {
        ...prev[qid],
        questionId: qid,
        [type]: value,
      },
    }));

    setErrors((prev: any) => ({
      ...prev,
      [qid]: null,
    }));
  };

  const updateAddressAnswer = (qid: number, next: ProvinceWardValue) => {
    setAnswers((prev: any) => ({
      ...prev,
      [qid]: {
        ...prev[qid],
        questionId: qid,
        provinceCode: next.provinceCode,
        wardCode: next.wardCode,
        province: next.province,
        ward: next.ward,
      },
    }));
    setErrors((prev: any) => ({
      ...prev,
      [qid]: null,
    }));
  };

  const handleOption = (qid: number, optionId: number, multiple: boolean) => {
    setAnswers((prev: any) => {
      const current = prev[qid]?.optionIds || [];

      let updated = multiple
        ? current.includes(optionId)
          ? current.filter((x: number) => x !== optionId)
          : [...current, optionId]
        : [optionId];

      return {
        ...prev,
        [qid]: {
          ...prev[qid],
          questionId: qid,
          optionIds: updated,
        },
      };
    });

    setErrors((prev: any) => ({
      ...prev,
      [qid]: null,
    }));
  };

  const validate = (pageIndex?: number) => {
    const newErrors: any = {};

    const pagesToValidate =
      pageIndex == null ? survey.pages : [survey.pages[pageIndex]];

    pagesToValidate.forEach((p: any) => {
      if (!p) return;
      p.questions.forEach((q: any) => {
        if (!isEnabled(q.id)) return;
        if (!q.isRequired) return;

        const answer = answers[q.id];
        const typeCode = getQuestionTypeCode(q);

        let isEmpty = false;

        if (typeCode === "ADDRESS" || isAddressQuestionType(q)) {
          isEmpty =
            answer == null ||
            !hasNonBlank(answer.province) ||
            !hasNonBlank(answer.ward) ||
            !Number.isFinite(Number(answer.provinceCode)) ||
            Number(answer.provinceCode) <= 0 ||
            !Number.isFinite(Number(answer.wardCode)) ||
            Number(answer.wardCode) <= 0;
        } else if (q.questionTypeId === 1 || q.questionTypeId === 2) {
          isEmpty = !answer?.optionIds?.length;
        } else if (q.questionTypeId === 3) {
          isEmpty = !hasNonBlank(answer?.answerText);
        } else if (q.questionTypeId === 4) {
          isEmpty =
            answer?.answerNumber == null ||
            answer?.answerNumber === "" ||
            !Number.isFinite(Number(answer.answerNumber));
        } else if (q.questionTypeId === 5) {
          isEmpty = !hasNonBlank(answer?.answerDate);
        } else {
          isEmpty = true;
        }

        if (isEmpty) {
          newErrors[q.id] = "Câu hỏi này là bắt buộc";
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goToPage = (nextPage: number) => {
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextPage = () => {
    if (validate(currentPage)) goToPage(currentPage + 1);
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const enabledAnswers = Object.fromEntries(
      Object.entries(answers).filter(([questionId]) =>
        isEnabled(Number(questionId))
      )
    );
    const payload = buildPublicSurveySubmitAnswers(survey, enabledAnswers);

    try {
      const res = await fetch(`${API_PUBLIC_SURVEYS}/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });

      if (res.ok) {
        setSubmitted(true);
        return;
      }

      const rawText = await res.text();
      let body: any = null;
      try {
        body = rawText ? JSON.parse(rawText) : null;
      } catch {
        body = null;
      }

      try {
        await persistFailedSurveyRecord({
          surveyId: Number(id),
          surveyTitle: survey?.title || null,
          statusCode: res.status,
          statusText: res.statusText,
          message: body?.message || body?.error || rawText || "Submit lỗi",
          url: `${API_PUBLIC_SURVEYS}/${id}/submit`,
          payload: { answers: payload },
        });
      } catch {
        // fallback silent; UI still shows the server error
      }

      if (body?.questionId != null) {
        setErrors((prev: any) => ({
          ...prev,
          [body.questionId]:
            body.message || "Câu hỏi này là bắt buộc hoặc không hợp lệ",
        }));
      } else if (body?.message) {
        alert(body.message);
      } else {
        alert(`Submit lỗi (${res.status})`);
      }
    } catch (error) {
      try {
        await persistFailedSurveyRecord({
          surveyId: Number(id),
          surveyTitle: survey?.title || null,
          statusCode: 0,
          statusText: "NetworkError",
          message:
            error instanceof Error ? error.message : "Network request failed",
          url: `${API_PUBLIC_SURVEYS}/${id}/submit`,
          payload: { answers: payload },
        });
      } catch {
        // noop
      }
      alert("Không gửi được khảo sát. Dữ liệu đã được lưu vào public/failed-surveys để xử lý sau.");
    }
  };

  if (!survey) return <div className="p-10">Đang tải...</div>;

  if (loadState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 py-10">
        <div className="text-sm text-gray-500">Đang tải khảo sát...</div>
      </main>
    );
  }

  if (loadState === "not-found" || !survey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 py-10 text-[#1f2937]">
        <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-indigo-50 text-2xl font-bold text-indigo-600">404</div>
          <h1 className="text-2xl font-bold text-gray-900">Khảo sát không tồn tại</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">Khảo sát bạn đang truy cập không tồn tại, đã bị xóa hoặc đường dẫn không chính xác.</p>
          <Link href="/survey" className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">Về danh sách khảo sát</Link>
        </section>
      </main>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] px-4 py-10 text-[#1f2937]">
        <div className="mx-auto max-w-[760px] rounded-xl bg-white px-8 py-12 text-center shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="mx-auto mb-5 flex h-[65px] w-[65px] items-center justify-center rounded-full bg-green-100 text-[32px] font-bold text-green-600">
            ✓
          </div>
          <h2 className="mb-2 text-2xl font-bold">Cảm ơn bạn!</h2>
          <p className="text-gray-500">Câu trả lời của bạn đã được ghi nhận.</p>
        </div>
      </div>
    );
  }

  const pages = survey.pages || [];
  const pageCount = Math.max(pages.length, 1);
  const page = pages[currentPage];
  const pageQuestions = page?.questions || [];
  const questionOffset = pages
    .slice(0, currentPage)
    .reduce((total: number, item: any) => total + (item.questions?.length || 0), 0);

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-5 text-[#1f2937] sm:py-10">
      <div className="mx-auto w-full max-w-[760px]">
        <section className="mb-[18px] rounded-xl border-t-[5px] border-indigo-600 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] sm:p-7">
          <h1 className="mb-2 text-[22px] font-bold sm:text-[26px]">{survey.title || "Khảo sát mức độ hài lòng"}</h1>
          <p className="leading-relaxed text-gray-500">
            {survey.description || "Cảm ơn bạn đã dành thời gian tham gia khảo sát. Ý kiến của bạn sẽ giúp chúng tôi cải thiện chất lượng dịch vụ."}
          </p>
          <div className="mb-2 mt-[22px] flex justify-between text-sm text-gray-500">
            <span>Trang {Math.min(currentPage + 1, pageCount)} / {pageCount}</span>
            <span>{Math.round(((currentPage + 1) / pageCount) * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-indigo-600 transition-[width] duration-300"
              style={{ width: `${((currentPage + 1) / pageCount) * 100}%` }}
            />
          </div>
        </section>

        <section>
          <div className="mx-1 mb-3 mt-[26px]">
            <h2 className="text-[19px] font-bold">{page?.title || `Thông tin khảo sát`}</h2>
          </div>

          {pageQuestions.map((q: any, questionIndex: number) => {
            const enabled = isEnabled(q.id);
            const typeCode = getQuestionTypeCode(q);
            const isAddress = typeCode === "ADDRESS" || isAddressQuestionType(q);

            return (
              <article
                key={q.id}
                className={`mb-3 rounded-xl border bg-white p-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-colors sm:p-[22px] ${
                  enabled ? "border-transparent" : "border-gray-200 bg-[#fafafa]"
                }`}
              >
                {!enabled && (
                  <div className="mb-4 flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-gray-100 px-4 py-3 text-gray-500">
                    <div className="flex h-9 w-9 min-w-9 items-center justify-center rounded-full bg-gray-200 text-[17px]">🔒</div>
                    <div>
                      <div className="mb-0.5 text-sm font-semibold text-gray-600">Câu hỏi được bỏ qua</div>
                      <div className="text-[13px] leading-snug text-gray-400">Câu hỏi này không áp dụng với lựa chọn hiện tại.</div>
                    </div>
                  </div>
                )}

                <div className={`text-base font-semibold leading-relaxed ${enabled ? "" : "text-gray-500"}`}>
                  {questionOffset + questionIndex + 1}. {q.questionText}
                  {q.isRequired && <span className="ml-1 text-red-500">*</span>}
                </div>
                {q.description && (
                  <div className={`mb-4 mt-1 text-sm leading-relaxed ${enabled ? "text-gray-500" : "text-gray-400"}`}>
                    {q.description}
                  </div>
                )}

                <div className={!enabled ? "opacity-60" : ""}>
                  {isAddress ? (
                    <ProvinceWardSelect
                      value={{
                        provinceCode: answers[q.id]?.provinceCode ?? 48,
                        wardCode: answers[q.id]?.wardCode != null && Number.isFinite(answers[q.id].wardCode) ? answers[q.id].wardCode : null,
                        province: String(answers[q.id]?.province ?? ""),
                        ward: String(answers[q.id]?.ward ?? ""),
                      }}
                      onChange={(next) => updateAddressAnswer(q.id, next)}
                      disabled={!enabled}
                    />
                  ) : (
                    <>
                      {(q.questionTypeId === 1 || q.questionTypeId === 2) && q.options?.map((o: any) => (
                        <label key={o.id} className="flex cursor-pointer items-center gap-2.5 py-2">
                          <input
                            type={q.questionTypeId === 1 ? "radio" : "checkbox"}
                            name={`q-${q.id}`}
                            className="h-[18px] w-[18px] accent-indigo-600"
                            disabled={!enabled}
                            checked={answers[q.id]?.optionIds?.includes(o.id) || false}
                            onChange={() => handleOption(q.id, o.id, q.questionTypeId === 2)}
                          />
                          <span>{o.optionText}</span>
                        </label>
                      ))}

                      {q.questionTypeId === 3 && (
                        <input
                          type="text"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[15px] outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 disabled:cursor-not-allowed disabled:bg-gray-100"
                          placeholder="Nhập câu trả lời..."
                          disabled={!enabled}
                          value={answers[q.id]?.answerText || ""}
                          onChange={(e) => updateAnswer(q.id, e.target.value, "answerText")}
                        />
                      )}

                      {q.questionTypeId === 4 && (
                        <input
                          type="number"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[15px] outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 disabled:cursor-not-allowed disabled:bg-gray-100"
                          placeholder="Nhập điểm..."
                          disabled={!enabled}
                          value={answers[q.id]?.answerNumber ?? ""}
                          onChange={(e) => updateAnswer(q.id, e.target.value === "" ? "" : Number(e.target.value), "answerNumber")}
                        />
                      )}

                      {q.questionTypeId === 5 && (
                        <DatePicker
                          id={`public-answer-date-${q.id}`}
                          placeholder="dd/mm/yyyy"
                          disabled={!enabled}
                          defaultDate={answers[q.id]?.answerDate || undefined}
                          onChange={(_, dateStr) => updateAnswer(q.id, dateStr as string, "answerDate")}
                        />
                      )}
                    </>
                  )}
                </div>

                {errors[q.id] && <p className="mt-2 text-xs font-semibold text-red-500">{errors[q.id]}</p>}
              </article>
            );
          })}

          <div className="mb-[50px] mt-6 flex items-center justify-between gap-4">
            <div>
              {currentPage > 0 && (
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[15px] text-gray-700 transition hover:bg-gray-50"
                >
                  ← Quay lại
                </button>
              )}
            </div>
            {currentPage < pageCount - 1 ? (
              <button
                type="button"
                onClick={handleNextPage}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-[15px] text-white transition hover:bg-indigo-700"
              >
                Tiếp tục →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-[15px] text-white transition hover:bg-indigo-700"
              >
                Gửi khảo sát
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
