import {
  extractText,
  resolveFieldRawValue,
  type ReportDefinition,
  type ReportOutput,
} from "@/lib/report-engine";
import type { SurveyResultQuestion } from "@/types/report";
import type { DetailExportColumn } from "./excel";

export function escapeCsvCell(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "number") return Number.isFinite(val) ? String(val) : "";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  let str = String(val);
  // Prevent CSV formula injection while keeping plain numbers safe
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildSummaryCsv(
  definition: ReportDefinition,
  output: ReportOutput
): string {
  const lines: string[] = [];

  if (output.pivotMatrix) {
    const p = output.pivotMatrix;
    lines.push(
      [`${p.rowFieldLabel} \\ ${p.colFieldLabel}`, ...p.colKeys, "Tổng dòng"]
        .map(escapeCsvCell)
        .join(",")
    );
    for (const rk of p.rowKeys) {
      const row = [
        rk,
        ...p.colKeys.map((ck) => p.cells[rk]?.[ck]?.displayValue ?? "—"),
        p.rowTotals[rk]?.displayValue ?? "—",
      ];
      lines.push(row.map(escapeCsvCell).join(","));
    }
    lines.push(
      [
        "Tổng cột",
        ...p.colKeys.map((ck) => p.colTotals[ck]?.displayValue ?? "—"),
        p.grandTotal.displayValue ?? "—",
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  } else {
    const groupHeaders =
      definition.groupBy.length > 0
        ? definition.groupBy.map((g, i) => g.label || `Nhóm ${i + 1}`)
        : ["Phạm vi"];
    lines.push(
      [...groupHeaders, ...definition.measures.map((m) => m.label || m.agg)]
        .map(escapeCsvCell)
        .join(",")
    );

    const rows = output.grandTotalRow ? [...output.rows, output.grandTotalRow] : output.rows;
    for (const r of rows) {
      const vals = [
        ...r.groupValues,
        ...definition.measures.map((m) => r.cells[m.id]?.value ?? r.cells[m.id]?.displayValue ?? "—"),
      ];
      lines.push(vals.map(escapeCsvCell).join(","));
    }
  }

  return `\uFEFF${lines.join("\r\n")}`;
}

export function buildDetailsCsv(
  output: ReportOutput,
  detailColumns: DetailExportColumn[],
  questions: SurveyResultQuestion[]
): string {
  const questionsById = new Map(questions.map((q) => [q.id, q]));
  const lines: string[] = [
    ["ID Phản hồi", "Thời gian nộp", ...detailColumns.map((c) => c.label)]
      .map(escapeCsvCell)
      .join(","),
  ];

  for (const r of output.filteredRecords) {
    const comp = output.computedValues.get(r.id);
    const cells = detailColumns.map((col) => {
      if (col.isPii && col.maskOnExport) return "***";
      if (!col.fieldRef) return "";
      const raw = resolveFieldRawValue(r, col.fieldRef, questionsById, comp);
      return typeof raw === "number" ? raw : extractText(raw);
    });
    lines.push([r.id, r.submittedAt, ...cells].map(escapeCsvCell).join(","));
  }

  return `\uFEFF${lines.join("\r\n")}`;
}

