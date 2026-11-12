import type { DatasetRecord, SurveyResultQuestion } from "@/types/report";
import { aggregateReport, computeOverviewComputedFields } from "./aggregator";
import { evaluateComputedFields } from "./computed";
import { evaluateFilterTree } from "./filter";
import type {
  ComputedField,
  CustomDashboardDefinition,
  CustomDashboardOutput,
  OverviewQuestionSummary,
  ReportDefinition,
  ReportOutput,
} from "./types";

export function runReportPipeline(
  records: DatasetRecord[],
  questions: SurveyResultQuestion[],
  definition: ReportDefinition
): ReportOutput {
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const questionsById = new Map<string, SurveyResultQuestion>(questions.map((q) => [q.id, q]));

  // 1. Evaluate computed fields across raw dataset so filters can reference them
  const { computedValues, statuses } = evaluateComputedFields(
    records,
    definition.computedFields,
    questionsById
  );

  // 2. Apply nested AND/OR filters
  const filteredRecords = evaluateFilterTree(
    records,
    definition.filterTree,
    questionsById,
    computedValues
  );

  // 3. Aggregate groups, measures, pivot matrix, and overview summaries
  const { rows, grandTotalRow, pivotMatrix, overviewQuestions } = aggregateReport(
    filteredRecords,
    questions,
    questionsById,
    computedValues,
    definition
  );

  const computedOverviewQuestions = computeOverviewComputedFields(
    filteredRecords,
    definition.computedFields,
    computedValues
  );

  const end = typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    totalRecords: records.length,
    filteredRecords,
    computedValues,
    computedStatuses: statuses,
    rows,
    grandTotalRow,
    pivotMatrix,
    overviewQuestions: [...overviewQuestions, ...(computedOverviewQuestions as OverviewQuestionSummary[])],
    computedOverviewQuestions,
    durationMs: Math.round(end - start),
  };
}

export function runCustomDashboardPipeline(
  records: DatasetRecord[],
  questions: SurveyResultQuestion[],
  dashboardDef: CustomDashboardDefinition,
  sharedComputedFields?: ComputedField[]
): CustomDashboardOutput {
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const questionsById = new Map<string, SurveyResultQuestion>(questions.map((q) => [q.id, q]));

  // 1. Merge computed fields (shared + dashboardDef)
  const fieldMap = new Map<string, ComputedField>();
  for (const f of sharedComputedFields ?? []) {
    if (f && f.id) fieldMap.set(f.id, f);
  }
  for (const f of dashboardDef.computedFields ?? []) {
    if (f && f.id) fieldMap.set(f.id, f);
  }
  const mergedComputedFields = Array.from(fieldMap.values());

  // 2. Evaluate merged computed fields once
  const { computedValues, statuses } = evaluateComputedFields(
    records,
    mergedComputedFields,
    questionsById
  );

  // 3. Filter records by dashboardDef.globalFilterTree
  const globalFilteredRecords = evaluateFilterTree(
    records,
    dashboardDef.globalFilterTree,
    questionsById,
    computedValues
  );

  // 4. For each widget in dashboardDef.widgets
  const widgetOutputs: Record<string, ReportOutput> = {};
  for (const widget of dashboardDef.widgets ?? []) {
    const wStart = typeof performance !== "undefined" ? performance.now() : Date.now();
    const recordsForWidget = widget.ignoreGlobalFilter ? records : globalFilteredRecords;
    const widgetFiltered = evaluateFilterTree(
      recordsForWidget,
      widget.filterTree,
      questionsById,
      computedValues
    );

    const widgetDef: ReportDefinition = {
      version: 1,
      mode: "custom",
      filterTree: widget.filterTree,
      computedFields: mergedComputedFields,
      groupBy: widget.groupBy ?? [],
      measures: widget.measures ?? [],
      chart: widget.chart,
      viewOptions: widget.viewOptions,
    };

    const { rows, grandTotalRow, pivotMatrix, overviewQuestions } = aggregateReport(
      widgetFiltered,
      questions,
      questionsById,
      computedValues,
      widgetDef
    );

    const computedOverview = computeOverviewComputedFields(
      widgetFiltered,
      mergedComputedFields,
      computedValues
    );

    const wEnd = typeof performance !== "undefined" ? performance.now() : Date.now();

    widgetOutputs[widget.id] = {
      totalRecords: recordsForWidget.length,
      filteredRecords: widgetFiltered,
      computedValues,
      computedStatuses: statuses,
      rows,
      grandTotalRow,
      pivotMatrix,
      overviewQuestions: [...overviewQuestions, ...(computedOverview as OverviewQuestionSummary[])],
      computedOverviewQuestions: computedOverview,
      durationMs: Math.round(wEnd - wStart),
    };
  }

  const end = typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    totalRecords: records.length,
    globalFilteredRecords,
    computedValues,
    computedStatuses: statuses,
    widgetOutputs,
    durationMs: Math.round(end - start),
  };
}

