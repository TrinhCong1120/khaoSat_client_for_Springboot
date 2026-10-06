"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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

type OptionMediaFile = {
  mediaType?: string | null;
  objectUrl?: string | null;
};

type ChoiceOptionMedia = {
  id: number;
  optionText?: string | null;
  imageUrl?: string | null;
  mediaFiles?: OptionMediaFile[] | null;
};

export default function PublicSurvey() {
  const { id } = useParams();
  const [survey, setSurvey] = useState<any>(null);
  const [answers, setAnswers] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "not-found">("loading");
  const validationRequestRef = useRef(0);

  const parseSourceValueTokens = (sourceValue: string) =>
    String(sourceValue || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const hasNonBlank = (v: unknown) => String(v ?? "").trim().length > 0;

  const getOptionImageUrls = (option: ChoiceOptionMedia) => {
    const mediaImages = Array.isArray(option?.mediaFiles)
      ? option.mediaFiles
          .filter((media) => String(media?.mediaType || "").toUpperCase() === "IMAGE")
          .map((media) => media?.objectUrl)
      : [];

    return Array.from(new Set([
      option?.imageUrl,
      ...mediaImages,
    ].filter((url): url is string => typeof url === "string" && url.trim().length > 0)));
  };

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

  const getRuleList = (value: any, keys: string[] = []) => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    for (const key of keys) if (Array.isArray(value[key])) return value[key];
    return [];
  };

  const answerIsEmpty = (q: any, answer: any) => {
    const typeCode = getQuestionTypeCode(q);
    if (typeCode === "ADDRESS" || isAddressQuestionType(q)) {
      return answer == null || !hasNonBlank(answer.province) || !hasNonBlank(answer.ward) ||
        !Number.isFinite(Number(answer.provinceCode)) || Number(answer.provinceCode) <= 0 ||
        !Number.isFinite(Number(answer.wardCode)) || Number(answer.wardCode) <= 0;
    }
    if (q.questionTypeId === 1 || q.questionTypeId === 2) return !answer?.optionIds?.length;
    if (q.questionTypeId === 3) return !hasNonBlank(answer?.answerText);
    if (q.questionTypeId === 4) return answer?.answerNumber == null || answer?.answerNumber === "" || !Number.isFinite(Number(answer.answerNumber));
    if (q.questionTypeId === 5) return !hasNonBlank(answer?.answerDate);
    return true;
  };

  const validateQuestionValue = (q: any, answer: any) => {
    if (!isEnabled(q.id)) return null;
    if (q.isRequired && answerIsEmpty(q, answer)) return "Câu hỏi này là bắt buộc";
    if (answerIsEmpty(q, answer)) return null;

    const typeCode = getQuestionTypeCode(q);
    const selected = Array.isArray(answer?.optionIds) ? answer.optionIds.map(Number) : [];
    const text = String(answer?.answerText ?? "");
    const number = Number(answer?.answerNumber);
    const detail = String(answer?.addressDetail ?? "");
    const date = String(answer?.answerDate ?? "").slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    for (const rule of Array.isArray(q.validationRules) ? q.validationRules : []) {
      if (rule?.enabled === false) continue;
      const type = String(rule?.type || "").toUpperCase();
      const value = rule?.value;
      const message = rule?.message || "Giá trị không hợp lệ";
      const list = (keys: string[]) => getRuleList(value, keys).map(String);

      if (type === "FIXED_OPTION" && selected[0] !== Number(value?.optionId ?? value)) return message;
      if (type === "ALLOWED_OPTIONS" && selected.some((id: number) => !list(["optionIds"]).includes(String(id)))) return message;
      if (type === "DISALLOWED_OPTIONS" && selected.some((id: number) => list(["optionIds"]).includes(String(id)))) return message;
      if (type === "MIN_SELECTIONS" && selected.length < Number(value)) return message;
      if (type === "MAX_SELECTIONS" && selected.length > Number(value)) return message;
      if (type === "REQUIRED_OPTIONS" && list(["optionIds"]).some((id) => !selected.includes(Number(id)))) return message;
      if (type === "MUTUALLY_EXCLUSIVE" && list(["optionIds"]).some((id) => selected.includes(Number(id))) && selected.length > 1) return message;

      if (type === "MIN_LENGTH" && text.length < Number(value)) return message;
      if (type === "MAX_LENGTH" && text.length > Number(value)) return message;
      if (type === "REGEX" || type === "DETAIL_REGEX") {
        try { if (!new RegExp(String(value)).test(type === "DETAIL_REGEX" ? detail : text)) return message; } catch { return message; }
      }
      if (type === "EMAIL" && value !== false && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return message;
      if (type === "PHONE" && !new RegExp(String(value || "^(0[35789])[0-9]{8}$")).test(text)) return message;
      if (type === "URL" && value !== false) { try { new URL(text); } catch { return message; } }
      if (type === "NUMERIC_TEXT" && value !== false && !/^\d+$/.test(text)) return message;
      if (type === "ALPHABET_ONLY" && value !== false && !/^[\p{L}\s]+$/u.test(text)) return message;
      if (type === "ALPHANUMERIC" && value !== false && !/^[\p{L}\d\s]+$/u.test(text)) return message;
      if (type === "STARTS_WITH" && !text.startsWith(String(value))) return message;
      if (type === "ENDS_WITH" && !text.endsWith(String(value))) return message;
      if (type === "NOT_CONTAIN" && list(["values"]).some((item) => text.toLowerCase().includes(item.toLowerCase()))) return message;

      if (type === "MIN" && number < Number(value)) return message;
      if (type === "MAX" && number > Number(value)) return message;
      if (type === "GREATER_THAN" && number <= Number(value)) return message;
      if (type === "LESS_THAN" && number >= Number(value)) return message;
      if (type === "NOT_EQUAL" && number === Number(value)) return message;
      if (type === "INTEGER_ONLY" && value !== false && !Number.isInteger(number)) return message;
      if (type === "DECIMAL_PLACES" && String(answer?.answerNumber).split(".")[1]?.length > Number(value)) return message;
      if (type === "MULTIPLE_OF" && Number(value) !== 0 && number % Number(value) !== 0) return message;
      if (type === "POSITIVE" && value !== false && number <= 0) return message;
      if (type === "NEGATIVE" && value !== false && number >= 0) return message;

      if (type === "MIN_DATE" && date < String(value)) return message;
      if (type === "MAX_DATE" && date > String(value)) return message;
      if ((type === "BEFORE_TODAY" || type === "NOT_FUTURE") && value !== false && date >= today) return message;
      if ((type === "AFTER_TODAY" || type === "NOT_PAST") && value !== false && date <= today) return message;
      if (type === "ALLOWED_WEEKDAYS" && !list(["weekdays"]).includes(String((new Date(`${date}T00:00:00`).getDay() + 6) % 7 + 1))) return message;
      if (type === "DISALLOWED_DATES" && list(["dates"]).includes(date)) return message;

      if (type === "REQUIRE_PROVINCE" && value !== false && !hasNonBlank(answer?.province)) return message;
      if (type === "REQUIRE_WARD" && value !== false && !hasNonBlank(answer?.ward)) return message;
      if (type === "REQUIRE_DETAIL" && value !== false && !hasNonBlank(detail)) return message;
      if (type === "FIXED_PROVINCE" && String(answer?.provinceCode) !== String(value?.code ?? value)) return message;
      if (type === "FIXED_WARD" && String(answer?.wardCode) !== String(value?.code ?? value)) return message;
      if (type === "ALLOWED_PROVINCES" && !list(["provinceCodes"]).includes(String(answer?.provinceCode))) return message;
      if (type === "DISALLOWED_PROVINCES" && list(["provinceCodes"]).includes(String(answer?.provinceCode))) return message;
      if (type === "ALLOWED_WARDS" && !list(["wardCodes"]).includes(String(answer?.wardCode))) return message;
      if (type === "DISALLOWED_WARDS" && list(["wardCodes"]).includes(String(answer?.wardCode))) return message;
      if (type === "DETAIL_MIN_LENGTH" && detail.length < Number(value)) return message;
      if (type === "DETAIL_MAX_LENGTH" && detail.length > Number(value)) return message;
    }
    return null;
  };

  const validateQuestion = (q: any) => {
    const message = validateQuestionValue(q, answers[q.id]);
    setErrors((prev: any) => ({ ...prev, [q.id]: message }));
    return message;
  };

  const validateWithBackend = async (scopeType: "QUESTION" | "PAGE" | "SURVEY", questionId?: number, pageId?: number) => {
    const requestId = ++validationRequestRef.current;
    const payload = buildPublicSurveySubmitAnswers(survey, answers);
    let response: Response;
    try {
      response = await fetch(`${API_PUBLIC_SURVEYS}/${id}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyRevision: survey?.validationRevision ?? survey?.revision ?? 1,
          scope: {
            type: scopeType,
            ...(questionId == null ? {} : { questionId }),
            ...(pageId == null ? {} : { pageId }),
          },
          answers: payload,
        }),
      });
    } catch {
      const message = "Chưa thể xác minh câu trả lời. Vui lòng kiểm tra kết nối mạng.";
      if (scopeType === "QUESTION" && questionId != null) setErrors((prev: any) => ({ ...prev, [questionId]: message }));
      return { valid: false, fieldErrors: questionId == null ? [] : [{ questionId, message }] };
    }

    const body = await response.json().catch(() => ({}));
    if (requestId !== validationRequestRef.current) return { valid: true, fieldErrors: [] };

    const fieldErrors = Array.isArray(body?.fieldErrors) ? body.fieldErrors : [];
    const scopeQuestionIds = scopeType === "QUESTION"
      ? new Set(questionId == null ? [] : [questionId])
      : new Set(
          (scopeType === "PAGE"
            ? survey.pages.find((page: any) => page.id === pageId)?.questions || []
            : survey.pages.flatMap((page: any) => page.questions || [])
          ).map((question: any) => question.id)
        );
    // Một số phiên bản Backend hiện vẫn trả lỗi toàn survey dù scope là PAGE/QUESTION.
    // Chỉ dùng lỗi thuộc phạm vi đang kiểm tra để quyết định chuyển trang.
    const scopedFieldErrors = fieldErrors.filter((error: any) => scopeQuestionIds.has(Number(error?.questionId)));
    if (scopeType === "QUESTION" && questionId != null) {
      const fieldError = scopedFieldErrors.find((error: any) => Number(error.questionId) === questionId);
      setErrors((prev: any) => ({
        ...prev,
        [questionId]: fieldError?.message || null,
      }));
    } else {
      setErrors((prev: any) => {
        const next = { ...prev };
        const scopeQuestions = scopeType === "PAGE"
          ? survey.pages.find((page: any) => page.id === pageId)?.questions || []
          : survey.pages.flatMap((page: any) => page.questions || []);
        for (const question of scopeQuestions) delete next[question.id];
        for (const error of scopedFieldErrors) {
          if (error?.questionId != null) next[error.questionId] = error.message || "Dữ liệu không hợp lệ";
        }
        return next;
      });
    }

    return { valid: response.ok && scopedFieldErrors.length === 0, fieldErrors: scopedFieldErrors };
  };

  const getSingleAnswerPayload = (q: any) => {
    const answer = answers[q.id];
    if (!answer) return null;
    const typeCode = getQuestionTypeCode(q);
    if (typeCode === "SINGLE_CHOICE" || q.questionTypeId === 1) return answer.optionIds?.[0] ?? null;
    if (typeCode === "MULTIPLE_CHOICE" || q.questionTypeId === 2) return Array.isArray(answer.optionIds) ? answer.optionIds : [];
    if (typeCode === "TEXT" || q.questionTypeId === 3) return answer.answerText ?? "";
    if (typeCode === "NUMBER" || q.questionTypeId === 4) return answer.answerNumber ?? "";
    if (typeCode === "DATE" || q.questionTypeId === 5) return answer.answerDate ?? "";
    if (typeCode === "ADDRESS" || isAddressQuestionType(q)) {
      return {
        province: answer.province ?? "",
        ward: answer.ward ?? "",
        addressDetail: answer.addressDetail ?? "",
      };
    }
    return null;
  };

  const validateOneWithBackend = async (q: any) => {
    const requestId = ++validationRequestRef.current;
    try {
      const response = await fetch(`${API_PUBLIC_SURVEYS}/${id}/validate-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.id,
          answer: getSingleAnswerPayload(q),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (requestId !== validationRequestRef.current) return;
      if (!response.ok) {
        setErrors((prev: any) => ({
          ...prev,
          [q.id]: body?.message || `Không thể kiểm tra câu trả lời (${response.status})`,
        }));
        return;
      }
      const fieldError = Array.isArray(body?.fieldErrors)
        ? body.fieldErrors.find((error: any) => Number(error?.questionId) === Number(q.id))
        : null;
      setErrors((prev: any) => ({
        ...prev,
        [q.id]: fieldError?.message || null,
      }));
    } catch {
      if (requestId !== validationRequestRef.current) return;
      setErrors((prev: any) => ({
        ...prev,
        [q.id]: "Chưa thể xác minh câu trả lời. Vui lòng kiểm tra kết nối mạng.",
      }));
    }
  };

  // Endpoint validate dùng chung: gửi đúng các câu cần kiểm tra, kể cả câu trống.
  const validateAnswersWithBackend = async (questions: any[], retriedAfterRevisionConflict = false, revisionOverride?: number) => {
    const requestId = ++validationRequestRef.current;
    const answersPayload = questions.map((q: any) => {
      const answer = answers[q.id] || {};
      const typeCode = getQuestionTypeCode(q);
      const payload: any = { questionId: q.id };
      if (typeCode === "SINGLE_CHOICE" || typeCode === "MULTIPLE_CHOICE" || q.questionTypeId === 1 || q.questionTypeId === 2) {
        payload.optionIds = Array.isArray(answer.optionIds) ? answer.optionIds : [];
      } else if (typeCode === "TEXT" || q.questionTypeId === 3) {
        payload.answerText = answer.answerText ?? "";
      } else if (typeCode === "NUMBER" || q.questionTypeId === 4) {
        const value = String(answer.answerNumber ?? "").trim();
        if (value && /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)) payload.answerNumber = Number(value);
      } else if (typeCode === "DATE" || q.questionTypeId === 5) {
        payload.answerDate = answer.answerDate ?? "";
      } else if (typeCode === "ADDRESS" || isAddressQuestionType(q)) {
        payload.province = answer.province ?? "";
        payload.ward = answer.ward ?? "";
        payload.addressDetail = answer.addressDetail ?? "";
      }
      return payload;
    });

    try {
      const response = await fetch(`${API_PUBLIC_SURVEYS}/${id}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyRevision: revisionOverride ?? survey?.validationRevision ?? survey?.revision ?? undefined,
          answers: answersPayload,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (requestId !== validationRequestRef.current) return { valid: true, fieldErrors: [] };
      if (response.status === 409) {
        window.alert("Phiên khảo sát đã thay đổi. Vui lòng tải lại trang.");
        if (!retriedAfterRevisionConflict) {
          try {
            const refreshResponse = await fetch(`${API_PUBLIC_SURVEYS}/${id}`);
            const refreshedBody = await refreshResponse.json().catch(() => ({}));
            const refreshedSurvey = refreshedBody?.data ?? refreshedBody;
            const refreshedRevision = Number(refreshedSurvey?.validationRevision ?? refreshedSurvey?.revision);
            if (refreshResponse.ok && Array.isArray(refreshedSurvey?.pages) && Number.isFinite(refreshedRevision)) {
              setSurvey(refreshedSurvey);
              return validateAnswersWithBackend(questions, true, refreshedRevision);
            }
          } catch {
            // Không tải được survey mới.
          }
        }
        return { valid: false, fieldErrors: [] };
      }
      const requestedQuestionIds = new Set(questions.map((q: any) => Number(q.id)));
      const fieldErrors = Array.isArray(body?.fieldErrors)
        ? body.fieldErrors.filter((error: any) => requestedQuestionIds.has(Number(error?.questionId)))
        : [];
      setErrors((prev: any) => {
        const next = { ...prev };
        for (const q of questions) {
          delete next[q.id];
          const submitted = answersPayload.find((item: any) => item.questionId === q.id);
          const empty = !submitted ||
            (Array.isArray(submitted.optionIds) && submitted.optionIds.length === 0) ||
            Object.keys(submitted).every((key) => key === "questionId");
          if (q.isRequired && empty) next[q.id] = "Câu hỏi bắt buộc chưa được trả lời";
        }
        for (const error of fieldErrors) {
          if (error?.questionId != null) next[error.questionId] = error.message || "Dữ liệu không hợp lệ";
        }
        if (!response.ok && fieldErrors.length === 0) {
          for (const q of questions) next[q.id] = body?.message || `Không thể kiểm tra câu trả lời (${response.status})`;
        }
        return next;
      });
      return { valid: response.ok && fieldErrors.length === 0, fieldErrors };
    } catch {
      if (requestId !== validationRequestRef.current) return { valid: false, fieldErrors: [] };
      setErrors((prev: any) => ({
        ...prev,
        ...Object.fromEntries(questions.map((q: any) => [q.id, "Chưa thể kiểm tra câu trả lời. Vui lòng kiểm tra kết nối mạng."])),
      }));
      return { valid: false, fieldErrors: [] };
    }
  };

  const validate = (pageIndex?: number) => {
    const newErrors: any = {};

    const pagesToValidate =
      pageIndex == null ? survey.pages : [survey.pages[pageIndex]];

    pagesToValidate.forEach((p: any) => {
      if (!p) return;
      p.questions.forEach((q: any) => {
        const ruleError = validateQuestionValue(q, answers[q.id]);
        if (ruleError) newErrors[q.id] = ruleError;
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

    // Recalculate after the legacy required check so every rule uses the same message.
    pagesToValidate.forEach((p: any) => {
      if (!p) return;
      p.questions.forEach((q: any) => {
        const error = validateQuestionValue(q, answers[q.id]);
        if (error) newErrors[q.id] = error;
        else delete newErrors[q.id];
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goToPage = (nextPage: number) => {
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextPage = async () => {
    const pageQuestions = survey.pages[currentPage]?.questions || [];
    const result = await validateAnswersWithBackend(pageQuestions);
    if (result?.valid) goToPage(currentPage + 1);
  };

  const handleSubmit = async () => {
    const allQuestions = survey.pages.flatMap((page: any) => page.questions || []);
    const validationResult = await validateAnswersWithBackend(allQuestions);
    if (!validationResult?.valid) return;

    // Gửi toàn bộ trạng thái đã nhập để Backend tự tính conditions và quyết định
    // câu nào applicable; FE không tự loại câu trả lời bị ẩn.
    const payload = buildPublicSurveySubmitAnswers(survey, answers);

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

      if (Array.isArray(body?.fieldErrors) && body.fieldErrors.length > 0) {
        setErrors((prev: any) => {
          const next = { ...prev };
          for (const fieldError of body.fieldErrors) {
            if (fieldError?.questionId == null) continue;
            next[fieldError.questionId] = fieldError.message || "Dữ liệu không hợp lệ";
          }
          return next;
        });
      } else if (body?.questionId != null) {
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

  if (loadState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
        <div className="text-sm text-gray-600 dark:text-gray-300" role="status">Đang tải khảo sát…</div>
      </main>
    );
  }

  if (loadState === "not-found" || !survey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 text-gray-800 dark:bg-gray-950 dark:text-gray-100">
        <section className="w-full max-w-md rounded-xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:px-10">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-brand-50 text-2xl font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">404</div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Khảo sát không tồn tại</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">Khảo sát bạn đang truy cập không tồn tại, đã bị xóa hoặc đường dẫn không chính xác.</p>
          <Link href="/survey" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600">Về danh sách khảo sát</Link>
        </section>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-800 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white px-5 py-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:px-8">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-success-100 text-3xl font-bold text-success-700 dark:bg-success-950 dark:text-success-300">
            ✓
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">Cảm ơn bạn!</h1>
          <p className="text-gray-600 dark:text-gray-300">Câu trả lời của bạn đã được ghi nhận.</p>
        </div>
      </main>
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
    <>
      <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-2 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 sm:hidden">
        <Link href="/survey" className="flex min-w-0 items-center gap-2.5" aria-label="Về trang khảo sát">
          <Image
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Emblem_of_Vietnam.svg/960px-Emblem_of_Vietnam.svg.png"
            alt="Biểu trưng Sở Xây dựng Đà Nẵng"
            width={36}
            height={36}
            priority
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span className="min-w-0 truncate text-sm font-semibold text-gray-900 dark:text-white">Sở Xây dựng Đà Nẵng</span>
        </Link>
        <Link href="/" className="ml-3 shrink-0 rounded-md px-2.5 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950">
          Trang chủ
        </Link>
      </header>
      <main className="min-h-screen bg-gray-50 px-3 py-4 text-gray-800 dark:bg-gray-950 dark:text-gray-100 sm:px-5 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <section className="mb-5 rounded-xl border border-gray-200 border-t-4 border-t-brand-500 bg-white p-5 shadow-sm dark:border-gray-800 dark:border-t-brand-400 dark:bg-gray-900 sm:p-7">
          <h1 className="mb-2 text-xl font-semibold leading-tight text-gray-900 dark:text-white sm:text-2xl">{survey.title || "Khảo sát mức độ hài lòng"}</h1>
          <p className="leading-7 text-gray-600 dark:text-gray-300">
            {survey.description || "Cảm ơn bạn đã dành thời gian tham gia khảo sát. Ý kiến của bạn sẽ giúp chúng tôi cải thiện chất lượng dịch vụ."}
          </p>
          {survey.imageUrl && <img src={survey.imageUrl} alt="" className="mt-4 max-h-72 w-full rounded-lg object-contain" />}
          {survey.videoUrl && <video src={survey.videoUrl} controls className="mt-4 max-h-72 w-full rounded-lg" />}
          {survey.audioUrl && <audio src={survey.audioUrl} controls className="mt-4 w-full" />}
          <div className="mb-2 mt-6 flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>Trang {Math.min(currentPage + 1, pageCount)} / {pageCount}</span>
            <span>{Math.round(((currentPage + 1) / pageCount) * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-brand-500 transition-[width] duration-300"
              style={{ width: `${((currentPage + 1) / pageCount) * 100}%` }}
            />
          </div>
        </section>

        <section>
          <div className="mx-1 mb-3 mt-[26px]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">{page?.title || `Thông tin khảo sát`}</h2>
            {page?.description && <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{page.description}</p>}
            {page?.imageUrl && <img src={page.imageUrl} alt="" className="mt-3 max-h-64 w-full rounded-lg object-contain" />}
            {page?.videoUrl && <video src={page.videoUrl} controls className="mt-3 max-h-64 w-full rounded-lg" />}
            {page?.audioUrl && <audio src={page.audioUrl} controls className="mt-3 w-full" />}
          </div>

          {pageQuestions.map((q: any, questionIndex: number) => {
            const enabled = isEnabled(q.id);
            const typeCode = getQuestionTypeCode(q);
            const isAddress = typeCode === "ADDRESS" || isAddressQuestionType(q);
            const choiceOptions = Array.isArray(q.options) ? q.options : [];
            const hasImageOptions =
              (q.questionTypeId === 1 || q.questionTypeId === 2) &&
              choiceOptions.some((option: ChoiceOptionMedia) => getOptionImageUrls(option).length > 0);

            return (
              <article
                key={q.id}
                id={`question-${q.id}`}
                onBlur={(event) => {
                  const nextTarget = event.relatedTarget as Node | null;
                  if ((nextTarget as HTMLElement | null)?.closest?.("[data-validation-navigation]")) return;
                  if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
                    const answer = answers[q.id];
                    const typeCode = getQuestionTypeCode(q);
                    const isEmpty =
                      !answer ||
                      (typeCode === "TEXT" || q.questionTypeId === 3
                        ? !hasNonBlank(answer.answerText)
                        : typeCode === "NUMBER" || q.questionTypeId === 4
                          ? !hasNonBlank(answer.answerNumber)
                          : typeCode === "DATE" || q.questionTypeId === 5
                            ? !hasNonBlank(answer.answerDate)
                            : typeCode === "ADDRESS" || isAddressQuestionType(q)
                              ? !hasNonBlank(answer.province) || !hasNonBlank(answer.ward)
                              : !Array.isArray(answer.optionIds) || answer.optionIds.length === 0);
                    if (q.isRequired && isEmpty) {
                      setErrors((prev: any) => ({ ...prev, [q.id]: "Câu hỏi bắt buộc chưa được trả lời" }));
                    }
                    void validateAnswersWithBackend([q]);
                  }
                }}
                className={`mb-3 min-w-0 scroll-mt-20 rounded-xl border bg-white p-4 shadow-theme-xs transition-colors dark:bg-gray-900 sm:p-6 ${
                  enabled ? "border-gray-200 dark:border-gray-800" : "border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900/60"
                }`}
              >
                {!enabled && (
                  <div className="mb-4 flex items-start gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-100 px-4 py-3 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    <div aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-base dark:bg-gray-700">🔒</div>
                    <div className="min-w-0">
                      <div className="mb-0.5 text-sm font-semibold text-gray-700 dark:text-gray-200">Câu hỏi được bỏ qua</div>
                      <div className="text-[13px] leading-snug text-gray-500 dark:text-gray-400">Câu hỏi này không áp dụng với lựa chọn hiện tại.</div>
                    </div>
                  </div>
                )}
                {errors[q.id] && <p id={`question-error-${q.id}`} role="alert" className="mt-1 text-sm text-error-600 dark:text-error-400">{errors[q.id]}</p>}
                {q.description && (
                  <div className={`mb-4 mt-1 text-sm leading-6 ${enabled ? "text-gray-600 dark:text-gray-300" : "text-gray-500 dark:text-gray-400"}`}>
                    {q.description}
                  </div>
                )}
                {q.imageUrl && <img src={q.imageUrl} alt="" className="mb-4 max-h-64 w-full rounded-lg object-contain" />}
                {q.videoUrl && <video src={q.videoUrl} controls className="mb-4 max-h-64 w-full rounded-lg" />}
                {q.audioUrl && <audio src={q.audioUrl} controls className="mb-4 w-full" />}

                <div id={`question-label-${q.id}`} className={`break-words text-base font-semibold leading-7 ${enabled ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                  {questionOffset + questionIndex + 1}. {q.questionText}
                  {q.isRequired && <span className="ml-1 text-red-500">*</span>}
                </div>


                <div className={!enabled ? "opacity-60" : ""}>
                  {isAddress ? (
                    <div className="space-y-3">
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
                    <input
                      type="text"
                      name={`question-${q.id}-address-detail`}
                      aria-labelledby={`question-label-${q.id}`}
                      aria-describedby={errors[q.id] ? `question-error-${q.id}` : undefined}
                      className="min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[15px] transition-[border-color,box-shadow] placeholder:text-gray-400 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/15 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-800"
                      placeholder="Địa chỉ chi tiết (nếu có)…"
                      disabled={!enabled}
                      value={answers[q.id]?.addressDetail || ""}
                      onChange={(e) => updateAnswer(q.id, e.target.value, "addressDetail")}
                    />
                    </div>
                  ) : (
                    <>
                      {(q.questionTypeId === 1 || q.questionTypeId === 2) && (
                        <div className={hasImageOptions ? "mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3" : ""}>
                          {choiceOptions.map((o: ChoiceOptionMedia) => {
                            const optionImageUrls = getOptionImageUrls(o);
                            const checked = answers[q.id]?.optionIds?.includes(o.id) || false;
                            const optionHasImages = optionImageUrls.length > 0;

                            return (
                              <label
                                key={o.id}
                                className={`${hasImageOptions ? "overflow-hidden rounded-xl p-0" : "mt-2 items-start gap-3 rounded-lg px-3 py-3"} flex cursor-pointer border transition ${
                                  checked
                                    ? "border-brand-400 bg-brand-50 ring-2 ring-brand-500/10 dark:border-brand-600 dark:bg-brand-950"
                                    : "border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-brand-700 dark:hover:bg-brand-950/50"
                                } ${!enabled ? "cursor-not-allowed bg-gray-50 hover:border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-800" : ""}`}
                              >
                                {hasImageOptions ? (
                                  <span className="flex min-w-0 flex-1 flex-col">
                                    {optionHasImages && (
                                      <span className={`grid aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800 ${optionImageUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                                        {optionImageUrls.slice(0, 4).map((url, index) => (
                                          <span key={`${url}-${index}`} className="relative min-h-0 min-w-0 overflow-hidden">
                                            <img
                                              src={url}
                                              alt={o.optionText ? `${o.optionText} ${index + 1}` : `Ảnh đáp án ${index + 1}`}
                                              loading="lazy"
                                              className="h-full w-full object-cover"
                                            />
                                            {index === 3 && optionImageUrls.length > 4 && (
                                              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                                                +{optionImageUrls.length - 4}
                                              </span>
                                            )}
                                          </span>
                                        ))}
                                      </span>
                                    )}
                                    <span className={`flex items-start gap-3 px-3 py-3 ${optionHasImages ? "" : "min-h-24 items-center"}`}>
                                      <input
                                        type={q.questionTypeId === 1 ? "radio" : "checkbox"}
                                        name={`q-${q.id}`}
                                        aria-describedby={errors[q.id] ? `question-error-${q.id}` : undefined}
                                        className="mt-0.5 size-5 shrink-0 accent-brand-600"
                                        disabled={!enabled}
                                        checked={checked}
                                        onChange={() => handleOption(q.id, o.id, q.questionTypeId === 2)}
                                      />
                                      <span className="min-w-0 break-words text-[15px] leading-6 text-gray-800 dark:text-gray-200">{o.optionText}</span>
                                    </span>
                                  </span>
                                ) : (
                                  <>
                                    <input
                                      type={q.questionTypeId === 1 ? "radio" : "checkbox"}
                                      name={`q-${q.id}`}
                                      aria-describedby={errors[q.id] ? `question-error-${q.id}` : undefined}
                                      className="mt-0.5 size-5 shrink-0 accent-brand-600"
                                      disabled={!enabled}
                                      checked={checked}
                                      onChange={() => handleOption(q.id, o.id, q.questionTypeId === 2)}
                                    />
                                    <span className="min-w-0 flex-1 break-words text-[15px] leading-6 text-gray-800 dark:text-gray-200">{o.optionText}</span>
                                  </>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {q.questionTypeId === 3 && (
                        <input
                          type="text"
                          name={`question-${q.id}-text`}
                          aria-labelledby={`question-label-${q.id}`}
                          aria-describedby={errors[q.id] ? `question-error-${q.id}` : undefined}
                          className="min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[15px] transition-[border-color,box-shadow] placeholder:text-gray-400 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/15 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-800"
                          placeholder="Nhập câu trả lời…"
                          disabled={!enabled}
                          value={answers[q.id]?.answerText || ""}
                          onChange={(e) => updateAnswer(q.id, e.target.value, "answerText")}
                        />
                      )}

                      {q.questionTypeId === 4 && (
                        <input
                          type="text"
                          inputMode="decimal"
                          name={`question-${q.id}-number`}
                          aria-labelledby={`question-label-${q.id}`}
                          aria-describedby={errors[q.id] ? `question-error-${q.id}` : undefined}
                          className="min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[15px] transition-[border-color,box-shadow] placeholder:text-gray-400 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/15 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-800"
                          placeholder="Nhập giá trị…"
                          disabled={!enabled}
                          value={answers[q.id]?.answerNumber ?? ""}
                          onChange={(e) => updateAnswer(q.id, e.target.value, "answerNumber")}
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

              </article>
            );
          })}

          <div className="mb-12 mt-6 flex flex-col-reverse gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
            <div className="min-w-0">
              {currentPage > 0 && (
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[15px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 min-[420px]:w-auto"
                >
                  ← Quay lại
                </button>
              )}
            </div>
            {currentPage < pageCount - 1 ? (
              <button
                type="button"
                data-validation-navigation="true"
                onClick={handleNextPage}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-500 px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-600 min-[420px]:w-auto"
              >
                Tiếp tục →
              </button>
            ) : (
              <button
                type="button"
                data-validation-navigation="true"
                onClick={handleSubmit}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-500 px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-600 min-[420px]:w-auto"
              >
                Gửi khảo sát
              </button>
            )}
          </div>
        </section>
      </div>
      </main>
    </>
  );
}
