import type {
  ChoiceOptionStatistic,
  DatasetRecord,
  MatrixRowStatistic,
  MatrixColumnStatistic,
  SurveyResultQuestion,
  SurveyQuestionStatistic,
} from "@/types/report";
import {
  buildDynamicEqualWidthRanges,
} from "./computed";
import {
  extractArrayValues,
  extractText,
  getQuestionLabel,
  normalizeQuestionType,
  parseMatrixAnswer,
  parseMatrixConfig,
  parseSmartNumber,
  resolveFieldRawValue,
} from "./extractors";
import {
  FormulaErrorValue,
  type ComputedField,
  type GroupBySpec,
  type MeasureSpec,
  type NumericHistogramBucket,
  type OverviewQuestionSummary,
  type PivotMatrix,
  type ReportDefinition,
  type ResultCell,
  type ResultRow,
} from "./types";

const EMPTY_GROUP_LABEL = "(Chưa trả lời)";

type BinRange = { label: string; min: number; max: number; inclusiveMax: boolean };

function extractFirstLetter(str: string): string {
  const t = str.trim();
  if (!t) return EMPTY_GROUP_LABEL;
  const letter = /\p{L}/u.exec(t);
  return (letter ? letter[0] : t.charAt(0)).toUpperCase();
}

function extractFirstWord(str: string): string {
  const t = str.trim();
  if (!t) return EMPTY_GROUP_LABEL;
  return t.split(/\s+/)[0] || EMPTY_GROUP_LABEL;
}

function formatDateBucket(raw: unknown, mode: "day" | "month" | "quarter" | "year" | "weekday"): string {
  if (raw == null || raw === "") return EMPTY_GROUP_LABEL;
  const s = String(raw).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = iso
    ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    : new Date(s);
  if (Number.isNaN(d.getTime())) return EMPTY_GROUP_LABEL;
  const pad2 = (n: number) => String(n).padStart(2, "0");
  switch (mode) {
    case "day":
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    case "month":
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    case "quarter":
      return `Q${Math.floor(d.getMonth() / 3) + 1}/${d.getFullYear()}`;
    case "year":
      return String(d.getFullYear());
    case "weekday":
      return ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"][d.getDay()] ?? EMPTY_GROUP_LABEL;
  }
}

function resolveGroupKeysForSpec(
  record: DatasetRecord,
  spec: GroupBySpec,
  questionsById: Map<string, SurveyResultQuestion>,
  recordComputed: Record<string, unknown> | undefined,
  dynamicBinsBySpecId: Map<string, BinRange[]>
): string[] {
  const raw = resolveFieldRawValue(record, spec.field, questionsById, recordComputed);
  if (raw == null || raw === "") return [EMPTY_GROUP_LABEL];

  if (spec.transform === "multiChoiceSplit") {
    const arr = extractArrayValues(raw);
    return arr.length > 0 ? arr : [EMPTY_GROUP_LABEL];
  }

  if (spec.transform === "multiChoiceJoin") {
    const arr = extractArrayValues(raw);
    return arr.length > 0 ? [arr.join(", ")] : [EMPTY_GROUP_LABEL];
  }

  if (spec.transform === "province") {
    if (typeof raw === "object" && raw !== null && "province" in raw) {
      const p = String((raw as { province?: string }).province ?? "").trim();
      return [p || EMPTY_GROUP_LABEL];
    }
    const txt = extractText(raw);
    return [txt.includes("/") ? txt.split("/")[0].trim() || EMPTY_GROUP_LABEL : txt || EMPTY_GROUP_LABEL];
  }

  if (spec.transform === "ward") {
    if (typeof raw === "object" && raw !== null && "ward" in raw) {
      const w = String((raw as { ward?: string }).ward ?? "").trim();
      return [w || EMPTY_GROUP_LABEL];
    }
    const txt = extractText(raw);
    return [txt.includes("/") ? (txt.split("/")[1] ?? "").trim() || EMPTY_GROUP_LABEL : txt || EMPTY_GROUP_LABEL];
  }

  if (spec.transform === "dateDay") return [formatDateBucket(raw, "day")];
  if (spec.transform === "dateMonth") return [formatDateBucket(raw, "month")];
  if (spec.transform === "dateQuarter") return [formatDateBucket(raw, "quarter")];
  if (spec.transform === "dateYear") return [formatDateBucket(raw, "year")];
  if (spec.transform === "dateWeekday") return [formatDateBucket(raw, "weekday")];

  if (spec.transform === "numberBin") {
    const num = parseSmartNumber(raw);
    if (num === null) return [EMPTY_GROUP_LABEL];
    const bins = dynamicBinsBySpecId.get(spec.id) ?? [];
    for (const b of bins) {
      if (num >= b.min && (b.inclusiveMax ? num <= b.max : num < b.max)) {
        return [b.label];
      }
    }
    return [EMPTY_GROUP_LABEL];
  }

  const text = extractText(raw).trim();
  if (!text) return [EMPTY_GROUP_LABEL];

  switch (spec.transform) {
    case "firstLetter":
      return [extractFirstLetter(text)];
    case "firstWord":
      return [extractFirstWord(text)];
    case "beforeDash": {
      const idx = text.search(/\s*[-–—]\s*/);
      return [(idx === -1 ? text : text.slice(0, idx).trim()) || EMPTY_GROUP_LABEL];
    }
    case "afterDash": {
      const m = /\s*[-–—]\s*(.+)$/.exec(text);
      return [(m ? m[1].trim() : text) || EMPTY_GROUP_LABEL];
    }
    case "exact":
    default:
      return [text];
  }
}

