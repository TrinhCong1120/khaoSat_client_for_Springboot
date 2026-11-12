import type { SurveyResultQuestion } from "@/types/report";
import {
  getQuestionPrefixedLabel,
  getQuestionPrefixedShortLabel,
  normalizeQuestionType,
} from "./extractors";
import { createEmptyFilterTree } from "./filter";
import type {
  CustomDashboardDefinition,
  DashboardWidgetSpec,
  MeasureSpec,
  ReportDefinition,
} from "./types";

export type SystemReportPreset = {
  id: string;
  name: string;
  description: string;
  scope: "SYSTEM";
  definition: ReportDefinition;
};

export function createDefaultReportDefinition(questions: SurveyResultQuestion[] = []): ReportDefinition {
  const numQuestions = questions.filter((q) => normalizeQuestionType(q) === "NUMBER");
  const catQuestions = questions.filter((q) =>
    ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "SHORT_TEXT", "ADDRESS"].includes(normalizeQuestionType(q))
  );

  const primaryGroupField = catQuestions[0]
    ? (`question:${catQuestions[0].id}` as const)
    : ("system:submittedAt" as const);
  const primaryGroupType = catQuestions[0] ? normalizeQuestionType(catQuestions[0]) : "DATE";

  const measures: MeasureSpec[] = [
    {
      id: "m_count",
      field: "responses",
      agg: "count",
      label: "Số phản hồi (N)",
      highlightBest: true,
    },
    {
      id: "m_pct",
      field: "responses",
      agg: "percentOfTotal",
      label: "Tỷ lệ (%)",
    },
  ];

  if (numQuestions[0]) {
    measures.push({
      id: "m_avg_1",
      field: `question:${numQuestions[0].id}`,
      agg: "avg",
      label: `TB: ${getQuestionPrefixedShortLabel(numQuestions[0], 24)}`,
      highlightBest: true,
      highlightWorst: true,
    });
  }

  return {
    version: 1,
    mode: "overview",
    filterTree: createEmptyFilterTree(),
    computedFields: [],
    groupBy: [
      {
        id: "g_1",
        field: primaryGroupField,
        label: catQuestions[0] ? getQuestionPrefixedLabel(catQuestions[0]) : "Ngày nộp bài",
        transform:
          primaryGroupType === "DATE" || !catQuestions[0]
            ? "dateDay"
            : primaryGroupType === "MULTIPLE_CHOICE"
              ? "multiChoiceSplit"
              : primaryGroupType === "ADDRESS"
                ? "province"
                : "exact",
      },
    ],
    measures,
    chart: {
      enabled: true,
      type: "groupedBar",
      measureId: numQuestions[0] ? "m_avg_1" : "m_count",
    },
    viewOptions: {
      showEmptyGroups: false,
      sortBy: "m_count",
      sortDir: "desc",
      maxGroups: 50,
      includeGrandTotal: true,
      pivot: false,
    },
  };
}

