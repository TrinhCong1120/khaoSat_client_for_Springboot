"use client";
import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function BarChartOne({
  title,
  categories,
  data,
}: {
  title: string;
  categories: string[];
  data: number[];
}) {
  // 👉 đổi label thành 1,2,3,4...
  const indexLabels = categories.map((_, i) => (i + 1).toString());

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 260,
      toolbar: { show: false },
    },

    colors: ["#3b82f6"], // ✅ xanh dương

    plotOptions: {
      bar: {
        columnWidth: "45%",
        borderRadius: 6,
      },
    },

    dataLabels: { enabled: false },

    xaxis: {
      categories: indexLabels, // 👉 1,2,3,4
      labels: {
        style: {
          colors: "#9ca3af",
        },
      },
    },

    yaxis: {
      labels: {
        style: { colors: "#9ca3af" },
      },
    },

    grid: {
      borderColor: "#374151",
    },

    tooltip: {
      custom: function ({ dataPointIndex }) {
        return `
          <div style="padding:8px">
            <b>${categories[dataPointIndex]}</b><br/>
            ${data[dataPointIndex]} người
          </div>
        `;
      },
    },
  };

  const series = [
    {
      name: title,
      data,
    },
  ];

  return (
    <div className="flex gap-6">
      {/* CHART */}
      <div className="flex-1">
        <ReactApexChart
          options={options}
          series={series}
          type="bar"
          height={260}
        />
      </div>

      {/* LEGEND (ghi chú) */}
      <div className="w-[220px] text-sm space-y-2">
        {categories.map((cat, i) => (
          <div key={i} className="flex gap-2">
            <span className="font-semibold text-blue-500 w-5">
              {i + 1}.
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              {cat}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}