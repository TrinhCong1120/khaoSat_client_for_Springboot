"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DatasetRecord, SurveyResultQuestion } from "@/types/report";
import { runReportPipeline } from "@/lib/report-engine/pipeline";
import type { ReportDefinition, ReportOutput } from "@/lib/report-engine/types";

const WORKER_THRESHOLD = 5000;
const DEBOUNCE_MS = 150;

export function useReportEngine(
  records: DatasetRecord[],
  questions: SurveyResultQuestion[],
  definition: ReportDefinition
): { output: ReportOutput; isComputing: boolean } {
  const [debouncedDef, setDebouncedDef] = useState(definition);
  const [workerState, setWorkerState] = useState<{
    jobKey: string;
    output: ReportOutput;
  } | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedDef(definition), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [definition]);

  const useWorker = records.length > WORKER_THRESHOLD && typeof Worker !== "undefined";

  const jobKey = useMemo(
    () => `${records.length}:${questions.length}:${JSON.stringify(debouncedDef)}`,
    [records.length, questions.length, debouncedDef]
  );

  const syncOutput = useMemo(() => {
    if (useWorker) return null;
    return runReportPipeline(records, questions, debouncedDef);
  }, [useWorker, records, questions, debouncedDef]);

  useEffect(() => {
    if (!useWorker) return;

    const reqId = ++reqIdRef.current;

    try {
      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL("../lib/report-engine/reportWorker.ts", import.meta.url)
        );
      }

      const worker = workerRef.current;
      const handleMessage = (
        event: MessageEvent<{
          requestId: number;
          output: Omit<ReportOutput, "computedValues"> & {
            computedValuesEntries?: Array<[string, Record<string, unknown>]>;
          };
        }>
      ) => {
        if (event.data.requestId !== reqIdRef.current) return;
        const { computedValuesEntries, ...rest } = event.data.output;
        setWorkerState({
          jobKey,
          output: {
            ...rest,
            computedValues: new Map(computedValuesEntries ?? []),
          },
        });
      };

      const handleError = () => {
        if (reqId !== reqIdRef.current) return;
        setWorkerState({
          jobKey,
          output: runReportPipeline(records, questions, debouncedDef),
        });
      };

      worker.onmessage = handleMessage;
      worker.onerror = handleError;
      worker.postMessage({ requestId: reqId, records, questions, definition: debouncedDef });
    } catch {
      queueMicrotask(() => {
        if (reqId !== reqIdRef.current) return;
        setWorkerState({
          jobKey,
          output: runReportPipeline(records, questions, debouncedDef),
        });
      });
    }
  }, [useWorker, jobKey, records, questions, debouncedDef]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const fallbackEmpty: ReportOutput = useMemo(
    () => ({
      totalRecords: records.length,
      filteredRecords: records,
      computedValues: new Map(),
      computedStatuses: [],
      rows: [],
      grandTotalRow: null,
      pivotMatrix: null,
      overviewQuestions: [],
      durationMs: 0,
    }),
    [records]
  );

  return {
    output: syncOutput ?? workerState?.output ?? fallbackEmpty,
    isComputing: useWorker && workerState?.jobKey !== jobKey,
  };
}
