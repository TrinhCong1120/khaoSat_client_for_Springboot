"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const YEARS = Array.from({ length: new Date().getFullYear() - 1969 }, (_, index) => 1970 + index);
const pad = (value: number) => String(value).padStart(2, "0");
const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

function parts(value: string, today: string) {
  const [year, month, day] = (value || today).split("-").map(Number);
  return { year, month, day };
}

function Wheel({ label, values, value, format, onChange }: {
  label: string;
  values: number[];
  value: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const index = values.indexOf(value);
    if (wheelRef.current && index >= 0) wheelRef.current.scrollTop = index * 32;
  }, [value, values]);

  useEffect(() => () => {
    if (settleRef.current) clearTimeout(settleRef.current);
  }, []);

  return (
    <div
      ref={wheelRef}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={event => {
        if (settleRef.current) clearTimeout(settleRef.current);
        const target = event.currentTarget;
        settleRef.current = setTimeout(() => {
          const index = Math.max(0, Math.min(values.length - 1, Math.round(target.scrollTop / 32)));
          target.scrollTo({ top: index * 32, behavior: "smooth" });
          if (values[index] !== value) onChange(values[index]);
        }, 90);
      }}
      className="date-wheel relative z-10 h-40 snap-y snap-mandatory overflow-y-auto py-16 text-center text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
    >
      {values.map(item => (
        <button
          type="button"
          role="option"
          aria-selected={item === value}
          key={item}
          onClick={() => onChange(item)}
          className={`block h-8 w-full snap-center rounded-md px-1 transition-colors ${item === value ? "font-bold text-slate-950 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
        >
          {format(item)}
        </button>
      ))}
    </div>
  );
}

export default function DateWheelPicker({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: string;
  max: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = parts(value, max);
  const maximum = parts(max, max);
  const maxMonth = selected.year === maximum.year ? maximum.month : 12;
  const maxDay = selected.year === maximum.year && selected.month === maximum.month
    ? maximum.day
    : daysInMonth(selected.year, selected.month);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const update = (next: Partial<typeof selected>) => {
    const year = next.year ?? selected.year;
    const monthLimit = year === maximum.year ? maximum.month : 12;
    const month = Math.min(next.month ?? selected.month, monthLimit);
    const dayLimit = year === maximum.year && month === maximum.month
      ? maximum.day
      : daysInMonth(year, month);
    const day = Math.min(next.day ?? selected.day, dayLimit);
    onChange(`${year}-${pad(month)}-${pad(day)}`);
  };

  return (
    <div ref={rootRef} className="relative min-w-[132px] flex-1 sm:max-w-[175px]">
      <span className="text-[11px] font-medium">{label}</span>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className="mt-1 flex h-9 w-full items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 text-left text-xs outline-none hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600"
      >
        <CalendarDays size={14} className="shrink-0 text-slate-500" aria-hidden />
        <span className={value ? "flex-1 tabular-nums" : "flex-1 text-slate-500 dark:text-slate-400"}>
          {value ? `${pad(selected.day)}/${pad(selected.month)}/${selected.year}` : "Chọn ngày"}
        </span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div role="dialog" aria-label={`Chọn ${label.toLowerCase()}`} className="absolute left-0 top-full z-50 mt-2 w-[300px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
          <div className="mb-2 grid grid-cols-3 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <span>Ngày</span><span>Tháng</span><span>Năm</span>
          </div>
          <div className="relative grid grid-cols-3 gap-2 before:pointer-events-none before:absolute before:inset-x-0 before:top-[64px] before:h-8 before:rounded-md before:bg-blue-50 dark:before:bg-blue-950/60">
            <Wheel label="Ngày" values={Array.from({ length: maxDay }, (_, index) => index + 1)} value={selected.day} format={pad} onChange={day => update({ day })} />
            <Wheel label="Tháng" values={MONTHS.slice(0, maxMonth)} value={selected.month} format={month => `Tháng ${month}`} onChange={month => update({ month })} />
            <Wheel label="Năm" values={YEARS.filter(year => year <= maximum.year)} value={selected.year} format={String} onChange={year => update({ year })} />
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
            <button type="button" onClick={() => onChange("")} className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-slate-300 dark:hover:bg-slate-800">Bỏ chọn</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Xong</button>
          </div>
        </div>
      )}
    </div>
  );
}
