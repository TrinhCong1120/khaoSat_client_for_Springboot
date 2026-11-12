"use client";

import React from "react";
import { ArrowDownUp, Award, MousePointerClick, TrendingDown } from "lucide-react";
import type { MeasureSpec, ReportDefinition, ReportOutput, ResultCell } from "@/lib/report-engine";
import type { DatasetRecord } from "@/types/report";

type Props = {
  definition: ReportDefinition;
  output: ReportOutput;
  recordMap: Map<string, DatasetRecord>;
  onChangeSort?: (sortBy: string, sortDir: "asc" | "desc") => void;
  onDrillDown: (
    records: DatasetRecord[],
    title: string,
    subtitle?: string,
    targetQuestionId?: string
  ) => void;
  onClearFilters?: () => void;
  embedded?: boolean;
  compact?: boolean;
  title?: string;
};

export default function ResultTable({
  definition,
  output,
  recordMap,
  onChangeSort,
  onDrillDown,
  onClearFilters,
  embedded = false,
  compact = false,
  title,
}: Props) {
  const isCompact = compact || embedded;

  const resolveRecords = (ids: string[]) =>
    ids.map((id) => recordMap.get(id)).filter((r): r is DatasetRecord => Boolean(r));

  const extractTargetQuestionId = (m?: MeasureSpec): string | undefined => {
    if (!m || m.field === "responses" || !m.field.startsWith("question:")) return undefined;
    return m.field.split(":")[1];
  };

  if (output.filteredRecords.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
          Không có phản hồi nào khớp với bộ lọc hiện tại
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Hãy điều chỉnh hoặc xóa bớt điều kiện lọc để xem số liệu tổng hợp.
        </p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Xóa điều kiện lọc
          </button>
        )}
      </div>
    );
  }

  // PIVOT 2D MATRIX MODE
  if (output.pivotMatrix) {
    const pivot = output.pivotMatrix;
    const primaryMeasure = definition.measures[0];
    const targetQId = extractTargetQuestionId(primaryMeasure);

    return (
      <div
        className={
          embedded
            ? "overflow-hidden w-full"
            : "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
        }
      >
        <div
          className={`flex items-center justify-between border-b border-slate-200 dark:border-slate-800 ${
            isCompact ? "px-3 py-2" : "px-4 py-3"
          }`}
        >
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {title || `Bảng chéo 2 chiều: ${pivot.rowFieldLabel} x ${pivot.colFieldLabel}`}
            </h3>
            <p className="text-[11px] text-slate-500">
              Chỉ số hiển thị: <b>{pivot.measureLabel}</b> · Bấm vào bất kỳ ô nào để xem danh sách bài nộp tương ứng
            </p>
          </div>
          <LegendBadges />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
              <tr>
                <th
                  className={`border-b border-slate-200 font-bold dark:border-slate-800 ${
                    isCompact ? "px-2.5 py-1.5 text-[11px]" : "px-4 py-3"
                  }`}
                >
                  {pivot.rowFieldLabel} \ {pivot.colFieldLabel}
                </th>
                {pivot.colKeys.map((ck) => (
                  <th
                    key={ck}
                    className={`border-b border-slate-200 text-right font-bold dark:border-slate-800 ${
                      isCompact ? "px-2 py-1.5 text-[11px]" : "px-3 py-3"
                    }`}
                  >
                    {ck}
                  </th>
                ))}
                <th
                  className={`border-b border-slate-200 bg-slate-100/70 text-right font-bold dark:border-slate-800 dark:bg-slate-900 ${
                    isCompact ? "px-2.5 py-1.5 text-[11px]" : "px-4 py-3"
                  }`}
                >
                  Tổng dòng
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pivot.rowKeys.map((rk) => (
                <tr key={rk} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td
                    className={`font-semibold text-slate-900 dark:text-white ${
                      isCompact ? "px-2.5 py-1 text-xs" : "px-4 py-2.5"
                    }`}
                  >
                    {rk}
                  </td>
                  {pivot.colKeys.map((ck) => {
                    const cell = pivot.cells[rk]?.[ck];
                    return (
                      <td
                        key={ck}
                        className={`text-right tabular-nums ${isCompact ? "px-2 py-1 text-xs" : "px-3 py-2"}`}
                      >
                        <ClickableResultCell
                          cell={cell}
                          compact={isCompact}
                          onClick={() => {
                            if (!cell || cell.recordIds.length === 0) return;
                            onDrillDown(
                              resolveRecords(cell.recordIds),
                              `${rk} · ${ck} (${pivot.measureLabel}: ${cell.displayValue})`,
                              `Bao gồm ${cell.recordIds.length} bài nộp khớp điều kiện`,
                              targetQId
                            );
                          }}
                        />
                      </td>
                    );
                  })}
                  <td
                    className={`bg-slate-50/60 text-right font-bold tabular-nums dark:bg-slate-950/30 ${
                      isCompact ? "px-2.5 py-1 text-xs" : "px-4 py-2"
                    }`}
                  >
                    <ClickableResultCell
                      cell={pivot.rowTotals[rk]}
                      compact={isCompact}
                      onClick={() => {
                        const cell = pivot.rowTotals[rk];
                        if (!cell || cell.recordIds.length === 0) return;
                        onDrillDown(
                          resolveRecords(cell.recordIds),
                          `Nhóm ${rk} (${pivot.measureLabel}: ${cell.displayValue})`,
                          `${cell.recordIds.length} phản hồi trong hàng này`,
                          targetQId
                        );
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold dark:border-slate-700 dark:bg-slate-950">
                <td
                  className={`text-slate-800 dark:text-slate-100 ${
                    isCompact ? "px-2.5 py-1.5 text-xs" : "px-4 py-3"
                  }`}
                >
                  Tổng cột / Chung
                </td>
                {pivot.colKeys.map((ck) => {
                  const cell = pivot.colTotals[ck];
                  return (
                    <td
                      key={ck}
                      className={`text-right tabular-nums ${
                        isCompact ? "px-2 py-1.5 text-xs" : "px-3 py-3"
                      }`}
                    >
                      <ClickableResultCell
                        cell={cell}
                        compact={isCompact}
                        onClick={() => {
                          if (!cell || cell.recordIds.length === 0) return;
                          onDrillDown(
                            resolveRecords(cell.recordIds),
                            `Cột ${ck} (${pivot.measureLabel}: ${cell.displayValue})`,
                            `${cell.recordIds.length} phản hồi`,
                            targetQId
                          );
                        }}
                      />
                    </td>
                  );
                })}
                <td
                  className={`text-right tabular-nums ${
                    isCompact ? "px-2.5 py-1.5 text-xs" : "px-4 py-3"
                  }`}
                >
                  <ClickableResultCell
                    cell={pivot.grandTotal}
                    compact={isCompact}
                    onClick={() =>
                      onDrillDown(
                        output.filteredRecords,
                        `Tất cả phản hồi (${pivot.grandTotal.displayValue})`,
                        `${output.filteredRecords.length} bài nộp`,
                        targetQId
                      )
                    }
                  />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  // FLAT MULTI-MEASURE TABLE
  const groupCols =
    definition.groupBy.length > 0
      ? definition.groupBy.map((g, i) => g.label || `Nhóm ${i + 1}`)
      : ["Phạm vi"];

  const toggleSort = (colKey: string) => {
    if (!onChangeSort) return;
    const same = definition.viewOptions.sortBy === colKey;
    onChangeSort(colKey, same && definition.viewOptions.sortDir === "desc" ? "asc" : "desc");
  };

  return (
    <div
      className={
        embedded
          ? "overflow-hidden w-full"
          : "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
      }
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 ${
          isCompact ? "px-3 py-2" : "px-4 py-3"
        }`}
      >
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {title || `Bảng tổng hợp số liệu (${output.rows.length} nhóm · ${output.filteredRecords.length} phản hồi)`}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
            <MousePointerClick size={12} /> Bấm vào bất kỳ ô số liệu nào (kể cả Min/Max) để khoan sâu danh sách phản hồi chính xác.
          </p>
        </div>
        <LegendBadges />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs" data-testid="rb-result-table">
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
            <tr>
              {groupCols.map((label, idx) => (
                <th
                  key={idx}
                  className={`border-b border-slate-200 font-bold dark:border-slate-800 ${
                    isCompact ? "px-2.5 py-1.5 text-[11px]" : "px-4 py-3"
                  }`}
                >
                  {idx === 0 && onChangeSort ? (
                    <button
                      type="button"
                      onClick={() => toggleSort("group")}
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      {label}
                      <ArrowDownUp size={12} />
                    </button>
                  ) : (
                    label
                  )}
                </th>
              ))}
              {definition.measures.map((m) => (
                <th
                  key={m.id}
                  className={`border-b border-slate-200 text-right font-bold dark:border-slate-800 ${
                    isCompact ? "px-2.5 py-1.5 text-[11px]" : "px-4 py-3"
                  }`}
                >
                  {onChangeSort ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(m.id)}
                      className="inline-flex items-center justify-end gap-1 hover:text-blue-600"
                    >
                      {m.label || m.agg}
                      <ArrowDownUp size={12} />
                    </button>
                  ) : (
                    <span>{m.label || m.agg}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {output.rows.map((row) => {
              const rowLabel = row.groupValues.join(" / ");
              return (
                <tr key={row.rowKey} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  {row.groupValues.map((gv, gIdx) => (
                    <td
                      key={gIdx}
                      className={`font-semibold text-slate-900 dark:text-white ${
                        isCompact ? "px-2.5 py-1 text-xs" : "px-4 py-2.5"
                      }`}
                    >
                      {gIdx === 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            onDrillDown(
                              resolveRecords(row.groupRecordIds),
                              `Nhóm: ${rowLabel}`,
                              `${row.groupRecordIds.length} bài nộp thuộc nhóm này`
                            )
                          }
                          className="text-left hover:text-blue-600 hover:underline"
                        >
                          {gv}
                        </button>
                      ) : (
                        gv
                      )}
                    </td>
                  ))}

                  {definition.measures.map((m) => {
                    const cell = row.cells[m.id];
                    const targetQId = extractTargetQuestionId(m);
                    return (
                      <td
                        key={m.id}
                        className={`text-right tabular-nums ${isCompact ? "px-2.5 py-1 text-xs" : "px-4 py-2"}`}
                      >
                        <ClickableResultCell
                          cell={cell}
                          compact={isCompact}
                          dataTestId={`rb-cell-${row.rowKey}-${m.id}`}
                          onClick={() => {
                            if (!cell || cell.recordIds.length === 0) return;
                            onDrillDown(
                              resolveRecords(cell.recordIds),
                              `${rowLabel} · ${m.label || m.agg} = ${cell.displayValue}`,
                              `Hiển thị chính xác ${cell.recordIds.length} phản hồi đạt giá trị này`,
                              targetQId
                            );
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>

          {output.grandTotalRow && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold dark:border-slate-700 dark:bg-slate-950">
                {output.grandTotalRow.groupValues.map((gv, gIdx) => (
                  <td
                    key={gIdx}
                    className={`text-slate-800 dark:text-slate-100 ${
                      isCompact ? "px-2.5 py-1.5 text-xs" : "px-4 py-3"
                    }`}
                  >
                    {gv}
                  </td>
                ))}
                {definition.measures.map((m) => {
                  const cell = output.grandTotalRow!.cells[m.id];
                  const targetQId = extractTargetQuestionId(m);
                  return (
                    <td
                      key={m.id}
                      className={`text-right tabular-nums ${
                        isCompact ? "px-2.5 py-1.5 text-xs" : "px-4 py-3"
                      }`}
                    >
                      <ClickableResultCell
                        cell={cell}
                        compact={isCompact}
                        onClick={() => {
                          if (!cell || cell.recordIds.length === 0) return;
                          onDrillDown(
                            resolveRecords(cell.recordIds),
                            `Tổng chung · ${m.label || m.agg} = ${cell.displayValue}`,
                            `${cell.recordIds.length} phản hồi`,
                            targetQId
                          );
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function ClickableResultCell({
  cell,
  onClick,
  dataTestId,
  compact = false,
}: {
  cell?: ResultCell;
  onClick: () => void;
  dataTestId?: string;
  compact?: boolean;
}) {
  if (!cell || cell.displayValue === "—" || cell.recordIds.length === 0) {
    return <span className="text-slate-400">{cell?.displayValue ?? "—"}</span>;
  }

  let badgeClass =
    "text-slate-800 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-100 dark:hover:bg-blue-950/50 dark:hover:text-blue-300";
  if (cell.isBest) {
    badgeClass =
      "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800";
  } else if (cell.isWorst) {
    badgeClass =
      "bg-amber-50 text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800";
  }

  const padClass = compact ? "px-1.5 py-0.5 text-xs font-semibold" : "px-2 py-1 font-bold";

  return (
    <button
      type="button"
      data-testid={dataTestId}
      onClick={onClick}
      title={`Bấm để xem ${cell.recordIds.length} phản hồi tương ứng`}
      className={`inline-flex items-center gap-1 rounded-lg transition ${padClass} ${badgeClass}`}
    >
      {cell.isBest && (
        <Award size={compact ? 11 : 12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
      )}
      {cell.isWorst && (
        <TrendingDown size={compact ? 11 : 12} className="shrink-0 text-amber-600 dark:text-amber-400" />
      )}
      <span>{cell.displayValue}</span>
    </button>
  );
}

function LegendBadges() {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
        <Award size={11} /> Cao nhất
      </span>
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900">
        <TrendingDown size={11} /> Thấp nhất
      </span>
    </div>
  );
}

