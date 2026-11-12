import { describe, expect, it } from "vitest";
import type { DatasetRecord, SurveyResultQuestion } from "@/types/report";
import { evaluateComputedFields } from "../computed";
import { evaluateFilterTree } from "../filter";
import type { ComputedField, FilterGroup } from "../types";

const questions: SurveyResultQuestion[] = [
  { id: "q-dept", questionText: "Phòng ban", questionTypeCode: "SINGLE_CHOICE" },
  { id: "q-score", questionText: "Điểm đánh giá", questionTypeCode: "NUMBER" },
  { id: "q-code", questionText: "Mã nhân viên", questionTypeCode: "SHORT_TEXT" },
];

const questionsById = new Map(questions.map((q) => [q.id, q]));

const records: DatasetRecord[] = [
  {
    id: "r1",
    requestId: "req1",
    submittedAt: "2026-10-01T10:00:00Z",
    answers: {
      "q-dept": { optionTexts: ["Kinh doanh"], formatted: "Kinh doanh" },
      "q-score": { number: 9 },
      "q-code": { text: "KD-01" },
    },
  },
  {
    id: "r2",
    requestId: "req2",
    submittedAt: "2026-10-05T10:00:00Z",
    answers: {
      "q-dept": { optionTexts: ["Kỹ thuật"], formatted: "Kỹ thuật" },
      "q-score": { number: 6 },
      "q-code": { text: "KT-09" },
    },
  },
  {
    id: "r3",
    requestId: "req3",
    submittedAt: "2026-10-10T10:00:00Z",
    answers: {
      "q-dept": { optionTexts: ["Nhân sự"], formatted: "Nhân sự" },
      "q-score": { number: 8.5 },
      "q-code": { text: "" },
    },
  },
];

describe("Nested AND/OR Filter & Guided Computed Transforms", () => {
  it("evaluates nested OR inside AND filters accurately across all operator families", () => {
    const tree: FilterGroup = {
      kind: "group",
      id: "root",
      logic: "AND",
      children: [
        { kind: "rule", id: "f1", field: "question:q-score", operator: "gte", value: 8 },
        {
          kind: "group",
          id: "g2",
          logic: "OR",
          children: [
            { kind: "rule", id: "f2", field: "question:q-dept", operator: "equals", value: "Kinh doanh" },
            { kind: "rule", id: "f3", field: "question:q-code", operator: "isEmpty" },
          ],
        },
      ],
    };

    const out = evaluateFilterTree(records, tree, questionsById, new Map());
    expect(out.map((r) => r.id)).toEqual(["r1", "r3"]);
  });

  it("supports filtering by extracted computed fields", () => {
    const computed: ComputedField[] = [
      {
        id: "c_prefix",
        name: "Tiền tố mã",
        kind: "extract",
        sourceField: "question:q-code",
        extractType: "beforeDash",
      },
    ];
    const { computedValues } = evaluateComputedFields(records, computed, questionsById);

    const tree: FilterGroup = {
      kind: "group",
      id: "root",
      logic: "AND",
      children: [
        { kind: "rule", id: "f1", field: "computed:c_prefix", operator: "equals", value: "KT" },
      ],
    };
    const out = evaluateFilterTree(records, tree, questionsById, computedValues);
    expect(out.map((r) => r.id)).toEqual(["r2"]);
  });
});