export function formatMeasureDisplay(val: number | null, agg: MeasureSpec["agg"]): string {
  if (val === null || !Number.isFinite(val)) return "—";
  if (agg === "count") return String(Math.round(val));
  if (agg === "percentOfTotal" || agg === "percentOfOption") {
    return `${val.toFixed(1)}%`;
  }
  return Number.isInteger(val) ? String(val) : val.toFixed(2).replace(/\.?0+$/, "");
}

function computeCellForGroup(
  groupRecords: DatasetRecord[],
  measure: MeasureSpec,
  totalFilteredCount: number,
  questionsById: Map<string, SurveyResultQuestion>,
  computedValues: Map<string, Record<string, unknown>>
): ResultCell {
  const uniqueIds = Array.from(new Set(groupRecords.map((r) => r.id)));

  if (measure.agg === "count") {
    return {
      value: uniqueIds.length,
      displayValue: String(uniqueIds.length),
      recordIds: uniqueIds,
    };
  }

  if (measure.agg === "percentOfTotal") {
    const pct = totalFilteredCount > 0 ? (uniqueIds.length / totalFilteredCount) * 100 : 0;
    return {
      value: Number(pct.toFixed(2)),
      displayValue: formatMeasureDisplay(pct, "percentOfTotal"),
      recordIds: uniqueIds,
    };
  }

  if (measure.agg === "percentOfOption") {
    const targetText = (measure.targetOptionText ?? "").trim().toLowerCase();
    const targetId = (measure.targetOptionId ?? "").trim();
    const matchedIds: string[] = [];

    for (const r of groupRecords) {
      if (measure.field === "responses") continue;
      const comp = computedValues.get(r.id);
      if (measure.field.startsWith("question:") && targetId) {
        const qId = measure.field.split(":")[1];
        const optIds = r.answers?.[qId]?.optionIds ?? [];
        if (optIds.includes(targetId)) {
          matchedIds.push(r.id);
          continue;
        }
      }
      const raw = resolveFieldRawValue(r, measure.field, questionsById, comp);
      const vals = extractArrayValues(raw).map((v) => v.toLowerCase());
      if (targetText && vals.includes(targetText)) {
        matchedIds.push(r.id);
      }
    }

    const dedupMatched = Array.from(new Set(matchedIds));
    const pct = uniqueIds.length > 0 ? (dedupMatched.length / uniqueIds.length) * 100 : 0;
    return {
      value: Number(pct.toFixed(2)),
      displayValue: formatMeasureDisplay(pct, "percentOfOption"),
      recordIds: dedupMatched,
    };
  }

  if (measure.field === "responses") {
    return { value: null, displayValue: "—", recordIds: uniqueIds };
  }

  const samples: Array<{ recordId: string; num: number }> = [];
  for (const r of groupRecords) {
    const raw = resolveFieldRawValue(r, measure.field, questionsById, computedValues.get(r.id));
    const num = parseSmartNumber(raw);
    if (num !== null) {
      samples.push({ recordId: r.id, num });
    }
  }

  if (samples.length === 0) {
    return { value: null, displayValue: "—", recordIds: [] };
  }

  const numericRecordIds = Array.from(new Set(samples.map((s) => s.recordId)));
  const nums = samples.map((s) => s.num);

  switch (measure.agg) {
    case "sum": {
      const sum = nums.reduce((a, b) => a + b, 0);
      return {
        value: Number(sum.toFixed(4)),
        displayValue: formatMeasureDisplay(sum, "sum"),
        recordIds: numericRecordIds,
      };
    }
    case "avg": {
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      return {
        value: Number(avg.toFixed(4)),
        displayValue: formatMeasureDisplay(avg, "avg"),
        recordIds: numericRecordIds,
      };
    }
    case "min": {
      const min = Math.min(...nums);
      const exactIds = Array.from(
        new Set(samples.filter((s) => Math.abs(s.num - min) < 1e-9).map((s) => s.recordId))
      );
      return {
        value: Number(min.toFixed(4)),
        displayValue: formatMeasureDisplay(min, "min"),
        recordIds: exactIds,
      };
    }
    case "max": {
      const max = Math.max(...nums);
      const exactIds = Array.from(
        new Set(samples.filter((s) => Math.abs(s.num - max) < 1e-9).map((s) => s.recordId))
      );
      return {
        value: Number(max.toFixed(4)),
        displayValue: formatMeasureDisplay(max, "max"),
        recordIds: exactIds,
      };
    }
    case "median": {
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median =
        sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      return {
        value: Number(median.toFixed(4)),
        displayValue: formatMeasureDisplay(median, "median"),
        recordIds: numericRecordIds,
      };
    }
    case "p90": {
      const sorted = [...nums].sort((a, b) => a - b);
      const pos = (sorted.length - 1) * 0.9;
      const lo = Math.floor(pos);
      const hi = Math.ceil(pos);
      const p90 = sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
      return {
        value: Number(p90.toFixed(4)),
        displayValue: formatMeasureDisplay(p90, "p90"),
        recordIds: numericRecordIds,
      };
    }
    case "stddev": {
      if (nums.length <= 1) {
        return {
          value: 0,
          displayValue: formatMeasureDisplay(0, "stddev"),
          recordIds: numericRecordIds,
        };
      }
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const variance = nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (nums.length - 1);
      const std = Math.sqrt(variance);
      return {
        value: Number(std.toFixed(4)),
        displayValue: formatMeasureDisplay(std, "stddev"),
        recordIds: numericRecordIds,
      };
    }
  }
}

