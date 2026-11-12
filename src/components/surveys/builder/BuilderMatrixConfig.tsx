"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { FiPlus, FiTrash2, FiGrid, FiList } from "react-icons/fi";

export type MatrixColumnType = "text" | "number" | "date" | "select" | "rating" | "checkbox";

export type MatrixRow = { id: string; label: string; orderIndex?: number };
export type MatrixColumn = {
  id: string;
  label: string;
  type?: MatrixColumnType;
  options?: string[];
  maxRating?: number;
  score?: number;
  orderIndex?: number;
};
export type MatrixConfig = {
  rows?: MatrixRow[];
  columns?: MatrixColumn[];
};

interface BuilderMatrixConfigProps {
  typeCode: string;
  config: string | MatrixConfig | null | undefined;
  onChange: (newConfig: MatrixConfig) => void;
}

/**
 * Component input nhận diện và bảo vệ gõ tiếng Việt có dấu (Telex/VNI/IME).
 * Tránh việc parent re-render sau mỗi phím gõ làm đứt bộ đệm IME, gây mất chữ tiếng Việt.
 */
function CompositionAwareInput({
  value,
  placeholder,
  className,
  onCommit,
}: {
  value: string;
  placeholder?: string;
  className?: string;
  onCommit: (val: string) => void;
}) {
  const [localVal, setLocalVal] = useState(value);
  const isComposingRef = useRef(false);

  useEffect(() => {
    if (!isComposingRef.current) {
      setLocalVal(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVal(e.target.value);
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    const finalVal = (e.target as HTMLInputElement).value;
    setLocalVal(finalVal);
    onCommit(finalVal);
  };

  const handleBlur = () => {
    isComposingRef.current = false;
    if (localVal !== value) {
      onCommit(localVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isComposingRef.current) {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      value={localVal}
      onChange={handleChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
    />
  );
}

export default function BuilderMatrixConfig({
  typeCode,
  config,
  onChange,
}: BuilderMatrixConfigProps) {
  const isDynamicTable = typeCode === "DYNAMIC_TABLE";
  const isInputMatrix = typeCode === "MATRIX_INPUT";
  const hasColumnTypes = isDynamicTable || isInputMatrix;

  const currentConfig: MatrixConfig = useMemo(() => {
    if (!config) {
      if (isDynamicTable) {
        return {
          columns: [
            { id: "col1", label: "Tên hạng mục", type: "text" },
            { id: "col2", label: "Số lượng / Điểm", type: "number" },
          ],
        };
      }
      if (isInputMatrix) {
        return {
          rows: [
            { id: "r1", label: "Tiêu chí 1" },
            { id: "r2", label: "Tiêu chí 2" },
          ],
          columns: [
            { id: "c1", label: "Cột chữ", type: "text" },
            { id: "c2", label: "Cột số", type: "number" },
          ],
        };
      }
      return {
        rows: [
          { id: "r1", label: "Tiêu chí 1" },
          { id: "r2", label: "Tiêu chí 2" },
        ],
        columns: [
          { id: "c1", label: "Kém", score: 1 },
          { id: "c2", label: "Trung bình", score: 2 },
          { id: "c3", label: "Tốt", score: 3 },
        ],
      };
    }
    if (typeof config === "string") {
      try {
        return JSON.parse(config);
      } catch {
        return {};
      }
    }
    return config;
  }, [config, isDynamicTable, isInputMatrix]);

  const updateConfig = (next: MatrixConfig) => {
    onChange(next);
  };

  const addRow = () => {
    const rows = [...(currentConfig.rows || [])];
    const newId = `r_${Date.now()}_${rows.length + 1}`;
    rows.push({ id: newId, label: `Tiêu chí ${rows.length + 1}` });
    updateConfig({ ...currentConfig, rows });
  };

  const updateRowLabel = (index: number, label: string) => {
    const rows = [...(currentConfig.rows || [])];
    if (rows[index]) {
      rows[index] = { ...rows[index], label };
      updateConfig({ ...currentConfig, rows });
    }
  };

  const deleteRow = (index: number) => {
    const rows = [...(currentConfig.rows || [])];
    rows.splice(index, 1);
    updateConfig({ ...currentConfig, rows });
  };

  const addColumn = () => {
    const columns = [...(currentConfig.columns || [])];
    const newId = `c_${Date.now()}_${columns.length + 1}`;
    columns.push({
      id: newId,
      label: `Cột ${columns.length + 1}`,
      ...(hasColumnTypes ? { type: "text" } : { score: columns.length + 1 }),
    });
    updateConfig({ ...currentConfig, columns });
  };

  const updateColumnLabel = (index: number, label: string) => {
    const columns = [...(currentConfig.columns || [])];
    if (columns[index]) {
      columns[index] = { ...columns[index], label };
      updateConfig({ ...currentConfig, columns });
    }
  };

  const updateColumnType = (index: number, type: MatrixColumnType) => {
    const columns = [...(currentConfig.columns || [])];
    if (columns[index]) {
      columns[index] = {
        ...columns[index],
        type,
        ...(type === "select" && !columns[index].options ? { options: ["Lựa chọn 1", "Lựa chọn 2"] } : {}),
      };
      updateConfig({ ...currentConfig, columns });
    }
  };

  const updateColumnOptions = (index: number, rawText: string) => {
    const columns = [...(currentConfig.columns || [])];
    if (columns[index]) {
      const options = rawText.split(",").map((s) => s.trim()).filter(Boolean);
      columns[index] = { ...columns[index], options };
      updateConfig({ ...currentConfig, columns });
    }
  };

  const deleteColumn = (index: number) => {
    const columns = [...(currentConfig.columns || [])];
    columns.splice(index, 1);
    updateConfig({ ...currentConfig, columns });
  };

  return (
    <div className="mb-4 p-4 rounded-2xl border border-purple-200/80 bg-purple-50/30 dark:border-purple-900/40 dark:bg-purple-950/20 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiGrid size={15} className="text-purple-600 dark:text-purple-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
            {isDynamicTable
              ? "Cấu hình Cột Bảng Động"
              : isInputMatrix
              ? "Cấu hình Ma trận nhập liệu (Đa dạng kiểu Input)"
              : "Cấu hình Hàng & Cột Ma trận"}
          </h4>
        </div>
        <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400">
          {isDynamicTable
            ? `${currentConfig.columns?.length || 0} cột`
            : `${currentConfig.rows?.length || 0} hàng × ${currentConfig.columns?.length || 0} cột`}
        </span>
      </div>

      <div className={`grid gap-4 ${isDynamicTable ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
        {/* ROWS CONFIG */}
        {!isDynamicTable && (
          <div className="space-y-2 border-r-0 md:border-r border-purple-100 dark:border-purple-900/40 pr-0 md:pr-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Danh sách Hàng (Tiêu chí đánh giá)
              </span>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400"
              >
                <FiPlus size={13} /> Thêm hàng
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(currentConfig.rows || []).map((row, idx) => (
                <div key={row.id || idx} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 w-5 text-right">{idx + 1}.</span>
                  <CompositionAwareInput
                    value={row.label}
                    onCommit={(val) => updateRowLabel(idx, val)}
                    placeholder={`Hàng ${idx + 1}`}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => deleteRow(idx)}
                    title="Xóa hàng"
                    className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg transition"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              ))}
              {(currentConfig.rows || []).length === 0 && (
                <p className="text-xs text-gray-400 italic py-2 text-center">Chưa có hàng nào</p>
              )}
            </div>
          </div>
        )}

        {/* COLUMNS CONFIG */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {hasColumnTypes ? "Danh sách Cột & Kiểu nhập liệu" : "Danh sách Cột (Mức đánh giá)"}
            </span>
            <button
              type="button"
              onClick={addColumn}
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400"
            >
              <FiPlus size={13} /> Thêm cột
            </button>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {(currentConfig.columns || []).map((col, idx) => (
              <div key={col.id || idx} className="p-2 rounded-xl bg-white/70 dark:bg-gray-900/60 border border-purple-100 dark:border-purple-900/30 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 w-5 text-right">{idx + 1}.</span>
                  <CompositionAwareInput
                    value={col.label}
                    onCommit={(val) => updateColumnLabel(idx, val)}
                    placeholder={`Cột ${idx + 1}`}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                  />

                  {hasColumnTypes && (
                    <select
                      value={col.type || "text"}
                      onChange={(e) => updateColumnType(idx, e.target.value as MatrixColumnType)}
                      className="px-2 py-1.5 bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
                    >
                      <option value="text">Chữ (Text)</option>
                      <option value="number">Số (Number)</option>
                      <option value="date">Ngày tháng (Date)</option>
                      <option value="select">Dropdown (Chọn 1)</option>
                      <option value="rating">Đánh giá sao (1-5)</option>
                      <option value="checkbox">Hộp kiểm (Có/Không)</option>
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={() => deleteColumn(idx)}
                    title="Xóa cột"
                    className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg transition"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>

                {/* DROPDOWN OPTIONS CONFIG IF SELECT */}
                {hasColumnTypes && col.type === "select" && (
                  <div className="pl-7 pr-1 flex items-center gap-2 text-xs">
                    <FiList size={12} className="text-purple-500 shrink-0" />
                    <CompositionAwareInput
                      value={(col.options || []).join(", ")}
                      onCommit={(val) => updateColumnOptions(idx, val)}
                      placeholder="Các lựa chọn phân cách bằng dấu phẩy (vd: Tốt, Khá, TB, Yếu)..."
                      className="w-full px-2.5 py-1 bg-purple-50/50 dark:bg-gray-800/60 border border-dashed border-purple-200 dark:border-purple-700 rounded-lg text-[11px] text-gray-700 dark:text-gray-300 outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>
            ))}
            {(currentConfig.columns || []).length === 0 && (
              <p className="text-xs text-gray-400 italic py-2 text-center">Chưa có cột nào</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
