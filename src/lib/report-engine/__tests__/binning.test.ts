import { describe, expect, it } from "vitest";
import {
  buildContinuousTickAxis,
  snapNumericValue,
  formatTickNumber,
  formatTickKey,
  resolveFieldWithCoalesce,
  aggregateReport,
} from "../index";
import type {
  DatasetRecord,
  SurveyResultQuestion,
} from "@/types/report";
import type { ReportDefinition } from "../types";

describe("Numeric Binning & Coalesce Unit Tests", () => {
  it("snapNumericValue correctly rounds small decimals and large integers", () => {
    // Step 0.5 round_step
    expect(snapNumericValue(6.08, 0.5, "round_step")).toBe(6.0);
    expect(snapNumericValue(5.33, 0.5, "round_step")).toBe(5.5);
    expect(snapNumericValue(7.17, 0.5, "round_step")).toBe(7.0);

    // Step 0.5 floor_step
    expect(snapNumericValue(6.08, 0.5, "floor_step")).toBe(6.0);
    expect(snapNumericValue(5.33, 0.5, "floor_step")).toBe(5.0);
    expect(snapNumericValue(7.17, 0.5, "floor_step")).toBe(7.0);

    // Step 5,000,000 round_step
    expect(snapNumericValue(12400000, 5000000, "round_step")).toBe(10000000);
    expect(snapNumericValue(12600000, 5000000, "round_step")).toBe(15000000);

    // Step 1 round_step
    expect(snapNumericValue(8.4, 1, "round_step")).toBe(8.0);
    expect(snapNumericValue(8.6, 1, "round_step")).toBe(9.0);
  });

  it("buildContinuousTickAxis generates correct continuous ticks with metadata", () => {
    const ticks = buildContinuousTickAxis([6.0, 8.5], {
      mode: "round_step",
      stepSize: 0.5,
      minTick: 5.0,
      maxTick: 9.5,
      fillEmptyTicks: true,
      decimalPlaces: 1,
    });

    expect(ticks).toHaveLength(10);
    expect(ticks[0].key).toBe("5.0");
    expect(ticks[0].numericValue).toBe(5.0);
    expect(ticks[0].rangeMin).toBe(4.75);
    expect(ticks[0].rangeMax).toBe(5.25);

    expect(ticks[2].key).toBe("6.0");
    expect(ticks[2].numericValue).toBe(6.0);
    expect(ticks[2].rangeMin).toBe(5.75);
    expect(ticks[2].rangeMax).toBe(6.25);

    expect(ticks[9].key).toBe("9.5");
    expect(ticks[9].numericValue).toBe(9.5);
    expect(ticks[9].rangeMin).toBe(9.25);
    expect(ticks[9].rangeMax).toBe(9.75);
  });

  it("resolveFieldWithCoalesce falls back to alternative fields when primary is empty", () => {
    const mockQuestions = new Map<string, SurveyResultQuestion>([
      ["q_khtn", { id: "q_khtn", questionText: "Điểm KHTN", questionType: { code: "NUMBER" } } as any],
      ["q_khxh", { id: "q_khxh", questionText: "Điểm KHXH", questionType: { code: "NUMBER" } } as any],
    ]);

    const recordA: DatasetRecord = {
      id: "rec_1",
      submittedAt: "2026-03-01T08:00:00Z",
      answers: {
        q_khtn: { questionId: "q_khtn", text: "8.5", numberValue: 8.5 },
      },
    };

    const recordB: DatasetRecord = {
      id: "rec_2",
      submittedAt: "2026-03-01T08:00:00Z",
      answers: {
        q_khxh: { questionId: "q_khxh", text: "7.0", numberValue: 7.0 },
      },
    };

    const recordC: DatasetRecord = {
      id: "rec_3",
      submittedAt: "2026-03-01T08:00:00Z",
      answers: {},
    };

    const primaryField = "question:q_khtn" as const;
    const coalesceFields = ["question:q_khxh" as const];

    expect(resolveFieldWithCoalesce(recordA, primaryField, coalesceFields, mockQuestions)).toBe("8.5");
    expect(resolveFieldWithCoalesce(recordB, primaryField, coalesceFields, mockQuestions)).toBe("7.0");
    expect(resolveFieldWithCoalesce(recordC, primaryField, coalesceFields, mockQuestions)).toBeNull();
  });

  it("regression test: 60 students benchmark with coalesce and numeric binning step 0.5", () => {
    // 60 students across 8 classes: 30 KHTN, 30 KHXH
    const classes = ["10A1", "10C1", "11A1", "11C1", "12A1", "12A2", "12C1", "12C2"];
    const records: DatasetRecord[] = [];

    // Distribution matching QA Checklist:
    // 5.0: 0
    // 5.5: 1 (12C2: 1)
    // 6.0: 5 (12C2: 4, 10C1: 1)
    // 6.5: 4 (12C2: 2, 11C1: 1, 12C1: 1)
    // 7.0: 10 (12A2: 4, 10A1: 3, 10C1: 1, 11A1: 1, 11C1: 1)
    // 7.5: 11 (11C1: 3, 11A1: 2, 12A2: 2, 10A1: 1, 10C1: 1, 12A1: 1, 12C1: 1)
    // 8.0: 19 (10A1: 4, 11A1: 4, 12A1: 4, 10C1: 3, 12C1: 2, 11C1: 1, 12A2: 1)
    // 8.5: 5 (12A1: 2, 10C1: 1, 11C1: 1, 12C1: 1)
    // 9.0: 5 (12A1: 2, 12C1: 2, 11A1: 1)
    // 9.5: 0
    const distribution: Array<{ score: number; classCounts: Record<string, number> }> = [
      { score: 5.5, classCounts: { "12C2": 1 } },
      { score: 6.0, classCounts: { "12C2": 4, "10C1": 1 } },
      { score: 6.5, classCounts: { "12C2": 2, "11C1": 1, "12C1": 1 } },
      { score: 7.0, classCounts: { "12A2": 4, "10A1": 3, "10C1": 1, "11A1": 1, "11C1": 1 } },
      { score: 7.5, classCounts: { "11C1": 3, "11A1": 2, "12A2": 2, "10A1": 1, "10C1": 1, "12A1": 1, "12C1": 1 } },
      { score: 8.0, classCounts: { "10A1": 4, "11A1": 4, "12A1": 4, "10C1": 3, "12C1": 2, "11C1": 1, "12A2": 1 } },
      { score: 8.5, classCounts: { "12A1": 2, "10C1": 1, "11C1": 1, "12C1": 1 } },
      { score: 9.0, classCounts: { "12A1": 2, "12C1": 2, "11A1": 1 } },
    ];

    let idCounter = 1;
    let khtnCount = 0;
    for (const item of distribution) {
      for (const [cls, count] of Object.entries(item.classCounts)) {
        for (let i = 0; i < count; i++) {
          const recId = `stu_${idCounter++}`;
          const isKhtn = khtnCount < 30;
          khtnCount++;

          records.push({
            id: recId,
            submittedAt: "2026-03-01T08:00:00Z",
            answers: {
              q_class: { questionId: "q_class", text: cls, optionTexts: [cls] },
              ...(isKhtn
                ? { q_khtn: { questionId: "q_khtn", text: String(item.score), numberValue: item.score } }
                : { q_khxh: { questionId: "q_khxh", text: String(item.score), numberValue: item.score } }),
            },
          });
        }
      }
    }

    expect(records).toHaveLength(60);

    const questions: SurveyResultQuestion[] = [
      { id: "q_khtn", questionText: "Điểm KHTN", questionType: { code: "NUMBER" } } as any,
      { id: "q_khxh", questionText: "Điểm KHXH", questionType: { code: "NUMBER" } } as any,
      { id: "q_class", questionText: "Lớp học", questionType: { code: "SINGLE_CHOICE" } } as any,
    ];

    const definition: ReportDefinition = {
      version: 1,
      mode: "custom",
      filterTree: { kind: "group", id: "root", logic: "AND", children: [] },
      computedFields: [],
      groupBy: [
        {
          id: "gb_score",
          field: "question:q_khtn",
          label: "Mức điểm trung bình",
          transform: "exact",
          coalesceFields: ["question:q_khxh"],
          binning: {
            mode: "round_step",
            stepSize: 0.5,
            minTick: 5.0,
            maxTick: 9.5,
            fillEmptyTicks: true,
            decimalPlaces: 1,
          },
        },
        {
          id: "gb_class",
          field: "question:q_class",
          label: "Lớp",
          transform: "exact",
        },
      ],
      measures: [
        {
          id: "m_count",
          field: "responses",
          agg: "count",
          label: "Số lượng học sinh",
        },
      ],
      chart: { enabled: true, type: "line" },
      viewOptions: {
        showEmptyGroups: true,
        sortBy: "score",
        sortDir: "asc",
        maxGroups: 50,
        includeGrandTotal: true,
        pivot: true,
      },
    };

    const qMap = new Map(questions.map((q) => [q.id, q]));
    const output = aggregateReport(records, questions, qMap, new Map(), definition);
    expect(output.pivotMatrix).not.toBeNull();
    const pivot = output.pivotMatrix!;

    // 1. Ticks verification
    expect(pivot.rowKeys).toEqual([
      "5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0", "9.5"
    ]);

    // 2. Series verification
    expect(pivot.colKeys.sort()).toEqual(classes.sort());

    // 3. Count at tick 5.0 = 0
    expect(pivot.rowTotals["5.0"].value).toBe(0);

    // 4. Count at tick 5.5 = 1 (12C2: 1)
    expect(pivot.rowTotals["5.5"].value).toBe(1);
    expect(pivot.cells["5.5"]["12C2"].value).toBe(1);

    // 5. Count at tick 6.0 = 5 (12C2: 4, 10C1: 1)
    expect(pivot.rowTotals["6.0"].value).toBe(5);
    expect(pivot.cells["6.0"]["12C2"].value).toBe(4);
    expect(pivot.cells["6.0"]["10C1"].value).toBe(1);
    expect(pivot.cells["6.0"]["12C2"].recordIds).toHaveLength(4);

    // 6. Count at tick 8.0 = 19
    expect(pivot.rowTotals["8.0"].value).toBe(19);

    // 7. Count at tick 9.5 = 0
    expect(pivot.rowTotals["9.5"].value).toBe(0);

    // 8. Total grand count = 60
    expect(pivot.grandTotal.value).toBe(60);

    // 9. tickMetaMap verification
    expect(pivot.tickMetaMap).toBeDefined();
    expect(pivot.tickMetaMap!["6.0"]).toEqual({
      key: "6.0",
      displayLabel: "6.0",
      numericValue: 6.0,
      rangeMin: 5.75,
      rangeMax: 6.25,
    });
  });

  it("handles empty zero-filling semantics correctly: count is 0, avg is null", () => {
    const questions: SurveyResultQuestion[] = [
      { id: "q_num", questionText: "Số điểm", questionType: { code: "NUMBER" } } as any,
      { id: "q_grp", questionText: "Nhóm", questionType: { code: "SINGLE_CHOICE" } } as any,
    ];

    const records: DatasetRecord[] = [
      {
        id: "r1",
        submittedAt: "2026-03-01T08:00:00Z",
        answers: {
          q_num: { questionId: "q_num", text: "5", numberValue: 5 },
          q_grp: { questionId: "q_grp", text: "A", optionTexts: ["A"] },
        },
      },
    ];

    // Measure: AVG
    const avgDef: ReportDefinition = {
      version: 1,
      mode: "custom",
      filterTree: { kind: "group", id: "root", logic: "AND", children: [] },
      computedFields: [],
      groupBy: [
        {
          id: "gb_num",
          field: "question:q_num",
          transform: "exact",
          binning: {
            mode: "round_step",
            stepSize: 1,
            minTick: 4,
            maxTick: 6,
            fillEmptyTicks: true,
          },
        },
        {
          id: "gb_grp",
          field: "question:q_grp",
          transform: "exact",
        },
      ],
      measures: [
        {
          id: "m_avg",
          field: "question:q_num",
          agg: "avg",
          label: "Điểm TB",
        },
      ],
      chart: { enabled: true, type: "line" },
      viewOptions: {
        showEmptyGroups: true,
        sortBy: "num",
        sortDir: "asc",
        maxGroups: 50,
        includeGrandTotal: true,
        pivot: true,
      },
    };

    const qMap = new Map(questions.map((q) => [q.id, q]));
    const output = aggregateReport(records, questions, qMap, new Map(), avgDef);
    const pivot = output.pivotMatrix!;

    // At tick "4" (empty): avg should be null, display "—"
    expect(pivot.cells["4"]["A"].value).toBeNull();
    expect(pivot.cells["4"]["A"].displayValue).toBe("—");

    // At tick "5" (present): avg should be 5
    expect(pivot.cells["5"]["A"].value).toBe(5);

    // At tick "6" (empty): avg should be null
    expect(pivot.cells["6"]["A"].value).toBeNull();
  });

  it("handles NPS satisfaction scenario (step 1, range 1-10 with coalesce between online and offline channels)", () => {
    const questions: SurveyResultQuestion[] = [
      { id: "q_nps_online", questionText: "Điểm hài lòng Online", questionType: { code: "RATING" } } as any,
      { id: "q_nps_pos", questionText: "Điểm hài lòng Tại quầy", questionType: { code: "RATING" } } as any,
      { id: "q_branch", questionText: "Chi nhánh", questionType: { code: "SINGLE_CHOICE" } } as any,
    ];

    const records: DatasetRecord[] = [
      {
        id: "c1",
        submittedAt: "2026-03-01T08:00:00Z",
        answers: {
          q_nps_online: { questionId: "q_nps_online", text: "9", numberValue: 9 },
          q_branch: { questionId: "q_branch", text: "Hà Nội", optionTexts: ["Hà Nội"] },
        },
      },
      {
        id: "c2",
        submittedAt: "2026-03-01T08:00:00Z",
        answers: {
          q_nps_pos: { questionId: "q_nps_pos", text: "10", numberValue: 10 },
          q_branch: { questionId: "q_branch", text: "TP.HCM", optionTexts: ["TP.HCM"] },
        },
      },
      {
        id: "c3",
        submittedAt: "2026-03-01T08:00:00Z",
        answers: {
          q_nps_pos: { questionId: "q_nps_pos", text: "9", numberValue: 9 },
          q_branch: { questionId: "q_branch", text: "TP.HCM", optionTexts: ["TP.HCM"] },
        },
      },
    ];

    const def: ReportDefinition = {
      version: 1,
      mode: "custom",
      filterTree: { kind: "group", id: "root", logic: "AND", children: [] },
      computedFields: [],
      groupBy: [
        {
          id: "gb_nps",
          field: "question:q_nps_online",
          label: "Mức điểm hài lòng",
          transform: "exact",
          coalesceFields: ["question:q_nps_pos"],
          binning: {
            mode: "round_step",
            stepSize: 1,
            minTick: 1,
            maxTick: 10,
            fillEmptyTicks: true,
            decimalPlaces: 0,
          },
        },
        {
          id: "gb_branch",
          field: "question:q_branch",
          transform: "exact",
        },
      ],
      measures: [{ id: "m1", field: "responses", agg: "count" }],
      chart: { enabled: true, type: "line" },
      viewOptions: {
        showEmptyGroups: true,
        sortBy: "group",
        sortDir: "asc",
        maxGroups: 50,
        includeGrandTotal: true,
        pivot: true,
      },
    };

    const qMap = new Map(questions.map((q) => [q.id, q]));
    const output = aggregateReport(records, questions, qMap, new Map(), def);
    const pivot = output.pivotMatrix!;

    expect(pivot.rowKeys).toHaveLength(10);
    expect(pivot.rowKeys[0]).toBe("1");
    expect(pivot.rowKeys[9]).toBe("10");

    // Empty ticks have count 0
    expect(pivot.cells["1"]["Hà Nội"].value).toBe(0);
    expect(pivot.cells["9"]["Hà Nội"].value).toBe(1);
    expect(pivot.cells["9"]["TP.HCM"].value).toBe(1);
    expect(pivot.cells["10"]["TP.HCM"].value).toBe(1);
    expect(pivot.grandTotal.value).toBe(3);
  });

  it("handles large numeric income scenario (step 5,000,000, range 10,000,000 - 25,000,000)", () => {
    const questions: SurveyResultQuestion[] = [
      { id: "q_income", questionText: "Thu nhập", questionType: { code: "NUMBER" } } as any,
      { id: "q_dept", questionText: "Khối", questionType: { code: "SINGLE_CHOICE" } } as any,
    ];

    const records: DatasetRecord[] = [
      {
        id: "emp1",
        submittedAt: "2026-03-01T08:00:00Z",
        answers: {
          q_income: { questionId: "q_income", text: "12500000", numberValue: 12500000 },
          q_dept: { questionId: "q_dept", text: "Văn phòng", optionTexts: ["Văn phòng"] },
        },
      },
      {
        id: "emp2",
        submittedAt: "2026-03-01T08:00:00Z",
        answers: {
          q_income: { questionId: "q_income", text: "18000000", numberValue: 18000000 },
          q_dept: { questionId: "q_dept", text: "Sản xuất", optionTexts: ["Sản xuất"] },
        },
      },
    ];

    const def: ReportDefinition = {
      version: 1,
      mode: "custom",
      filterTree: { kind: "group", id: "root", logic: "AND", children: [] },
      computedFields: [],
      groupBy: [
        {
          id: "gb_income",
          field: "question:q_income",
          label: "Mức thu nhập",
          transform: "exact",
          binning: {
            mode: "round_step",
            stepSize: 5000000,
            minTick: 10000000,
            maxTick: 25000000,
            fillEmptyTicks: true,
            decimalPlaces: 0,
          },
        },
        {
          id: "gb_dept",
          field: "question:q_dept",
          transform: "exact",
        },
      ],
      measures: [{ id: "m1", field: "responses", agg: "count" }],
      chart: { enabled: true, type: "groupedBar" },
      viewOptions: {
        showEmptyGroups: true,
        sortBy: "group",
        sortDir: "asc",
        maxGroups: 50,
        includeGrandTotal: true,
        pivot: true,
      },
    };

    const qMap = new Map(questions.map((q) => [q.id, q]));
    const output = aggregateReport(records, questions, qMap, new Map(), def);
    const pivot = output.pivotMatrix!;

    expect(pivot.rowKeys).toEqual(["10000000", "15000000", "20000000", "25000000"]);
    // 12.5M snapped to 15M (round_step 5M)
    expect(pivot.cells["15000000"]["Văn phòng"].value).toBe(1);
    // 18M snapped to 20M
    expect(pivot.cells["20000000"]["Sản xuất"].value).toBe(1);
    // 10M and 25M empty
    expect(pivot.cells["10000000"]["Văn phòng"].value).toBe(0);
    expect(pivot.cells["25000000"]["Sản xuất"].value).toBe(0);

    // Format display label in Vietnamese locale
    expect(pivot.tickMetaMap!["10000000"].displayLabel).toBe("10.000.000");
  });
});
