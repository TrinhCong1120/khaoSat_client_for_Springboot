import type { SurveyResultQuestion } from "@/types/report";
import { getQuestionLabel, normalizeQuestionType } from "./extractors";

export type PiiBadgeInfo = {
  isPii: boolean;
  label: string;
};

export function detectClientPiiQuestionIds(
  questions: SurveyResultQuestion[],
  serverPiiIds?: string[]
): Set<string> {
  const set = new Set(serverPiiIds ?? []);
  for (const q of questions) {
    if (set.has(q.id)) continue;
    const typeCode = normalizeQuestionType(q);
    if (typeCode === "ADDRESS") {
      set.add(q.id);
      continue;
    }
    const text = normalizeNoAccent(getQuestionLabel(q));
    if (
      ["so dien thoai", "dien thoai", "sdt", "email", "ho va ten", "ho ten", "cccd", "cmnd", "can cuoc"].some(
        (kw) => text.includes(kw)
      )
    ) {
      set.add(q.id);
    }
  }
  return set;
}

export function normalizeNoAccent(input: string): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

