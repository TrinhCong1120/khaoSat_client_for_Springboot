"use client";

import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import { Vietnamese } from "flatpickr/dist/l10n/vn.js";
import "flatpickr/dist/flatpickr.css";
import { FiCalendar } from "react-icons/fi";

export default function DateTimePicker({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!inputRef.current) return;
    const picker = flatpickr(inputRef.current, {
      enableTime: true,
      time_24hr: true,
      minuteIncrement: 5,
      dateFormat: "Y-m-d\\TH:i",
      altInput: true,
      altFormat: "d/m/Y · H:i",
      altInputClass: "h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 pr-11 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white",
      locale: Vietnamese,
      disableMobile: true,
      clickOpens: !disabled,
      appendTo: document.body,
      onChange: (_dates, dateString) => onChangeRef.current(dateString),
      onReady: (_dates, _dateString, instance) => {
        instance.calendarContainer.classList.add("survey-datetime-calendar");
        if (instance.altInput) {
          inputRef.current?.removeAttribute("id");
          instance.altInput.id = id;
        }
      },
    });
    pickerRef.current = picker;
    return () => {
      picker.destroy();
      pickerRef.current = null;
    };
  }, [disabled, id]);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (value) picker.setDate(value, false, "Y-m-d\\TH:i");
    else picker.clear(false);
  }, [value]);

  return (
    <div className="relative min-w-0 flex-1">
      <input ref={inputRef} id={id} disabled={disabled} placeholder={placeholder} />
      <button type="button" onClick={() => pickerRef.current?.open()} disabled={disabled} aria-label="Mở lịch chọn ngày giờ" className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-brand-400">
        <FiCalendar size={17} />
      </button>
    </div>
  );
}
