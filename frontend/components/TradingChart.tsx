"use client";

import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, type IChartApi, type ISeriesApi } from "lightweight-charts";

export default function TradingChart() {
  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 520,
      layout: {
        background: { color: "#0f172a" },
        textColor: "#d1d5db",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      timeScale: { borderColor: "#1f2937" },
      rightPriceScale: { borderColor: "#1f2937" },
    });

    // ✅ API mới
    const series = chart.addSeries(CandlestickSeries, {});

    series.setData([
      { time: "2024-01-01", open: 1800, high: 1810, low: 1795, close: 1805 },
      { time: "2024-01-02", open: 1805, high: 1820, low: 1800, close: 1815 },
      { time: "2024-01-03", open: 1815, high: 1825, low: 1805, close: 1810 },
    ]);

    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = series;

    const onResize = () => {
      if (!elRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({ width: elRef.current.clientWidth });
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  return <div ref={elRef} style={{ width: "100%", height: 520 }} />;
}
