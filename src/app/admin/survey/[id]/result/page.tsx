"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  HelpCircle,
  Layers,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  RefreshCw,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import ApiNotFound from "@/components/common/ApiNotFound";
import ComputedFieldsDrawer from "@/components/result/report-builder/ComputedFieldsDrawer";
import CustomReportTab from "@/components/result/report-builder/CustomReportTab";
import ExportReportModal from "@/components/result/report-builder/ExportReportModal";
import FilterBuilderBar from "@/components/result/report-builder/FilterBuilderBar";
import ReportToolbar from "@/components/result/report-builder/ReportToolbar";
import SaveViewModal from "@/components/result/report-builder/SaveViewModal";
import ResponseListTab from "@/components/result/ResponseListTab";
import SummaryTab from "@/components/result/SummaryTab";
import SurveyDashboardTab from "@/components/result/SurveyDashboardTab";
import GoogleAccountManagerModal from "@/components/surveys/GoogleAccountManagerModal";
import { useCustomDashboardEngine } from "@/hooks/useCustomDashboardEngine";
import { useReportEngine } from "@/hooks/useReportEngine";
import { API_GOOGLE_SURVEY, API_REPORTS, API_SURVEYS, API_GOOGLE_INTEGRATIONS } from "@/lib/api";
import { getToken, getUser, hasPermission, isUserAdmin } from "@/lib/auth";
import { formatSurveyLocal, getApiError } from "@/lib/report";
import {
  buildSurveyFieldMetas,
  buildSystemPresets,
  countActiveFilterRules,
  createDefaultCustomDashboard,
  createDefaultReportDefinition,
  detectClientPiiQuestionIds,
  flattenSurveyPagesQuestions,
  type ComputedField,
  type CustomDashboardDefinition,
  type ReportDefinition,
} from "@/lib/report-engine";
import {
  createReportView,
  deleteReportView,
  fetchSurveyDataset,
  listReportViews,
  updateReportView,
} from "@/lib/report-views-api";
import type {
  ReportFilter,
  ReportViewItem,
  ReportViewScope,
  SurveyDataset,
  SurveyResultDetail,
  SurveyStatistics,
} from "@/types/report";
import type { SurveyDashboard } from "@/types/survey-dashboard";

type Tab = "dashboard" | "questions" | "custom" | "responses";

const statusConfig: Record<string, { label: string; badgeClass: string; dotClass: string; pingClass?: string }> = {
  OPEN: {
    label: "Đang mở",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
    dotClass: "bg-emerald-500",
    pingClass: "bg-emerald-400",
  },
  SCHEDULED: {
    label: "Lên lịch",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
    dotClass: "bg-amber-500",
  },
  CLOSED: {
    label: "Đã đóng",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/60",
    dotClass: "bg-slate-400",
  },
  DRAFT: {
    label: "Bản nháp",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40",
    dotClass: "bg-blue-500",
  },
};

