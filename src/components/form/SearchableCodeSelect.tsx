"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const inputClass =
  "w-full border border-slate-200 px-4 py-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

export type CodeOption = { code: number; name: string };

type Props = {
  options: CodeOption[];
  /** null = chưa chọn (khi allowNull) */
  value: number | null;
  onChange: (code: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  /** Hiện mục đầu để bỏ chọn (lọc / xã không bắt buộc) */
  allowNull?: boolean;
  nullLabel?: string;
  allowCodeInput?: boolean;
};

function norm(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function SearchableCodeSelect({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "",
  className = "",
  "aria-label": ariaLabel,
  allowNull = false,
  nullLabel = "— Bỏ chọn —",
  allowCodeInput = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(() => {
    if (value == null || !Number.isFinite(value)) return "";
    return options.find((o) => o.code === value)?.name ?? "";
  }, [options, value]);

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return options;
    return options.filter((o) => {
      const name = norm(o.name);
      if (!allowCodeInput) return name.includes(q);
      const qNum = Number(q.replace(/\s/g, ""));
      const codeStr = String(o.code);
      return name.includes(q) || codeStr.includes(q.replace(/\s/g, "")) || (Number.isFinite(qNum) && o.code === qNum);
    });
  }, [allowCodeInput, options, query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const commitFromQuery = (q: string) => {
    const t = q.trim();
    if (t === "") {
      if (allowNull) onChange(null);
      return;
    }
    if (allowCodeInput) {
      const n = Number(t.replace(/\s/g, ""));
      if (Number.isFinite(n) && options.some((o) => o.code === n)) {
        onChange(n);
        return;
      }
    }
    const exact = options.find((o) => norm(o.name) === norm(t));
    if (exact) onChange(exact.code);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!rootRef.current?.contains(document.activeElement)) {
        setOpen(false);
        setQuery("");
      }
    }, 0);
  };

  const showList = open && !disabled && (options.length > 0 || allowNull);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        type="text"
        disabled={disabled}
        autoComplete="off"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        placeholder={placeholder}
        className={inputClass}
        value={open ? query : selectedLabel}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery(selectedLabel);
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (filtered.length === 1) {
              onChange(filtered[0].code);
              setOpen(false);
              setQuery("");
            } else {
              commitFromQuery(query);
              setOpen(false);
              setQuery("");
            }
          }
        }}
      />
      {showList && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {allowNull && (
            <li
              role="option"
              className="cursor-pointer px-3 py-2 text-gray-500 hover:bg-slate-50 dark:hover:bg-gray-800"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(null);
                setOpen(false);
                setQuery("");
              }}
            >
              {nullLabel}
            </li>
          )}
          {filtered.map((o) => (
            <li
              key={o.code}
              role="option"
              className="cursor-pointer px-3 py-2 text-gray-800 hover:bg-slate-50 dark:text-gray-200 dark:hover:bg-gray-800"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o.code);
                setOpen(false);
                setQuery("");
              }}
            >
              <span className="font-medium">{o.name}</span>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-gray-400 italic">Không khớp</li>
          )}
        </ul>
      )}
    </div>
  );
}
