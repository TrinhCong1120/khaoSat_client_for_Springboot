"use client";

import { useEffect, useState } from "react";
import {
  formatAddressFromCodes,
  parseAddressCodesFromAnswer,
} from "@/lib/vietnam-address-api";

type Props = {
  answer: any;
  className?: string;
};

export default function AddressAnswerDisplay({ answer, className }: Props) {
  const provinceText = String(answer?.province ?? "").trim();
  const wardText = String(answer?.ward ?? "").trim();
  const textAddress = provinceText && wardText ? `${provinceText} / ${wardText}` : "";
  const codes = parseAddressCodesFromAnswer(answer);
  const fallback =
    textAddress ||
    (answer?.value != null && String(answer.value).trim() !== ""
      ? String(answer.value)
      : "-");

  const [text, setText] = useState<string>(() =>
    codes ? "Đang tải địa danh…" : fallback
  );

  useEffect(() => {
    if (textAddress) {
      setText(textAddress);
      return;
    }
    const c = parseAddressCodesFromAnswer(answer);
    if (!c) {
      setText(fallback);
      return;
    }
    let cancelled = false;
    setText("Đang tải địa danh…");
    formatAddressFromCodes(c.provinceCode, c.wardCode).then((line) => {
      if (!cancelled) setText(line);
    });
    return () => {
      cancelled = true;
    };
  }, [answer, fallback, textAddress]);

  return <span className={className}>{text}</span>;
}
