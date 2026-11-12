"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ECharts, EChartsOption } from "echarts";

export type { EChartsOption };

export interface EChartsContainerProps {
  option: EChartsOption;
  height?: number | string;
  className?: string;
  loading?: boolean;
  theme?: "dark" | "light" | "auto";
  emptyText?: string;
  onEvents?: Record<string, (params: any) => void>;
}

export const ECHARTS_PALETTE = [
  "#2563eb", // blue-600
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
  "#e11d48", // rose-600
];

// Lazy-load echarts only in the browser to prevent Next.js SSR / Node memory bloat
let echartsModulePromise: Promise<typeof import("echarts")> | null = null;
const getECharts = () => {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (!echartsModulePromise) {
    echartsModulePromise = import("echarts");
  }
  return echartsModulePromise;
};

export default function EChartsContainer({
  option,
  height = 300,
  className = "",
  loading = false,
  theme = "auto",
  emptyText = "Chưa có dữ liệu",
  onEvents,
}: EChartsContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ECharts | null>(null);
  const [isDark, setIsDark] = useState<boolean>(false);

  // Detect current system dark mode
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkDarkMode = () => {
      const hasDarkClass = document.documentElement.classList.contains("dark");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(hasDarkClass || (!("theme" in localStorage) && prefersDark));
    };

    checkDarkMode();

    const observer = new MutationObserver(() => {
      checkDarkMode();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const activeTheme = theme === "auto" ? (isDark ? "dark" : undefined) : theme === "dark" ? "dark" : undefined;

  const optionRef = useRef(option);
  optionRef.current = option;

  const onEventsRef = useRef(onEvents);
  onEventsRef.current = onEvents;

  const applyOption = (chart: ECharts, opt: EChartsOption) => {
    const themedOption: EChartsOption = {
      backgroundColor: "transparent",
      color: ECHARTS_PALETTE,
      ...opt,
    };
    chart.setOption(themedOption, {
      notMerge: true,
      lazyUpdate: true,
    });
  };

  // Initialize and update chart whenever activeTheme changes
  useEffect(() => {
    if (!containerRef.current) return;

    let isDisposed = false;
    let resizeObserver: ResizeObserver | null = null;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
      chartInstanceRef.current = null;
    }

    getECharts().then((echarts) => {
      if (isDisposed || !containerRef.current) return;

      const chart = echarts.init(containerRef.current, activeTheme, {
        renderer: "canvas",
      });
      chartInstanceRef.current = chart;

      if (onEventsRef.current) {
        Object.entries(onEventsRef.current).forEach(([eventName, handler]) => {
          chart.on(eventName, handler);
        });
      }

      applyOption(chart, optionRef.current);

      if (loading) {
        chart.showLoading({
          text: "Đang tải dữ liệu...",
          color: "#2563eb",
          textColor: isDark ? "#94a3b8" : "#475569",
          maskColor: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.6)",
        });
      }

      resizeObserver = new ResizeObserver(() => {
        chart.resize();
      });
      resizeObserver.observe(containerRef.current);
    }).catch(() => {
      // Ignore SSR import failures
    });

    return () => {
      isDisposed = true;
      if (resizeObserver) resizeObserver.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [activeTheme]);

  // Set chart options whenever option changes
  useEffect(() => {
    if (!chartInstanceRef.current) return;
    applyOption(chartInstanceRef.current, option);
  }, [option]);

  // Handle loading state
  useEffect(() => {
    if (!chartInstanceRef.current) return;
    if (loading) {
      chartInstanceRef.current.showLoading({
        text: "Đang tải dữ liệu...",
        color: "#2563eb",
        textColor: isDark ? "#94a3b8" : "#475569",
        maskColor: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.6)",
      });
    } else {
      chartInstanceRef.current.hideLoading();
    }
  }, [loading, isDark]);

  const heightStyle = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: heightStyle }}
      className={`min-h-[200px] w-full transition-opacity ${className}`}
      role="img"
      aria-label="Sơ đồ thống kê ECharts"
    />
  );
}
