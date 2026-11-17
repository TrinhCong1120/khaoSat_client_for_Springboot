import ExcelJS from "exceljs";
import {
  describeFilterTree,
  extractText,
  resolveFieldRawValue,
  type CustomDashboardDefinition,
  type CustomDashboardOutput,
  type FieldRef,
  type ReportDefinition,
  type ReportOutput,
  type SurveyFieldMeta,
} from "@/lib/report-engine";
import type { DatasetRecord, SurveyResultQuestion } from "@/types/report";

export type DetailExportColumn = {
  id: string;
  label: string;
  kind: "meta" | "field" | "computed";
  fieldRef?: FieldRef;
  isPii?: boolean;
  maskOnExport?: boolean;
};

export type BuildExcelParams = {
  surveyTitle: string;
  reportName: string;
  definition: ReportDefinition;
  output: ReportOutput;
  questions: SurveyResultQuestion[];
  fieldMetas: SurveyFieldMeta[];
  piiIncluded: boolean;
  includeSheets: {
    overview: boolean;
    summary: boolean;
    details: boolean;
  };
  detailColumns: DetailExportColumn[];
};

export async function buildReportWorkbookBuffer(params: BuildExcelParams): Promise<ArrayBuffer> {
  const {
    surveyTitle,
    reportName,
    definition,
    output,
    questions,
    fieldMetas,
    piiIncluded,
    includeSheets,
    detailColumns,
  } = params;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Enterprise Survey Platform";
  workbook.created = new Date();

  const fieldMap = new Map<string, SurveyFieldMeta>(fieldMetas.map((m) => [m.ref, m]));
  const questionsById = new Map(questions.map((q) => [q.id, q]));

  if (includeSheets.overview) {
    const ws = workbook.addWorksheet("Tong_quan");
    ws.columns = [
      { header: "Mục thông tin", key: "k", width: 32 },
      { header: "Giá trị / Chi tiết", key: "v", width: 70 },
    ];
    styleHeaderRow(ws.getRow(1));

    const filterDesc = describeFilterTree(definition.filterTree, fieldMap) || "Không có bộ lọc (Toàn bộ dữ liệu)";
    const formulaDesc =
      definition.computedFields.length > 0
        ? definition.computedFields
            .map((c) => `${c.name} (${c.kind === "formula" ? c.expression : c.kind})`)
            .join("; ")
        : "Không có cột tự tạo";

    ws.addRows([
      { k: "Tên khảo sát", v: surveyTitle },
      { k: "Tên báo cáo", v: reportName || "Báo cáo tổng hợp động" },
      { k: "Thời gian xuất", v: new Date().toLocaleString("vi-VN") },
      { k: "Trạng thái dữ liệu nhạy cảm (PII)", v: piiIncluded ? "Đã mở khóa (có quyền EXPORT_DATA)" : "Đang che mặc định (Masked)" },
      { k: "Tổng số phản hồi gốc", v: output.totalRecords },
      { k: "Số phản hồi khớp bộ lọc", v: output.filteredRecords.length },
      { k: "Điều kiện lọc đang áp dụng", v: filterDesc },
      { k: "Cột tự tạo / Công thức", v: formulaDesc },
      { k: "Chế độ bảng tổng hợp", v: definition.viewOptions.pivot ? "Bảng chéo Pivot 2 chiều" : "Bảng gom nhóm đa chỉ số" },
    ]);
    ws.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.getCell(1).font = { bold: true };
        row.getCell(2).alignment = { wrapText: true };
      }
    });
  }

  if (includeSheets.summary) {
    const ws = workbook.addWorksheet("Bang_tong_hop");
    if (output.pivotMatrix) {
      renderPivotSheet(ws, output);
    } else {
      renderFlatSummarySheet(ws, definition, output);
    }
  }

  if (includeSheets.details) {
    const ws = workbook.addWorksheet("Du_lieu_chi_tiet");
    renderDetailSheet(ws, output.filteredRecords, output.computedValues, detailColumns, questionsById);
  }

  if (workbook.worksheets.length === 0) {
    workbook.addWorksheet("Tong_quan").addRow(["Không có sheet nào được chọn"]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

export type BuildDashboardExcelParams = {
  surveyTitle: string;
  dashboardName?: string;
  dashboardDef: CustomDashboardDefinition;
  dashboardOutput: CustomDashboardOutput;
  questions: SurveyResultQuestion[];
  fieldMetas: SurveyFieldMeta[];
  piiIncluded: boolean;
  includeRawDetails?: boolean;
};

export async function buildDashboardWorkbookBuffer(
  params: BuildDashboardExcelParams
): Promise<ArrayBuffer> {
  const {
    surveyTitle,
    dashboardName,
    dashboardDef,
    dashboardOutput,
    questions,
    fieldMetas,
    piiIncluded,
    includeRawDetails = true,
  } = params;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Enterprise Survey Platform";
  workbook.created = new Date();

  const fieldMap = new Map<string, SurveyFieldMeta>(fieldMetas.map((m) => [m.ref, m]));
  const questionsById = new Map(questions.map((q) => [q.id, q]));

  // Sheet 1: Tong_quan
  const wsOverview = workbook.addWorksheet("Tong_quan");
  wsOverview.columns = [
    { header: "Mục thông tin", key: "k", width: 32 },
    { header: "Giá trị / Chi tiết", key: "v", width: 70 },
  ];
  styleHeaderRow(wsOverview.getRow(1));

  const globalFilterDesc =
    describeFilterTree(dashboardDef.globalFilterTree, fieldMap) ||
    "Không có bộ lọc (Toàn bộ dữ liệu)";
  const formulaDesc =
    dashboardDef.computedFields.length > 0
      ? dashboardDef.computedFields
          .map((c) => `${c.name} (${c.kind === "formula" ? c.expression : c.kind})`)
          .join("; ")
      : "Không có cột tự tạo";

  wsOverview.addRows([
    { k: "Tên khảo sát", v: surveyTitle },
    { k: "Tên dashboard", v: dashboardName || dashboardDef.name || "Bảng điều khiển tùy chỉnh" },
    { k: "Thời gian xuất", v: new Date().toLocaleString("vi-VN") },
    {
      k: "Trạng thái dữ liệu nhạy cảm (PII)",
      v: piiIncluded
        ? "Đã mở khóa (có quyền EXPORT_DATA)"
        : "Đang che mặc định (Masked)",
    },
    { k: "Tổng số phản hồi gốc", v: dashboardOutput.totalRecords },
    { k: "Số phản hồi khớp bộ lọc chung", v: dashboardOutput.globalFilteredRecords.length },
    { k: "Điều kiện lọc chung", v: globalFilterDesc },
    { k: "Cột tự tạo / Công thức", v: formulaDesc },
    { k: "Số lượng widget", v: dashboardDef.widgets.length },
    {
      k: "Danh sách widget",
      v: dashboardDef.widgets.map((w, idx) => `${idx + 1}. ${w.title}`).join("; "),
    },
  ]);

  wsOverview.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.getCell(1).font = { bold: true };
      row.getCell(2).alignment = { wrapText: true };
    }
  });

  // Widget sheets
  const usedSheetNames = new Set<string>(["Tong_quan"]);
  const sanitizeSheetName = (rawName: string, fallbackIdx: number): string => {
    let cleaned = rawName.replace(/[\\/?*\[\]:]/g, "_").trim();
    if (!cleaned) cleaned = `Widget_${fallbackIdx}`;
    if (cleaned.length > 28) cleaned = cleaned.slice(0, 28);
    let finalName = cleaned;
    let counter = 1;
    while (usedSheetNames.has(finalName)) {
      finalName = `${cleaned.slice(0, 27 - String(counter).length)}_${counter}`;
      counter++;
    }
    usedSheetNames.add(finalName);
    return finalName;
  };

  dashboardDef.widgets.forEach((widget, idx) => {
    const widgetOutput = dashboardOutput.widgetOutputs[widget.id];
    if (!widgetOutput) return;

    const sheetName = sanitizeSheetName(`W${idx + 1}_${widget.title}`, idx + 1);
    const ws = workbook.addWorksheet(sheetName);

    const widgetDef: ReportDefinition = {
      version: 1,
      mode: "custom",
      filterTree: widget.filterTree,
      computedFields: dashboardDef.computedFields,
      groupBy: widget.groupBy,
      measures: widget.measures,
      chart: widget.chart,
      viewOptions: widget.viewOptions,
    };

    if (widgetOutput.pivotMatrix) {
      renderPivotSheet(ws, widgetOutput);
    } else {
      renderFlatSummarySheet(ws, widgetDef, widgetOutput);
    }
  });

  // Optional: Du_lieu_chi_tiet
  if (includeRawDetails) {
    const detailColumns: DetailExportColumn[] = fieldMetas.map((m) => ({
      id: m.ref,
      label: m.label,
      kind: m.kind === "computed" ? "computed" : "field",
      fieldRef: m.ref,
      isPii: m.isPii,
      maskOnExport: !piiIncluded && m.isPii,
    }));
    const wsDetails = workbook.addWorksheet("Du_lieu_chi_tiet");
    renderDetailSheet(
      wsDetails,
      dashboardOutput.globalFilteredRecords,
      dashboardOutput.computedValues,
      detailColumns,
      questionsById
    );
  }

  if (workbook.worksheets.length === 0) {
    workbook.addWorksheet("Tong_quan").addRow(["Không có sheet nào được chọn"]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

function renderFlatSummarySheet(
  ws: ExcelJS.Worksheet,
  definition: ReportDefinition,
  output: ReportOutput
) {
  const groupHeaders =
    definition.groupBy.length > 0
      ? definition.groupBy.map((g, i) => g.label || `Nhóm ${i + 1}`)
      : ["Phạm vi"];
  const measureHeaders = definition.measures.map((m) => m.label || m.agg);

  ws.addRow([...groupHeaders, ...measureHeaders]);
  styleHeaderRow(ws.getRow(1));

  const appendResultRow = (rowObj: typeof output.rows[number], isTotal: boolean) => {
    const values: Array<string | number | null> = [
      ...rowObj.groupValues,
      ...definition.measures.map((m) => {
        const cell = rowObj.cells[m.id];
        if (!cell || cell.value === null) return "—";
        return cell.value;
      }),
    ];
    const row = ws.addRow(values);

    definition.measures.forEach((m, idx) => {
      const colIdx = groupHeaders.length + idx + 1;
      const cell = row.getCell(colIdx);
      const metaCell = rowObj.cells[m.id];
      if (metaCell && metaCell.value !== null) {
        if (m.agg === "count") cell.numFmt = "#,##0";
        else if (m.agg === "percentOfTotal" || m.agg === "percentOfOption") cell.numFmt = '0.0"%"';
        else cell.numFmt = "#,##0.##";

        if (!isTotal) {
          if (metaCell.isBest) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
            cell.font = { bold: true, color: { argb: "FF166534" } };
          } else if (metaCell.isWorst) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
            cell.font = { bold: true, color: { argb: "FF92400E" } };
          }
        }
      }
    });

    if (isTotal) {
      row.font = { bold: true };
      row.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      });
    }
  };

  for (const r of output.rows) {
    appendResultRow(r, false);
  }
  if (output.grandTotalRow) {
    appendResultRow(output.grandTotalRow, true);
  }

  autoFitColumns(ws);
}