/** Sinh các mẫu báo cáo tự thích ứng cho mọi khảo sát (không hardcode lĩnh vực) */
export function buildSystemPresets(
  questions: SurveyResultQuestion[],
  piiQuestionIds: string[] = []
): SystemReportPreset[] {
  const piiSet = new Set(piiQuestionIds);
  const nonPiiQuestions = questions.filter((q) => !piiSet.has(q.id));
  const pool = nonPiiQuestions.length > 0 ? nonPiiQuestions : questions;

  const numQuestions = pool.filter((q) => normalizeQuestionType(q) === "NUMBER");
  const choiceQuestions = pool.filter((q) =>
    ["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(normalizeQuestionType(q))
  );
  const textQuestions = pool.filter((q) => normalizeQuestionType(q) === "SHORT_TEXT");
  const primaryDim = choiceQuestions[0] ?? textQuestions[0] ?? pool[0];
  const secondaryDim = choiceQuestions[1] ?? textQuestions[1];

  const presets: SystemReportPreset[] = [];

  if (primaryDim) {
    const dimType = normalizeQuestionType(primaryDim);
    const measures: MeasureSpec[] = [
      { id: "m_n", field: "responses", agg: "count", label: "Số phiếu (N)", highlightBest: true },
      { id: "m_pct", field: "responses", agg: "percentOfTotal", label: "Tỷ lệ (%)" },
    ];
    numQuestions.slice(0, 2).forEach((nq, idx) => {
      const sName = getQuestionPrefixedShortLabel(nq, 24);
      measures.push({
        id: `m_avg_${idx}`,
        field: `question:${nq.id}`,
        agg: "avg",
        label: `TB ${sName}`,
        highlightBest: true,
        highlightWorst: true,
      });
      measures.push({
        id: `m_max_${idx}`,
        field: `question:${nq.id}`,
        agg: "max",
        label: `Max ${sName}`,
        highlightBest: true,
      });
    });

    presets.push({
      id: "sys_group_primary",
      name: `Tổng hợp theo "${getQuestionPrefixedShortLabel(primaryDim, 26)}"`,
      description: "Gom nhóm theo tiêu chí phân loại chính và tính chỉ số các câu số",
      scope: "SYSTEM",
      definition: {
        version: 1,
        mode: "custom",
        name: `Tổng hợp theo ${getQuestionPrefixedShortLabel(primaryDim, 26)}`,
        filterTree: createEmptyFilterTree(),
        computedFields: [],
        groupBy: [
          {
            id: "g_sys_1",
            field: `question:${primaryDim.id}`,
            label: getQuestionPrefixedLabel(primaryDim),
            transform: dimType === "MULTIPLE_CHOICE" ? "multiChoiceSplit" : "exact",
          },
        ],
        measures,
        chart: {
          enabled: true,
          type: "groupedBar",
          measureId: numQuestions[0] ? "m_avg_0" : "m_n",
        },
        viewOptions: {
          showEmptyGroups: false,
          sortBy: numQuestions[0] ? "m_avg_0" : "m_n",
          sortDir: "desc",
          maxGroups: 50,
          includeGrandTotal: true,
          pivot: false,
        },
      },
    });
  }

  if (primaryDim && secondaryDim) {
    presets.push({
      id: "sys_pivot_two_dim",
      name: `Bảng chéo 2 chiều (${getQuestionPrefixedShortLabel(primaryDim, 18)} x ${getQuestionPrefixedShortLabel(secondaryDim, 18)})`,
      description: "Pivot bảng chéo đếm phản hồi giữa 2 tiêu chí phân loại",
      scope: "SYSTEM",
      definition: {
        version: 1,
        mode: "custom",
        name: "Bảng chéo 2 chiều",
        filterTree: createEmptyFilterTree(),
        computedFields: [],
        groupBy: [
          {
            id: "g_p1",
            field: `question:${primaryDim.id}`,
            label: getQuestionPrefixedLabel(primaryDim),
            transform: normalizeQuestionType(primaryDim) === "MULTIPLE_CHOICE" ? "multiChoiceSplit" : "exact",
          },
          {
            id: "g_p2",
            field: `question:${secondaryDim.id}`,
            label: getQuestionPrefixedLabel(secondaryDim),
            transform: normalizeQuestionType(secondaryDim) === "MULTIPLE_CHOICE" ? "multiChoiceSplit" : "exact",
          },
        ],
        measures: [
          { id: "m_pivot_n", field: "responses", agg: "count", label: "Số phiếu", highlightBest: true },
        ],
        chart: { enabled: true, type: "stackedBar", measureId: "m_pivot_n" },
        viewOptions: {
          showEmptyGroups: false,
          sortBy: "m_pivot_n",
          sortDir: "desc",
          maxGroups: 50,
          includeGrandTotal: true,
          pivot: true,
        },
      },
    });
  }

  presets.push({
    id: "sys_timeline_trend",
    name: "Xu hướng phản hồi theo ngày nộp",
    description: "Theo dõi số lượt nộp và thời gian hoàn thành trung bình theo từng ngày",
    scope: "SYSTEM",
    definition: {
      version: 1,
      mode: "custom",
      name: "Xu hướng theo ngày nộp",
      filterTree: createEmptyFilterTree(),
      computedFields: [],
      groupBy: [
        {
          id: "g_day",
          field: "system:submittedAt",
          label: "Ngày nộp bài",
          transform: "dateDay",
        },
      ],
      measures: [
        { id: "m_day_n", field: "responses", agg: "count", label: "Số lượt nộp (N)", highlightBest: true },
        { id: "m_day_pct", field: "responses", agg: "percentOfTotal", label: "Tỷ trọng (%)" },
        ...(numQuestions[0]
          ? [
              {
                id: "m_day_num",
                field: `question:${numQuestions[0].id}` as const,
                agg: "avg" as const,
                label: `TB ${getQuestionPrefixedShortLabel(numQuestions[0], 24)}`,
                highlightBest: true,
              },
            ]
          : []),
      ],
      chart: { enabled: true, type: "line", measureId: "m_day_n" },
      viewOptions: {
        showEmptyGroups: false,
        sortBy: "group",
        sortDir: "asc",
        maxGroups: 60,
        includeGrandTotal: true,
        pivot: false,
      },
    },
  });

  return presets;
}

export function createEmptyWidgetSpec(
  questions: SurveyResultQuestion[] = [],
  index = 0
): DashboardWidgetSpec {
  const numQuestions = questions.filter((q) => normalizeQuestionType(q) === "NUMBER");
  const catQuestions = questions.filter((q) =>
    ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "SHORT_TEXT", "ADDRESS"].includes(normalizeQuestionType(q))
  );

  const targetCat = catQuestions.length > 0 ? catQuestions[index % catQuestions.length] : undefined;
  const primaryGroupField = targetCat
    ? (`question:${targetCat.id}` as const)
    : ("system:submittedAt" as const);
  const primaryGroupType = targetCat ? normalizeQuestionType(targetCat) : "DATE";

  const targetNum = numQuestions.length > 0 ? numQuestions[index % numQuestions.length] : undefined;

  const measures: MeasureSpec[] = [
    {
      id: `m_count_${index + 1}`,
      field: "responses",
      agg: "count",
      label: "Số phản hồi (N)",
      highlightBest: true,
    },
    {
      id: `m_pct_${index + 1}`,
      field: "responses",
      agg: "percentOfTotal",
      label: "Tỷ lệ (%)",
    },
  ];

  if (targetNum) {
    measures.push({
      id: `m_avg_${index + 1}`,
      field: `question:${targetNum.id}`,
      agg: "avg",
      label: `TB: ${getQuestionPrefixedShortLabel(targetNum, 24)}`,
      highlightBest: true,
      highlightWorst: true,
    });
  }

  return {
    id: `widget_${index + 1}`,
    title: targetCat ? `Phân tích theo ${getQuestionPrefixedShortLabel(targetCat, 24)}` : `Biểu đồ ${index + 1}`,
    displayMode: "chartAndTable",
    width: "full",
    ignoreGlobalFilter: false,
    filterTree: createEmptyFilterTree(),
    groupBy: [
      {
        id: `g_${index + 1}`,
        field: primaryGroupField,
        label: targetCat ? getQuestionPrefixedLabel(targetCat) : "Ngày nộp bài",
        transform:
          primaryGroupType === "DATE" || !targetCat
            ? "dateDay"
            : primaryGroupType === "MULTIPLE_CHOICE"
              ? "multiChoiceSplit"
              : primaryGroupType === "ADDRESS"
                ? "province"
                : "exact",
      },
    ],
    measures,
    chart: {
      enabled: true,
      type: "groupedBar",
      measureId: targetNum ? `m_avg_${index + 1}` : `m_count_${index + 1}`,
    },
    viewOptions: {
      showEmptyGroups: false,
      sortBy: `m_count_${index + 1}`,
      sortDir: "desc",
      maxGroups: 50,
      includeGrandTotal: true,
      pivot: false,
    },
  };
}

