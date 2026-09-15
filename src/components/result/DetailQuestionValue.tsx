"use client";

import AddressAnswerDisplay from "@/components/result/AddressAnswerDisplay";
import {
  isAddressQuestionType,
  parseAddressCodesFromAnswer,
} from "@/lib/vietnam-address-api";

type Q = {
  type?: string;
  questionTypeCode?: string;
  questionTypeId?: number;
  value?: unknown;
  province?: string;
  ward?: string;
  provinceCode?: number;
  wardCode?: number;
  isApplicable?: boolean;
};

export default function DetailQuestionValue({ q }: { q: Q }) {
  if (q.isApplicable === false) {
    return (
      <span className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-300 italic font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Không áp dụng theo điều kiện
      </span>
    );
  }

  const answerPayload = {
    value: q.value,
    province: q.province,
    ward: q.ward,
    provinceCode: q.provinceCode,
    wardCode: q.wardCode,
  };
  const codes = parseAddressCodesFromAnswer(answerPayload);

  if (isAddressQuestionType(q)) {
    const hasTextAddress =
      String(q.province ?? "").trim() !== "" &&
      String(q.ward ?? "").trim() !== "";
    if (!hasTextAddress && !codes && (q.value == null || q.value === "")) {
      return <span className="text-gray-400 italic">Chưa trả lời</span>;
    }
    return <AddressAnswerDisplay answer={answerPayload} />;
  }

  if (q.value === null || q.value === undefined || q.value === "") {
    return <span className="text-gray-400 italic">Chưa trả lời</span>;
  }

  if (q.type === "DATE") {
    return <>{new Date(q.value as string).toLocaleDateString("vi-VN")}</>;
  }

  return <>{String(q.value)}</>;
}