export function aggregateReport(
  filteredRecords: DatasetRecord[],
  questions: SurveyResultQuestion[],
  questionsById: Map<string, SurveyResultQuestion>,
  computedValues: Map<string, Record<string, unknown>>,
  definition: ReportDefinition
): {
  rows: ResultRow[];
  grandTotalRow: ResultRow | null;
  pivotMatrix: PivotMatrix | null;
  overviewQuestions: OverviewQuestionSummary[];
} {
  const groupSpecs = definition.groupBy.slice(0, 3);
  const measures: MeasureSpec[] =
    definition.measures.length > 0
      ? definition.measures
      : [{ id: "m_count", field: "responses", agg: "count", label: "Số phiếu (N)" }];

  // Precompute dynamic numeric bins for group-by specs that need numberBin
  const dynamicBinsBySpecId = new Map<string, BinRange[]>();
  for (const spec of groupSpecs) {
    if (spec.transform === "numberBin") {
      const nums = filteredRecords
        .map((r) => parseSmartNumber(resolveFieldRawValue(r, spec.field, questionsById, computedValues.get(r.id))))
        .filter((n): n is number => n !== null);
      dynamicBinsBySpecId.set(spec.id, buildDynamicEqualWidthRanges(nums, spec.binStep, spec.binCount ?? 5));
    }
  }

  // Group records by composite dimension tuples (cartesian product only on multiChoiceSplit)
  const bucketMap = new Map<string, { groupValues: string[]; records: DatasetRecord[] }>();

  for (const record of filteredRecords) {
    const recComp = computedValues.get(record.id);
    if (groupSpecs.length === 0) {
      const key = "__ALL__";
      if (!bucketMap.has(key)) {
        bucketMap.set(key, { groupValues: ["Tất cả phản hồi"], records: [] });
      }
      bucketMap.get(key)!.records.push(record);
      continue;
    }

    const dimKeyLists = groupSpecs.map((spec) =>
      resolveGroupKeysForSpec(record, spec, questionsById, recComp, dynamicBinsBySpecId)
    );

    const tuples = cartesianTuples(dimKeyLists);
    for (const tuple of tuples) {
      if (!definition.viewOptions.showEmptyGroups && tuple.every((v) => v === EMPTY_GROUP_LABEL)) {
        continue;
      }
      const compositeKey = tuple.join("\u0000");
      if (!bucketMap.has(compositeKey)) {
        bucketMap.set(compositeKey, { groupValues: tuple, records: [] });
      }
      bucketMap.get(compositeKey)!.records.push(record);
    }
  }

  const totalFiltered = filteredRecords.length;
  let rows: ResultRow[] = Array.from(bucketMap.entries()).map(([rowKey, bucket]) => {
    const cells: Record<string, ResultCell> = {};
    for (const m of measures) {
      cells[m.id] = computeCellForGroup(
        bucket.records,
        m,
        totalFiltered,
        questionsById,
        computedValues
      );
    }
    return {
      rowKey,
      groupValues: bucket.groupValues,
      groupRecordIds: Array.from(new Set(bucket.records.map((r) => r.id))),
      cells,
    };
  });

  // Sort rows
  const { sortBy, sortDir, maxGroups } = definition.viewOptions;
  rows.sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (!sortBy || sortBy === "group") {
      return (
        a.groupValues
          .join(" ")
          .localeCompare(b.groupValues.join(" "), "vi", { numeric: true }) * dir
      );
    }
    const va = a.cells[sortBy]?.value;
    const vb = b.cells[sortBy]?.value;
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return (va - vb) * dir;
  });

  if (maxGroups > 0 && rows.length > maxGroups) {
    rows = rows.slice(0, maxGroups);
  }

  // Highlight Best / Worst per Measure column (only when >= 2 rows have non-null distinct values)
  for (const m of measures) {
    if (!m.highlightBest && !m.highlightWorst) continue;
    const numericCells = rows
      .map((r) => r.cells[m.id])
      .filter((c) => c && c.value !== null && Number.isFinite(c.value));
    if (numericCells.length < 2) continue;

    const vals = numericCells.map((c) => c.value as number);
    const maxVal = Math.max(...vals);
    const minVal = Math.min(...vals);
    if (Math.abs(maxVal - minVal) < 1e-9) continue;

    for (const c of numericCells) {
      if (m.highlightBest && Math.abs((c.value as number) - maxVal) < 1e-9) {
        c.isBest = true;
      }
      if (m.highlightWorst && Math.abs((c.value as number) - minVal) < 1e-9) {
        c.isWorst = true;
      }
    }
  }

  // Grand Total row
  let grandTotalRow: ResultRow | null = null;
  if (definition.viewOptions.includeGrandTotal && filteredRecords.length > 0) {
    const cells: Record<string, ResultCell> = {};
    for (const m of measures) {
      cells[m.id] = computeCellForGroup(
        filteredRecords,
        m,
        totalFiltered,
        questionsById,
        computedValues
      );
    }
    grandTotalRow = {
      rowKey: "__GRAND_TOTAL__",
      groupValues:
        groupSpecs.length === 0
          ? ["Tổng cộng"]
          : groupSpecs.map((_, idx) => (idx === 0 ? "Tổng cộng / Chung" : "")),
      groupRecordIds: filteredRecords.map((r) => r.id),
      cells,
    };
  }

  // Optional 2D Pivot Matrix when pivot === true and exactly >= 2 dimensions
  let pivotMatrix: PivotMatrix | null = null;
  if (definition.viewOptions.pivot && groupSpecs.length >= 2 && filteredRecords.length > 0) {
    pivotMatrix = buildPivotMatrix(
      filteredRecords,
      groupSpecs[0],
      groupSpecs[1],
      measures[0],
      questionsById,
      computedValues,
      dynamicBinsBySpecId
    );
  }

  // Overview stats per question computed strictly on filteredRecords
  const overviewQuestions = computeOverviewQuestions(filteredRecords, questions);

  return { rows, grandTotalRow, pivotMatrix, overviewQuestions };
}

