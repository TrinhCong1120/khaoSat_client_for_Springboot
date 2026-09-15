"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DatePicker from "@/components/form/date-picker";
import ProvinceWardSelect from "@/components/form/ProvinceWardSelect";
import type { ProvinceWardValue } from "@/components/form/ProvinceWardSelect";
import {
  buildPublicSurveySubmitAnswers,
  getQuestionTypeCode,
} from "@/types/survey";
import { isAddressQuestionType } from "@/lib/vietnam-address-api";

export default function PublicSurvey() {
  const { id } = useParams();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [survey, setSurvey] = useState<any>(null);
  const [answers, setAnswers] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const [submitted, setSubmitted] = useState(false);

  const parseSourceValueTokens = (sourceValue: string) =>
    String(sourceValue || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const hasNonBlank = (v: unknown) => String(v ?? "").trim().length > 0;

  useEffect(() => {
    if (!id) return;

    fetch(`${API_URL}/survey/PublicSurvey/${id}`)
      .then((res) => res.json())
      .then((data) => {
        data.pages = data.pages || [];
        data.conditions = data.conditions || [];
        setSurvey(data);
      });
  }, [id]);

  useEffect(() => {
    if (!survey?.pages) return;
    setAnswers((prev: any) => {
      let changed = false;
      const next = { ...prev };
      for (const page of survey.pages) {
        for (const q of page.questions || []) {
          if (getQuestionTypeCode(q) !== "ADDRESS") continue;
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

  const validate = () => {
    const newErrors: any = {};

    survey.pages.forEach((p: any) => {
      p.questions.forEach((q: any) => {
        if (!isEnabled(q.id)) return;
        if (!q.isRequired) return;

        const answer = answers[q.id];
        const typeCode = getQuestionTypeCode(q);

        let isEmpty = false;

        if (typeCode === "ADDRESS") {
          isEmpty =
            answer == null ||
            !hasNonBlank(answer.province) ||
            !hasNonBlank(answer.ward);
        } else {
          isEmpty =
            (q.questionTypeId <= 2 && !answer?.optionIds?.length) ||
            ((q.questionTypeId === 3 || q.questionTypeId === 4) &&
              !answer?.answerText);
        }

        if (isEmpty) {
          newErrors[q.id] = "Câu hỏi này là bắt buộc";
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = buildPublicSurveySubmitAnswers(survey, answers);

    const res = await fetch(`${API_URL}/survey/PublicSurvey/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: payload }),
    });

    if (res.ok) {
      setSubmitted(true);
      return;
    }

    try {
      const body = await res.json();
      if (body?.questionId != null) {
        setErrors((prev: any) => ({
          ...prev,
          [body.questionId]:
            body.message || "Câu hỏi này là bắt buộc hoặc không hợp lệ",
        }));
      } else if (body?.message) {
        alert(body.message);
      } else {
        alert("Submit lỗi");
      }
    } catch {
      alert("Submit lỗi");
    }
  };

  if (!survey) return <div className="p-10">Đang tải...</div>;

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h2 className="text-xl font-semibold text-green-600">
          Gửi khảo sát thành công!
        </h2>
      </div>
    );
  }

  const inlineTypes = [3, 5, 6];
  const isInlineQuestion = (q: any) => {
    if (getQuestionTypeCode(q) === "ADDRESS") return false;
    return inlineTypes.includes(q.questionTypeId);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 text-sm font-sans mb-12">
      {(() => {
        const allQuestions: {
          q: any;
          pageTitle: string;
          pageId: any;
          isFirstOfPage: boolean;
        }[] = [];
        survey.pages.forEach((page: any) => {
          page.questions.forEach((q: any, qi: number) => {
            allQuestions.push({
              q,
              pageTitle: page.title?.trim() || "",
              pageId: page.id,
              isFirstOfPage: qi === 0,
            });
          });
        });

        const groupedQuestions: { group: typeof allQuestions }[] = [];
        let i = 0;
        while (i < allQuestions.length) {
          const item = allQuestions[i];
          if (isInlineQuestion(item.q)) {
            const nextItem = allQuestions[i + 1];
            if (nextItem && isInlineQuestion(nextItem.q)) {
              groupedQuestions.push({ group: [item, nextItem] });
              i += 2;
            } else {
              groupedQuestions.push({ group: [item] });
              i += 1;
            }
          } else {
            groupedQuestions.push({ group: [item] });
            i += 1;
          }
        }

        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
            <button
              onClick={() => window.history.back()}
              className="text-sm font-medium text-slate-400 hover:text-slate-600 mb-4 flex items-center transition-colors"
            >
              &larr; Quay lại
            </button>

            <h1 className="text-2xl font-bold text-blue-700 mb-2 flex items-center gap-2">
              <span className="text-2xl">🏠</span> {survey.title}
            </h1>

            {survey.description && (
              <p className="text-slate-500 font-medium">{survey.description}</p>
            )}

            <div className="border-b-2 border-blue-50 my-8"></div>

            <div className="space-y-6">
              {groupedQuestions.map(({ group }, groupIndex) => {
                const isGroup = group.length > 1;
                const firstItem = group[0];
                const showSectionTitle =
                  firstItem.isFirstOfPage && firstItem.pageTitle !== "";

                return (
                  <div key={groupIndex}>
                    {showSectionTitle && (
                      <div className="mb-6 mt-2">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-3">
                          📝 {firstItem.pageTitle}
                        </h2>
                        <div className="border-b-3 border-blue-700"></div>
                      </div>
                    )}

                    <div
                      className={
                        isGroup ? "grid grid-cols-1 md:grid-cols-2 gap-6" : ""
                      }
                    >
                      {group.map((item) => {
                        const { q } = item;
                        const enabled = isEnabled(q.id);
                        const isInlineType = isInlineQuestion(q);
                        const typeCode = getQuestionTypeCode(q);

                        return (
                          <div
                            key={q.id}
                            className={
                              !enabled
                                ? "opacity-30 pointer-events-none grayscale"
                                : ""
                            }
                          >
                            <p
                              className={
                                "font-semibold mb-1 text-sm uppercase tracking-widest"
                              }
                            >
                              {q.questionText}
                              {q.isRequired && (
                                <span className="text-red-500 ml-1.5">*</span>
                              )}
                            </p>

                            {q.description && (
                              <p className=" text-red-400 text-sm mb-3 leading-relaxed">
                                {q.description}
                              </p>
                            )}

                            <div
                              className={isInlineType ? "" : "mt-3 space-y-2.5"}
                            >
                              {typeCode === "ADDRESS" ? (
                                <ProvinceWardSelect
                                  value={{
                                    provinceCode:
                                      answers[q.id]?.provinceCode ?? 48,
                                    wardCode:
                                      answers[q.id]?.wardCode != null &&
                                      Number.isFinite(answers[q.id].wardCode)
                                        ? answers[q.id].wardCode
                                        : null,
                                    province: String(
                                      answers[q.id]?.province ?? ""
                                    ),
                                    ward: String(answers[q.id]?.ward ?? ""),
                                  }}
                                  onChange={(next) =>
                                    updateAddressAnswer(q.id, next)
                                  }
                                  disabled={!enabled}
                                />
                              ) : (
                                <>
                                  {q.questionTypeId === 1 &&
                                    q.options?.map((o: any) => (
                                      <label
                                        key={o.id}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-blue-300 transition-all cursor-pointer"
                                      >
                                        <input
                                          type="radio"
                                          name={`q-${q.id}`}
                                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                          disabled={!enabled}
                                          checked={
                                            answers[q.id]?.optionIds?.includes(
                                              o.id
                                            ) || false
                                          }
                                          onChange={() =>
                                            handleOption(q.id, o.id, false)
                                          }
                                        />
                                        <span className="text-slate-700 font-medium text-[14px]">
                                          {o.optionText}
                                        </span>
                                      </label>
                                    ))}

                                  {q.questionTypeId === 2 &&
                                    q.options?.map((o: any) => (
                                      <label
                                        key={o.id}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-blue-300 transition-all cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                          disabled={!enabled}
                                          checked={
                                            answers[q.id]?.optionIds?.includes(
                                              o.id
                                            ) || false
                                          }
                                          onChange={() =>
                                            handleOption(q.id, o.id, true)
                                          }
                                        />
                                        <span className="text-slate-700 font-medium text-[14px]">
                                          {o.optionText}
                                        </span>
                                      </label>
                                    ))}

                                  {q.questionTypeId === 3 && (
                                    <input
                                      type="text"
                                      className="w-full border border-slate-200 px-4 py-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                                      placeholder="Nhập thông tin..."
                                      disabled={!enabled}
                                      value={answers[q.id]?.answerText || ""}
                                      onChange={(e) =>
                                        updateAnswer(
                                          q.id,
                                          e.target.value,
                                          "answerText"
                                        )
                                      }
                                    />
                                  )}

                                  {q.questionTypeId === 4 && (
                                    <textarea
                                      rows={4}
                                      className="w-full border border-slate-200 p-4 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 resize-none"
                                      placeholder="Nhập câu trả lời chi tiết..."
                                      disabled={!enabled}
                                      value={answers[q.id]?.answerText || ""}
                                      onChange={(e) =>
                                        updateAnswer(
                                          q.id,
                                          e.target.value,
                                          "answerText"
                                        )
                                      }
                                    />
                                  )}

                                  {q.questionTypeId === 5 && (
                                    <input
                                      type="number"
                                      className="w-full border border-slate-200 px-4 py-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                                      placeholder="0"
                                      disabled={!enabled}
                                      value={answers[q.id]?.answerNumber ?? ""}
                                      onChange={(e) =>
                                        updateAnswer(
                                          q.id,
                                          Number(e.target.value),
                                          "answerNumber"
                                        )
                                      }
                                    />
                                  )}

                                  {q.questionTypeId === 6 && (
                                    <DatePicker
                                      id={`public-answer-date-${q.id}`}
                                      placeholder="dd/mm/yyyy"
                                      disabled={!enabled}
                                      defaultDate={
                                        answers[q.id]?.answerDate || undefined
                                      }
                                      onChange={(_, dateStr) =>
                                        updateAnswer(
                                          q.id,
                                          dateStr as string,
                                          "answerDate"
                                        )
                                      }
                                    />
                                  )}
                                </>
                              )}

                              {errors[q.id] && (
                                <p className="text-red-500 text-xs font-semibold mt-2 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block"></span>
                                  {errors[q.id]}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="bg-amber-50 rounded-xl border border-amber-200/50 p-6 flex flex-col items-start shadow-sm mt-8">
        <h4 className="font-bold text-amber-800 mb-2">💡 Lưu ý quan trọng</h4>
        <ul className="text-sm text-amber-700/80 mb-6 space-y-1 pl-4 list-disc">
          <li>
            Chỉ điền những trường hợp đủ điều kiện mua nhà ở xã hội theo luật
            định.
          </li>
          <li>
            Thông tin sẽ được bảo mật kỹ lượng và chỉ dùng cho mục đích khảo
            sát.
          </li>
          <li>
            Vui lòng rà soát lại thông tin trước khi nhấn Gửi Khảo Sát để tránh
            sai lệch.
          </li>
        </ul>

        <div className="w-full flex justify-center">
          <button
            onClick={handleSubmit}
            className="w-full md:w-auto px-16 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-[10px] font-bold shadow-md shadow-purple-500/20 transition-all active:scale-95"
          >
            Gửi Khảo Sát
          </button>
        </div>
      </div>
    </div>
  );
}
