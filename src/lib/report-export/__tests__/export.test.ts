import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { DatasetRecord, SurveyResultQuestion } from "@/types/report";
import { buildSurveyFieldMetas, runReportPipeline, type ReportDefinition } from "@/lib/report-engine";
import { buildDetailsCsv, buildReportWorkbookBuffer, buildSummaryCsv, escapeCsvCell } from "../index";

const questions: SurveyResultQuestion[] = [
  { id: "q1", questionText: "Lớp", questionTypeCode: "SHORT_TEXT" },
  { id: "q2", questionText: "Điểm số", questionTypeCode: "NUMBER" },
  { id: "q3", questionText: "Số điện thoại", questionTypeCode: "SHORT_TEXT" },
];

const records: DatasetRecord[] = [
  {
    id: "rec-1",
    requestId: "rq-1",
    submittedAt: "2026-10-01T10:00:00Z",
    answers: {
      q1: { text: "12A1" },
      q2: { number: 9 },
      q3: { text: "090***12" },
    },
  },
  {
    id: "rec-2",
    requestId: "rq-2",
    submittedAt: "2026-10-02T10:00:00Z",
    answers: {
      q1: { text: "12B1" },
      q2: { number: 7 },
      q3: { text: "098***34" },
    },
  },
];

const def: ReportDefinition = {
  version: 1,
  mode: "custom",
  filterTree: { kind: "group", id: "root", logic: "AND", children: [] },
  computedFields: [],
  groupBy: [{ id: "g1", field: "question:q1", label: "Nhóm lớp", transform: "firstLetter" }],
  measures: [
    { id: "m_n", field: "responses", agg: "count", label: "N", highlightBest: true },
    { id: "m_avg", field: "question:q2", agg: "avg", label: "TB Điểm", highlightBest: true },
  ],
  chart: { enabled: true, type: "groupedBar", measureId: "m_avg" },
  viewOptions: {
    showEmptyGroups: false,
    sortBy: "m_avg",
    sortDir: "desc",
    maxGroups: 50,
    includeGrandTotal: true,
    pivot: false,
  },
};

describe("Client ExcelJS & CSV Exporters", () => {
  it("exports valid .xlsx workbook with 3 sheets matching screen numbers", async () => {
    const output = runReportPipeline(records, questions, def);
    const metas = buildSurveyFieldMetas(questions, ["q3"]);

    const buf = await buildReportWorkbookBuffer({
      surveyTitle: "Khảo sát mẫu",
      reportName: "Báo cáo tổng hợp",
      definition: def,
      output,
      questions,
      fieldMetas: metas,
      piiIncluded: false,
      includeSheets: { overview: true, summary: true, details: true },
      detailColumns: [
        { id: "q1", label: "Lớp", kind: "field", fieldRef: "question:q1" },
        { id: "q2", label: "Điểm số", kind: "field", fieldRef: "question:q2" },
        { id: "q3", label: "Số điện thoại", kind: "field", fieldRef: "question:q3", isPii: true, maskOnExport: true },
      ],
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Tong_quan", "Bang_tong_hop", "Du_lieu_chi_tiet"]);

    const summarySheet = wb.getWorksheet("Bang_tong_hop")!;
    // Header + Row A + Row B + Grand Total = 4 rows
    expect(summarySheet.rowCount).toBe(4);
    expect(summarySheet.getRow(2).getCell(1).value).toBe("A");
    expect(summarySheet.getRow(2).getCell(2).value).toBe(1);
    expect(summarySheet.getRow(2).getCell(3).value).toBe(9);

    const detailSheet = wb.getWorksheet("Du_lieu_chi_tiet")!;
    expect(detailSheet.rowCount).toBe(3);
    // Masked PII column on detail export
    expect(detailSheet.getRow(2).getCell(5).value).toBe("***");
  });

  it("exports RFC-4180 CSV with UTF-8 BOM and formula injection guard", () => {
    const output = runReportPipeline(records, questions, def);
    const csv = buildSummaryCsv(def, output);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Nhóm lớp,N,TB Điểm");
    expect(csv).toContain("A,1,9");

    const detailCsv = buildDetailsCsv(
      output,
      [{ id: "q1", label: "Lớp", kind: "field", fieldRef: "question:q1" }],
      questions
    );
    expect(detailCsv).toContain("12A1");
    expect(escapeCsvCell('=cmd|"calc"')).toBe(`"'=cmd|""calc"""`);
  });
});