function buildPivotMatrix(
  filteredRecords: DatasetRecord[],
  rowSpec: GroupBySpec,
  colSpec: GroupBySpec,
  measure: MeasureSpec,
  questionsById: Map<string, SurveyResultQuestion>,
  computedValues: Map<string, Record<string, unknown>>,
  dynamicBinsBySpecId: Map<string, BinRange[]>
): PivotMatrix {
  const rowKeysSet = new Set<string>();
  const colKeysSet = new Set<string>();
  const cellRecords = new Map<string, DatasetRecord[]>();
  const rowRecords = new Map<string, DatasetRecord[]>();
  const colRecords = new Map<string, DatasetRecord[]>();

  for (const r of filteredRecords) {
    const comp = computedValues.get(r.id);
    const rKeys = resolveGroupKeysForSpec(r, rowSpec, questionsById, comp, dynamicBinsBySpecId);
    const cKeys = resolveGroupKeysForSpec(r, colSpec, questionsById, comp, dynamicBinsBySpecId);

    for (const rk of rKeys) {
      rowKeysSet.add(rk);
      if (!rowRecords.has(rk)) rowRecords.set(rk, []);
      rowRecords.get(rk)!.push(r);

      for (const ck of cKeys) {
        colKeysSet.add(ck);
        const key = `${rk}\u0000${ck}`;
        if (!cellRecords.has(key)) cellRecords.set(key, []);
        cellRecords.get(key)!.push(r);
      }
    }
    for (const ck of cKeys) {
      if (!colRecords.has(ck)) colRecords.set(ck, []);
      colRecords.get(ck)!.push(r);
    }
  }

  const rowKeys = Array.from(rowKeysSet).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  const colKeys = Array.from(colKeysSet).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  const total = filteredRecords.length;

  const cells: Record<string, Record<string, ResultCell>> = {};
  const allPivotVals: number[] = [];

  for (const rk of rowKeys) {
    cells[rk] = {};
    for (const ck of colKeys) {
      const recs = cellRecords.get(`${rk}\u0000${ck}`) ?? [];
      const cell = computeCellForGroup(recs, measure, total, questionsById, computedValues);
      cells[rk][ck] = cell;
      if (cell.value !== null && Number.isFinite(cell.value)) {
        allPivotVals.push(cell.value);
      }
    }
  }

  if ((measure.highlightBest || measure.highlightWorst) && allPivotVals.length >= 2) {
    const maxV = Math.max(...allPivotVals);
    const minV = Math.min(...allPivotVals);
    if (Math.abs(maxV - minV) > 1e-9) {
      for (const rk of rowKeys) {
        for (const ck of colKeys) {
          const c = cells[rk][ck];
          if (c.value === null) continue;
          if (measure.highlightBest && Math.abs(c.value - maxV) < 1e-9) c.isBest = true;
          if (measure.highlightWorst && Math.abs(c.value - minV) < 1e-9) c.isWorst = true;
        }
      }
    }
  }

  const rowTotals: Record<string, ResultCell> = {};
  for (const rk of rowKeys) {
    rowTotals[rk] = computeCellForGroup(
      rowRecords.get(rk) ?? [],
      measure,
      total,
      questionsById,
      computedValues
    );
  }

  const colTotals: Record<string, ResultCell> = {};
  for (const ck of colKeys) {
    colTotals[ck] = computeCellForGroup(
      colRecords.get(ck) ?? [],
      measure,
      total,
      questionsById,
      computedValues
    );
  }

  return {
    rowFieldLabel: rowSpec.label ?? rowSpec.field,
    colFieldLabel: colSpec.label ?? colSpec.field,
    measureId: measure.id,
    measureLabel: measure.label ?? measure.agg,
    rowKeys,
    colKeys,
    cells,
    rowTotals,
    colTotals,
    grandTotal: computeCellForGroup(filteredRecords, measure, total, questionsById, computedValues),
  };
}

