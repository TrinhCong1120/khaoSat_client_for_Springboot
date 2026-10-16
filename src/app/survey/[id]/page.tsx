"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiArrowRight, FiCheck, FiClock, FiLock } from "react-icons/fi";
import DatePicker from "@/components/form/date-picker";
import ProvinceWardSelect from "@/components/form/ProvinceWardSelect";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import type { ProvinceWardValue } from "@/components/form/ProvinceWardSelect";
import {
  buildPublicSurveySubmitAnswers,
  getQuestionTypeCode,
} from "@/types/survey";
import { isAddressQuestionType } from "@/lib/vietnam-address-api";
import { API_PUBLIC_SURVEYS } from "@/lib/api";
import { getMediaUrls, resolveMediaUrl } from "@/lib/media";
import { getVisitorId } from "@/lib/site-visitor";

type OptionMediaFile = {
  mediaType?: string | null;
  objectUrl?: string | null;
};

type ChoiceOptionMedia = {
  id: string;
  optionText?: string | null;
  imageUrl?: string | null;
  mediaFiles?: OptionMediaFile[] | null;
};

type TrackingEventType =
  | "SURVEY_VIEWED"
  | "SURVEY_STARTED"
  | "PAGE_VIEWED"
  | "PAGE_COMPLETED"
  | "SURVEY_SUBMIT_ATTEMPTED"
  | "SURVEY_SUBMIT_FAILED"
  | "SURVEY_RESUMED";

const sendTrackingEvent = (
  surveyRef: string,
  sessionId: string,
  eventType: TrackingEventType,
  pageId: string | null = null,
  eventId = crypto.randomUUID(),
) => fetch(`${API_PUBLIC_SURVEYS}/${surveyRef}/events`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    eventId,
    sessionId,
    eventType,
    pageId,
    questionId: null,
    clientOccurredAt: new Date().toISOString(),
  }),
  keepalive: true,
}).catch(() => undefined);

