"use client";

import AddressAnswerDisplay from "@/components/result/AddressAnswerDisplay";
import { isAddressQuestionType } from "@/lib/vietnam-address-api";

type ColumnMeta = {
  type?: string;
  questionTypeCode?: string;
  question?: string;
  questionId?: string;
  questionTypeId?: number;
};

type Props = {
  column: ColumnMeta | undefined;
  answer: any;
};

export default function ResponseAnswerCell({ column, answer }: Props) {
  if (isAddressQuestionType(column ?? {})) {
    return <AddressAnswerDisplay answer={answer} />;
  }

  const isMatrix = ["MATRIX_SINGLE", "MATRIX_MULTI", "MATRIX_INPUT", "DYNAMIC_TABLE"].includes(
    String(column?.questionTypeCode ?? "").toUpperCase()
  );

  if (isMatrix || answer?.matrixData) {
    return <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">✓ Đã điền</span>;
  }

  if (answer?.value != null && String(answer.value) !== "") {
    return <span>{String(answer.value)}</span>;
  }

  return <span>-</span>;
}
