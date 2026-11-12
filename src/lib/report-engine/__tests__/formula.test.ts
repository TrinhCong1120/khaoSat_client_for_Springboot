import { describe, expect, it } from "vitest";
import type { DatasetRecord, SurveyResultQuestion } from "@/types/report";
import {
  evaluateFormulaExpression,
  parseFormula,
  toDisplayFormula,
  toStorageFormula,
} from "../formula";
import { FormulaErrorValue } from "../types";

const questions: SurveyResultQuestion[] = [
  { id: "q-math", questionText: "Điểm Toán", questionTypeCode: "NUMBER" },
  { id: "q-lit", questionText: "Điểm Văn", questionTypeCode: "NUMBER" },
  { id: "q-class", questionText: "Lớp", questionTypeCode: "SHORT_TEXT" },
  { id: "q-date", questionText: "Ngày sinh", questionTypeCode: "DATE" },
  {
    id: "q-matrix",
    questionText: "Đánh giá tiêu chí",
    questionTypeCode: "MATRIX_SINGLE",
    matrixConfig: JSON.stringify({
      rows: [{ id: "r1", label: "Chất lượng" }],
      columns: [{ id: "c5", label: "5 điểm" }],
    }),
  },
];

const questionsById = new Map(questions.map((q) => [q.id, q]));

const sampleRecord: DatasetRecord = {
  id: "rec-1",
  requestId: "req-1",
  submittedAt: "2026-11-11T08:00:00Z",
  durationMs: 90000,
  totalScore: 16,
  answers: {
    "q-math": { number: 8.5, text: "8.5", formatted: "8.5" },
    "q-lit": { text: "7,5", formatted: "7,5" },
    "q-class": { text: "12A3", formatted: "12A3" },
    "q-date": { date: "2008-05-20", formatted: "2008-05-20" },
    "q-matrix": { matrixData: JSON.stringify({ r1: "c5" }), formatted: "Chất lượng: 5 điểm" },
  },
};

describe("Formula AST Engine", () => {
  it("evaluates arithmetic, Vietnamese decimal literals, and logical functions safely", () => {
    const res1 = evaluateFormulaExpression("=ROUND(AVG([#q-math], [#q-lit]), 2)", {
      record: sampleRecord,
      questionsById,
    });
    expect(res1).toBe(8);

    const res2 = evaluateFormulaExpression('=IF([#q-math] >= 8,5, "Giỏi", "Khá")', {
      record: sampleRecord,
      questionsById,
    });
    expect(res2).toBe("Giỏi");

    const res3 = evaluateFormulaExpression('=IFS([#q-math] >= 9, "A", [#q-math] >= 8, "B", TRUE, "C")', {
      record: sampleRecord,
      questionsById,
    });
    expect(res3).toBe("B");
  });

  it("supports string functions, regex, date parts, and matrix row refs", () => {
    expect(
      evaluateFormulaExpression('=UPPER(REGEXEXTRACT([#q-class], "[A-Za-z]+"))', {
        record: sampleRecord,
        questionsById,
      })
    ).toBe("A");

    expect(
      evaluateFormulaExpression('=CONTAINS([#q-class], "12") && YEAR([#q-date]) == 2008', {
        record: sampleRecord,
        questionsById,
      })
    ).toBe(true);

    expect(
      evaluateFormulaExpression("=[#q-matrix].[Chất lượng]", {
        record: sampleRecord,
        questionsById,
      })
    ).toBe("5 điểm");
  });

  it("handles Excel errors (#DIV/0!, #NAME?, #REF!, #VALUE?, #SYNTAX?) cleanly", () => {
    const divZero = evaluateFormulaExpression("=[#q-math] / 0", {
      record: sampleRecord,
      questionsById,
    });
    expect(divZero).toBeInstanceOf(FormulaErrorValue);
    expect((divZero as FormulaErrorValue).code).toBe("#DIV/0!");

    // Short-circuit IF should NOT divide by 0
    expect(
      evaluateFormulaExpression("=IF(0 == 0, 99, [#q-math] / 0)", {
        record: sampleRecord,
        questionsById,
      })
    ).toBe(99);

    const unknownFn = evaluateFormulaExpression("=UNKNOWNFN(1)", {
      record: sampleRecord,
      questionsById,
    });
    expect((unknownFn as FormulaErrorValue).code).toBe("#NAME?");

    const missingId = evaluateFormulaExpression("=[#not-exist] + 1", {
      record: sampleRecord,
      questionsById,
    });
    expect((missingId as FormulaErrorValue).code).toBe("#REF!");

    const badTextMath = evaluateFormulaExpression('=[#q-class] * 2', {
      record: sampleRecord,
      questionsById,
    });
    expect((badTextMath as FormulaErrorValue).code).toBe("#VALUE?");

    expect(() => parseFormula("((([#q-math] + 1")).toThrowError();
  });

  it("rejects AST nesting exceeding MAX_AST_DEPTH = 50", () => {
    const deep = "(".repeat(60) + "1" + ")".repeat(60);
    expect(() => parseFormula(deep)).toThrowError();
  });

  it("converts bidirectionally between [#id] storage format and [Tên câu hỏi] display format", () => {
    const storage = 'IF([#q-math] >= 8, "Đạt", "Chưa")';
    const display = toDisplayFormula(storage, questions);
    expect(display).toBe('IF([Điểm Toán] >= 8, "Đạt", "Chưa")');
    expect(toStorageFormula(display, questions)).toBe(storage);
  });

  it("disambiguates duplicate question names across multi-page surveys via [Page / Question] in formulas", () => {
    const multiPageQuestions: SurveyResultQuestion[] = [
      { id: "q-p1", pageId: "p1", pageTitle: "Nhóm A", questionText: "Điểm tổng kết", questionTypeCode: "NUMBER" },
      { id: "q-p2", pageId: "p2", pageTitle: "Nhóm B", questionText: "Điểm tổng kết", questionTypeCode: "NUMBER" },
    ];
    const multiById = new Map(multiPageQuestions.map((q) => [q.id, q]));
    const multiRec: DatasetRecord = {
      id: "rec-mp",
      requestId: "rq-mp",
      submittedAt: "2026-10-05T10:00:00Z",
      answers: {
        "q-p1": { number: 8 },
        "q-p2": { number: 6 },
      },
    };

    const storage = "=[#q-p2] + 1";
    const display = toDisplayFormula(storage, multiPageQuestions);
    expect(display).toBe("=[Nhóm B / Điểm tổng kết] + 1");
    expect(toStorageFormula(display, multiPageQuestions)).toBe(storage);

    const val = evaluateFormulaExpression("=[Nhóm B / Điểm tổng kết] - [Nhóm A / Điểm tổng kết]", {
      record: multiRec,
      questionsById: multiById,
    });
    expect(val).toBe(-2);
  });
});
