import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { DatasetRecord, SurveyResultQuestion } from "@/types/report";
import {
  buildDashboardWorkbookBuffer,
} from "@/lib/report-export/excel";
import {
  buildSurveyFieldMetas,
  computeOverviewComputedFields,
  createDefaultCustomDashboard,
  createEmptyFilterTree,
  createEmptyWidgetSpec,
  runCustomDashboardPipeline,
} from "../index";
import type { CustomDashboardDefinition } from "../types";

describe("Custom Dashboard Engine & Export", () => {
  const questions: SurveyResultQuestion[] = [
    { id: "q_dept", questionText: "Phòng ban", questionTypeCode: "SHORT_TEXT" },
    { id: "q_score", questionText: "Điểm đánh giá", questionTypeCode: "NUMBER" },
    { id: "q_city", questionText: "Thành phố", questionTypeCode: "SHORT_TEXT" },
  ];

  const records: DatasetRecord[] = [
    {
      id: "rec_1",
      requestId: "r1",
      submittedAt: "2026-10-01T08:00:00Z",
      answers: { q_dept: { text: "Kỹ thuật" }, q_score: { number: 85 }, q_city: { text: "Hà Nội" } },
    },
    {
      id: "rec_2",
      requestId: "r2",
      submittedAt: "2026-10-01T08:15:00Z",
      answers: { q_dept: { text: "Kỹ thuật" }, q_score: { number: 90 }, q_city: { text: "Hà Nội" } },
    },
    {
      id: "rec_3",
      requestId: "r3",
      submittedAt: "2026-10-01T08:30:00Z",
      answers: { q_dept: { text: "Kinh doanh" }, q_score: { number: 60 }, q_city: { text: "Đà Nẵng" } },
    },
    {
      id: "rec_4",
      requestId: "r4",
      submittedAt: "2026-10-01T08:45:00Z",
      answers: { q_dept: { text: "Nhân sự" }, q_score: { number: 40 }, q_city: { text: "Hà Nội" } },
    },
    {
      id: "rec_5",
      requestId: "r5",
      submittedAt: "2026-10-01T09:00:00Z",
      answers: { q_dept: { text: "Kinh doanh" }, q_score: { number: 75 }, q_city: { text: "TP HCM" } },
    },
  ];

  const fieldMetas = buildSurveyFieldMetas(questions);

  it("evaluates runCustomDashboardPipeline with 2 widgets, different filters, and ignoreGlobalFilter flag", () => {
    const dashboardDef: CustomDashboardDefinition = {
      version: 2,
      reportKind: "custom_dashboard",
      name: "Dashboard Ban Giám Đốc",
      description: "Theo dõi phòng ban và điểm số",
      globalFilterTree: {
        kind: "group",
        id: "g_root",
        logic: "AND",
        children: [
          // Global filter: score >= 50 (excludes rec_4 with score 40)
          { kind: "rule", id: "r_score_gt50", field: "question:q_score", operator: "gte", value: 50 },
        ],
      },
      computedFields: [
        {
          id: "cf_high",
          name: "Điểm cao (>=80)",
          kind: "formula",
          expression: "=[#q_score] >= 80",
          outputType: "boolean",
        },
      ],
      widgets: [
        // Widget 1: obeys global filter (score >= 50) + city == "Hà Nội"
        {
          id: "w1",
          title: "Hà Nội - Theo Phòng Ban",
          displayMode: "chartAndTable",
          width: "half",
          ignoreGlobalFilter: false,
          filterTree: {
            kind: "group",
            id: "w1_root",
            logic: "AND",
            children: [
              { kind: "rule", id: "r_w1_hn", field: "question:q_city", operator: "equals", value: "Hà Nội" },
            ],
          },
          groupBy: [{ id: "g_dept", field: "question:q_dept", label: "Phòng ban", transform: "exact" }],
          measures: [
            { id: "m_count", field: "responses", agg: "count", label: "Số lượng" },
            { id: "m_avg_score", field: "question:q_score", agg: "avg", label: "TB Điểm" },
          ],
          chart: { enabled: true, type: "groupedBar", measureId: "m_avg_score" },
          viewOptions: {
            showEmptyGroups: false,
            sortBy: "m_count",
            sortDir: "desc",
            maxGroups: 10,
            includeGrandTotal: true,
            pivot: false,
          },
        },
        // Widget 2: ignores global filter! Can see rec_4 (score 40). Filter: score < 70 (rec_3 and rec_4)
        {
          id: "w2",
          title: "Phản hồi điểm thấp (<70)",
          displayMode: "table",
          width: "half",
          ignoreGlobalFilter: true,
          filterTree: {
            kind: "group",
            id: "w2_root",
            logic: "AND",
            children: [
              { kind: "rule", id: "r_w2_low", field: "question:q_score", operator: "lt", value: 70 },
            ],
          },
          groupBy: [{ id: "g_city", field: "question:q_city", label: "Thành phố", transform: "exact" }],
          measures: [{ id: "m_low_n", field: "responses", agg: "count", label: "Số lượng" }],
          chart: { enabled: true, type: "horizontalBar", measureId: "m_low_n" },
          viewOptions: {
            showEmptyGroups: false,
            sortBy: "m_low_n",
            sortDir: "desc",
            maxGroups: 10,
            includeGrandTotal: true,
            pivot: false,
          },
        },
      ],
    };

    const output = runCustomDashboardPipeline(records, questions, dashboardDef);

    // Global checks
    expect(output.totalRecords).toBe(5);
    // rec_4 (score 40) is excluded globally
    expect(output.globalFilteredRecords.map((r) => r.id).sort()).toEqual(["rec_1", "rec_2", "rec_3", "rec_5"].sort());

    // Computed field evaluated
    expect(output.computedValues.get("rec_1")?.cf_high).toBe(true);
    expect(output.computedValues.get("rec_3")?.cf_high).toBe(false);

    // Widget 1 checks (obeys global filter: rec_1, rec_2, rec_3, rec_5) + city === "Hà Nội" -> rec_1, rec_2
    const w1Out = output.widgetOutputs.w1;
    expect(w1Out).toBeDefined();
    expect(w1Out.filteredRecords.map((r) => r.id).sort()).toEqual(["rec_1", "rec_2"]);
    expect(w1Out.rows.length).toBe(1); // "Kỹ thuật"
    expect(w1Out.rows[0].groupValues).toEqual(["Kỹ thuật"]);
    expect(w1Out.rows[0].cells.m_count.value).toBe(2);
    expect(w1Out.rows[0].cells.m_avg_score.value).toBe(87.5);

    // Widget 2 checks (ignoreGlobalFilter: true) -> records scanned = all 5
    // Filter score < 70 -> rec_3 (60) and rec_4 (40)
    const w2Out = output.widgetOutputs.w2;
    expect(w2Out).toBeDefined();
    expect(w2Out.filteredRecords.map((r) => r.id).sort()).toEqual(["rec_3", "rec_4"].sort());
    expect(w2Out.rows.length).toBe(2); // Đà Nẵng (rec_3), Hà Nội (rec_4)
  });

  it("exports multi-widget custom dashboard to valid Excel workbook buffer", async () => {
    const dashboardDef = createDefaultCustomDashboard(questions);
    const output = runCustomDashboardPipeline(records, questions, dashboardDef);

    const buffer = await buildDashboardWorkbookBuffer({
      surveyTitle: "Khảo sát đo lường chất lượng",
      dashboardName: "Dashboard Khảo sát",
      dashboardDef,
      dashboardOutput: output,
      questions,
      fieldMetas,
      piiIncluded: false,
      includeRawDetails: true,
    });

    expect(buffer).toBeDefined();
    expect(buffer.byteLength).toBeGreaterThan(1000);

    // Parse and verify sheet structure with ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheetNames = workbook.worksheets.map((ws) => ws.name);
    expect(sheetNames).toContain("Tong_quan");
    expect(sheetNames).toContain("Du_lieu_chi_tiet");
    // Should have sheets for each widget in the dashboard
    expect(workbook.worksheets.length).toBeGreaterThanOrEqual(3);

    const overviewSheet = workbook.getWorksheet("Tong_quan");
    expect(overviewSheet).toBeDefined();
    expect(overviewSheet?.getCell(2, 2).value).toBe("Khảo sát đo lường chất lượng");
  });

  it("generates default custom dashboard and empty widget specs properly", () => {
    const emptyWidget = createEmptyWidgetSpec(questions, 0);
    expect(emptyWidget.id).toBe("widget_1");
    expect(emptyWidget.displayMode).toBe("chartAndTable");
    expect(emptyWidget.width).toBe("full");
    expect(emptyWidget.groupBy.length).toBeGreaterThan(0);
    expect(emptyWidget.measures.length).toBeGreaterThan(0);

    const defaultDash = createDefaultCustomDashboard(questions);
    expect(defaultDash.version).toBe(2);
    expect(defaultDash.reportKind).toBe("custom_dashboard");
    expect(defaultDash.widgets.length).toBe(2);
  });

  it("computes overview questions for computed fields accurately", () => {
    const def: CustomDashboardDefinition = {
      version: 2,
      reportKind: "custom_dashboard",
      globalFilterTree: createEmptyFilterTree(),
      computedFields: [
        {
          id: "cf_num_mult",
          name: "Điểm x 2",
          kind: "formula",
          expression: "=[#q_score] * 2",
          outputType: "number",
        },
        {
          id: "cf_is_pass",
          name: "Đạt chuẩn",
          kind: "formula",
          expression: "=[#q_score] >= 70",
          outputType: "boolean",
        },
      ],
      widgets: [],
    };

    const output = runCustomDashboardPipeline(records, questions, def);
    expect(output.totalRecords).toBe(5);

    const overviewStats = computeOverviewComputedFields(records, def.computedFields, output.computedValues);

    expect(overviewStats.length).toBe(2);

    const numStat = overviewStats[0];
    expect(numStat.questionId).toBe("cf_num_mult");
    expect(numStat.questionTypeCode).toBe("NUMBER");
    expect(numStat.numberStatistics?.count).toBe(5);
    // (85*2 + 90*2 + 60*2 + 40*2 + 75*2) / 5 = (170 + 180 + 120 + 80 + 150) / 5 = 700 / 5 = 140
    expect(numStat.numberStatistics?.average).toBe(140);
    expect(numStat.numberStatistics?.min).toBe(80);
    expect(numStat.numberStatistics?.max).toBe(180);
    expect((numStat as unknown as { dynamicBuckets?: unknown[] }).dynamicBuckets?.length).toBeGreaterThan(0);

    const boolStat = overviewStats[1];
    expect(boolStat.questionId).toBe("cf_is_pass");
    expect(boolStat.questionTypeCode).toBe("SINGLE_CHOICE");
    expect(boolStat.choiceStatistics?.options.length).toBe(2);
    // 85 (true), 90 (true), 60 (false), 40 (false), 75 (true) -> 3 true, 2 false
    expect(boolStat.choiceStatistics?.options[0].optionText).toBe("true");
    expect(boolStat.choiceStatistics?.options[0].count).toBe(3);
    expect(boolStat.choiceStatistics?.options[1].optionText).toBe("false");
    expect(boolStat.choiceStatistics?.options[1].count).toBe(2);
  });

  it("produces pivotMatrix for 2-dimensional multi-line chart (score vs group)", () => {
    const multiLineWidgetDef: CustomDashboardDefinition = {
      version: 2,
      reportKind: "custom_dashboard",
      globalFilterTree: createEmptyFilterTree(),
      computedFields: [],
      widgets: [
        {
          id: "w_multiline",
          title: "Phân bố điểm theo Phòng ban",
          displayMode: "chartOnly",
          width: "full",
          ignoreGlobalFilter: false,
          filterTree: createEmptyFilterTree(),
          groupBy: [
            { id: "g1", field: "question:q_score", label: "Mốc điểm", transform: "exact" },
            { id: "g2", field: "question:q_dept", label: "Phòng ban", transform: "exact" },
          ],
          measures: [
            { id: "m_cnt", field: "responses", agg: "count", label: "Số lượng" },
          ],
          viewOptions: {
            pivot: true,
            includeGrandTotal: false,
            showEmptyGroups: false,
          },
          chart: {
            enabled: true,
            type: "line",
            measureId: "m_cnt",
          },
        },
      ],
    };

    const out = runCustomDashboardPipeline(records, questions, multiLineWidgetDef);
    const widgetOut = out.widgetOutputs.w_multiline;
    expect(widgetOut).toBeDefined();
    expect(widgetOut.pivotMatrix).toBeDefined();
    // rowKeys are scores
    expect(widgetOut.pivotMatrix?.rowKeys).toEqual(expect.arrayContaining(["85", "90", "60", "40", "75"]));
    // colKeys are departments (series lines)
    expect(widgetOut.pivotMatrix?.colKeys).toEqual(expect.arrayContaining(["Kỹ thuật", "Kinh doanh", "Nhân sự"]));
    // cell check
    expect(widgetOut.pivotMatrix?.cells["85"]?.["Kỹ thuật"]?.value).toBe(1);
    expect(widgetOut.pivotMatrix?.cells["85"]?.["Kỹ thuật"]?.recordIds).toContain("rec_1");
  });

  it("should correctly handle permanent and temporary scoped computed fields in pipeline", () => {
    const permField = {
      id: "cf_perm",
      name: "Cột vĩnh viễn (Phòng chuẩn hóa)",
      scope: "permanent" as const,
      kind: "extract" as const,
      sourceField: "question:q_dept" as const,
      extractType: "firstWord" as const,
    };

    const tempField = {
      id: "cf_temp",
      name: "Cột tạm thời (Thang điểm 10)",
      scope: "temporary" as const,
      kind: "formula" as const,
      expression: "=[#q_score] / 10",
    };

    const dashboardDef: CustomDashboardDefinition = {
      version: 2,
      reportKind: "custom_dashboard",
      name: "Dashboard Scope Test",
      globalFilterTree: createEmptyFilterTree(),
      computedFields: [tempField],
      widgets: [
        {
          id: "w_scope",
          title: "Widget Scope Test",
          displayMode: "both",
          width: "full",
          ignoreGlobalFilter: false,
          filterTree: createEmptyFilterTree(),
          groupBy: [
            { id: "g1", field: "computed:cf_perm", label: "Phòng (Vĩnh viễn)", transform: "exact" },
          ],
          measures: [
            { id: "m_avg", field: "computed:cf_temp", agg: "avg", label: "Điểm TB / 10" },
          ],
          viewOptions: {
            pivot: false,
            includeGrandTotal: false,
            showEmptyGroups: false,
          },
          chart: { enabled: true, type: "bar", measureId: "m_avg" },
        },
      ],
    };

    // Run pipeline with shared permanent field + dashboard temporary field
    const output = runCustomDashboardPipeline(records, questions, dashboardDef, [permField]);

    expect(output.computedValues.has("rec_1")).toBe(true);

    const rec1Vals = output.computedValues.get("rec_1");
    expect(rec1Vals?.cf_perm).toBe("Kỹ"); // firstWord of "Kỹ thuật"
    expect(rec1Vals?.cf_temp).toBe(8.5); // 85 / 10

    const widgetOut = output.widgetOutputs.w_scope;
    expect(widgetOut.rows.length).toBeGreaterThan(0);
    const rowKy = widgetOut.rows.find((r) => r.rowKey === "Kỹ");
    expect(rowKy).toBeDefined();
    expect(rowKy?.cells.m_avg?.value).toBeCloseTo(8.75, 2); // (85 + 90) / 20 = 8.75
  });
});