function renderPivotSheet(ws: ExcelJS.Worksheet, output: ReportOutput) {
  const pivot = output.pivotMatrix!;
  ws.addRow([`${pivot.rowFieldLabel} \\ ${pivot.colFieldLabel}`, ...pivot.colKeys, "Tổng dòng"]);
  styleHeaderRow(ws.getRow(1));

  for (const rk of pivot.rowKeys) {
    const meta = pivot.tickMetaMap?.[rk];
    const rowLabel = meta ? meta.displayLabel : rk;
    const rowVals: Array<string | number> = [rowLabel];
    for (const ck of pivot.colKeys) {
      const c = pivot.cells[rk]?.[ck];
      rowVals.push(c?.value != null ? c.value : "—");
    }
    const rTot = pivot.rowTotals[rk];
    rowVals.push(rTot?.value != null ? rTot.value : "—");
    const row = ws.addRow(rowVals);

    pivot.colKeys.forEach((ck, idx) => {
      const c = pivot.cells[rk]?.[ck];
      const cell = row.getCell(idx + 2);
      if (c?.isBest) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
        cell.font = { bold: true, color: { argb: "FF166534" } };
      } else if (c?.isWorst) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
        cell.font = { bold: true, color: { argb: "FF92400E" } };
      }
    });
  }

  const totRowVals: Array<string | number> = ["Tổng cột"];
  for (const ck of pivot.colKeys) {
    const c = pivot.colTotals[ck];
    totRowVals.push(c?.value != null ? c.value : "—");
  }
  totRowVals.push(pivot.grandTotal.value != null ? pivot.grandTotal.value : "—");
  const totRow = ws.addRow(totRowVals);
  totRow.font = { bold: true };
  autoFitColumns(ws);
}