export function createDefaultCustomDashboard(
  questions: SurveyResultQuestion[] = [],
  piiQuestionIds: string[] = []
): CustomDashboardDefinition {
  const piiSet = new Set(piiQuestionIds);
  const nonPii = questions.filter((q) => !piiSet.has(q.id));
  const pool = nonPii.length > 0 ? nonPii : questions;

  const w1 = createEmptyWidgetSpec(pool, 0);
  w1.width = "half";

  const choiceQuestions = pool.filter((q) =>
    ["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(normalizeQuestionType(q))
  );

  let w2: DashboardWidgetSpec;
  if (choiceQuestions.length > 1) {
    const q2 = choiceQuestions[1];
    w2 = {
      ...createEmptyWidgetSpec(pool, 1),
      id: "widget_2",
      title: `Cơ cấu theo ${getQuestionPrefixedShortLabel(q2, 24)}`,
      width: "half",
      chart: {
        enabled: true,
        type: "pie",
        measureId: "m_count_2",
      },
    };
  } else {
    w2 = {
      id: "widget_2",
      title: "Xu hướng phản hồi theo ngày",
      displayMode: "chartAndTable",
      width: "half",
      ignoreGlobalFilter: false,
      filterTree: createEmptyFilterTree(),
      groupBy: [
        {
          id: "g_date",
          field: "system:submittedAt",
          label: "Ngày nộp bài",
          transform: "dateDay",
        },
      ],
      measures: [
        { id: "m_sub_n", field: "responses", agg: "count", label: "Số lượt nộp (N)", highlightBest: true },
      ],
      chart: { enabled: true, type: "line", measureId: "m_sub_n" },
      viewOptions: {
        showEmptyGroups: false,
        sortBy: "group",
        sortDir: "asc",
        maxGroups: 50,
        includeGrandTotal: true,
        pivot: false,
      },
    };
  }

  return {
    version: 2,
    reportKind: "custom_dashboard",
    name: "Dashboard tổng quan",
    description: "Bảng điều khiển trực quan các chỉ số quan trọng của khảo sát",
    globalFilterTree: createEmptyFilterTree(),
    computedFields: [],
    widgets: [w1, w2],
  };
}

export type StarterCustomDashboardTemplate = {
  id: string;
  name: string;
  description: string;
  dashboard: CustomDashboardDefinition;
};

export function buildStarterCustomDashboardTemplates(
  questions: SurveyResultQuestion[] = [],
  piiQuestionIds: string[] = []
): StarterCustomDashboardTemplate[] {
  const piiSet = new Set(piiQuestionIds);
  const nonPii = questions.filter((q) => !piiSet.has(q.id));
  const pool = nonPii.length > 0 ? nonPii : questions;

  const defaultDb = createDefaultCustomDashboard(pool, piiQuestionIds);

  const numQuestions = pool.filter((q) => normalizeQuestionType(q) === "NUMBER");
  const choiceQuestions = pool.filter((q) =>
    ["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(normalizeQuestionType(q))
  );

  const templates: StarterCustomDashboardTemplate[] = [
    {
      id: "tpl_standard_overview",
      name: "Dashboard Tổng quan Chuẩn",
      description: "2 widget tổng hợp phân bố và cơ cấu đối tượng khảo sát",
      dashboard: defaultDb,
    },
  ];

  if (numQuestions.length > 0) {
    const primaryNum = numQuestions[0];
    const dimQuestion = choiceQuestions[0] ?? pool[0];
    const kpiWidget: DashboardWidgetSpec = {
      id: "widget_kpi_1",
      title: `Chỉ số TB: ${getQuestionPrefixedShortLabel(primaryNum, 24)}`,
      displayMode: "kpi",
      width: "half",
      ignoreGlobalFilter: false,
      filterTree: createEmptyFilterTree(),
      groupBy: [],
      measures: [
        {
          id: "m_kpi_avg",
          field: `question:${primaryNum.id}`,
          agg: "avg",
          label: `TB ${getQuestionPrefixedShortLabel(primaryNum, 20)}`,
          highlightBest: true,
        },
        {
          id: "m_kpi_n",
          field: "responses",
          agg: "count",
          label: "Số phiếu",
        },
      ],
      chart: { enabled: false, type: "groupedBar" },
      viewOptions: {
        showEmptyGroups: false,
        sortBy: "group",
        sortDir: "asc",
        maxGroups: 10,
        includeGrandTotal: false,
        pivot: false,
      },
    };

    const breakdownWidget: DashboardWidgetSpec = {
      id: "widget_num_breakdown",
      title: `Điểm số theo ${dimQuestion ? getQuestionPrefixedShortLabel(dimQuestion, 20) : "nhóm"}`,
      displayMode: "chartAndTable",
      width: "half",
      ignoreGlobalFilter: false,
      filterTree: createEmptyFilterTree(),
      groupBy: [
        {
          id: "g_dim",
          field: dimQuestion ? `question:${dimQuestion.id}` : "system:submittedAt",
          label: dimQuestion ? getQuestionPrefixedLabel(dimQuestion) : "Ngày nộp",
          transform: dimQuestion && normalizeQuestionType(dimQuestion) === "MULTIPLE_CHOICE" ? "multiChoiceSplit" : "exact",
        },
      ],
      measures: [
        {
          id: "m_score_avg",
          field: `question:${primaryNum.id}`,
          agg: "avg",
          label: `TB ${getQuestionPrefixedShortLabel(primaryNum, 20)}`,
          highlightBest: true,
          highlightWorst: true,
        },
        {
          id: "m_score_max",
          field: `question:${primaryNum.id}`,
          agg: "max",
          label: "Điểm cao nhất",
          highlightBest: true,
        },
      ],
      chart: { enabled: true, type: "horizontalBar", measureId: "m_score_avg" },
      viewOptions: {
        showEmptyGroups: false,
        sortBy: "m_score_avg",
        sortDir: "desc",
        maxGroups: 30,
        includeGrandTotal: true,
        pivot: false,
      },
    };

    templates.push({
      id: "tpl_kpi_score",
      name: "Dashboard Đánh giá & Hiệu suất",
      description: "Thẻ KPI chỉ số kết hợp biểu đồ thanh ngang so sánh chi tiết",
      dashboard: {
        version: 2,
        reportKind: "custom_dashboard",
        name: "Dashboard Đánh giá & Hiệu suất",
        description: "Theo dõi điểm trung bình và xếp hạng nhóm",
        globalFilterTree: createEmptyFilterTree(),
        computedFields: [],
        widgets: [kpiWidget, breakdownWidget],
      },
    });
  }

  if (choiceQuestions.length >= 2) {
    const q1 = choiceQuestions[0];
    const q2 = choiceQuestions[1];
    const pivotWidget: DashboardWidgetSpec = {
      id: "widget_pivot_cross",
      title: `Phân tích chéo: ${getQuestionPrefixedShortLabel(q1, 16)} x ${getQuestionPrefixedShortLabel(q2, 16)}`,
      displayMode: "table",
      width: "full",
      ignoreGlobalFilter: false,
      filterTree: createEmptyFilterTree(),
      groupBy: [
        {
          id: "g_cross_1",
          field: `question:${q1.id}`,
          label: getQuestionPrefixedLabel(q1),
          transform: normalizeQuestionType(q1) === "MULTIPLE_CHOICE" ? "multiChoiceSplit" : "exact",
        },
        {
          id: "g_cross_2",
          field: `question:${q2.id}`,
          label: getQuestionPrefixedLabel(q2),
          transform: normalizeQuestionType(q2) === "MULTIPLE_CHOICE" ? "multiChoiceSplit" : "exact",
        },
      ],
      measures: [
        { id: "m_p_n", field: "responses", agg: "count", label: "Số phiếu", highlightBest: true },
      ],
      chart: { enabled: true, type: "stackedBar", measureId: "m_p_n" },
      viewOptions: {
        showEmptyGroups: false,
        sortBy: "m_p_n",
        sortDir: "desc",
        maxGroups: 50,
        includeGrandTotal: true,
        pivot: true,
      },
    };

    templates.push({
      id: "tpl_cross_tab",
      name: "Dashboard Bảng chéo Đa chiều",
      description: "Pivot 2 chiều kiểm tra tương quan giữa các tiêu chí phân loại",
      dashboard: {
        version: 2,
        reportKind: "custom_dashboard",
        name: "Dashboard Bảng chéo Đa chiều",
        description: "Bảng chéo ma trận 2 chiều",
        globalFilterTree: createEmptyFilterTree(),
        computedFields: [],
        widgets: [pivotWidget],
      },
    });
  }

  return templates;
}

