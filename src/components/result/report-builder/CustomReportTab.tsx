"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Copy,
  CopyPlus,
  Download,
  Eye,
  Filter,
  FunctionSquare,
  GitMerge,
  Hash,
  LayoutDashboard,
  Plus,
  Save,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Trash2,
  X,
} from "lucide-react";
import {
  countActiveFilterRules,
  createEmptyFilterTree,
  createDefaultCustomDashboard,
  createEmptyWidgetSpec,
  buildStarterCustomDashboardTemplates,
  type ChartType,
  type ComputedField,
  type CustomDashboardDefinition,
  type DashboardWidgetSpec,
  type FieldRef,
  type GroupByBinningConfig,
  type ReportDefinition,
  type SurveyFieldMeta,
} from "@/lib/report-engine";
import { useCustomDashboardEngine } from "@/hooks/useCustomDashboardEngine";
import type {
  DatasetRecord,
  ReportViewItem,
  SurveyDataset,
  SurveyResultQuestion,
} from "@/types/report";
import DashboardWidgetRenderer from "./DashboardWidgetRenderer";
import BuilderConfigPanel from "./BuilderConfigPanel";
import FilterBuilderBar from "./FilterBuilderBar";
import DrillDownResponseDrawer from "../DrillDownResponseDrawer";

type Props = {
  surveyId: string;
  surveyTitle: string;
  dataset: SurveyDataset | null;
  questions: SurveyResultQuestion[];
  fieldMetas: SurveyFieldMeta[];
  recordMap: Map<string, DatasetRecord>;
  sharedComputedFields: ComputedField[];
  onOpenComputedDrawer: () => void;
  savedCustomViews: ReportViewItem[];
  activeCustomViewId: string | null;
  onSelectCustomView: (viewId: string) => void;
  onSaveCustomView: (mode: "create" | "update" | "clone") => void;
  onDeleteCustomView: (viewId: string) => void;
  onOpenExportModal: () => void;
  canExportData: boolean;
  piiIncluded: boolean;
  onTogglePii: (included: boolean) => void;
  initialDashboardDef?: CustomDashboardDefinition;
  onChangeDashboardDef?: (def: CustomDashboardDefinition) => void;
};

const CHART_TYPES: Array<{ type: ChartType; label: string }> = [
  { type: "groupedBar", label: "Cột dọc" },
  { type: "horizontalBar", label: "Thanh ngang" },
  { type: "stackedBar", label: "Cột chồng" },
  { type: "line", label: "Đường xu hướng" },
  { type: "pie", label: "Tròn / Vành khăn" },
  { type: "boxRange", label: "Hộp phân bố" },
];