const number = new Intl.NumberFormat("vi-VN");
const vnToday = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const dateStart = (date: string) => new Date(`${date}T00:00:00+07:00`).toISOString();
const dateEnd = (date: string, now: number) =>
  date === vnToday() ? new Date(now).toISOString() : new Date(Date.parse(`${date}T00:00:00+07:00`) + 86400000).toISOString();

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(getApiError(response.status));
  return response.json() as Promise<T>;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SurveyReportPage() {
  const { id } = useParams<{ id: string }>();
  const surveyId = String(id ?? "");
  const reportBase = `${API_REPORTS}/survey/${encodeURIComponent(surveyId)}`;
  const [tab, setTab] = useState<Tab>("dashboard");
  const [survey, setSurvey] = useState<SurveyResultDetail | null>(null);
  const [surveyError, setSurveyError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [statistics, setStatistics] = useState<SurveyStatistics | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [statisticsError, setStatisticsError] = useState("");
  const [dataset, setDataset] = useState<SurveyDataset | null>(null);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [dashboard, setDashboard] = useState<SurveyDashboard | null>(null);
  const [lifetime, setLifetime] = useState<SurveyDashboard["lifetime"] | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [filter] = useState<ReportFilter>({});
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [asOf, setAsOf] = useState(() => Date.now());
  const [exporting, setExporting] = useState<"raw" | "analysis" | null>(null);
  const [exportError, setExportError] = useState("");
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [syncGoogleMessage, setSyncGoogleMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [requestingEdit, setRequestingEdit] = useState(false);
  const [isGoogleConnectModalOpen, setIsGoogleConnectModalOpen] = useState(false);
  const [includePii, setIncludePii] = useState(false);
  const [reportDefinition, setReportDefinition] = useState<ReportDefinition>(() =>
    createDefaultReportDefinition([])
  );
  const [customDashboardDef, setCustomDashboardDef] = useState<CustomDashboardDefinition>(() =>
    createDefaultCustomDashboard([])
  );
  const [savedViews, setSavedViews] = useState<ReportViewItem[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [activeCustomViewId, setActiveCustomViewId] = useState<string | null>(null);
  const [isComputedDrawerOpen, setIsComputedDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [saveModalState, setSaveModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "update" | "clone";
  }>({ isOpen: false, mode: "create" });
  const [pendingDeleteViewId, setPendingDeleteViewId] = useState<string | null>(null);
  const [viewNotice, setViewNotice] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const hasCustomizedDefRef = useRef(false);
  const appliedDefaultViewRef = useRef(false);
  const hasCustomizedDashboardRef = useRef(false);
  const appliedDefaultDashboardRef = useRef(false);

  const maxDate = vnToday();
  const valid =
    (!fromDate || fromDate <= maxDate) &&
    (!toDate || toDate <= maxDate) &&
    (!fromDate || !toDate || fromDate <= toDate);
  const questions = useMemo(
    () => flattenSurveyPagesQuestions(survey?.pages),
    [survey]
  );

  const piiQuestionIds = useMemo(
    () => Array.from(detectClientPiiQuestionIds(questions, dataset?.piiQuestionIds)),
    [questions, dataset?.piiQuestionIds]
  );

  const fieldMetas = useMemo(
    () => buildSurveyFieldMetas(questions, piiQuestionIds, reportDefinition.computedFields),
    [questions, piiQuestionIds, reportDefinition.computedFields]
  );

  const systemPresets = useMemo(
    () => buildSystemPresets(questions, piiQuestionIds),
    [questions, piiQuestionIds]
  );

  const { output, isComputing } = useReportEngine(
    dataset?.records ?? [],
    questions,
    reportDefinition
  );

  const { output: customDashboardOutput } =
    useCustomDashboardEngine(
      dataset?.records ?? [],
      questions,
      customDashboardDef,
      reportDefinition.computedFields
    );

  const recordMap = useMemo(
    () => new Map((dataset?.records ?? []).map((r) => [r.id, r])),
    [dataset?.records]
  );

  const permanentConfigView = useMemo(
    () =>
      savedViews.find(
        (v) =>
          v.definition &&
          (v.definition as { reportKind?: string }).reportKind === "survey_permanent_config"
      ) ?? null,
    [savedViews]
  );

  const questionSavedViews = useMemo(
    () =>
      savedViews.filter(
        (v) =>
          !v.definition ||
          ((v.definition as { reportKind?: string }).reportKind !== "custom_dashboard" &&
            (v.definition as { reportKind?: string }).reportKind !== "survey_permanent_config")
      ),
    [savedViews]
  );

  const customDashboardViews = useMemo(
    () =>
      savedViews.filter(
        (v) =>
          v.definition &&
          (v.definition as { reportKind?: string }).reportKind === "custom_dashboard"
      ),
    [savedViews]
  );

  const activeSavedView = useMemo(() => {
    const targetId = tab === "custom" ? activeCustomViewId : activeViewId;
    return savedViews.find((v) => v.id === targetId) ?? null;
  }, [activeCustomViewId, activeViewId, savedViews, tab]);

  const mergeWithPermanentFields = useCallback(
    (existingFields?: ComputedField[]): ComputedField[] => {
      const rawPerm = (
        permanentConfigView?.definition as { computedFields?: ComputedField[] } | undefined
      )?.computedFields;
      const permanentFields = Array.isArray(rawPerm)
        ? rawPerm.map((cf) => ({ ...cf, scope: "permanent" as const }))
        : [];

      const map = new Map<string, ComputedField>();
      permanentFields.forEach((cf) => map.set(cf.id, cf));
      (existingFields ?? []).forEach((cf) => {
        if (!map.has(cf.id)) {
          map.set(cf.id, cf);
        }
      });
      return Array.from(map.values());
    },
    [permanentConfigView]
  );

  const handleDefinitionChange = useCallback((next: ReportDefinition) => {
    hasCustomizedDefRef.current = true;
    setReportDefinition(next);
  }, []);

  useEffect(() => {
    if (
      questions.length > 0 &&
      !hasCustomizedDefRef.current &&
      !appliedDefaultViewRef.current
    ) {
      setReportDefinition(createDefaultReportDefinition(questions));
    }
  }, [questions]);

  useEffect(() => {
    if (
      questions.length > 0 &&
      !hasCustomizedDashboardRef.current &&
      !appliedDefaultDashboardRef.current
    ) {
      setCustomDashboardDef(createDefaultCustomDashboard(questions, piiQuestionIds));
    }
  }, [questions, piiQuestionIds]);

  const loadSurvey = useCallback(async () => {
    if (!surveyId) return;
    setSurveyError("");
    setNotFound(false);
    try {
      const response = await fetch(`${API_SURVEYS}/${encodeURIComponent(surveyId)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        cache: "no-store",
      });
      if (response.status === 404) {
        setNotFound(true);
        setSurvey(null);
        return;
      }
      setSurvey(await readJson<SurveyResultDetail>(response));
    } catch (cause) {
      setSurvey(null);
      setSurveyError(cause instanceof Error ? cause.message : "Không thể tải khảo sát.");
    }
  }, [surveyId]);

  useEffect(() => {
    void loadSurvey();
  }, [loadSurvey]);

  useEffect(() => {
    if (!surveyId) return;
    let live = true;
    setDatasetLoading(true);
    void fetchSurveyDataset(surveyId, includePii)
      .then((val) => {
        if (live) setDataset(val);
      })
      .catch((cause) => {
        console.warn("Dataset fetch error:", cause);
      })
      .finally(() => {
        if (live) setDatasetLoading(false);
      });
    return () => {
      live = false;
    };
  }, [asOf, includePii, surveyId]);

  const reloadSavedViews = useCallback(async () => {
    if (!surveyId) return;
    try {
      const list = await listReportViews(surveyId);
      setSavedViews(list);

      // 1. Check for permanent survey fields
      const permView = list.find(
        (v) =>
          v.definition &&
          (v.definition as { reportKind?: string }).reportKind === "survey_permanent_config"
      );
      const permFieldsRaw = (
        permView?.definition as { computedFields?: ComputedField[] } | undefined
      )?.computedFields;
      const permanentFields = Array.isArray(permFieldsRaw)
        ? permFieldsRaw.map((cf) => ({ ...cf, scope: "permanent" as const }))
        : [];

      if (permanentFields.length > 0) {
        setReportDefinition((prev) => {
          const map = new Map<string, ComputedField>();
          permanentFields.forEach((cf) => map.set(cf.id, cf));
          prev.computedFields.forEach((cf) => {
            if (!map.has(cf.id)) {
              map.set(cf.id, cf);
            }
          });
          return { ...prev, computedFields: Array.from(map.values()) };
        });

        setCustomDashboardDef((prev) => {
          const map = new Map<string, ComputedField>();
          permanentFields.forEach((cf) => map.set(cf.id, cf));
          prev.computedFields.forEach((cf) => {
            if (!map.has(cf.id)) {
              map.set(cf.id, cf);
            }
          });
          return { ...prev, computedFields: Array.from(map.values()) };
        });
      }

      if (!hasCustomizedDefRef.current && !appliedDefaultViewRef.current) {
        const defaultView = list.find(
          (v) =>
            v.isDefault &&
            (!v.definition ||
              (v.definition as { reportKind?: string }).reportKind !== "custom_dashboard")
        );
        if (defaultView) {
          appliedDefaultViewRef.current = true;
          setActiveViewId(defaultView.id);
          const viewDef = (defaultView.definition as Partial<ReportDefinition>) ?? {};
          setReportDefinition({
            ...createDefaultReportDefinition(questions),
            ...viewDef,
            computedFields: mergeWithPermanentFields(viewDef.computedFields),
          });
        }
      }
      if (!hasCustomizedDashboardRef.current && !appliedDefaultDashboardRef.current) {
        const defaultDashboard = list.find(
          (v) =>
            v.isDefault &&
            v.definition &&
            (v.definition as { reportKind?: string }).reportKind === "custom_dashboard"
        );
        if (defaultDashboard) {
          appliedDefaultDashboardRef.current = true;
          setActiveCustomViewId(defaultDashboard.id);
          const loadedDef = defaultDashboard.definition as unknown as CustomDashboardDefinition;
          setCustomDashboardDef({
            ...loadedDef,
            computedFields: mergeWithPermanentFields(loadedDef.computedFields),
          });
        }
      }
    } catch {
      // ignore if user lacks views access or offline
    }
  }, [mergeWithPermanentFields, questions, surveyId]);

  useEffect(() => {
    void reloadSavedViews();
  }, [reloadSavedViews]);

  const handleSelectPresetOrView = useCallback(
    (id: string, kind: "system" | "saved") => {
      hasCustomizedDefRef.current = true;
      setPendingDeleteViewId(null);
      if (kind === "system") {
        const preset = systemPresets.find((p) => p.id === id);
        if (!preset) return;
        setActiveViewId(null);
        setReportDefinition({
          ...preset.definition,
          computedFields: mergeWithPermanentFields(preset.definition.computedFields),
          name: preset.name,
        });
      } else {
        const view = savedViews.find((v) => v.id === id);
        if (!view) return;
        const viewDef = (view.definition as Partial<ReportDefinition>) ?? {};
        setActiveViewId(view.id);
        setReportDefinition({
          ...createDefaultReportDefinition(questions),
          ...viewDef,
          computedFields: mergeWithPermanentFields(viewDef.computedFields),
          name: view.name,
        });
      }
    },
    [mergeWithPermanentFields, questions, savedViews, systemPresets]
  );

  const handleSelectCustomView = useCallback(
    (id: string) => {
      hasCustomizedDashboardRef.current = true;
      setPendingDeleteViewId(null);
      const view = customDashboardViews.find((v) => v.id === id);
      if (!view) return;
      const loadedDef = view.definition as unknown as CustomDashboardDefinition;
      setActiveCustomViewId(view.id);
      setCustomDashboardDef({
        ...loadedDef,
        computedFields: mergeWithPermanentFields(loadedDef.computedFields),
      });
    },
    [customDashboardViews, mergeWithPermanentFields]
  );

  const canEditSurvey = useMemo(() => {
    if (survey?.canEdit) return true;
    if (isUserAdmin()) return true;
    const user = getUser();
    if (user && survey?.creatorUserId && user.id === survey.creatorUserId) return true;
    return hasPermission("survey_update");
  }, [survey]);

  const handleComputedFieldsChange = useCallback(
    async (nextFields: ComputedField[]) => {
      handleDefinitionChange({ ...reportDefinition, computedFields: nextFields });
      setCustomDashboardDef((prev) => ({ ...prev, computedFields: nextFields }));

      if (!canEditSurvey) return;

      const permanentFields = nextFields
        .filter((cf) => cf.scope === "permanent")
        .map((cf) => ({ ...cf, scope: "permanent" as const }));

      const existingPermanentFields = (
        (permanentConfigView?.definition as { computedFields?: ComputedField[] })?.computedFields ?? []
      );

      const hasChanged =
        JSON.stringify(permanentFields) !== JSON.stringify(existingPermanentFields);

      if (hasChanged) {
        try {
          if (permanentConfigView) {
            await updateReportView(surveyId, permanentConfigView.id, {
              name: "Cấu hình Cột vĩnh viễn",
              description: "Hệ thống tự động lưu trữ các cột tự tạo vĩnh viễn toàn bài khảo sát",
              scope: "SHARED",
              definition: {
                reportKind: "survey_permanent_config",
                computedFields: permanentFields,
              },
              isDefault: false,
            });
          } else if (permanentFields.length > 0) {
            await createReportView(surveyId, {
              name: "Cấu hình Cột vĩnh viễn",
              description: "Hệ thống tự động lưu trữ các cột tự tạo vĩnh viễn toàn bài khảo sát",
              scope: "SHARED",
              definition: {
                reportKind: "survey_permanent_config",
                computedFields: permanentFields,
              },
              isDefault: false,
            });
          }
          await reloadSavedViews();
        } catch (err) {
          console.warn("Failed to persist permanent computed fields:", err);
        }
      }
    },
    [
      canEditSurvey,
      handleDefinitionChange,
      permanentConfigView,
      reloadSavedViews,
      reportDefinition,
      surveyId,
    ]
  );

  const handleSaveViewSubmit = useCallback(
    async (payload: {
      name: string;
      description: string;
      scope: ReportViewScope;
      isDefault: boolean;
      mode: "create" | "update" | "clone";
    }) => {
      const isCustomTab = tab === "custom";
      const targetId = isCustomTab ? activeCustomViewId : activeViewId;
      const defToSave = isCustomTab
        ? {
            ...customDashboardDef,
            name: payload.name,
            description: payload.description || undefined,
            reportKind: "custom_dashboard" as const,
            version: 2 as const,
          }
        : {
            ...reportDefinition,
            name: payload.name,
            reportKind: "questions_analysis" as const,
            version: 1 as const,
          };

      if (payload.mode === "update" && targetId) {
        const updated = await updateReportView(surveyId, targetId, {
          name: payload.name,
          description: payload.description || null,
          scope: payload.scope,
          definition: defToSave as unknown as Record<string, unknown>,
          isDefault: payload.isDefault,
        });
        if (isCustomTab) {
          setActiveCustomViewId(updated.id);
          setCustomDashboardDef(defToSave as CustomDashboardDefinition);
        } else {
          setActiveViewId(updated.id);
          setReportDefinition(defToSave as ReportDefinition);
        }
        setViewNotice({ type: "success", text: `Đã cập nhật mẫu "${updated.name}".` });
      } else {
        const created = await createReportView(surveyId, {
          name: payload.name,
          description: payload.description || null,
          scope: payload.scope,
          definition: defToSave as unknown as Record<string, unknown>,
          isDefault: payload.isDefault,
        });
        if (isCustomTab) {
          setActiveCustomViewId(created.id);
          setCustomDashboardDef(defToSave as CustomDashboardDefinition);
        } else {
          setActiveViewId(created.id);
          setReportDefinition(defToSave as ReportDefinition);
        }
        setViewNotice({ type: "success", text: `Đã lưu mẫu "${created.name}".` });
      }
      await reloadSavedViews();
    },
    [activeCustomViewId, activeViewId, customDashboardDef, reloadSavedViews, reportDefinition, surveyId, tab]
  );

  const handleConfirmDeleteView = useCallback(
    async (viewId: string) => {
      try {
        await deleteReportView(surveyId, viewId);
        if (activeViewId === viewId) {
          setActiveViewId(null);
        }
        if (activeCustomViewId === viewId) {
          setActiveCustomViewId(null);
        }
        setPendingDeleteViewId(null);
        setViewNotice({ type: "success", text: "Đã xóa mẫu báo cáo đã lưu." });
        await reloadSavedViews();
      } catch (err) {
        setViewNotice({
          type: "error",
          text: err instanceof Error ? err.message : "Không thể xóa mẫu báo cáo.",
        });
      }
    },
    [activeCustomViewId, activeViewId, reloadSavedViews, surveyId]
  );

  useEffect(() => {
    if (!surveyId) return;
    let live = true;
    const filtered = Object.keys(filter).length > 0;
    setStatisticsLoading(true);
    setStatisticsError("");
    setStatistics(null);
    void fetch(`${reportBase}/statistics${filtered ? "/filter" : ""}`, {
      method: filtered ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        ...(filtered ? { "Content-Type": "application/json" } : {}),
      },
      body: filtered ? JSON.stringify(filter) : undefined,
      cache: "no-store",
    })
      .then(readJson<SurveyStatistics>)
      .then((value) => {
        if (live) setStatistics(value);
      })
      .catch((cause) => {
        if (live) setStatisticsError(cause instanceof Error ? cause.message : "Không thể tải thống kê câu hỏi.");
      })
      .finally(() => {
        if (live) setStatisticsLoading(false);
      });
    return () => {
      live = false;
    };
  }, [filter, reportBase, surveyId]);

  useEffect(() => {
    if (!surveyId || !valid) return;
    let live = true;
    const query = new URLSearchParams({ bucket: "AUTO" });
    if (fromDate) query.set("from", dateStart(fromDate));
    if (toDate) query.set("to", dateEnd(toDate, asOf));
    setDashboardLoading(true);
    setDashboardError("");
    setDashboard(null);
    void fetch(`${reportBase}/dashboard?${query}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      cache: "no-store",
    })
      .then(readJson<SurveyDashboard>)
      .then((value) => {
        if (live) {
          setDashboard(value);
          setLifetime(value.lifetime);
        }
      })
      .catch((cause) => {
        if (live) {
          setDashboardError(cause instanceof Error ? cause.message : "Không thể tải dashboard khảo sát.");
          if (cause instanceof Error && /quyền|đăng nhập/.test(cause.message)) setLifetime(null);
        }
      })
      .finally(() => {
        if (live) setDashboardLoading(false);
      });
    return () => {
      live = false;
    };
  }, [asOf, fromDate, reportBase, surveyId, toDate, valid]);

  const exportReport = async (kind: "raw" | "analysis") => {
    setExporting(kind);
    setExportError("");
    try {
      const filteredAnalysis = kind === "analysis" && Object.keys(filter).length > 0;
      const endpoint = kind === "raw" ? "responses.xlsx" : `analysis${filteredAnalysis ? "/filter" : ".xlsx"}`;
      const response = await fetch(`${reportBase}/${endpoint}`, {
        method: filteredAnalysis ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          ...(filteredAnalysis ? { "Content-Type": "application/json" } : {}),
        },
        body: filteredAnalysis ? JSON.stringify(filter) : undefined,
      });
      if (!response.ok) throw new Error(getApiError(response.status));
      downloadBlob(await response.blob(), `survey_${surveyId}_${kind === "raw" ? "responses" : "analysis"}.xlsx`);
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : "Không thể xuất báo cáo.");
    } finally {
      setExporting(null);
    }
  };

  const handleSyncGoogle = async () => {
    if (!surveyId || syncingGoogle) return;
    setSyncingGoogle(true);
    setSyncGoogleMessage(null);
    try {
      const res = await fetch(`${API_GOOGLE_SURVEY(surveyId)}/sync-responses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Đồng bộ thất bại");
      }
      setSyncGoogleMessage({
        type: "success",
        text: data.message || `Đã đồng bộ ${data.syncedResponsesCount ?? 0} phản hồi mới từ Google Forms!`,
      });
      void loadSurvey();
      setAsOf(Date.now());
    } catch (err: unknown) {
      setSyncGoogleMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Đồng bộ phản hồi Google Forms thất bại",
      });
    } finally {
      setSyncingGoogle(false);
    }
  };

  const initialGoogleSyncRef = useRef(false);
  useEffect(() => {
    if (survey?.googleIntegration && !initialGoogleSyncRef.current) {
      initialGoogleSyncRef.current = true;
      void handleSyncGoogle();
    }
  }, [survey?.googleIntegration]);

  const handleOpenGoogleEdit = async () => {
    if (!survey?.googleIntegration) return;
    setRequestingEdit(true);
    try {
      const token = getToken();

      const directEditUrl =
        survey.googleIntegration.editUrl ||
        (survey.googleIntegration.googleFormId
          ? `https://docs.google.com/forms/d/${survey.googleIntegration.googleFormId}/edit`
          : null);

      // Kiểm tra trước nếu chưa có tài khoản Google nào liên kết
      let hasActiveConn = false;
      try {
        const connRes = await fetch(`${API_GOOGLE_INTEGRATIONS}/connections`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (connRes.ok) {
          const conns: Array<{ status?: string }> = await connRes.json();
          hasActiveConn = Array.isArray(conns) && conns.some((c) => c.status === "ACTIVE");
        }
      } catch (e) {
        console.warn("Could not check google connections", e);
      }

      if (!hasActiveConn) {
        setIsGoogleConnectModalOpen(true);
        return;
      }

      // Gọi cấp quyền ngầm trong nền
      try {
        const res = await fetch(`${API_GOOGLE_SURVEY(surveyId)}/request-edit-access`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const targetUrl = data.editUrl || directEditUrl;
          if (targetUrl) {
            window.open(targetUrl, "_blank");
            return;
          }
        }
      } catch (err) {
        console.warn("Silent edit-access error:", err);
      }

      // Mở trực tiếp biểu mẫu Google Forms mà không làm phiền người dùng bằng popup lỗi kỹ thuật
      if (directEditUrl) {
        window.open(directEditUrl, "_blank");
      }
    } catch (err: unknown) {
      console.warn("handleOpenGoogleEdit error:", err);
    } finally {
      setRequestingEdit(false);
    }
  };

  if (notFound) {
    return (
      <ApiNotFound
        title="Không tìm thấy báo cáo"
        description="Khảo sát không tồn tại hoặc bạn không còn quyền truy cập."
        href="/admin/survey"
        linkLabel="Về danh sách khảo sát"
      />
    );
  }

  const tabs = [
    ["dashboard", "Tổng quan", BarChart3],
    ["questions", "Phân tích câu hỏi", MessageSquareText],
    ["custom", "Báo cáo tùy chỉnh", LayoutDashboard],
    ["responses", "Phản hồi", ListChecks],
  ] as const;

  const currentStatus = statusConfig[survey?.status ?? ""] ?? {
    label: survey?.status ?? "—",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
    dotClass: "bg-slate-400",
  };

  const lifetimeMetrics = [
    ["Trang", survey?.pages?.length == null ? "—" : number.format(survey.pages.length), Layers, "text-blue-500"],
    ["Câu hỏi", survey ? number.format(questions.length) : "—", HelpCircle, "text-indigo-500"],
    ["Lượt xem", lifetime ? (lifetime.views == null ? "Chưa ghi nhận" : number.format(lifetime.views)) : "—", Eye, "text-emerald-500"],
    ["Phản hồi", lifetime == null ? "—" : number.format(lifetime.submissions), CheckCircle2, "text-purple-500"],
    ["Phạm vi", "Toàn thời gian", Clock, "text-amber-500"],
  ] as const;

  return (
    <main className="analytics-hub -mx-4 -my-5 min-h-screen bg-slate-50/70 px-4 py-6 text-slate-900 transition-colors duration-200 dark:bg-[#0b1220] dark:text-slate-100 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        {/* HEADER PANEL */}
        <header className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow duration-200 dark:border-slate-800/80 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Link
                href="/admin/survey"
                className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
              >
                <ArrowLeft size={14} className="transition-transform duration-200 group-hover:-translate-x-1" />
                Quay lại danh sách khảo sát
              </Link>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {survey?.title ?? statistics?.surveyTitle ?? (surveyError ? "Báo cáo khảo sát" : "Đang tải…")}
              </h1>

              <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-xs">
                {/* STATUS BADGE WITH GLOWING DOT */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium ${currentStatus.badgeClass}`}
                >
                  <span className="relative flex h-2 w-2">
                    {currentStatus.pingClass && (
                      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${currentStatus.pingClass}`} />
                    )}
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${currentStatus.dotClass}`} />
                  </span>
                  {currentStatus.label}
                </span>

                <span className="text-slate-300 dark:text-slate-700">·</span>

                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Calendar size={13} className="text-slate-400 dark:text-slate-500" />
                  Mở: <strong className="font-semibold text-slate-700 dark:text-slate-300">{formatSurveyLocal(survey?.openAt)}</strong>
                  {" — "}
                  Đóng: <strong className="font-semibold text-slate-700 dark:text-slate-300">{formatSurveyLocal(survey?.closeAt)}</strong>
                </span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => void exportReport("raw")}
                disabled={exporting !== null || !survey}
                className="inline-flex h-9.5 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400" />
                {exporting === "raw" ? "Đang xuất..." : "Xuất phản hồi"}
              </button>

              <button
                type="button"
                onClick={() => void exportReport("analysis")}
                disabled={exporting !== null || !survey}
                className="inline-flex h-9.5 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              >
                <Download size={15} />
                {exporting === "analysis" ? "Đang xuất..." : "Xuất phân tích"}
              </button>
            </div>
          </div>

          {/* SCHEDULE WARNINGS */}
          {survey?.scheduleWarnings?.length ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 text-xs font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              <span>⚠️</span>
              <span>{survey.scheduleWarnings.join(" · ")}</span>
            </div>
          ) : null}

          {/* LIFETIME METRICS TILES */}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800/80 sm:grid-cols-3 lg:grid-cols-5">
            {lifetimeMetrics.map(([label, value, Icon, colorClass]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-100/80 bg-slate-50/70 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-800/30 dark:hover:bg-slate-800/50"
              >
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <Icon size={13} className={colorClass} />
                  {label}
                </p>
                <strong className="mt-1 block text-lg font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                  {value}
                </strong>
              </div>
            ))}
          </div>
        </header>

        {/* GOOGLE FORMS SYNC BAR */}
        {survey?.googleIntegration && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-purple-200/90 bg-gradient-to-r from-purple-50/80 via-indigo-50/50 to-purple-50/30 p-4.5 shadow-xs dark:border-purple-900/50 dark:from-purple-950/20 dark:via-indigo-950/15 dark:to-purple-950/10 sm:p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs ring-1 ring-purple-100 dark:bg-slate-800 dark:ring-purple-900/40">
                <FcGoogle className="text-2xl" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Google Forms đang liên kết
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      survey.googleIntegration.syncStatus === "FAILED"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                        : "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                    }`}
                  >
                    {survey.googleIntegration.syncStatus || "CONNECTED"}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Form ID: <code className="rounded bg-purple-100/70 px-1 py-0.5 font-mono text-[11px] font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">{survey.googleIntegration.googleFormId}</code>
                  </span>
                  <span>•</span>
                  <span>
                    Đồng bộ lần cuối:{" "}
                    <strong className="font-medium text-slate-700 dark:text-slate-300">
                      {survey.googleIntegration.lastSyncedAt
                        ? new Date(survey.googleIntegration.lastSyncedAt).toLocaleString("vi-VN")
                        : "Chưa đồng bộ"}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSyncGoogle()}
                disabled={syncingGoogle}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-purple-700 active:scale-[0.98] disabled:opacity-50"
              >
                <RefreshCw size={13} className={syncingGoogle ? "animate-spin" : ""} />
                {syncingGoogle ? "Đang đồng bộ..." : "Đồng bộ ngay"}
              </button>

              <button
                type="button"
                onClick={() => void handleOpenGoogleEdit()}
                disabled={requestingEdit}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 text-xs font-semibold text-purple-700 shadow-2xs transition hover:bg-purple-50 active:scale-[0.98] disabled:opacity-50 dark:border-purple-800 dark:bg-slate-800 dark:text-purple-300 dark:hover:bg-slate-700"
              >
                <Edit3 size={13} />
                {requestingEdit ? "Đang cấp quyền..." : "Sửa trên Forms"}
              </button>

              {survey.googleIntegration.responseUrl && (
                <a
                  href={survey.googleIntegration.responseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <ExternalLink size={13} />
                  Mở Form
                </a>
              )}
            </div>
          </div>
        )}

        {/* GOOGLE SYNC NOTIFICATION BANNER */}
        {syncGoogleMessage && (
          <div
            className={`flex items-center justify-between rounded-xl border p-3.5 text-xs font-medium ${
              syncGoogleMessage.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
            }`}
          >
            <span>{syncGoogleMessage.text}</span>
            <button
              type="button"
              onClick={() => setSyncGoogleMessage(null)}
              className="text-xs font-semibold underline hover:opacity-80"
            >
              Đóng
            </button>
          </div>
        )}

        {/* ERROR BANNERS */}
        {surveyError && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <span>{surveyError}</span>
            <button
              type="button"
              onClick={() => void loadSurvey()}
              aria-label="Tải lại khảo sát"
              className="rounded-lg p-1 transition hover:bg-rose-100 dark:hover:bg-rose-900/40"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        )}

        {exportError && (
          <p
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300"
          >
            {exportError}
          </p>
        )}

        {/* TAB NAVIGATION PILL BAR */}
        <nav
          aria-label="Nội dung báo cáo"
          className="flex gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900"
        >
          {tabs.map(([key, label, Icon]) => {
            const isActive = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-10.5 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white"
                }`}
              >
                <Icon size={16} className={isActive ? "text-white" : "text-slate-400 dark:text-slate-500"} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* TAB CONTENTS */}
        {tab === "dashboard" ? (
          <SurveyDashboardTab
            data={dashboard}
            loading={dashboardLoading}
            error={dashboardError}
            fromDate={fromDate}
            toDate={toDate}
            maxDate={maxDate}
            valid={valid}
            onFromDate={setFromDate}
            onToDate={setToDate}
            onRefresh={() => setAsOf(Date.now())}
          />
        ) : tab === "custom" ? (
          <div className="space-y-5">
            {viewNotice && (
              <div
                className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-medium ${
                  viewNotice.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                <span>{viewNotice.text}</span>
                <button
                  type="button"
                  onClick={() => setViewNotice(null)}
                  className="text-xs font-bold underline"
                >
                  Đóng
                </button>
              </div>
            )}

            {pendingDeleteViewId && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
                <span className="font-semibold">
                  Bạn chắc chắn muốn xóa mẫu báo cáo đang chọn không?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingDeleteViewId(null)}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    data-testid="rb-confirm-delete-view"
                    onClick={() => void handleConfirmDeleteView(pendingDeleteViewId)}
                    className="rounded-lg bg-rose-600 px-3 py-1 font-bold text-white hover:bg-rose-700"
                  >
                    Xác nhận xóa
                  </button>
                </div>
              </div>
            )}

            <CustomReportTab
              surveyId={surveyId}
              surveyTitle={survey?.title ?? "Khảo sát"}
              dataset={dataset}
              questions={questions}
              fieldMetas={fieldMetas}
              recordMap={recordMap}
              sharedComputedFields={reportDefinition.computedFields}
              onOpenComputedDrawer={() => setIsComputedDrawerOpen(true)}
              savedCustomViews={customDashboardViews}
              activeCustomViewId={activeCustomViewId}
              onSelectCustomView={handleSelectCustomView}
              onSaveCustomView={(modalMode) =>
                setSaveModalState({ isOpen: true, mode: modalMode })
              }
              onDeleteCustomView={(viewId) => setPendingDeleteViewId(viewId)}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              canExportData={Boolean(dataset?.canExportData)}
              piiIncluded={Boolean(dataset?.piiIncluded)}
              onTogglePii={(nextInclude) => setIncludePii(nextInclude)}
              initialDashboardDef={customDashboardDef}
              onChangeDashboardDef={setCustomDashboardDef}
            />
          </div>
        ) : (
          <div className="space-y-5">
            {viewNotice && (
              <div
                className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-medium ${
                  viewNotice.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                <span>{viewNotice.text}</span>
                <button
                  type="button"
                  onClick={() => setViewNotice(null)}
                  className="text-xs font-bold underline"
                >
                  Đóng
                </button>
              </div>
            )}

            {pendingDeleteViewId && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
                <span className="font-semibold">
                  Bạn chắc chắn muốn xóa mẫu báo cáo đang chọn không?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingDeleteViewId(null)}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    data-testid="rb-confirm-delete-view"
                    onClick={() => void handleConfirmDeleteView(pendingDeleteViewId)}
                    className="rounded-lg bg-rose-600 px-3 py-1 font-bold text-white hover:bg-rose-700"
                  >
                    Xác nhận xóa
                  </button>
                </div>
              </div>
            )}

            <ReportToolbar
              definition={reportDefinition}
              onChangeMode={(nextMode) =>
                handleDefinitionChange({ ...reportDefinition, mode: nextMode })
              }
              onReset={() => {
                hasCustomizedDefRef.current = false;
                setActiveViewId(null);
                setPendingDeleteViewId(null);
                setReportDefinition(createDefaultReportDefinition(questions));
              }}
              onOpenComputedDrawer={() => setIsComputedDrawerOpen(true)}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              onOpenSaveModal={(modalMode) =>
                setSaveModalState({ isOpen: true, mode: modalMode })
              }
              onDeleteActiveView={(viewId) => setPendingDeleteViewId(viewId)}
              systemPresets={systemPresets}
              savedViews={questionSavedViews}
              activeViewId={activeViewId}
              onSelectPresetOrView={handleSelectPresetOrView}
              canExportData={Boolean(dataset?.canExportData)}
              piiIncluded={Boolean(dataset?.piiIncluded)}
              piiCount={piiQuestionIds.length}
              onTogglePii={(nextInclude) => setIncludePii(nextInclude)}
              piiLoading={datasetLoading}
              isComputing={isComputing}
              durationMs={output.durationMs}
            />

            <FilterBuilderBar
              filterTree={reportDefinition.filterTree}
              onChange={(filterTree) =>
                handleDefinitionChange({ ...reportDefinition, filterTree })
              }
              fieldMetas={fieldMetas}
              totalCount={output.totalRecords}
              filteredCount={output.filteredRecords.length}
            />

            {statisticsError && (
              <p
                role="alert"
                className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300"
              >
                {statisticsError}
              </p>
            )}

            {tab === "questions" ? (
              <SummaryTab
                mode="questions"
                data={statistics}
                traffic={null}
                pages={null}
                timeline={[]}
                loading={statisticsLoading || datasetLoading}
                filtered={countActiveFilterRules(reportDefinition.filterTree) > 0}
                surveyPages={survey?.pages}
                dataset={dataset}
                surveyId={surveyId}
                filter={filter}
                definition={reportDefinition}
                onChangeDefinition={handleDefinitionChange}
                output={output}
                fieldMetas={fieldMetas}
                recordMap={recordMap}
                onOpenComputedDrawer={() => setIsComputedDrawerOpen(true)}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                onOpenSaveModal={() =>
                  setSaveModalState({
                    isOpen: true,
                    mode: activeSavedView?.canEdit ? "update" : "create",
                  })
                }
              />
            ) : (
              <ResponseListTab
                surveyId={surveyId}
                filter={filter}
                filteredRecords={dataset ? output.filteredRecords : undefined}
                questions={questions}
                computedValues={output.computedValues}
                computedFields={reportDefinition.computedFields}
                isFilteredByReport={countActiveFilterRules(reportDefinition.filterTree) > 0}
                piiIncluded={Boolean(dataset?.piiIncluded)}
                piiQuestionIds={piiQuestionIds}
              />
            )}
          </div>
        )}
      </div>

      {/* REPORT BUILDER MODALS & DRAWERS */}
      <ComputedFieldsDrawer
        isOpen={isComputedDrawerOpen}
        onClose={() => setIsComputedDrawerOpen(false)}
        computedFields={reportDefinition.computedFields}
        statuses={output.computedStatuses}
        onChange={handleComputedFieldsChange}
        records={dataset?.records ?? []}
        questions={questions}
        fieldMetas={fieldMetas}
        canManagePermanent={canEditSurvey}
      />

      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        surveyId={surveyId}
        surveyTitle={survey?.title ?? "Khảo sát"}
        definition={reportDefinition}
        output={output}
        questions={questions}
        fieldMetas={fieldMetas}
        canExportData={Boolean(dataset?.canExportData)}
        piiIncluded={Boolean(dataset?.piiIncluded)}
        dashboardMode={
          tab === "custom" && customDashboardOutput
            ? {
                definition: customDashboardDef,
                output: customDashboardOutput,
              }
            : undefined
        }
      />

      <SaveViewModal
        isOpen={saveModalState.isOpen}
        mode={saveModalState.mode}
        activeView={activeSavedView}
        onClose={() => setSaveModalState((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={handleSaveViewSubmit}
      />

      {/* GOOGLE ACCOUNT CONNECTION MODAL */}
      <GoogleAccountManagerModal
        isOpen={isGoogleConnectModalOpen}
        onClose={() => setIsGoogleConnectModalOpen(false)}
        title="Yêu cầu kết nối tài khoản Google"
        description="Để chỉnh sửa biểu mẫu trên Google Forms, bạn cần liên kết một tài khoản Google có thực."
        requiredNotice="Hệ thống cần tài khoản Google của bạn để cấp quyền chỉnh sửa biểu mẫu Google Forms trực tiếp từ Google Drive. Vui lòng kết nối tài khoản Google bên dưới."
        onAccountChange={() => {
          setIsGoogleConnectModalOpen(false);
          void handleOpenGoogleEdit();
        }}
      />
    </main>
  );
}