function cartesianTuples(lists: string[][]): string[][] {
  return lists.reduce<string[][]>(
    (acc, curr) => {
      const next: string[][] = [];
      for (const prev of acc) {
        for (const item of curr) {
          next.push([...prev, item]);
        }
      }
      return next;
    },
    [[]]
  );
}

export function computeOverviewQuestions(
  records: DatasetRecord[],
  questions: SurveyResultQuestion[]
): OverviewQuestionSummary[] {
  const total = records.length;

  return questions.map((q) => {
    const qType = normalizeQuestionType(q);
    const qText = getQuestionLabel(q);
    const allAnsweredIds: string[] = [];

    const base: OverviewQuestionSummary = {
      questionId: q.id,
      questionText: qText,
      questionTypeCode: qType,
      totalAnswered: 0,
      allAnsweredRecordIds: [],
    };

    if (qType === "SINGLE_CHOICE" || qType === "MULTIPLE_CHOICE") {
      const optMap = new Map<string, { id: string; text: string; recordIds: string[] }>();
      for (const opt of q.options ?? []) {
        const text = String(opt.optionText ?? opt.text ?? "").trim();
        optMap.set(opt.id, { id: opt.id, text, recordIds: [] });
      }
      const byTextFallback = new Map<string, string[]>();

      for (const r of records) {
        const ans = r.answers?.[q.id];
        if (!ans) continue;
        const optIds = ans.optionIds ?? [];
        const optTexts = ans.optionTexts ?? [];
        if (optIds.length === 0 && optTexts.length === 0) continue;
        allAnsweredIds.push(r.id);

        if (optIds.length > 0) {
          for (const oid of optIds) {
            const entry = optMap.get(oid);
            if (entry) entry.recordIds.push(r.id);
          }
        } else {
          for (const txt of optTexts) {
            if (!byTextFallback.has(txt)) byTextFallback.set(txt, []);
            byTextFallback.get(txt)!.push(r.id);
          }
        }
      }

      const recordIdsByOption: Record<string, string[]> = {};
      const options: ChoiceOptionStatistic[] = [];
      for (const entry of optMap.values()) {
        const fallback = byTextFallback.get(entry.text) ?? [];
        const dedup = Array.from(new Set([...entry.recordIds, ...fallback]));
        recordIdsByOption[entry.text] = dedup;
        options.push({
          optionId: entry.id,
          optionText: entry.text,
          count: dedup.length,
          percentage: total > 0 ? Number(((dedup.length / total) * 100).toFixed(1)) : 0,
        });
      }

      base.choiceStatistics = { options };
      base.recordIdsByOption = recordIdsByOption;
      base.totalAnswered = allAnsweredIds.length;
      base.allAnsweredRecordIds = allAnsweredIds;
      return base;
    }

    if (qType === "NUMBER") {
      const samples: Array<{ recordId: string; num: number }> = [];
      for (const r of records) {
        const ans = r.answers?.[q.id];
        if (!ans) continue;
        const n = ans.number !== undefined && ans.number !== null ? ans.number : parseSmartNumber(ans.text);
        if (n !== null) {
          samples.push({ recordId: r.id, num: n });
          allAnsweredIds.push(r.id);
        }
      }
      const nums = samples.map((s) => s.num);
      let avg: number | null = null;
      let min: number | null = null;
      let max: number | null = null;
      let median: number | null = null;
      let dynamicBuckets: NumericHistogramBucket[] = [];

      if (nums.length > 0) {
        avg = Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
        min = Math.min(...nums);
        max = Math.max(...nums);
        const sorted = [...nums].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        median = Number(
          (sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2).toFixed(2)
        );
        const ranges = buildDynamicEqualWidthRanges(nums, undefined, 6);
        dynamicBuckets = ranges.map((range) => {
          const matchingIds = samples
            .filter((s) => s.num >= range.min && (range.inclusiveMax ? s.num <= range.max : s.num < range.max))
            .map((s) => s.recordId);
          return {
            label: range.label,
            min: range.min,
            max: range.max,
            count: matchingIds.length,
            percentage: nums.length > 0 ? Number(((matchingIds.length / nums.length) * 100).toFixed(1)) : 0,
            recordIds: matchingIds,
          };
        });
      }

      base.numberStatistics = { count: nums.length, average: avg, min, max, median };
      base.dynamicBuckets = dynamicBuckets;
      base.totalAnswered = allAnsweredIds.length;
      base.allAnsweredRecordIds = allAnsweredIds;
      return base;
    }

    if (qType === "DATE") {
      const dates: string[] = [];
      for (const r of records) {
        const d = r.answers?.[q.id]?.date ?? r.answers?.[q.id]?.formatted;
        if (d) {
          dates.push(String(d));
          allAnsweredIds.push(r.id);
        }
      }
      const sorted = [...dates].sort();
      base.dateStatistics = {
        count: dates.length,
        min: sorted[0] ?? null,
        max: sorted[sorted.length - 1] ?? null,
      };
      base.totalAnswered = allAnsweredIds.length;
      base.allAnsweredRecordIds = allAnsweredIds;
      return base;
    }

    if (qType === "ADDRESS") {
      const addrCount = new Map<string, { province: string; ward: string; count: number }>();
      const provCount = new Map<string, number>();
      const wardCount = new Map<string, number>();
      const recordIdsByOption: Record<string, string[]> = {};

      for (const r of records) {
        const ans = r.answers?.[q.id];
        if (!ans) continue;
        const prov = String(ans.province ?? "").trim();
        const ward = String(ans.ward ?? "").trim();
        if (!prov && !ward) continue;
        allAnsweredIds.push(r.id);
        const key = `${prov}\u0000${ward}`;
        addrCount.set(key, {
          province: prov,
          ward,
          count: (addrCount.get(key)?.count ?? 0) + 1,
        });
        if (prov) {
          provCount.set(prov, (provCount.get(prov) ?? 0) + 1);
          if (!recordIdsByOption[prov]) recordIdsByOption[prov] = [];
          recordIdsByOption[prov].push(r.id);
        }
        if (ward) wardCount.set(ward, (wardCount.get(ward) ?? 0) + 1);
      }

      base.addressStatistics = {
        count: allAnsweredIds.length,
        topAddresses: Array.from(addrCount.values()).sort((a, b) => b.count - a.count).slice(0, 10),
        topProvinces: Array.from(provCount.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        topWards: Array.from(wardCount.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      };
      base.recordIdsByOption = recordIdsByOption;
      base.totalAnswered = allAnsweredIds.length;
      base.allAnsweredRecordIds = allAnsweredIds;
      return base;
    }

    if (["MATRIX_SINGLE", "MATRIX_MULTI", "MATRIX_INPUT", "DYNAMIC_TABLE"].includes(qType)) {
      const meta = parseMatrixConfig(q.matrixConfig);
      let answeredCount = 0;

      if (qType === "MATRIX_SINGLE" || qType === "MATRIX_MULTI") {
        const rowMap = new Map<string, Map<string, number>>();
        const rowTotals = new Map<string, number>();
        for (const row of meta.rows) {
          rowMap.set(row.id, new Map());
          rowTotals.set(row.id, 0);
        }

        for (const r of records) {
          const md = r.answers?.[q.id]?.matrixData;
          if (!md) continue;
          try {
            const parsed = JSON.parse(md) as Record<string, unknown>;
            if (parsed && Object.keys(parsed).length > 0) {
              answeredCount++;
              allAnsweredIds.push(r.id);
            }
            for (const [rk, cv] of Object.entries(parsed)) {
              if (!rowMap.has(rk)) rowMap.set(rk, new Map());
              rowTotals.set(rk, (rowTotals.get(rk) ?? 0) + 1);
              const colCounts = rowMap.get(rk)!;
              const chosen = Array.isArray(cv) ? cv.map(String) : [String(cv ?? "")];
              for (const cid of chosen) {
                if (cid) colCounts.set(cid, (colCounts.get(cid) ?? 0) + 1);
              }
            }
          } catch {
            // ignore malformed JSON
          }
        }

        const rows: MatrixRowStatistic[] = meta.rows.map((row) => {
          const rTotal = rowTotals.get(row.id) ?? 0;
          const colCounts = rowMap.get(row.id) ?? new Map<string, number>();
          return {
            rowId: row.id,
            rowLabel: row.label,
            totalCount: rTotal,
            cells: meta.cols.map((col) => {
              const count = colCounts.get(col.id) ?? 0;
              return {
                columnId: col.id,
                columnLabel: col.label,
                count,
                percentage: rTotal > 0 ? Number(((count / rTotal) * 100).toFixed(1)) : 0,
              };
            }),
          };
        });

        base.matrixStatistics = { totalResponses: answeredCount, rows };
      } else {
        const colNums = new Map<string, number[]>();
        const colFilled = new Map<string, number>();
        for (const r of records) {
          const md = r.answers?.[q.id]?.matrixData;
          if (!md) continue;
          try {
            const parsed = JSON.parse(md) as unknown;
            answeredCount++;
            allAnsweredIds.push(r.id);
            const entries = Array.isArray(parsed)
              ? parsed.flatMap((rowObj) =>
                  rowObj && typeof rowObj === "object" ? Object.entries(rowObj as Record<string, unknown>) : []
                )
              : parsed && typeof parsed === "object"
                ? Object.values(parsed as Record<string, unknown>).flatMap((rowVal) =>
                    rowVal && typeof rowVal === "object"
                      ? Object.entries(rowVal as Record<string, unknown>)
                      : []
                  )
                : [];
            for (const [ck, val] of entries) {
              if (val != null && String(val).trim() !== "") {
                colFilled.set(ck, (colFilled.get(ck) ?? 0) + 1);
                const num = parseSmartNumber(val);
                if (num !== null) {
                  if (!colNums.has(ck)) colNums.set(ck, []);
                  colNums.get(ck)!.push(num);
                }
              }
            }
          } catch {
            // ignore
          }
        }

        const columns: MatrixColumnStatistic[] = meta.cols.map((col) => {
          const nums = colNums.get(col.id) ?? [];
          return {
            columnId: col.id,
            columnLabel: col.label,
            filledCount: colFilled.get(col.id) ?? 0,
            averageValue: nums.length > 0 ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : null,
            minValue: nums.length > 0 ? Math.min(...nums) : null,
            maxValue: nums.length > 0 ? Math.max(...nums) : null,
          };
        });
        base.matrixStatistics = { totalResponses: answeredCount, columns };
      }

      base.totalAnswered = answeredCount;
      base.allAnsweredRecordIds = allAnsweredIds;
      return base;
    }

    // SHORT_TEXT / LONG_TEXT / default
    const textCounts = new Map<string, number>();
    const recordIdsByOption: Record<string, string[]> = {};
    for (const r of records) {
      const parsed = parseMatrixAnswer(r.answers?.[q.id]?.matrixData);
      const raw = r.answers?.[q.id]?.text ?? r.answers?.[q.id]?.formatted ?? (Object.keys(parsed).length ? JSON.stringify(parsed) : "");
      const txt = String(raw ?? "").trim();
      if (!txt) continue;
      allAnsweredIds.push(r.id);
      textCounts.set(txt, (textCounts.get(txt) ?? 0) + 1);
      if (!recordIdsByOption[txt]) recordIdsByOption[txt] = [];
      recordIdsByOption[txt].push(r.id);
    }

    base.textStatistics = {
      count: allAnsweredIds.length,
      topAnswers: Array.from(textCounts.entries())
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12),
    };
    base.recordIdsByOption = recordIdsByOption;
    base.totalAnswered = allAnsweredIds.length;
    base.allAnsweredRecordIds = allAnsweredIds;
    return base;
  });
}

export function computeOverviewComputedFields(
  records: DatasetRecord[],
  computedFields: ComputedField[] = [],
  computedValues: Map<string, Record<string, unknown>>
): SurveyQuestionStatistic[] {
  const total = records.length;

  return computedFields.map((cf) => {
    const isFormulaNumber =
      cf.kind === "formula" &&
      (cf.outputType === "number" ||
        (!cf.outputType &&
          records.some((r) => {
            const v = computedValues.get(r.id)?.[cf.id];
            return typeof v === "number" && !Number.isNaN(v);
          })));

    if (isFormulaNumber) {
      const samples: Array<{ recordId: string; num: number }> = [];
      for (const r of records) {
        const val = computedValues.get(r.id)?.[cf.id];
        if (val == null || val === "" || val instanceof FormulaErrorValue) continue;
        const n = typeof val === "number" ? val : parseSmartNumber(val);
        if (n !== null && !Number.isNaN(n)) {
          samples.push({ recordId: r.id, num: n });
        }
      }

      const nums = samples.map((s) => s.num);
      let avg: number | null = null;
      let min: number | null = null;
      let max: number | null = null;
      let median: number | null = null;
      let dynamicBuckets: NumericHistogramBucket[] = [];

      if (nums.length > 0) {
        avg = Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
        min = Math.min(...nums);
        max = Math.max(...nums);
        const sorted = [...nums].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        median = Number(
          (sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2).toFixed(2)
        );
        const ranges = buildDynamicEqualWidthRanges(nums, undefined, 6);
        dynamicBuckets = ranges.map((range) => {
          const matchingIds = samples
            .filter((s) => s.num >= range.min && (range.inclusiveMax ? s.num <= range.max : s.num < range.max))
            .map((s) => s.recordId);
          return {
            label: range.label,
            min: range.min,
            max: range.max,
            count: matchingIds.length,
            percentage: nums.length > 0 ? Number(((matchingIds.length / nums.length) * 100).toFixed(1)) : 0,
            recordIds: matchingIds,
          };
        });
      }

      const allAnsweredRecordIds = samples.map((s) => s.recordId);

      const stat: OverviewQuestionSummary = {
        questionId: cf.id,
        questionText: cf.name,
        questionTypeCode: "NUMBER",
        totalAnswered: allAnsweredRecordIds.length,
        allAnsweredRecordIds,
        numberStatistics: {
          count: nums.length,
          average: avg,
          min,
          max,
          median,
        },
        dynamicBuckets,
      };

      return stat;
    }

    // text / bin / extract / datePart / boolean
    const optMap = new Map<string, string[]>();
    const allAnsweredRecordIds: string[] = [];

    for (const r of records) {
      const val = computedValues.get(r.id)?.[cf.id];
      if (val == null || val === "" || val instanceof FormulaErrorValue) continue;
      const strVal = String(val).trim();
      if (!strVal) continue;

      allAnsweredRecordIds.push(r.id);
      if (!optMap.has(strVal)) optMap.set(strVal, []);
      optMap.get(strVal)!.push(r.id);
    }

    const options: ChoiceOptionStatistic[] = Array.from(optMap.entries())
      .map(([optText, rIds]) => ({
        optionId: optText,
        optionText: optText,
        count: rIds.length,
        percentage: total > 0 ? Number(((rIds.length / total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const recordIdsByOption: Record<string, string[]> = {};
    for (const [optText, rIds] of optMap.entries()) {
      recordIdsByOption[optText] = rIds;
    }

    const stat: OverviewQuestionSummary = {
      questionId: cf.id,
      questionText: cf.name,
      questionTypeCode: "SINGLE_CHOICE",
      totalAnswered: allAnsweredRecordIds.length,
      allAnsweredRecordIds,
      choiceStatistics: { options },
      recordIdsByOption,
    };

    return stat;
  });
}

