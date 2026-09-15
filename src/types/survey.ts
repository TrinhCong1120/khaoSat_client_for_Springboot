export type AnswerPayload = {
  questionId: number;
  answerText?: string | null;
  answerNumber?: number | null;
  answerDate?: string | null;
  optionIds?: number[] | null;
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

    if (typeCode === "ADDRESS") {
      const province = String(raw.province ?? "").trim();
      const ward = String(raw.ward ?? "").trim();
      const provinceOk = province.length > 0;
      const wardOk = ward.length > 0;
      if (!q.isRequired && (!provinceOk || !wardOk)) continue;
      out.push({
        questionId: raw.questionId,
        province: provinceOk ? province : null,
        ward: wardOk ? ward : null,
      });
      continue;
    }

    const { province: _p, ward: _w, ...rest } = raw;
    out.push(rest as AnswerPayload);
  }

  return out;
}
