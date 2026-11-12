import type { DatasetRecord, SurveyResultQuestion } from "@/types/report";
import { runReportPipeline } from "./pipeline";
import type { ReportDefinition } from "./types";

type WorkerRequest = {
  requestId: number;
  records: DatasetRecord[];
  questions: SurveyResultQuestion[];
  definition: ReportDefinition;
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { requestId, records, questions, definition } = event.data;
  const output = runReportPipeline(records, questions, definition);
  self.postMessage({
    requestId,
    output: {
      ...output,
      computedValuesEntries: Array.from(output.computedValues.entries()),
      computedValues: undefined,
    },
  });
};

