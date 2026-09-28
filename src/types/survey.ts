export type AnswerPayload = {
  questionId: number;
  answerText?: string | null;
  answerNumber?: number | null;
  answerDate?: string | null;
  optionIds?: number[] | null;
  provinceCode?: number | null;
  wardCode?: number | null;
  province?: string | null;
  ward?: string | null;
};

export function getQuestionTypeCode(q: { questionTypeCode?: string | null }) {
  return String(q.questionTypeCode ?? "").toUpperCase();
}

/** Chuẩn hóa mảng answers trước khi POST PublicSurvey submit */
export function buildPublicSurveySubmitAnswers(
  survey: { pages: { questions?: any[] }[] },
  answers: Record<number, any>
): AnswerPayload[] {
  const questionById = new Map<number, any>();
  for (const p of survey.pages || []) {
    for (const q of p.questions || []) {
      questionById.set(q.id, q);
    }
  }

  const out: AnswerPayload[] = [];

  for (const raw of Object.values(answers) as any[]) {
    if (raw == null || raw.questionId == null) continue;
    const q = questionById.get(raw.questionId);
    if (!q) continue;

    const typeCode = getQuestionTypeCode(q);
    const typeId = Number(q.questionTypeId);

    if (typeCode === "ADDRESS" || typeId === 6) {
      const province = String(raw.province ?? "").trim();
      const ward = String(raw.ward ?? "").trim();
      const provinceCode = Number(raw.provinceCode);
      const wardCode = Number(raw.wardCode);
      const provinceOk = province.length > 0;
      const wardOk = ward.length > 0;
      const provinceCodeOk = Number.isFinite(provinceCode) && provinceCode > 0;
      const wardCodeOk = Number.isFinite(wardCode) && wardCode > 0;

      if (!provinceOk || !wardOk) continue;

      out.push({
        questionId: raw.questionId,
        provinceCode: provinceCodeOk ? provinceCode : null,
        wardCode: wardCodeOk ? wardCode : null,
        province,
        ward,
      });
      continue;
    }

    if (typeCode === "SINGLE_CHOICE" || typeCode === "MULTIPLE_CHOICE" || typeId === 1 || typeId === 2) {
      const optionIds = Array.from(
        new Set(
          (Array.isArray(raw.optionIds) ? raw.optionIds : [])
            .map(Number)
            .filter((optionId) => Number.isInteger(optionId) && optionId > 0)
        )
      );
      if (optionIds.length === 0) continue;
      out.push({ questionId: raw.questionId, optionIds });
      continue;
    }

    if (typeCode === "TEXT" || typeId === 3) {
      const answerText = String(raw.answerText ?? "").trim();
      if (!answerText) continue;
      out.push({ questionId: raw.questionId, answerText });
      continue;
    }

    if (typeCode === "NUMBER" || typeId === 4) {
      const answerNumber = Number(raw.answerNumber);
      if (!Number.isFinite(answerNumber)) continue;
      out.push({ questionId: raw.questionId, answerNumber });
      continue;
    }

    if (typeCode === "DATE" || typeId === 5) {
      const rawDate = String(raw.answerDate ?? "").trim();
      if (!rawDate) continue;

      const answerDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? `${rawDate}T00:00:00`
        : rawDate;
      out.push({ questionId: raw.questionId, answerDate });
    }
  }

  return out;
}
