import type { DatasetRecord, SurveyQuestionStatistic, SurveyResultQuestion } from "@/types/report";

export type FieldRef =
  | `question:${string}`
  | `question:${string}:${string}`
  | "system:submittedAt"
  | "system:durationMs"
  | "system:totalScore"
  | `computed:${string}`;

export type FilterOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "regex"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "in"
  | "notIn"
  | "isEmpty"
  | "isNotEmpty";

export type FilterRule = {
  kind: "rule";
  id: string;
  field: FieldRef;
  operator: FilterOperator;
  value?: unknown;
  valueTo?: unknown;
};

export type FilterGroup = {
  kind: "group";
  id: string;
  logic: "AND" | "OR";
  children: Array<FilterGroup | FilterRule>;
};

export type ExtractKind =
  | "firstLetter"
  | "firstWord"
  | "beforeDash"
  | "afterDash"
  | "regexGroup"
  | "province"
  | "ward";

export type BinMethod = "equalWidth" | "customEdges";

export type DatePartKind = "day" | "month" | "quarter" | "year" | "weekday" | "hour";

export type CustomBinRange = {
  label: string;
  min?: number | null;
  max?: number | null;
};

export type ComputedField =
  | {
      id: string;
      name: string;
      kind: "extract";
      sourceField: FieldRef;
      extractType: ExtractKind;
      pattern?: string;
    }
  | {
      id: string;
      name: string;
      kind: "bin";
      sourceField: FieldRef;
      method: BinMethod;
      step?: number;
      binCount?: number;
      edges?: number[];
      labels?: string[];
      customRanges?: CustomBinRange[];
    }
  | {
      id: string;
      name: string;
      kind: "datePart";
      sourceField: FieldRef;
      part: DatePartKind;
    }
  | {
      id: string;
      name: string;
      kind: "formula";
      expression: string;
      outputType?: "text" | "number" | "boolean";
    };

export type GroupByTransform =
  | "exact"
  | "firstLetter"
  | "firstWord"
  | "beforeDash"
  | "afterDash"
  | "province"
  | "ward"
  | "multiChoiceSplit"
  | "multiChoiceJoin"
  | "dateDay"
  | "dateMonth"
  | "dateQuarter"
  | "dateYear"
  | "dateWeekday"
  | "numberBin";

export type GroupBySpec = {
  id: string;
  field: FieldRef;
  label?: string;
  transform: GroupByTransform;
  binStep?: number;
  binCount?: number;
};

export type MeasureAgg =
  | "count"
  | "percentOfTotal"
  | "percentOfOption"
  | "sum"
  | "avg"
  | "median"
  | "min"
  | "max"
  | "stddev"
  | "p90";

export type MeasureSpec = {
  id: string;
  field: FieldRef | "responses";
  agg: MeasureAgg;
  label?: string;
  targetOptionText?: string;
  targetOptionId?: string;
  highlightBest?: boolean;
  highlightWorst?: boolean;
};

export type ChartType = "groupedBar" | "horizontalBar" | "stackedBar" | "line" | "pie" | "boxRange";

export type ChartConfig = {
  enabled: boolean;
  type: ChartType;
  measureId?: string;
};

export type ViewOptions = {
  showEmptyGroups: boolean;
  sortBy: string;
  sortDir: "asc" | "desc";
  maxGroups: number;
  includeGrandTotal: boolean;
  pivot: boolean;
};

export type ReportDefinition = {
  version: 1;
  reportKind?: "questions_analysis" | "custom_dashboard";
  mode: "overview" | "custom";
  name?: string;
  filterTree: FilterGroup;
  computedFields: ComputedField[];
  groupBy: GroupBySpec[];
  measures: MeasureSpec[];
  chart: ChartConfig;
  viewOptions: ViewOptions;
};

export type DashboardWidgetDisplayMode = "chart" | "table" | "chartAndTable" | "kpi";
export type DashboardWidgetWidth = "half" | "full";

export type DashboardWidgetSpec = {
  id: string;
  title: string;
  subtitle?: string;
  displayMode: DashboardWidgetDisplayMode;
  width: DashboardWidgetWidth;
  ignoreGlobalFilter?: boolean;
  filterTree: FilterGroup;
  groupBy: GroupBySpec[];
  measures: MeasureSpec[];
  chart: ChartConfig;
  viewOptions: ViewOptions;
};

export type CustomDashboardDefinition = {
  version: 2;
  reportKind: "custom_dashboard";
  name?: string;
  description?: string;
  globalFilterTree: FilterGroup;
  computedFields: ComputedField[];
  widgets: DashboardWidgetSpec[];
};

export type CustomDashboardOutput = {
  totalRecords: number;
  globalFilteredRecords: DatasetRecord[];
  computedValues: Map<string, Record<string, unknown>>;
  computedStatuses: ComputedFieldStatus[];
  widgetOutputs: Record<string, ReportOutput>;
  durationMs: number;
};

export type FormulaErrorCode = "#SYNTAX?" | "#NAME?" | "#VALUE?" | "#DIV/0!" | "#REF!";

export class FormulaErrorValue {
  readonly code: FormulaErrorCode;
  readonly detail?: string;
  constructor(code: FormulaErrorCode, detail?: string) {
    this.code = code;
    this.detail = detail;
  }
  toString() {
    return this.code;
  }
}

export type FieldKind = "text" | "number" | "date" | "choice" | "address" | "matrix" | "system" | "computed";

export type SurveyFieldMeta = {
  ref: FieldRef;
  label: string;
  shortLabel: string;
  kind: FieldKind;
  questionId?: string;
  matrixRowKey?: string;
  matrixRowLabel?: string;
  questionTypeCode?: string;
  options?: Array<{ id: string; text: string }>;
  isPii?: boolean;
};

export type ResultCell = {
  value: number | null;
  displayValue: string;
  recordIds: string[];
  isBest?: boolean;
  isWorst?: boolean;
};

export type ResultRow = {
  rowKey: string;
  groupValues: string[];
  groupRecordIds: string[];
  cells: Record<string, ResultCell>;
};

export type PivotMatrix = {
  rowFieldLabel: string;
  colFieldLabel: string;
  measureId: string;
  measureLabel: string;
  rowKeys: string[];
  colKeys: string[];
  cells: Record<string, Record<string, ResultCell>>;
  rowTotals: Record<string, ResultCell>;
  colTotals: Record<string, ResultCell>;
  grandTotal: ResultCell;
};

export type NumericHistogramBucket = {
  label: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
  recordIds: string[];
};

export type OverviewQuestionSummary = SurveyQuestionStatistic & {
  dynamicBuckets?: NumericHistogramBucket[];
  totalAnswered: number;
  recordIdsByOption?: Record<string, string[]>;
  allAnsweredRecordIds: string[];
};

export type ComputedFieldStatus = {
  fieldId: string;
  fieldName: string;
  syntaxError?: string;
  runtimeErrorCount: number;
  sampleErrors: string[];
};

export type ReportOutput = {
  totalRecords: number;
  filteredRecords: DatasetRecord[];
  computedValues: Map<string, Record<string, unknown>>;
  computedStatuses: ComputedFieldStatus[];
  rows: ResultRow[];
  grandTotalRow: ResultRow | null;
  pivotMatrix: PivotMatrix | null;
  overviewQuestions: OverviewQuestionSummary[];
  computedOverviewQuestions?: SurveyQuestionStatistic[];
  durationMs: number;
};

export type FormulaPreviewRow = {
  recordId: string;
  submittedAt: string;
  inputsSummary: string;
  output: string;
  error?: string;
};

export type QuestionIndex = Map<string, SurveyResultQuestion>;