export default function CustomReportTab({
  surveyId,
  surveyTitle,
  dataset,
  questions,
  fieldMetas,
  recordMap,
  sharedComputedFields,
  onOpenComputedDrawer,
  savedCustomViews,
  activeCustomViewId,
  onSelectCustomView,
  onSaveCustomView,
  onDeleteCustomView,
  onOpenExportModal,
  canExportData,
  piiIncluded,
  onTogglePii,
  initialDashboardDef,
  onChangeDashboardDef,
}: Props) {
  // Initial dashboard definition
  const [dashboardDef, setDashboardDef] = useState<CustomDashboardDefinition>(() => {
    if (initialDashboardDef) return initialDashboardDef;
    return createDefaultCustomDashboard(questions);
  });

  // Mode subPage: "view" (Chỉ xem) or "setup" (Thiết lập)
  const [subPage, setSubPage] = useState<"view" | "setup">(() => {
    return dashboardDef.widgets.length > 0 ? "view" : "setup";
  });

  // Selected widget id in setup mode
  const [selectedWidgetId, setSelectedWidgetId] = useState<string>(() => {
    return dashboardDef.widgets[0]?.id || "";
  });

  // Expandable global filter builder bar
  const [showGlobalFilterBar, setShowGlobalFilterBar] = useState(false);

  // Drill-down drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerSubtitle, setDrawerSubtitle] = useState("");
  const [drawerRecords, setDrawerRecords] = useState<DatasetRecord[]>([]);
  const [drawerTargetQuestionId, setDrawerTargetQuestionId] = useState<string | undefined>(undefined);

  const prevInitialDefRef = useRef(initialDashboardDef);
  useEffect(() => {
    if (initialDashboardDef && initialDashboardDef !== prevInitialDefRef.current) {
      prevInitialDefRef.current = initialDashboardDef;
      queueMicrotask(() => {
        setDashboardDef(initialDashboardDef);
      });
    }
  }, [initialDashboardDef]);

  // Sync saved view selection
  const prevCustomViewIdRef = useRef(activeCustomViewId);
  useEffect(() => {
    if (activeCustomViewId && activeCustomViewId !== prevCustomViewIdRef.current) {
      prevCustomViewIdRef.current = activeCustomViewId;
      const found = savedCustomViews.find((v) => v.id === activeCustomViewId);
      if (found?.definition && (found.definition as { reportKind?: string }).reportKind === "custom_dashboard") {
        queueMicrotask(() => {
          setDashboardDef(found.definition as unknown as CustomDashboardDefinition);
        });
      }
    }
  }, [activeCustomViewId, savedCustomViews]);

  // Update helper
  const updateDashboardDef = useCallback(
    (updater: CustomDashboardDefinition | ((prev: CustomDashboardDefinition) => CustomDashboardDefinition)) => {
      setDashboardDef((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        queueMicrotask(() => {
          onChangeDashboardDef?.(next);
        });
        return next;
      });
    },
    [onChangeDashboardDef]
  );

  // Engine calculation with debounce
  const { output, isComputing } = useCustomDashboardEngine(
    dataset?.records ?? [],
    questions,
    dashboardDef,
    sharedComputedFields
  );

  // Starter templates
  const starterTemplates = useMemo(() => {
    return buildStarterCustomDashboardTemplates(questions);
  }, [questions]);

  // Selected widget object
  const selectedWidget = useMemo(() => {
    return (
      dashboardDef.widgets.find((w) => w.id === selectedWidgetId) ??
      dashboardDef.widgets[0] ??
      null
    );
  }, [dashboardDef.widgets, selectedWidgetId]);

  const activeSavedView = savedCustomViews.find((v) => v.id === activeCustomViewId);
  const canEditActiveView = Boolean(activeSavedView?.canEdit);
  const hasUnsavedChanges = useMemo(() => {
    if (!activeSavedView?.definition) return false;
    try {
      return JSON.stringify(dashboardDef) !== JSON.stringify(activeSavedView.definition);
    } catch {
      return false;
    }
  }, [activeSavedView, dashboardDef]);
  const activeGlobalRules = countActiveFilterRules(dashboardDef.globalFilterTree);

  // Drill-down callback
  const handleDrillDown = useCallback(
    (
      records: DatasetRecord[],
      title: string,
      subtitle?: string,
      targetQuestionId?: string
    ) => {
      setDrawerRecords(records);
      setDrawerTitle(title);
      setDrawerSubtitle(subtitle || "");
      setDrawerTargetQuestionId(targetQuestionId);
      setDrawerOpen(true);
    },
    []
  );

  // Widget management helpers
  const handleAddWidget = () => {
    const newIdx = dashboardDef.widgets.length;
    const newWidget = createEmptyWidgetSpec(questions, newIdx);
    updateDashboardDef((prev) => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
    }));
    setSelectedWidgetId(newWidget.id);
  };

  const handleDuplicateWidget = (widgetId: string) => {
    const idx = dashboardDef.widgets.findIndex((w) => w.id === widgetId);
    if (idx === -1) return;
    const src = dashboardDef.widgets[idx];
    const cloned: DashboardWidgetSpec = {
      ...src,
      id: `${src.id}_copy_${dashboardDef.widgets.length + 1}`,
      title: `${src.title} (Bản sao)`,
      filterTree: JSON.parse(JSON.stringify(src.filterTree)),
      groupBy: JSON.parse(JSON.stringify(src.groupBy)),
      measures: JSON.parse(JSON.stringify(src.measures)),
      chart: { ...src.chart },
      viewOptions: { ...src.viewOptions },
    };
    updateDashboardDef((prev) => {
      const nextWidgets = [...prev.widgets];
      nextWidgets.splice(idx + 1, 0, cloned);
      return { ...prev, widgets: nextWidgets };
    });
    setSelectedWidgetId(cloned.id);
  };

  const handleDeleteWidget = (widgetId: string) => {
    updateDashboardDef((prev) => {
      const nextWidgets = prev.widgets.filter((w) => w.id !== widgetId);
      return { ...prev, widgets: nextWidgets };
    });
    if (selectedWidgetId === widgetId) {
      const remaining = dashboardDef.widgets.filter((w) => w.id !== widgetId);
      if (remaining.length > 0) {
        setSelectedWidgetId(remaining[0].id);
      }
    }
  };

  const handleMoveWidget = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= dashboardDef.widgets.length) return;
    updateDashboardDef((prev) => {
      const nextWidgets = [...prev.widgets];
      const temp = nextWidgets[index];
      nextWidgets[index] = nextWidgets[targetIdx];
      nextWidgets[targetIdx] = temp;
      return { ...prev, widgets: nextWidgets };
    });
  };

  const updateSelectedWidget = (updated: DashboardWidgetSpec) => {
    updateDashboardDef((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === updated.id ? updated : w)),
    }));
  };

  // Pseudo-definition adapter for BuilderConfigPanel
  const pseudoDefinition = useMemo<ReportDefinition>(() => {
    if (!selectedWidget) {
      return {
        version: 1,
        mode: "custom",
        filterTree: createEmptyFilterTree(),
        computedFields: [],
        groupBy: [],
        measures: [],
        chart: { enabled: true, type: "groupedBar" },
        viewOptions: {
          showEmptyGroups: false,
          sortBy: "group",
          sortDir: "asc",
          maxGroups: 20,
          includeGrandTotal: true,
          pivot: false,
        },
      };
    }
    return {
      version: 1,
      mode: "custom",
      name: selectedWidget.title,
      filterTree: selectedWidget.filterTree,
      computedFields: [],
      groupBy: selectedWidget.groupBy || [],
      measures: selectedWidget.measures || [],
      chart: selectedWidget.chart || { enabled: true, type: "groupedBar" },
      viewOptions: selectedWidget.viewOptions || {
        showEmptyGroups: false,
        sortBy: "group",
        sortDir: "asc",
        maxGroups: 20,
        includeGrandTotal: true,
        pivot: false,
      },
    };
  }, [selectedWidget]);

  const handlePseudoChange = (next: ReportDefinition) => {
    if (!selectedWidget) return;
    updateSelectedWidget({
      ...selectedWidget,
      groupBy: next.groupBy,
      measures: next.measures,
      chart: next.chart,
      viewOptions: next.viewOptions,
    });
  };

  const handleUpdateBinning = (
    groupIndex: number,
    nextBinning: GroupByBinningConfig | undefined
  ) => {
    if (!selectedWidget) return;
    const nextGroupBy = [...(selectedWidget.groupBy || [])];
    if (!nextGroupBy[groupIndex]) return;
    nextGroupBy[groupIndex] = {
      ...nextGroupBy[groupIndex],
      binning: nextBinning,
    };
    updateSelectedWidget({
      ...selectedWidget,
      groupBy: nextGroupBy,
      viewOptions: {
        ...(selectedWidget.viewOptions || {
          showEmptyGroups: false,
          sortBy: "group",
          sortDir: "asc",
          maxGroups: 20,
          includeGrandTotal: true,
          pivot: false,
        }),
        pivot: nextGroupBy.length >= 2,
      },
    });
  };

  const handleAddCoalesceField = (groupIndex: number, fieldRef: FieldRef) => {
    if (!selectedWidget) return;
    const nextGroupBy = [...(selectedWidget.groupBy || [])];
    const target = nextGroupBy[groupIndex];
    if (!target) return;
    const currentCoalesce = target.coalesceFields || [];
    if (currentCoalesce.includes(fieldRef)) return;
    nextGroupBy[groupIndex] = {
      ...target,
      coalesceFields: [...currentCoalesce, fieldRef],
    };
    updateSelectedWidget({
      ...selectedWidget,
      groupBy: nextGroupBy,
    });
  };

  const handleRemoveCoalesceField = (groupIndex: number, fieldRef: FieldRef) => {
    if (!selectedWidget) return;
    const nextGroupBy = [...(selectedWidget.groupBy || [])];
    const target = nextGroupBy[groupIndex];
    if (!target) return;
    nextGroupBy[groupIndex] = {
      ...target,
      coalesceFields: (target.coalesceFields || []).filter((f) => f !== fieldRef),
    };
    updateSelectedWidget({
      ...selectedWidget,
      groupBy: nextGroupBy,
    });
  };

  return (
    <div className="space-y-5" data-testid="custom-report-tab">
      {/* ========================================================================= */}
      {/* SUBPAGE 1: VIEW (Chỉ xem - Executive clean presentation) */}
      {/* ========================================================================= */}
      {subPage === "view" && (
        <div className="space-y-4">
          {/* TOP EXECUTIVE TOOLBAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            {/* LEFT: SAVED VIEW SELECTOR & ACTIONS */}
            <div className="flex flex-wrap items-center gap-2">
              {surveyTitle && (
                <span className="hidden text-xs font-semibold text-slate-500 xl:inline">
                  {surveyTitle} ·
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <Bookmark size={15} className="text-slate-400" />
                <select
                  aria-label="Chọn mẫu Dashboard"
                  value={activeCustomViewId ? `saved:${activeCustomViewId}` : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    if (v.startsWith("tpl:")) {
                      const tplId = v.slice(4);
                      const tpl = starterTemplates.find((t) => t.id === tplId);
                      if (tpl) {
                        updateDashboardDef(tpl.dashboard);
                      }
                    } else if (v.startsWith("saved:")) {
                      onSelectCustomView(v.slice(6));
                    }
                  }}
                  className="h-9 max-w-[260px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">-- Mẫu Dashboard dựng sẵn / Đã lưu --</option>
                  {starterTemplates.length > 0 && (
                    <optgroup label="Mẫu Dashboard khởi đầu (Hệ thống)">
                      {starterTemplates.map((t) => (
                        <option key={t.id} value={`tpl:${t.id}`}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {savedCustomViews.filter((v) => v.scope === "PRIVATE").length > 0 && (
                    <optgroup label="Mẫu cá nhân của tôi">
                      {savedCustomViews
                        .filter((v) => v.scope === "PRIVATE")
                        .map((v) => (
                          <option key={v.id} value={`saved:${v.id}`}>
                            {v.name} {v.isDefault ? "★" : ""}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  {savedCustomViews.filter((v) => v.scope === "SHARED").length > 0 && (
                    <optgroup label="Mẫu chia sẻ nhóm">
                      {savedCustomViews
                        .filter((v) => v.scope === "SHARED")
                        .map((v) => (
                          <option key={v.id} value={`saved:${v.id}`}>
                            {v.name} {v.isDefault ? "★" : ""}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    updateDashboardDef(createDefaultCustomDashboard(questions));
                    setSubPage("setup");
                  }}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  title="Tạo mới Dashboard"
                >
                  <Plus size={13} />
                  Tạo mới
                </button>

                {activeSavedView && activeSavedView.canEdit ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onSaveCustomView("update")}
                      className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      title="Lưu đè mẫu đang mở"
                    >
                      <Save size={13} />
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => onSaveCustomView("clone")}
                      className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      title="Lưu bản sao mới"
                    >
                      <CopyPlus size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCustomView(activeSavedView.id)}
                      className="inline-flex h-9 items-center rounded-xl border border-rose-200 bg-rose-50 px-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
                      title="Xóa mẫu đã lưu"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSaveCustomView(activeSavedView ? "clone" : "create")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <CopyPlus size={13} />
                    {activeSavedView ? "Lưu bản sao" : "Lưu mẫu"}
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT: EXPORT + PII + SETUP SWITCHER */}
            <div className="flex flex-wrap items-center gap-2">
              {/* PII Toggle */}
              {canExportData && (
                <button
                  type="button"
                  onClick={() => onTogglePii(!piiIncluded)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
                    piiIncluded
                      ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                  }`}
                  title={
                    piiIncluded
                      ? "Đang hiển thị đầy đủ thông tin cá nhân. Bấm để che lại."
                      : "Đang tự động che dữ liệu nhạy cảm. Bấm để hiện đầy đủ."
                  }
                >
                  {piiIncluded ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                  {piiIncluded ? "Đang hiện PII" : "Đang che PII"}
                </button>
              )}

              {/* Export Excel button */}
              <button
                type="button"
                onClick={onOpenExportModal}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
              >
                <Download size={14} />
                Xuất Excel
              </button>

              {/* Switch to Setup Mode */}
              <button
                type="button"
                data-testid="switch-to-setup-btn"
                onClick={() => setSubPage("setup")}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
              >
                <Settings size={14} />
                Thiết lập báo cáo
              </button>
            </div>
          </div>

          {/* GLOBAL FILTER STATUS BAR & EXPANDABLE BUILDER */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-2 text-xs dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    activeGlobalRules > 0
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <Filter size={11} />
                  {activeGlobalRules > 0
                    ? `Đang áp dụng ${activeGlobalRules} bộ lọc chung`
                    : "Chưa áp dụng bộ lọc chung"}
                </span>
                <span className="text-slate-500">
                  {output.globalFilteredRecords.length}/{output.totalRecords} phản hồi phù hợp
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowGlobalFilterBar((prev) => !prev)}
                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                {showGlobalFilterBar ? (
                  <>
                    Thu gọn bộ lọc <ChevronUp size={13} />
                  </>
                ) : (
                  <>
                    {activeGlobalRules > 0 ? "Chỉnh sửa bộ lọc chung" : "Thêm bộ lọc chung"}{" "}
                    <ChevronDown size={13} />
                  </>
                )}
              </button>
            </div>

            {showGlobalFilterBar && (
              <FilterBuilderBar
                filterTree={dashboardDef.globalFilterTree}
                onChange={(nextTree) =>
                  updateDashboardDef((prev) => ({
                    ...prev,
                    globalFilterTree: nextTree,
                  }))
                }
                fieldMetas={fieldMetas}
                totalCount={output.totalRecords}
                filteredCount={output.globalFilteredRecords.length}
              />
            )}
          </div>

          {/* 12-COLUMN RESPONSIVE GRID OF WIDGETS */}
          {dashboardDef.widgets.length > 0 ? (
            <div className="grid grid-cols-12 gap-5">
              {dashboardDef.widgets.map((widget) => {
                const isFull = widget.width === "full";
                const widgetOutput = output.widgetOutputs[widget.id];

                return (
                  <div
                    key={widget.id}
                    className={isFull ? "col-span-12" : "col-span-12 lg:col-span-6"}
                  >
                    <DashboardWidgetRenderer
                      widget={widget}
                      output={widgetOutput}
                      recordMap={recordMap}
                      onDrillDown={handleDrillDown}
                      isSetupMode={false}
                      onEditWidget={() => {
                        setSelectedWidgetId(widget.id);
                        setSubPage("setup");
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
              <LayoutDashboard className="mx-auto text-slate-400" size={36} />
              <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                Báo cáo chưa có khối hiển thị nào
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Hãy bắt đầu tạo khối đầu tiên bằng cách chuyển sang chế độ thiết lập.
              </p>
              <button
                type="button"
                onClick={() => {
                  handleAddWidget();
                  setSubPage("setup");
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
              >
                <Plus size={14} />
                Thêm khối báo cáo đầu tiên
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBPAGE 2: SETUP (Master-Detail Studio) */}
      {/* ========================================================================= */}
      {subPage === "setup" && (
        <div className="space-y-4">
          {/* STUDIO HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/80 bg-linear-to-r from-blue-50/80 via-white to-slate-50 p-4 dark:border-blue-900/50 dark:from-blue-950/30 dark:via-slate-900 dark:to-slate-900">
            <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[280px]">
              <button
                type="button"
                data-testid="back-to-view-btn"
                onClick={() => setSubPage("view")}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Eye size={14} />
                Xem báo cáo (Chỉ xem)
              </button>

              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={dashboardDef.name ?? ""}
                  onChange={(e) =>
                    updateDashboardDef((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Đặt tên cho Dashboard / Báo cáo..."
                  className="h-9 w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* SAVE VIEW BUTTON IN SETUP STUDIO */}
              {canEditActiveView ? (
                <>
                  <button
                    type="button"
                    data-testid="setup-save-view-btn"
                    onClick={() => onSaveCustomView("update")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
                    title="Lưu các thay đổi của thiết lập này"
                  >
                    <Save size={14} />
                    Lưu thay đổi
                    {hasUnsavedChanges && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" title="Có thay đổi chưa lưu" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSaveCustomView("clone")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    title="Lưu thành bản sao mới"
                  >
                    <CopyPlus size={13} />
                    Bản sao
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  data-testid="setup-save-view-btn"
                  onClick={() => onSaveCustomView(activeSavedView ? "clone" : "create")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
                  title="Lưu thiết lập này thành mẫu báo cáo"
                >
                  <Save size={14} />
                  {activeSavedView ? "Lưu bản sao" : "Lưu mẫu báo cáo"}
                </button>
              )}

              <button
                type="button"
                onClick={handleAddWidget}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Plus size={14} />
                Thêm khối mới
              </button>

              <button
                type="button"
                onClick={onOpenComputedDrawer}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300"
              >
                <FunctionSquare size={14} />
                Cột tự tạo / Công thức
                {(sharedComputedFields.length > 0 || dashboardDef.computedFields.length > 0) && (
                  <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {sharedComputedFields.length || dashboardDef.computedFields.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowGlobalFilterBar((prev) => !prev)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
                  showGlobalFilterBar
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                <Filter size={14} />
                Bộ lọc chung
                {activeGlobalRules > 0 && (
                  <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {activeGlobalRules}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* EXPANDABLE GLOBAL FILTER IN SETUP MODE */}
          {showGlobalFilterBar && (
            <FilterBuilderBar
              filterTree={dashboardDef.globalFilterTree}
              onChange={(nextTree) =>
                updateDashboardDef((prev) => ({
                  ...prev,
                  globalFilterTree: nextTree,
                }))
              }
              fieldMetas={fieldMetas}
              totalCount={output.totalRecords}
              filteredCount={output.globalFilteredRecords.length}
            />
          )}

          {/* MASTER-DETAIL STUDIO SPLIT LAYOUT */}
          <div className="flex flex-col items-start gap-5 lg:flex-row">
            {/* LEFT PANEL: WIDGET LIST (280-320px) */}
            <div className="w-full shrink-0 space-y-3 lg:w-80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Danh sách khối ({dashboardDef.widgets.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddWidget}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <Plus size={13} /> Thêm khối
                </button>
              </div>

              <div className="space-y-2">
                {dashboardDef.widgets.map((w, index) => {
                  const isSelected = w.id === selectedWidgetId;

                  return (
                    <div
                      key={w.id}
                      onClick={() => setSelectedWidgetId(w.id)}
                      className={`group relative cursor-pointer rounded-xl border p-3 transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/60 shadow-xs dark:border-blue-500 dark:bg-blue-950/40"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-xs font-bold ${
                              isSelected
                                ? "text-blue-700 dark:text-blue-300"
                                : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            #{index + 1}. {w.title || "Khối chưa đặt tên"}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="rounded bg-slate-100 px-1 py-0.5 font-medium dark:bg-slate-800">
                              {w.width === "full" ? "Cả hàng (100%)" : "Nửa hàng (50%)"}
                            </span>
                            <span className="rounded bg-slate-100 px-1 py-0.5 font-medium dark:bg-slate-800">
                              {w.displayMode === "chart"
                                ? "Biểu đồ"
                                : w.displayMode === "table"
                                  ? "Bảng"
                                  : w.displayMode === "kpi"
                                    ? "KPI"
                                    : "Biểu đồ & Bảng"}
                            </span>
                          </div>
                        </div>

                        {/* ORDER & ACTION BUTTONS */}
                        <div
                          className="flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveWidget(index, "up")}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800"
                            title="Di chuyển lên"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={index === dashboardDef.widgets.length - 1}
                            onClick={() => handleMoveWidget(index, "down")}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800"
                            title="Di chuyển xuống"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateWidget(w.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                            title="Nhân bản khối này"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWidget(w.id)}
                            className="rounded p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Xóa khối"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT PANEL: SELECTED WIDGET CONFIG & LIVE PREVIEW (flex-1) */}
            <div className="flex-1 min-w-0 w-full space-y-6">
              {selectedWidget ? (
                <>
                  {/* WIDGET GENERAL CONFIGURATION CARD */}
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Cấu hình khối: {selectedWidget.title || "Khối báo cáo"}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-400">
                        ID: {selectedWidget.id}
                      </span>
                    </div>

                    {/* TITLE & SUBTITLE */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          Tiêu đề khối
                        </label>
                        <input
                          type="text"
                          value={selectedWidget.title}
                          onChange={(e) =>
                            updateSelectedWidget({
                              ...selectedWidget,
                              title: e.target.value,
                            })
                          }
                          placeholder="Tiêu đề hiển thị..."
                          className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          Mô tả phụ (Tùy chọn)
                        </label>
                        <input
                          type="text"
                          value={selectedWidget.subtitle ?? ""}
                          onChange={(e) =>
                            updateSelectedWidget({
                              ...selectedWidget,
                              subtitle: e.target.value,
                            })
                          }
                          placeholder="Ghi chú thêm về tiêu chí đánh giá..."
                          className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* WIDTH & DISPLAY MODE */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Width selector */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          Độ rộng hiển thị
                        </label>
                        <div className="mt-1.5 flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedWidget({
                                ...selectedWidget,
                                width: "half",
                              })
                            }
                            className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                              selectedWidget.width === "half"
                                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            Nửa hàng (50%)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedWidget({
                                ...selectedWidget,
                                width: "full",
                              })
                            }
                            className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                              selectedWidget.width === "full"
                                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            Cả hàng (100%)
                          </button>
                        </div>
                      </div>

                      {/* Display Mode selector */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          Kiểu hiển thị
                        </label>
                        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {[
                            { mode: "chart" as const, label: "Biểu đồ" },
                            { mode: "table" as const, label: "Bảng" },
                            { mode: "chartAndTable" as const, label: "Cả hai" },
                            { mode: "kpi" as const, label: "KPI" },
                          ].map((item) => (
                            <button
                              key={item.mode}
                              type="button"
                              onClick={() =>
                                updateSelectedWidget({
                                  ...selectedWidget,
                                  displayMode: item.mode,
                                })
                              }
                              className={`rounded-xl border py-2 text-center text-xs font-semibold transition ${
                                selectedWidget.displayMode === item.mode
                                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* IGNORE GLOBAL FILTER CHECKBOX */}
                    <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedWidget.ignoreGlobalFilter)}
                          onChange={(e) =>
                            updateSelectedWidget({
                              ...selectedWidget,
                              ignoreGlobalFilter: e.target.checked,
                            })
                          }
                          className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Bỏ qua bộ lọc chung của báo cáo (Khối này sẽ luôn tính trên toàn bộ dữ liệu gốc)
                      </label>
                    </div>

                    {/* CHART TYPE SELECTOR (When displayMode is not KPI) */}
                    {selectedWidget.displayMode !== "kpi" && (
                      <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          Loại biểu đồ đồ họa
                        </label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {CHART_TYPES.map((ct) => {
                            const isTypeActive =
                              selectedWidget.chart?.type === ct.type &&
                              selectedWidget.chart?.enabled !== false;

                            return (
                              <button
                                key={ct.type}
                                type="button"
                                onClick={() =>
                                  updateSelectedWidget({
                                    ...selectedWidget,
                                    chart: {
                                      ...selectedWidget.chart,
                                      enabled: true,
                                      type: ct.type,
                                    },
                                  })
                                }
                                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                                  isTypeActive
                                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                              >
                                {ct.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* EMBEDDED BUILDER CONFIG PANEL (GroupBy & Measures) */}
                  <div className="space-y-2">
                    <BuilderConfigPanel
                      definition={pseudoDefinition}
                      onChange={handlePseudoChange}
                      fieldMetas={fieldMetas}
                    />
                  </div>

                  {/* ADVANCED NUMERIC BINNING & COALESCE CONFIGURATION CARD */}
                  {selectedWidget.groupBy && selectedWidget.groupBy.length > 0 && (
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                        <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                          <Sliders size={15} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Tùy chọn nâng cao: Phân bậc số học & Gộp câu hỏi rẽ nhánh
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Cấu hình bước nhảy trục liên tục và hợp nhất các câu hỏi theo nhánh điều kiện.
                          </p>
                        </div>
                      </div>

                      {selectedWidget.groupBy.map((gb, gIdx) => {
                        const meta = fieldMetas.find((m) => m.ref === gb.field);
                        const isNumericKind =
                          meta?.kind === "number" ||
                          meta?.kind === "computed" ||
                          gb.field.startsWith("system:duration") ||
                          gb.field.startsWith("system:totalScore");
                        const binConfig = gb.binning ?? { mode: "none" };
                        const isBinningActive = binConfig.mode !== "none";

                        return (
                          <div
                            key={gb.id || gIdx}
                            className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-950/50"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  Cấp {gIdx + 1}
                                </span>
                                {gb.label || meta?.shortLabel || gb.field}
                              </span>
                            </div>

                            {/* GỘP CÂU HỎI RẼ NHÁNH (COALESCE) */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <GitMerge size={12} className="text-indigo-500" />
                                  Gộp trường thay thế (khi rẽ nhánh / trang khác):
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                {(gb.coalesceFields || []).map((cf) => {
                                  const cMeta = fieldMetas.find((m) => m.ref === cf);
                                  return (
                                    <span
                                      key={cf}
                                      className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                                    >
                                      {cMeta?.label || cf}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCoalesceField(gIdx, cf)}
                                        className="rounded-full hover:bg-indigo-200/60 dark:hover:bg-indigo-800"
                                        title="Xóa trường này"
                                      >
                                        <X size={11} />
                                      </button>
                                    </span>
                                  );
                                })}

                                <select
                                  aria-label="Thêm trường gộp"
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAddCoalesceField(gIdx, e.target.value as FieldRef);
                                    }
                                  }}
                                  className="h-7 rounded-lg border border-dashed border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-600 hover:border-indigo-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                >
                                  <option value="">+ Thêm trường rẽ nhánh...</option>
                                  {fieldMetas
                                    .filter(
                                      (m) =>
                                        m.ref !== gb.field &&
                                        !(gb.coalesceFields || []).includes(m.ref)
                                    )
                                    .map((m) => (
                                      <option key={m.ref} value={m.ref}>
                                        {m.label}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>

                            {/* PHÂN BẬC SỐ HỌC (NUMERIC BINNING) */}
                            {isNumericKind && (
                              <div className="space-y-2.5 border-t border-slate-200/80 pt-2.5 dark:border-slate-800">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                    <Hash size={12} className="text-blue-500" />
                                    Chế độ phân bậc số học:
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {[
                                      { mode: "none" as const, label: "Gốc" },
                                      { mode: "round_step" as const, label: "Làm tròn bậc (Round)" },
                                      { mode: "floor_step" as const, label: "Bậc dưới (Floor)" },
                                    ].map((opt) => (
                                      <button
                                        key={opt.mode}
                                        type="button"
                                        onClick={() =>
                                          handleUpdateBinning(gIdx, {
                                            ...binConfig,
                                            mode: opt.mode,
                                            stepSize: binConfig.stepSize ?? 0.5,
                                            fillEmptyTicks: binConfig.fillEmptyTicks ?? true,
                                            decimalPlaces: binConfig.decimalPlaces ?? 1,
                                          })
                                        }
                                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                                          binConfig.mode === opt.mode
                                            ? "border border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                        }`}
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {isBinningActive && (
                                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                                    {/* Step size */}
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Bước nhảy (Δ)
                                      </label>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <input
                                          type="number"
                                          step="any"
                                          min="0.01"
                                          value={binConfig.stepSize ?? 0.5}
                                          onChange={(e) =>
                                            handleUpdateBinning(gIdx, {
                                              ...binConfig,
                                              stepSize: parseFloat(e.target.value) || 0.5,
                                            })
                                          }
                                          className="h-8 w-24 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                                        />
                                        <div className="flex flex-wrap gap-1">
                                          {[0.25, 0.5, 1, 5].map((s) => (
                                            <button
                                              key={s}
                                              type="button"
                                              onClick={() =>
                                                handleUpdateBinning(gIdx, {
                                                  ...binConfig,
                                                  stepSize: s,
                                                  decimalPlaces: s < 1 ? (s === 0.25 ? 2 : 1) : 0,
                                                })
                                              }
                                              className={`rounded-md px-2 py-1 text-[11px] font-bold transition whitespace-nowrap ${
                                                binConfig.stepSize === s
                                                  ? "bg-blue-600 text-white shadow-xs"
                                                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                              }`}
                                            >
                                              {s}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Min & Max Ticks grouped together */}
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Giới hạn trục (Min → Max)
                                      </label>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          step="any"
                                          placeholder="Min (Tự động)"
                                          value={binConfig.minTick ?? ""}
                                          onChange={(e) =>
                                            handleUpdateBinning(gIdx, {
                                              ...binConfig,
                                              minTick: e.target.value === "" ? undefined : parseFloat(e.target.value),
                                            })
                                          }
                                          className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                                        />
                                        <span className="text-slate-400 font-bold">→</span>
                                        <input
                                          type="number"
                                          step="any"
                                          placeholder="Max (Tự động)"
                                          value={binConfig.maxTick ?? ""}
                                          onChange={(e) =>
                                            handleUpdateBinning(gIdx, {
                                              ...binConfig,
                                              maxTick: e.target.value === "" ? undefined : parseFloat(e.target.value),
                                            })
                                          }
                                          className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                                        />
                                      </div>
                                    </div>

                                    {/* Fill empty ticks */}
                                    <div className="flex items-center pt-2 sm:pt-6 sm:col-span-2 lg:col-span-1">
                                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        <input
                                          type="checkbox"
                                          checked={binConfig.fillEmptyTicks ?? true}
                                          onChange={(e) =>
                                            handleUpdateBinning(gIdx, {
                                              ...binConfig,
                                              fillEmptyTicks: e.target.checked,
                                            })
                                          }
                                          className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        Lấp đầy mốc trống (Trục liên tục)
                                      </label>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* EMBEDDED FILTER BUILDER FOR WIDGET'S OWN FILTER TREE */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <Filter size={13} />
                      Bộ lọc riêng của khối này (Áp dụng độc lập)
                    </div>
                    <FilterBuilderBar
                      filterTree={selectedWidget.filterTree}
                      onChange={(nextTree) =>
                        updateSelectedWidget({
                          ...selectedWidget,
                          filterTree: nextTree,
                        })
                      }
                      fieldMetas={fieldMetas}
                      totalCount={output.globalFilteredRecords.length}
                      filteredCount={
                        output.widgetOutputs[selectedWidget.id]?.filteredRecords.length ??
                        output.globalFilteredRecords.length
                      }
                    />
                  </div>

                  {/* LIVE PREVIEW OF THE SELECTED WIDGET */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Xem trước trực tiếp (Live Preview)
                      </span>
                      {isComputing && (
                        <span className="text-xs text-blue-600 animate-pulse">
                          Đang cập nhật số liệu...
                        </span>
                      )}
                    </div>

                    <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-slate-50/50 p-2 dark:border-blue-900/50 dark:bg-slate-900/40">
                      <DashboardWidgetRenderer
                        widget={selectedWidget}
                        output={output.widgetOutputs[selectedWidget.id]}
                        recordMap={recordMap}
                        onDrillDown={handleDrillDown}
                        isSetupMode={true}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
                  <LayoutDashboard className="mx-auto text-slate-400" size={32} />
                  <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                    Chưa chọn khối nào
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Chọn một khối từ danh sách bên trái hoặc nhấn &quot;Thêm khối mới&quot; để bắt đầu cấu hình.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DRILL DOWN RESPONSE DRAWER */}
      <DrillDownResponseDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        subtitle={drawerSubtitle}
        records={drawerRecords}
        questions={questions}
        targetQuestionId={drawerTargetQuestionId}
        surveyId={surveyId}
        computedFields={sharedComputedFields}
        computedValues={output.computedValues}
      />
    </div>
  );
}