export default function PublicSurvey() {
  const { id } = useParams();
  const [survey, setSurvey] = useState<any>(null);
  const [answers, setAnswers] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "not-found" | "not-open" | "closed">("loading");
  const [loadMessage, setLoadMessage] = useState("");
  const [trackingSessionId, setTrackingSessionId] = useState("");
  const validationRequestRef = useRef(0);
  const trackingStartedRef = useRef(false);
  const surveyStartedEventRef = useRef(false);
  const activeElapsedRef = useRef(0);
  const activeSinceRef = useRef<number | null>(null);

  useEffect(() => {
    const sync = () => {
      const active = loadState === "ready" && !submitted &&
        document.visibilityState === "visible" && document.hasFocus();
      if (active && activeSinceRef.current == null) activeSinceRef.current = Date.now();
      if (!active && activeSinceRef.current != null) {
        activeElapsedRef.current += Date.now() - activeSinceRef.current;
        activeSinceRef.current = null;
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
    };
  }, [loadState, submitted]);

  const parseSourceValueTokens = (sourceValue: string) =>
    String(sourceValue || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const hasNonBlank = (v: unknown) => String(v ?? "").trim().length > 0;

  const getOptionImageUrls = (option: ChoiceOptionMedia) => {
    return getMediaUrls(option, "IMAGE");
  };

  useEffect(() => {
    if (!id) return;

    setLoadState("loading");
    fetch(`${API_PUBLIC_SURVEYS}/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) return null;
          const body = await res.json().catch(() => null);
          if (res.status === 409) return { unavailableState: "not-open", message: body?.message };
          if (res.status === 410) return { unavailableState: "closed", message: body?.message };
          throw new Error(`Survey request failed: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data?.unavailableState) {
          setSurvey(null);
          setLoadMessage(data.message || "Khảo sát hiện chưa thể truy cập.");
          setLoadState(data.unavailableState);
          return;
        }
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
    if (!id || loadState !== "ready" || !survey?.id || trackingStartedRef.current) return;
    trackingStartedRef.current = true;

    const surveyRef = String(id);
    const requestKey = `survey-session-request:${surveyRef}`;
    const expiryKey = `survey-session-expiry:${surveyRef}`;
    const storedExpiry = Date.parse(sessionStorage.getItem(expiryKey) || "");
    const requestId = Number.isFinite(storedExpiry) && storedExpiry > Date.now()
      ? sessionStorage.getItem(requestKey) || crypto.randomUUID()
      : crypto.randomUUID();
    sessionStorage.setItem(requestKey, requestId);

    fetch(`${API_PUBLIC_SURVEYS}/${surveyRef}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        visitorId: getVisitorId(),
        deviceType: /iPad|Tablet|Android(?!.*Mobile)/i.test(navigator.userAgent) ? "TABLET"
          : /Mobi|iPhone|Android/i.test(navigator.userAgent) ? "MOBILE" : "DESKTOP",
        utmSource: new URLSearchParams(window.location.search).get("utm_source"),
        utmMedium: new URLSearchParams(window.location.search).get("utm_medium"),
        utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign"),
        referrerHost: (() => { try { return document.referrer ? new URL(document.referrer).hostname : null; } catch { return null; } })(),
      }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Tracking session HTTP ${response.status}`);
        const body = await response.json();
        return body?.data ?? body;
      })
      .then(async (session) => {
        if (!session?.sessionId) return;
        const sessionId = String(session.sessionId);
        setTrackingSessionId(sessionId);
        if (session.expiresAt) sessionStorage.setItem(expiryKey, String(session.expiresAt));
        if (session.status === "ABANDONED") {
          await sendTrackingEvent(surveyRef, sessionId, "SURVEY_RESUMED");
        }
        const viewEventKey = `survey-view-event:${surveyRef}:${sessionId}`;
        const viewEventId = sessionStorage.getItem(viewEventKey) || crypto.randomUUID();
        sessionStorage.setItem(viewEventKey, viewEventId);
        await sendTrackingEvent(surveyRef, sessionId, "SURVEY_VIEWED", null, viewEventId);
      })
      .catch(() => undefined);
  }, [id, loadState, survey?.id]);

  useEffect(() => {
    const pageId = survey?.pages?.[currentPage]?.id;
    if (!id || !trackingSessionId || !pageId) return;
    void sendTrackingEvent(String(id), trackingSessionId, "PAGE_VIEWED", String(pageId));
  }, [currentPage, id, survey?.pages, trackingSessionId]);

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
      .map((x) => x.trim())
      .filter(Boolean);

  const isEnabled = (questionId: string) => {
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

  const updateAnswer = (qid: string, value: any, type: string) => {
    if (!surveyStartedEventRef.current && id && trackingSessionId) {
      surveyStartedEventRef.current = true;
      void sendTrackingEvent(String(id), trackingSessionId, "SURVEY_STARTED");
    }
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

  const updateAddressAnswer = (qid: string, next: ProvinceWardValue) => {
    if (!surveyStartedEventRef.current && id && trackingSessionId) {
      surveyStartedEventRef.current = true;
      void sendTrackingEvent(String(id), trackingSessionId, "SURVEY_STARTED");
    }
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

  const handleOption = (qid: string, optionId: string, multiple: boolean) => {
    if (!surveyStartedEventRef.current && id && trackingSessionId) {
      surveyStartedEventRef.current = true;
      void sendTrackingEvent(String(id), trackingSessionId, "SURVEY_STARTED");
    }
    setAnswers((prev: any) => {
      const current = prev[qid]?.optionIds || [];

      let updated = multiple
        ? current.includes(optionId)
          ? current.filter((x: string) => x !== optionId)
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
    if (typeCode === "SINGLE_CHOICE" || typeCode === "MULTIPLE_CHOICE") return !answer?.optionIds?.length;
    if (typeCode === "TEXT") return !hasNonBlank(answer?.answerText);
    if (typeCode === "NUMBER") return answer?.answerNumber == null || answer?.answerNumber === "" || !Number.isFinite(Number(answer.answerNumber));
    if (typeCode === "DATE") return !hasNonBlank(answer?.answerDate);
    return true;
  };

  const validateQuestionValue = (q: any, answer: any) => {
    if (!isEnabled(q.id)) return null;
    if (q.isRequired && answerIsEmpty(q, answer)) return "Câu hỏi này là bắt buộc";
    if (answerIsEmpty(q, answer)) return null;

    const typeCode = getQuestionTypeCode(q);
    const selected = Array.isArray(answer?.optionIds) ? answer.optionIds.map(String) : [];
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

      if (type === "FIXED_OPTION" && selected[0] !== String(value?.optionId ?? value)) return message;
      if (type === "ALLOWED_OPTIONS" && selected.some((id: string) => !list(["optionIds"]).includes(id))) return message;
      if (type === "DISALLOWED_OPTIONS" && selected.some((id: string) => list(["optionIds"]).includes(id))) return message;
      if (type === "MIN_SELECTIONS" && selected.length < Number(value)) return message;
      if (type === "MAX_SELECTIONS" && selected.length > Number(value)) return message;
      if (type === "REQUIRED_OPTIONS" && list(["optionIds"]).some((id) => !selected.includes(id))) return message;
      if (type === "MUTUALLY_EXCLUSIVE" && list(["optionIds"]).some((id) => selected.includes(id)) && selected.length > 1) return message;

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

  // Endpoint validate dùng chung: gửi đúng các câu cần kiểm tra, kể cả câu trống.
  const validateAnswersWithBackend = async (questions: any[], retriedAfterRevisionConflict = false, revisionOverride?: number) => {
    const requestId = ++validationRequestRef.current;
    const answersPayload = questions.map((q: any) => {
      const answer = answers[q.id] || {};
      const typeCode = getQuestionTypeCode(q);
      const payload: any = { questionId: q.id };
      if (typeCode === "SINGLE_CHOICE" || typeCode === "MULTIPLE_CHOICE") {
        payload.optionIds = Array.isArray(answer.optionIds) ? answer.optionIds : [];
      } else if (typeCode === "TEXT") {
        payload.answerText = answer.answerText ?? "";
      } else if (typeCode === "NUMBER") {
        const value = String(answer.answerNumber ?? "").trim();
        if (value && /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)) payload.answerNumber = Number(value);
      } else if (typeCode === "DATE") {
        payload.answerDate = answer.answerDate ?? "";
      } else if (typeCode === "ADDRESS" || isAddressQuestionType(q)) {
        payload.province = answer.province ?? "";
        payload.ward = answer.ward ?? "";
        payload.provinceCode = answer.provinceCode == null ? null : String(answer.provinceCode);
        payload.wardCode = answer.wardCode == null ? null : String(answer.wardCode);
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
      if (response.status === 409 && body?.code === "SURVEY_REVISION_CONFLICT") {
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
      const requestedQuestionIds = new Set(questions.map((q: any) => String(q.id)));
      const fieldErrors = Array.isArray(body?.fieldErrors)
        ? body.fieldErrors.filter((error: any) => requestedQuestionIds.has(String(error?.questionId)))
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

  const goToPage = (nextPage: number) => {
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToFirstError = (questions: Array<{ id: string }>) => {
    // Wait until React has rendered the validation messages before locating them.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const firstQuestionWithError = questions.find((q) =>
          document.getElementById(`question-error-${q.id}`),
        );
        if (!firstQuestionWithError) return;

        document.getElementById(`question-${firstQuestionWithError.id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    });
  };

  const handleNextPage = async () => {
    const pageQuestions = survey.pages[currentPage]?.questions || [];
    const result = await validateAnswersWithBackend(pageQuestions);
    if (result?.valid) {
      const pageId = survey.pages[currentPage]?.id;
      if (id && trackingSessionId && pageId) {
        void sendTrackingEvent(String(id), trackingSessionId, "PAGE_COMPLETED", String(pageId));
      }
      goToPage(currentPage + 1);
      return;
    }

    scrollToFirstError(pageQuestions);
  };

  const handleSubmit = async () => {
    const allQuestions = survey.pages.flatMap((page: any) => page.questions || []);
    const validationResult = await validateAnswersWithBackend(allQuestions);
    if (!validationResult?.valid) return;

    const payload = buildPublicSurveySubmitAnswers(survey, answers)
      .filter((answer) => isEnabled(answer.questionId));
    const requestKey = `survey-request-id:${id}`;
    const requestId = localStorage.getItem(requestKey) || crypto.randomUUID();
    localStorage.setItem(requestKey, requestId);

    try {
      if (id && trackingSessionId) {
        void sendTrackingEvent(String(id), trackingSessionId, "SURVEY_SUBMIT_ATTEMPTED");
      }
      const res = await fetch(`${API_PUBLIC_SURVEYS}/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          surveyRevision: survey.validationRevision ?? survey.revision,
          sessionId: trackingSessionId || undefined,
          activeDurationMs: Math.min(86400000, activeElapsedRef.current +
            (activeSinceRef.current == null ? 0 : Date.now() - activeSinceRef.current)),
          answers: payload,
        }),
      });

      if (res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.responseId) {
          localStorage.removeItem(requestKey);
          setSubmitted(true);
        } else {
          alert("Phản hồi đã được tiếp nhận và đang chờ hệ thống xử lý. Bạn không cần gửi lại.");
        }
        return;
      }

      const rawText = await res.text();
      let body: any = null;
      try {
        body = rawText ? JSON.parse(rawText) : null;
      } catch {
        body = null;
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
      if (id && trackingSessionId) {
        void sendTrackingEvent(String(id), trackingSessionId, "SURVEY_SUBMIT_FAILED");
      }
    } catch {
      if (id && trackingSessionId) {
        void sendTrackingEvent(String(id), trackingSessionId, "SURVEY_SUBMIT_FAILED");
      }
      alert("Không gửi được khảo sát. Vui lòng kiểm tra mạng rồi thử lại; mã yêu cầu hiện tại sẽ được giữ để tránh lưu trùng.");
    }
  };

  if (loadState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8f8] px-4 py-10 dark:bg-[#071319]">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300" role="status"><span className="size-5 animate-spin rounded-full border-2 border-[#0d5c63] border-t-transparent" />Đang tải khảo sát…</div>
      </main>
    );
  }

  if (loadState === "not-found" || !survey) {
    if (loadState === "not-open" || loadState === "closed") {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#f4f8f8] px-4 py-10 text-slate-900 dark:bg-[#071319] dark:text-white">
          <section className="w-full max-w-lg rounded-2xl bg-white px-6 py-12 text-center shadow-[0_24px_70px_rgba(7,31,42,.14)] dark:bg-slate-900 sm:px-12">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{loadState === "not-open" ? <FiClock size={26} /> : <FiLock size={26} />}</div>
            <h1 className="text-3xl font-black tracking-[-0.03em]">{loadState === "not-open" ? "Khảo sát chưa mở" : "Khảo sát đã đóng"}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{loadMessage}</p>
            <Link href="/" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0d5c63] px-5 text-sm font-bold text-white transition hover:bg-[#0a4b51]"><FiArrowLeft /> Về trang chủ</Link>
          </section>
        </main>
      );
    }
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8f8] px-4 py-10 text-slate-900 dark:bg-[#071319] dark:text-white">
        <section className="w-full max-w-lg rounded-2xl bg-white px-6 py-12 text-center shadow-[0_24px_70px_rgba(7,31,42,.14)] dark:bg-slate-900 sm:px-12">
          <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-[#dff2ec] text-xl font-black text-[#0d5c63] dark:bg-[#0d5c63]/20 dark:text-emerald-200">404</div>
          <h1 className="text-3xl font-black tracking-[-0.03em]">Khảo sát không tồn tại</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Khảo sát có thể đã bị xóa, chưa được xuất bản hoặc đường dẫn không chính xác.</p>
          <Link href="/" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0d5c63] px-5 text-sm font-bold text-white transition hover:bg-[#0a4b51]"><FiArrowLeft /> Về trang chủ</Link>
        </section>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center bg-[#f4f8f8] px-4 py-10 text-slate-900 dark:bg-[#071319] dark:text-white">
        <div className="mx-auto w-full max-w-xl rounded-2xl bg-white px-6 py-14 text-center shadow-[0_24px_70px_rgba(7,31,42,.14)] dark:bg-slate-900 sm:px-12">
          <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-[#dff2ec] text-[#0d5c63] dark:bg-[#0d5c63]/20 dark:text-emerald-200"><FiCheck size={28} strokeWidth={3} /></div>
          <h1 className="text-3xl font-black tracking-[-0.03em]">Cảm ơn bạn đã chia sẻ</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Câu trả lời đã được ghi nhận thành công.</p>
          <Link href="/" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:border-[#0d5c63] hover:text-[#0d5c63] dark:border-slate-700 dark:text-slate-200"><FiArrowLeft /> Về trang chủ</Link>
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
      <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-2 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <Link href="/survey" className="flex min-w-0 items-center gap-2.5" aria-label="Về trang khảo sát"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-500 text-white"><FiCheck size={17} /></span><span className="truncate text-sm font-semibold text-gray-900 dark:text-white">Khảo sát</span></Link>
        <div className="flex items-center gap-1"><ThemeToggleButton /><Link href="/" className="shrink-0 rounded-md px-2.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950">Trang chủ</Link></div>
      </header>
      <main className="min-h-screen bg-gray-50 px-3 py-4 text-gray-800 dark:bg-gray-950 dark:text-gray-100 sm:px-5 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <section className="mb-5 rounded-xl border border-gray-200 border-t-4 border-t-brand-500 bg-white p-5 shadow-sm dark:border-gray-800 dark:border-t-brand-400 dark:bg-gray-900 sm:p-7">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-semibold leading-tight text-gray-900 dark:text-white sm:text-2xl">{survey.title || "Khảo sát mức độ hài lòng"}</h1>{survey.shareCode && <span className="text-xs font-medium text-gray-400">Mã: {survey.shareCode}</span>}</div>
          <p className="leading-7 text-gray-600 dark:text-gray-300">
            {survey.description || "Cảm ơn bạn đã dành thời gian tham gia khảo sát. Ý kiến của bạn sẽ giúp chúng tôi cải thiện chất lượng dịch vụ."}
          </p>
          {getMediaUrls(survey, "IMAGE").map((url, index) => <img key={`${url}-${index}`} src={resolveMediaUrl(url)} alt="" className="mt-4 max-h-72 w-full rounded-lg object-contain" />)}
          {getMediaUrls(survey, "VIDEO").map((url, index) => <video key={`${url}-${index}`} src={resolveMediaUrl(url)} controls className="mt-4 max-h-72 w-full rounded-lg" />)}
          {getMediaUrls(survey, "AUDIO").map((url, index) => <audio key={`${url}-${index}`} src={resolveMediaUrl(url)} controls className="mt-4 w-full" />)}
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
            {getMediaUrls(page, "IMAGE").map((url, index) => <img key={`${url}-${index}`} src={resolveMediaUrl(url)} alt="" className="mt-3 max-h-64 w-full rounded-lg object-contain" />)}
            {getMediaUrls(page, "VIDEO").map((url, index) => <video key={`${url}-${index}`} src={resolveMediaUrl(url)} controls className="mt-3 max-h-64 w-full rounded-lg" />)}
            {getMediaUrls(page, "AUDIO").map((url, index) => <audio key={`${url}-${index}`} src={resolveMediaUrl(url)} controls className="mt-3 w-full" />)}
          </div>

          {pageQuestions.map((q: any, questionIndex: number) => {
            const enabled = isEnabled(q.id);
            const typeCode = getQuestionTypeCode(q);
            const isAddress = typeCode === "ADDRESS" || isAddressQuestionType(q);
            const choiceOptions = Array.isArray(q.options) ? q.options : [];
            const hasImageOptions =
              (typeCode === "SINGLE_CHOICE" || typeCode === "MULTIPLE_CHOICE") &&
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
                      (typeCode === "TEXT"
                        ? !hasNonBlank(answer.answerText)
                        : typeCode === "NUMBER"
                          ? !hasNonBlank(answer.answerNumber)
                          : typeCode === "DATE"
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
                    <div aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-base dark:bg-gray-700"><FiLock /></div>
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
                {getMediaUrls(q, "IMAGE").map((url, index) => <img key={`${url}-${index}`} src={resolveMediaUrl(url)} alt="" className="mb-4 max-h-64 w-full rounded-lg object-contain" />)}
                {getMediaUrls(q, "VIDEO").map((url, index) => <video key={`${url}-${index}`} src={resolveMediaUrl(url)} controls className="mb-4 max-h-64 w-full rounded-lg" />)}
                {getMediaUrls(q, "AUDIO").map((url, index) => <audio key={`${url}-${index}`} src={resolveMediaUrl(url)} controls className="mb-4 w-full" />)}

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
                      {(typeCode === "SINGLE_CHOICE" || typeCode === "MULTIPLE_CHOICE") && (
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
                                              src={resolveMediaUrl(url)}
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
                                        type={typeCode === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                                        name={`q-${q.id}`}
                                        aria-describedby={errors[q.id] ? `question-error-${q.id}` : undefined}
                                        className="mt-0.5 size-5 shrink-0 accent-brand-600"
                                        disabled={!enabled}
                                        checked={checked}
                                        onChange={() => handleOption(q.id, o.id, typeCode === "MULTIPLE_CHOICE")}
                                      />
                                      <span className="min-w-0 break-words text-[15px] leading-6 text-gray-800 dark:text-gray-200">{o.optionText}</span>
                                    </span>
                                  </span>
                                ) : (
                                  <>
                                    <input
                                      type={typeCode === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                                      name={`q-${q.id}`}
                                      aria-describedby={errors[q.id] ? `question-error-${q.id}` : undefined}
                                      className="mt-0.5 size-5 shrink-0 accent-brand-600"
                                      disabled={!enabled}
                                      checked={checked}
                                      onChange={() => handleOption(q.id, o.id, typeCode === "MULTIPLE_CHOICE")}
                                    />
                                    <span className="min-w-0 flex-1 break-words text-[15px] leading-6 text-gray-800 dark:text-gray-200">{o.optionText}</span>
                                  </>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {typeCode === "TEXT" && (
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

                      {typeCode === "NUMBER" && (
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

                      {typeCode === "DATE" && (
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
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[15px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 min-[420px]:w-auto"
                >
                  <FiArrowLeft /> Quay lại
                </button>
              )}
            </div>
            {currentPage < pageCount - 1 ? (
              <button
                type="button"
                data-validation-navigation="true"
                onClick={handleNextPage}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-600 min-[420px]:w-auto"
              >
                Tiếp tục <FiArrowRight />
              </button>
            ) : (
              <button
                type="button"
                data-validation-navigation="true"
                onClick={handleSubmit}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-600 min-[420px]:w-auto"
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
