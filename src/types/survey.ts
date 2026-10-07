export type AnswerPayload = {
  questionId: string;
  answerText?: string | null;
  answerNumber?: number | null;
  answerDate?: string | null;
  optionIds?: string[] | null;
  provinceCode?: string | null;
  wardCode?: string | null;
  province?: string | null;
  ward?: string | null;
  addressDetail?: string | null;
};

type SurveyQuestion = {
  id: string;
  questionTypeCode?: string | null;
};

type RawAnswer = {
  questionId?: string;
  answerText?: unknown;
  answerNumber?: unknown;
  answerDate?: unknown;
  optionIds?: unknown[];
  provinceCode?: unknown;
  wardCode?: unknown;
  province?: unknown;
  ward?: unknown;
  addressDetail?: unknown;
};

export function getQuestionTypeCode(q: { questionTypeCode?: string | null }) {
  return String(q.questionTypeCode ?? "").toUpperCase();
}

/** Chuẩn hóa mảng answers trước khi POST PublicSurvey submit */
export function buildPublicSurveySubmitAnswers(
  survey: { pages: { questions?: SurveyQuestion[] }[] },
  answers: Record<string, RawAnswer | null | undefined>
): AnswerPayload[] {
  const questionById = new Map<string, SurveyQuestion>();
  for (const p of survey.pages || []) {
    for (const q of p.questions || []) {
      questionById.set(String(q.id), q);
    }
  }

  const out: AnswerPayload[] = [];

  for (const raw of Object.values(answers)) {
    if (raw == null || raw.questionId == null) continue;
    const questionId = String(raw.questionId);
    const q = questionById.get(questionId);
    if (!q) continue;

    const typeCode = getQuestionTypeCode(q);

    if (typeCode === "ADDRESS") {
      const province = String(raw.province ?? "").trim();
      const ward = String(raw.ward ?? "").trim();
      const provinceOk = province.length > 0;
      const wardOk = ward.length > 0;

      if (!provinceOk || !wardOk) continue;

      out.push({
        questionId,
        provinceCode: String(raw.provinceCode ?? "").trim() || null,
        wardCode: String(raw.wardCode ?? "").trim() || null,
        province,
        ward,
        addressDetail: String(raw.addressDetail ?? "").trim() || null,
      });
      continue;
    }

    if (typeCode === "SINGLE_CHOICE" || typeCode === "MULTIPLE_CHOICE") {
      const optionIds: string[] = Array.from(
        new Set<string>(
          (Array.isArray(raw.optionIds) ? raw.optionIds : [])
            .map(String)
            .filter(Boolean)
        )
      );
      if (optionIds.length === 0) continue;
      out.push({ questionId, optionIds });
      continue;
    }

    if (typeCode === "TEXT") {
      const answerText = String(raw.answerText ?? "").trim();
      if (!answerText) continue;
      out.push({ questionId, answerText });
      continue;
    }

    if (typeCode === "NUMBER") {
      const answerNumber = String(raw.answerNumber ?? "").trim();
      if (!answerNumber || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(answerNumber)) continue;
      out.push({ questionId, answerNumber: Number(answerNumber) });
      continue;
    }

    if (typeCode === "DATE") {
      const rawDate = String(raw.answerDate ?? "").trim();
      if (!rawDate) continue;

      const answerDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? `${rawDate}T00:00:00`
        : rawDate;
      out.push({ questionId, answerDate });
    }
  }

  return out;
}
