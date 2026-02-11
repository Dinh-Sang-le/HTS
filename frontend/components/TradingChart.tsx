"use client";

import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import { Paper } from "@mantine/core";

export function TradingChart() {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: "#0f172a" },
        textColor: "#d1d5db",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
    });

    const series = chart.addCandlestickSeries();

    series.setData([
      { time: "2024-01-01", open: 1800, high: 1810, low: 1795, close: 1805 },
      { time: "2024-01-02", open: 1805, high: 1820, low: 1800, close: 1815 },
      { time: "2024-01-03", open: 1815, high: 1825, low: 1805, close: 1810 },
    ]);

    const resize = () => {
      chart.applyOptions({ width: chartRef.current!.clientWidth });
    };

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
    };
  }, []);

  return (
    <Paper withBorder radius="lg" p="md">
      <div ref={chartRef} />
    </Paper>
  );
}
