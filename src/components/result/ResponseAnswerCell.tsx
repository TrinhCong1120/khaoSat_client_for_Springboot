"use client";

import AddressAnswerDisplay from "@/components/result/AddressAnswerDisplay";
import { isAddressQuestionType } from "@/lib/vietnam-address-api";

type ColumnMeta = {
  type?: string;
  questionTypeCode?: string;
  question?: string;
  questionId?: number;
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

  if (answer?.value != null && String(answer.value) !== "") {
    return <span>{String(answer.value)}</span>;
  }

  return <span>-</span>;
}
