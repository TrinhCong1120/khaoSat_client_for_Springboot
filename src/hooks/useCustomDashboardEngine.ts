"use client";

import { useEffect, useMemo, useState } from "react";
import type { DatasetRecord, SurveyResultQuestion } from "@/types/report";
import { runCustomDashboardPipeline } from "@/lib/report-engine/pipeline";
import type {
  ComputedField,
  CustomDashboardDefinition,
  CustomDashboardOutput,
} from "@/lib/report-engine/types";

const DEBOUNCE_MS = 150;

export function useCustomDashboardEngine(
  records: DatasetRecord[],
  questions: SurveyResultQuestion[],
  dashboardDef: CustomDashboardDefinition,
  sharedComputedFields?: ComputedField[]
): {
  output: CustomDashboardOutput;
  isComputing: boolean;
} {
  const [debouncedDef, setDebouncedDef] = useState<CustomDashboardDefinition>(dashboardDef);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedDef(dashboardDef);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [dashboardDef]);

  const output = useMemo(() => {
    return runCustomDashboardPipeline(
      records,
      questions,
      debouncedDef,
      sharedComputedFields
    );
  }, [records, questions, debouncedDef, sharedComputedFields]);

  return {
    output,
    isComputing: debouncedDef !== dashboardDef,
  };
}