function renderDetailSheet(
  ws: ExcelJS.Worksheet,
  records: DatasetRecord[],
  computedValues: Map<string, Record<string, unknown>>,
  columns: DetailExportColumn[],
  questionsById: Map<string, SurveyResultQuestion>
) {
  ws.addRow(["ID Phản hồi", "Thời gian nộp", ...columns.map((c) => c.label)]);
  styleHeaderRow(ws.getRow(1));

  for (const r of records) {
    const comp = computedValues.get(r.id);
    const rowVals: Array<string | number | boolean> = [
      r.id,
      r.submittedAt ? new Date(r.submittedAt).toLocaleString("vi-VN") : "",
    ];

    for (const col of columns) {
      if (col.isPii && col.maskOnExport) {
        rowVals.push("***");
        continue;
      }
      if (!col.fieldRef) {
        rowVals.push("");
        continue;
      }
      const raw = resolveFieldRawValue(r, col.fieldRef, questionsById, comp);
      if (typeof raw === "number" || typeof raw === "boolean") {
        rowVals.push(raw);
      } else {
        rowVals.push(extractText(raw));
      }
    }
    ws.addRow(rowVals);
  }

  autoFitColumns(ws);
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  row.height = 24;
}

function autoFitColumns(ws: ExcelJS.Worksheet) {
  ws.columns.forEach((col) => {
    let maxLen = 14;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length + 3;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(48, maxLen);
  });
}

export function triggerBlobDownload(data: BlobPart, mimeType: string, filename: string) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

