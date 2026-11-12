import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatasetRecord, SurveyResultQuestion } from "@/types/report";
import {
  buildSurveyFieldMetas,
  buildSystemPresets,
  createDefaultReportDefinition,
  createEmptyFilterTree,
  flattenSurveyPagesQuestions,
  runReportPipeline,
} from "../index";
import type { ReportDefinition } from "../types";

describe("Acceptance Scenarios (Multi-Domain, Generic Engine)", () => {
  it("Scenario 1 (Primary Academic Scenario WITHOUT typing formulas): Filter -> firstLetter GroupBy -> Multi-measures -> Highlight Best -> Exact Max Drilldown", () => {
    const questions: SurveyResultQuestion[] = [
      { id: "q_class", questionText: "Lớp", questionTypeCode: "SHORT_TEXT" },
      { id: "q_math", questionText: "Toán", questionTypeCode: "NUMBER" },
      { id: "q_lit", questionText: "Văn", questionTypeCode: "NUMBER" },
    ];

    const records: DatasetRecord[] = [
      {
        id: "s1",
        requestId: "r1",
        submittedAt: "2026-10-01T08:00:00Z",
        answers: { q_class: { text: "12A1" }, q_math: { number: 10 }, q_lit: { number: 8 } },
      },
      {
        id: "s2",
        requestId: "r2",
        submittedAt: "2026-10-01T08:05:00Z",
        answers: { q_class: { text: "12A2" }, q_math: { number: 8 }, q_lit: { number: 7 } },
      },
      {
        id: "s3",
        requestId: "r3",
        submittedAt: "2026-10-01T08:10:00Z",
        answers: { q_class: { text: "12B1" }, q_math: { number: 9 }, q_lit: { number: 9 } },
      },
      {
        id: "s4",
        requestId: "r4",
        submittedAt: "2026-10-01T08:15:00Z",
        answers: { q_class: { text: "11A1" }, q_math: { number: 10 }, q_lit: { number: 10 } },
      },
    ];

    const def: ReportDefinition = {
      version: 1,
      mode: "custom",
      filterTree: {
        kind: "group",
        id: "root",
        logic: "AND",
        children: [{ kind: "rule", id: "r_12", field: "question:q_class", operator: "contains", value: "12" }],
      },
      computedFields: [],
      groupBy: [
        { id: "g1", field: "question:q_class", label: "Nhóm lớp", transform: "firstLetter" },
      ],
      measures: [
        { id: "m_n", field: "responses", agg: "count", label: "N", highlightBest: true },
        { id: "m_avg_math", field: "question:q_math", agg: "avg", label: "AVG Toán", highlightBest: true },
        { id: "m_avg_lit", field: "question:q_lit", agg: "avg", label: "AVG Văn", highlightBest: true },
        { id: "m_max_math", field: "question:q_math", agg: "max", label: "MAX Toán", highlightBest: true },
        { id: "m_max_lit", field: "question:q_lit", agg: "max", label: "MAX Văn", highlightBest: true },
      ],
      chart: { enabled: true, type: "groupedBar", measureId: "m_avg_math" },
      viewOptions: {
        showEmptyGroups: false,
        sortBy: "group",
        sortDir: "asc",
        maxGroups: 50,
        includeGrandTotal: true,
        pivot: false,
      },
    };

    const output = runReportPipeline(records, questions, def);

    // Filtered out 11A1 -> 3 records remain
    expect(output.filteredRecords.map((r) => r.id)).toEqual(["s1", "s2", "s3"]);

    // Group A (s1, s2) and Group B (s3)
    expect(output.rows.length).toBe(2);
    const rowA = output.rows[0];
    const rowB = output.rows[1];

    expect(rowA.groupValues).toEqual(["A"]);
    expect(rowA.cells.m_n.value).toBe(2);
    expect(rowA.cells.m_avg_math.value).toBe(9);
    expect(rowA.cells.m_avg_lit.value).toBe(7.5);
    expect(rowA.cells.m_max_math.value).toBe(10);
    // Exact Max Drill-down: clicking MAX Toán in Group A returns ONLY s1!
    expect(rowA.cells.m_max_math.recordIds).toEqual(["s1"]);
    expect(rowA.cells.m_max_math.isBest).toBe(true);

    expect(rowB.groupValues).toEqual(["B"]);
    expect(rowB.cells.m_n.value).toBe(1);
    expect(rowB.cells.m_avg_lit.value).toBe(9);
    expect(rowB.cells.m_avg_lit.isBest).toBe(true);
    expect(rowB.cells.m_max_lit.value).toBe(9);
    expect(rowB.cells.m_max_lit.isBest).toBe(true);
  });

  it("Scenario 2 (HR Employee Satisfaction Survey): Filter IN + GroupBy + % Option + AVG + Median + Pivot", () => {
    const questions: SurveyResultQuestion[] = [
      {
        id: "q_dept",
        questionText: "Phòng ban",
        questionTypeCode: "SINGLE_CHOICE",
        options: [
          { id: "o1", optionText: "Kinh doanh" },
          { id: "o2", optionText: "Kỹ thuật" },
          { id: "o3", optionText: "Vận hành" },
        ],
      },
      {
        id: "q_level",
        questionText: "Mức độ hài lòng chung",
        questionTypeCode: "SINGLE_CHOICE",
        options: [
          { id: "l1", optionText: "Rất hài lòng" },
          { id: "l2", optionText: "Hài lòng" },
        ],
      },
      { id: "q_rating", questionText: "Điểm hài lòng (1-10)", questionTypeCode: "NUMBER" },
    ];

    const records: DatasetRecord[] = [
      {
        id: "h1",
        requestId: "rh1",
        submittedAt: "2026-10-02T09:00:00Z",
        answers: {
          q_dept: { optionTexts: ["Kinh doanh"], optionIds: ["o1"] },
          q_level: { optionTexts: ["Rất hài lòng"], optionIds: ["l1"] },
          q_rating: { number: 9 },
        },
      },
      {
        id: "h2",
        requestId: "rh2",
        submittedAt: "2026-10-02T09:01:00Z",
        answers: {
          q_dept: { optionTexts: ["Kinh doanh"], optionIds: ["o1"] },
          q_level: { optionTexts: ["Hài lòng"], optionIds: ["l2"] },
          q_rating: { number: 7 },
        },
      },
      {
        id: "h3",
        requestId: "rh3",
        submittedAt: "2026-10-02T09:02:00Z",
        answers: {
          q_dept: { optionTexts: ["Kỹ thuật"], optionIds: ["o2"] },
          q_level: { optionTexts: ["Rất hài lòng"], optionIds: ["l1"] },
          q_rating: { number: 10 },
        },
      },
      {
        id: "h4",
        requestId: "rh4",
        submittedAt: "2026-10-02T09:03:00Z",
        answers: {
          q_dept: { optionTexts: ["Vận hành"], optionIds: ["o3"] },
          q_level: { optionTexts: ["Hài lòng"], optionIds: ["l2"] },
          q_rating: { number: 5 },
        },
      },
    ];

    const def: ReportDefinition = {
      version: 1,
      mode: "custom",
      filterTree: {
        kind: "group",
        id: "root",
        logic: "AND",
        children: [
          {
            kind: "rule",
            id: "r_dept",
            field: "question:q_dept",
            operator: "in",
            value: ["Kinh doanh", "Kỹ thuật"],
          },
        ],
      },
      computedFields: [],
      groupBy: [{ id: "g_d", field: "question:q_dept", label: "Phòng ban", transform: "exact" }],
      measures: [
        { id: "m_n", field: "responses", agg: "count", label: "N" },
        { id: "m_avg", field: "question:q_rating", agg: "avg", label: "Điểm TB", highlightBest: true },
        {
          id: "m_pct_top",
          field: "question:q_level",
          agg: "percentOfOption",
          targetOptionText: "Rất hài lòng",
          label: "% Rất hài lòng",
          highlightBest: true,
        },
      ],
      chart: { enabled: true, type: "groupedBar", measureId: "m_avg" },
      viewOptions: {
        showEmptyGroups: false,
        sortBy: "m_avg",
        sortDir: "desc",
        maxGroups: 20,
        includeGrandTotal: true,
        pivot: false,
      },
    };

    const output = runReportPipeline(records, questions, def);
    expect(output.filteredRecords.length).toBe(3);
    expect(output.rows[0].groupValues).toEqual(["Kỹ thuật"]);
    expect(output.rows[0].cells.m_avg.value).toBe(10);
    expect(output.rows[0].cells.m_pct_top.value).toBe(100);
    expect(output.rows[1].groupValues).toEqual(["Kinh doanh"]);
    expect(output.rows[1].cells.m_pct_top.value).toBe(50);
    expect(output.rows[1].cells.m_pct_top.recordIds).toEqual(["h1"]);

    // Verify dynamic SYSTEM presets work on arbitrary HR domain
    const presets = buildSystemPresets(questions);
    expect(presets.length).toBeGreaterThanOrEqual(2);
    const outPreset = runReportPipeline(records, questions, presets[0].definition);
    expect(outPreset.rows.length).toBe(3);
  });

  it("Enforces zero hardcoded survey domain keywords inside report-engine and result components", () => {
    const engineDir = path.resolve(__dirname, "..");
    const resultComponentsDir = path.resolve(__dirname, "../../../components/result");
    const forbidden = ["Học lực", "ACADEMIC_BUCKETS", "Khối 12", "Môn Toán", "Môn Văn"];
    const walk = (dir: string): string[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const e of entries) {
        if (e.name === "__tests__") continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) files.push(...walk(full));
        else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) files.push(full);
      }
      return files;
    };

    for (const file of [...walk(engineDir), ...walk(resultComponentsDir)]) {
      const src = fs.readFileSync(file, "utf8");
      for (const term of forbidden) {
        expect(src, `${file} contains forbidden hardcoded term ${term}`).not.toContain(term);
      }
    }
    expect(createEmptyFilterTree().children).toEqual([]);
  });

  it("Prefixes [Page Title] on questions only when survey has >= 2 pages and preserves page titles in presets/metas", () => {
    const singlePageQs = flattenSurveyPagesQuestions([
      {
        id: "page-1",
        title: "Trang duy nhất",
        questions: [{ id: "q1", questionText: "Hạng mục A", questionTypeCode: "NUMBER" }],
      },
    ]);
    expect(singlePageQs[0].pageTitle).toBeNull();
    const singleMetas = buildSurveyFieldMetas(singlePageQs);
    expect(singleMetas.find((m) => m.ref === "question:q1")?.label).toBe("Hạng mục A");

    const multiPageQs = flattenSurveyPagesQuestions([
      {
        id: "p1",
        title: "Hồ sơ phương án A",
        questions: [
          { id: "qa", questionText: "Điểm trung bình", questionTypeCode: "NUMBER" },
          { id: "qcat", questionText: "Phân loại", questionTypeCode: "SINGLE_CHOICE" },
        ],
      },
      {
        id: "p2",
        title: "Hồ sơ phương án B mở rộng",
        questions: [
          { id: "qb", questionText: "Điểm trung bình", questionTypeCode: "NUMBER" },
          {
            id: "qm",
            questionText: "Đánh giá",
            questionTypeCode: "MATRIX_SINGLE",
            matrixConfig: JSON.stringify({ rows: [{ id: "r1", label: "Tiêu chí 1" }], columns: [] }),
          },
        ],
      },
      {
        id: "p3",
        title: "   ",
        questions: [{ id: "qc", questionText: "Ghi chú", questionTypeCode: "TEXT" }],
      },
    ]);

    const metas = buildSurveyFieldMetas(multiPageQs);
    expect(metas.find((m) => m.ref === "question:qa")?.label).toBe("[Hồ sơ phương án A] Điểm trung bình");
    expect(metas.find((m) => m.ref === "question:qb")?.label).toBe("[Hồ sơ phương án B mở rộng] Điểm trung bình");
    expect(metas.find((m) => m.ref === "question:qb")?.shortLabel).toBe("[Hồ sơ phương án B mở rộng] Điểm trung bình");
    expect(metas.find((m) => m.ref === "question:qc")?.label).toBe("[Trang 3] Ghi chú");
    expect(metas.find((m) => m.ref === "question:qm:r1")?.label).toBe("[Hồ sơ phương án B mở rộng] Đánh giá -> Tiêu chí 1");

    const defaultDef = createDefaultReportDefinition(multiPageQs);
    expect(defaultDef.measures.find((m) => m.id === "m_avg_1")?.label).toBe("TB: [Hồ sơ phương án A] Điểm trung bình");
  });
});
