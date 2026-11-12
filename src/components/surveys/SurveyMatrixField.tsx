"use client";

import { useMemo } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import type { MatrixConfig, MatrixRow, MatrixColumn } from "./builder/BuilderMatrixConfig";

interface SurveyQuestionItem {
  id: string;
  matrixConfig?: string | MatrixConfig | null;
  questionTypeCode?: string | null;
  questionType?: { code?: string } | null;
}

interface SurveyMatrixFieldProps {
  question: SurveyQuestionItem;
  value: string | null | undefined;
  disabled?: boolean;
  onChange: (val: string) => void;
}

function renderCellInput(
  col: MatrixColumn,
  val: unknown,
  disabled: boolean,
  onCellChange: (val: unknown) => void,
  isTable = false
) {
  const type = col.type || "text";

  if (type === "number") {
    return (
      <input
        type="number"
        disabled={disabled}
        value={(val as string | number) ?? ""}
        onChange={(e) => onCellChange(e.target.value)}
        placeholder={isTable ? `Nhập ${col.label.toLowerCase()}…` : "..."}
        className={`w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-white outline-none focus:border-brand-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 ${
          isTable ? "" : "text-center"
        }`}
      />
    );
  }

  if (type === "date") {
    return (
      <input
        type="date"
        disabled={disabled}
        value={(val as string) ?? ""}
        onChange={(e) => onCellChange(e.target.value)}
        className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-white outline-none focus:border-brand-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 text-center"
      />
    );
  }

  if (type === "select") {
    const opts = col.options?.length ? col.options : ["Lựa chọn 1", "Lựa chọn 2"];
    return (
      <select
        disabled={disabled}
        value={(val as string) ?? ""}
        onChange={(e) => onCellChange(e.target.value)}
        className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-white outline-none focus:border-brand-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 cursor-pointer text-center"
      >
        <option value="">-- Chọn --</option>
        {opts.map((opt, i) => (
          <option key={i} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (type === "rating") {
    const ratingVal = Number(val) || 0;
    return (
      <div className="flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onCellChange(ratingVal === star ? 0 : star)}
            className={`transition text-lg cursor-pointer ${
              star <= ratingVal
                ? "text-amber-400 hover:text-amber-500 scale-110"
                : "text-gray-300 dark:text-gray-600 hover:text-gray-400"
            }`}
          >
            ★
          </button>
        ))}
      </div>
    );
  }

  if (type === "checkbox") {
    const checked = Boolean(val === true || val === "true" || val === 1 || val === "1");
    return (
      <div className="flex justify-center">
        <input
          type="checkbox"
          disabled={disabled}
          checked={checked}
          onChange={(e) => onCellChange(e.target.checked)}
          className="size-4.5 rounded accent-brand-600 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>
    );
  }

  // Default: text
  return (
    <input
      type="text"
      disabled={disabled}
      value={(val as string) ?? ""}
      onChange={(e) => onCellChange(e.target.value)}
      placeholder={isTable ? `Nhập ${col.label.toLowerCase()}…` : "..."}
      className={`w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-white outline-none focus:border-brand-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 ${
        isTable ? "" : "text-center"
      }`}
    />
  );
}

export default function SurveyMatrixField({
  question,
  value,
  disabled = false,
  onChange,
}: SurveyMatrixFieldProps) {
  const typeCode = String(question.questionTypeCode || question.questionType?.code || "").toUpperCase();

  const config: MatrixConfig = useMemo(() => {
    const raw = question.matrixConfig;
    if (!raw) return {};
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return raw;
  }, [question.matrixConfig]);

  const rows = config.rows || [];
  const columns = config.columns || [];

  // Parse current matrixData
  const parsedData = useMemo(() => {
    if (!value) {
      if (typeCode === "DYNAMIC_TABLE") return [];
      return {};
    }
    try {
      return typeof value === "string" ? JSON.parse(value) : value;
    } catch {
      return typeCode === "DYNAMIC_TABLE" ? [] : {};
    }
  }, [value, typeCode]);

  // 1. DYNAMIC TABLE
  if (typeCode === "DYNAMIC_TABLE") {
    const tableRows = Array.isArray(parsedData) ? parsedData : [];

    const handleCellChange = (rowIndex: number, colId: string, cellVal: unknown) => {
      const next = [...tableRows];
      next[rowIndex] = {
        ...(next[rowIndex] || {}),
        [colId]: cellVal,
      };
      onChange(JSON.stringify(next));
    };

    const addRow = () => {
      const next = [...tableRows, {}];
      onChange(JSON.stringify(next));
    };

    const removeRow = (rowIndex: number) => {
      const next = [...tableRows];
      next.splice(rowIndex, 1);
      onChange(JSON.stringify(next));
    };

    return (
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2.5 w-12 text-center">#</th>
                {columns.map((col: MatrixColumn) => (
                  <th key={col.id} className="px-3 py-2.5 min-w-[130px]">
                    {col.label}
                  </th>
                ))}
                {!disabled && <th className="px-3 py-2.5 w-12 text-center">Xóa</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {tableRows.map((rowItem: Record<string, unknown>, rIdx: number) => (
                <tr key={rIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="px-3 py-2 text-center text-xs text-gray-400 font-mono">
                    {rIdx + 1}
                  </td>
                  {columns.map((col: MatrixColumn) => (
                    <td key={col.id} className="px-2 py-1.5">
                      {renderCellInput(
                        col,
                        rowItem[col.id],
                        disabled,
                        (val) => handleCellChange(rIdx, col.id, val),
                        true
                      )}
                    </td>
                  ))}
                  {!disabled && (
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(rIdx)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition"
                        title="Xóa dòng"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + (disabled ? 1 : 2)}
                    className="px-4 py-6 text-center text-xs text-gray-400 italic"
                  >
                    Chưa có dòng dữ liệu nào. Nhấn &quot;+ Thêm dòng&quot; để bắt đầu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 hover:bg-brand-500 hover:text-white transition"
          >
            <FiPlus size={14} /> Thêm dòng mới
          </button>
        )}
      </div>
    );
  }

  // 2. MATRIX_SINGLE / MATRIX_MULTI / MATRIX_INPUT
  const isSingle = typeCode === "MATRIX_SINGLE";
  const isMulti = typeCode === "MATRIX_MULTI";
  const isInput = typeCode === "MATRIX_INPUT";

  const handleSingleSelect = (rowId: string, colId: string) => {
    const next = { ...parsedData, [rowId]: colId };
    onChange(JSON.stringify(next));
  };

  const handleMultiToggle = (rowId: string, colId: string) => {
    const currentList: string[] = Array.isArray(parsedData[rowId]) ? parsedData[rowId] : [];
    const exists = currentList.includes(colId);
    const updated = exists ? currentList.filter((x) => x !== colId) : [...currentList, colId];
    const next = { ...parsedData, [rowId]: updated };
    onChange(JSON.stringify(next));
  };

  const handleInputChange = (rowId: string, colId: string, val: unknown) => {
    const rowObj = typeof parsedData[rowId] === "object" && parsedData[rowId] != null ? parsedData[rowId] : {};
    const next = {
      ...parsedData,
      [rowId]: {
        ...rowObj,
        [colId]: val,
      },
    };
    onChange(JSON.stringify(next));
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
        <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <tr>
            <th className="px-4 py-3 min-w-[150px] bg-gray-100/50 dark:bg-gray-800 font-bold">
              Tiêu chí
            </th>
            {columns.map((col) => (
              <th key={col.id} className="px-3 py-3 text-center min-w-[90px]">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {rows.map((row: MatrixRow) => (
            <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
              <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                {row.label}
              </td>
              {columns.map((col: MatrixColumn) => {
                if (isSingle) {
                  const isChecked = parsedData[row.id] === col.id;
                  return (
                    <td key={col.id} className="px-3 py-3 text-center">
                      <input
                        type="radio"
                        name={`matrix-${question.id}-${row.id}`}
                        disabled={disabled}
                        checked={isChecked}
                        onChange={() => handleSingleSelect(row.id, col.id)}
                        className="size-4.5 accent-brand-600 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </td>
                  );
                }

                if (isMulti) {
                  const list: string[] = Array.isArray(parsedData[row.id]) ? parsedData[row.id] : [];
                  const isChecked = list.includes(col.id);
                  return (
                    <td key={col.id} className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={isChecked}
                        onChange={() => handleMultiToggle(row.id, col.id)}
                        className="size-4.5 rounded accent-brand-600 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </td>
                  );
                }

                if (isInput) {
                  const rowObj = typeof parsedData[row.id] === "object" && parsedData[row.id] != null ? parsedData[row.id] : {};
                  const cellVal = rowObj[col.id];
                  return (
                    <td key={col.id} className="px-2 py-2 text-center">
                      {renderCellInput(
                        col,
                        cellVal,
                        disabled,
                        (newVal) => handleInputChange(row.id, col.id, newVal),
                        false
                      )}
                    </td>
                  );
                }

                return null;
              })}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-xs text-gray-400 italic">
                Ma trận chưa có hàng nào được cấu hình
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
