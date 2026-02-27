"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type Time,
} from "lightweight-charts";
import { Box, Group, Badge, Text, Button } from "@mantine/core";
import { IconZoomIn, IconZoomOut, IconRefresh } from "@tabler/icons-react";

import type { Candle, SymbolName } from "@/lib/fakeFeed";
import type { Position } from "@/lib/tradeTypes";
import { formatPrice } from "@/lib/symbolSpecs";

type Props = {
  symbol: SymbolName;
  candles: Candle[];
  rightBadges?: React.ReactNode;

  /** Net position (cũ) - giữ để UI khác không vỡ */
  position?: Position | null;

  /** ✅ list positions (hedging) */
  positions?: Position[];

  /** ✅ NEW (optional): nếu truyền từ AppShell/page thì chart đổi theme chuẩn hơn */
  colorScheme?: "dark" | "light";
};

function getDomScheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  const v = document.documentElement.getAttribute("data-mantine-color-scheme");
  return v === "light" ? "light" : "dark";
}
export type TradingChartProps = {
  symbol: any;
  candles: any[];
  position: any | null;
  positions: any[];
  fills: any[];
  rightBadges?: React.ReactNode;
};

export default function TradingChart({
  symbol,
  candles,
  rightBadges,
  position,
  positions,
  colorScheme,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);

  const priceLinesRef = useRef<any[]>([]);

  const [ready, setReady] = useState(false);

  // track whether user has zoomed/panned
  const userInteractedRef = useRef(false);

  // track last candle time so we can update() instead of setData()
  const lastTimeRef = useRef<any>(null);

  // for symbol switch: allow 1-time fit
  const lastSymbolRef = useRef<string>("");

  // fallback scheme (nếu không truyền colorScheme)
  const [domScheme, setDomScheme] = useState<"dark" | "light">(() =>
    getDomScheme()
  );
  const scheme = colorScheme ?? domScheme;
  const isDark = scheme === "dark";

  // listen DOM scheme changes only when colorScheme prop is not provided
  useEffect(() => {
    if (colorScheme) return;
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDomScheme(getDomScheme()));
    obs.observe(el, {
      attributes: true,
      attributeFilter: ["data-mantine-color-scheme"],
    });
    return () => obs.disconnect();
  }, [colorScheme]);

  const dp = useMemo(
    () => (symbol === "XAUUSD" || symbol === "USDJPY" ? 2 : 4),
    [symbol]
  );

  // ===== THEME OPTIONS (NEW) =====
  const themeOptions = useMemo(() => {
    if (isDark) {
      return {
        layout: {
          background: { type: "solid" as const, color: "transparent" }, // giữ cảm giác cũ
          textColor: "rgba(255,255,255,0.82)",
          fontSize: 12,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.06)" },
          horzLines: { color: "rgba(255,255,255,0.06)" },
        },
        rightPriceScale: {
          borderColor: "rgba(255,255,255,0.10)",
          scaleMargins: { top: 0.12, bottom: 0.12 },
        },
        timeScale: {
          borderColor: "rgba(255,255,255,0.10)",
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 8,
          barSpacing: 14,
          fixLeftEdge: true,
          fixRightEdge: false,
        },
        crosshair: {
          vertLine: { color: "rgba(59,130,246,0.35)" },
          horzLine: { color: "rgba(59,130,246,0.35)" },
        },
      };
    }

    // ☀ LIGHT MODE: nền trắng + grid xám nhẹ + text #4f9078
    return {
      layout: {
        background: { type: "solid" as const, color: "#ffffff" },
        textColor: "rgba(79,144,120,0.92)", // #4f9078
        fontSize: 12,
      },
      grid: {
        vertLines: { color: "rgba(0,0,0,0.07)" },
        horzLines: { color: "rgba(0,0,0,0.07)" },
      },
      rightPriceScale: {
        borderColor: "rgba(0,0,0,0.10)",
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: "rgba(0,0,0,0.10)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 14,
        fixLeftEdge: true,
        fixRightEdge: false,
      },
      crosshair: {
        vertLine: { color: "rgba(0,0,0,0.18)" },
        horzLine: { color: "rgba(0,0,0,0.18)" },
      },
    };
  }, [isDark]);

  // ===== init chart (GIỮ LOGIC CŨ, chỉ thay options theo theme) =====
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      ...themeOptions,
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    });

    chartRef.current = chart;

    // series (GIỮ CŨ)
    const anyChart = chart as any;
    let series: any = null;

    // prefer addCandlestickSeries if available (stable)
    if (typeof anyChart.addCandlestickSeries === "function") {
      series = anyChart.addCandlestickSeries({
        upColor: "#10b981",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
      });
    } else {
      series = anyChart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
      });
    }

    seriesRef.current = series;
    setReady(true);

    // detect user interaction (zoom/pan)
    const ts = chart.timeScale();
    const unsub = ts.subscribeVisibleTimeRangeChange(() => {
      userInteractedRef.current = true;
    });

    const ro = new ResizeObserver(() => {
      if (!ref.current) return;
      chart.applyOptions({
        width: ref.current.clientWidth,
        height: ref.current.clientHeight,
      });
    });
    ro.observe(el);

    // wheel zoom stronger + doesn’t reset (GIỮ CŨ)
    const wheel = (ev: WheelEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(ev.target as Node)) return;

      ev.preventDefault();
      userInteractedRef.current = true;

      const ts2 = chart.timeScale();
      const cur = ts2.options().barSpacing ?? 14;

      const direction = ev.deltaY < 0 ? 1 : -1;
      const step = ev.ctrlKey ? 6 : 3;

      const next = Math.max(2, Math.min(140, cur + direction * step));
      ts2.applyOptions({ barSpacing: next });
    };

    el.addEventListener("wheel", wheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", wheel as any);
      ro.disconnect();
      // @ts-ignore
      unsub?.();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== apply theme when scheme changes (NEW) =====
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // giữ barSpacing hiện tại (đỡ “nhảy” khi đổi theme)
    const ts = chart.timeScale();
    const curSpacing = ts.options().barSpacing ?? 14;

    chart.applyOptions({
      ...themeOptions,
      timeScale: {
        ...(themeOptions as any).timeScale,
        barSpacing: curSpacing,
      },
    });
  }, [themeOptions]);

  // ===== set/update candles WITHOUT resetting zoom (GIỮ CŨ) =====
  useEffect(() => {
    const series: any = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    const data = candles.map((c) => ({
      time: c.time as any,
      open: +c.open.toFixed(dp),
      high: +c.high.toFixed(dp),
      low: +c.low.toFixed(dp),
      close: +c.close.toFixed(dp),
    }));

    const isSymbolChanged = lastSymbolRef.current !== symbol;
    if (isSymbolChanged) {
      lastSymbolRef.current = symbol;
      userInteractedRef.current = false;
      lastTimeRef.current = null;
    }

    if (lastTimeRef.current == null || data.length < 2) {
      series.setData(data);
      lastTimeRef.current = data[data.length - 1]?.time ?? null;

      if (!userInteractedRef.current) {
        chart.timeScale().fitContent();
      }
      return;
    }

    const last = data[data.length - 1];
    if (!last) return;

    if (last.time === lastTimeRef.current) {
      series.update(last);
    } else {
      series.update(last);
      lastTimeRef.current = last.time;
    }
  }, [candles, dp, symbol]);

  // ===== helpers (GIỮ CŨ) =====
  const clearPriceLines = () => {
    const s: any = seriesRef.current;
    if (!s) return;
    for (const pl of priceLinesRef.current) {
      try {
        s.removePriceLine(pl);
      } catch {}
    }
    priceLinesRef.current = [];
  };

  // ===== draw multiple position entry lines (short label) (GIỮ CŨ) =====
  useEffect(() => {
    const s: any = seriesRef.current;
    if (!s) return;

    clearPriceLines();

    // ưu tiên positions[] (hedging). nếu không có thì fallback position (net) cũ
    const list: any[] =
      positions && positions.length
        ? positions.filter((p) => p.symbol === symbol)
        : position && position.symbol === symbol
          ? [position]
          : [];

    if (!list.length) return;

    // nếu nhiều quá thì giới hạn 6 lệnh gần nhất cho đỡ rối
    const sorted = [...list].sort(
      (a, b) =>
        Number(b.openedAt ?? b.openedTs ?? 0) - Number(a.openedAt ?? a.openedTs ?? 0)
    );
    const show = sorted.slice(0, 6);

    for (const p of show) {
      const isBuy = p.side === "BUY";
      const entryColor = isBuy
        ? "rgba(16,185,129,0.95)"
        : "rgba(239,68,68,0.95)";
      const glowColor = isBuy
        ? "rgba(16,185,129,0.22)"
        : "rgba(239,68,68,0.22)";

      // glow mỏng
      const glow = s.createPriceLine({
        price: p.entry,
        color: glowColor,
        lineWidth: 4,
        lineStyle: 0,
        axisLabelVisible: false,
        title: "",
      });

      // label NGẮN: "BUY 0.10"
      const entryLine = s.createPriceLine({
        price: p.entry,
        color: entryColor,
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: `${p.side} ${Number(p.lots).toFixed(2)}`,
      });

      priceLinesRef.current.push(glow, entryLine);
    }
  }, [symbol, position?.id, position?.entry, position?.side, positions?.length]);

  // ===== zoom buttons (don’t reset) (GIỮ CŨ) =====
  const zoomIn = () => {
    const ch = chartRef.current;
    if (!ch) return;
    userInteractedRef.current = true;
    const ts = ch.timeScale();
    const cur = ts.options().barSpacing ?? 14;
    ts.applyOptions({ barSpacing: Math.min(140, cur + 6) });
  };

  const zoomOut = () => {
    const ch = chartRef.current;
    if (!ch) return;
    userInteractedRef.current = true;
    const ts = ch.timeScale();
    const cur = ts.options().barSpacing ?? 14;
    ts.applyOptions({ barSpacing: Math.max(2, cur - 6) });
  };

  const resetZoom = () => {
    const ch = chartRef.current;
    if (!ch) return;
    userInteractedRef.current = false;
    ch.timeScale().fitContent();
  };

  return (
    <Box
      className="hts-chartWrap"
      style={{
        height: "100%",
        width: "100%",
        position: "relative",
        // ✅ NEW: chống “dính nền đen” ở light mode
        background: isDark ? "transparent" : "#ffffff",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* top overlay (GIỮ CŨ) */}
      <Group
        justify="space-between"
        style={{
          position: "absolute",
          zIndex: 3,
          top: 10,
          left: 10,
          right: 10,
          pointerEvents: "none",
        }}
      >
        <Group gap="xs">
          <Badge variant="light">{symbol}</Badge>
          <Badge variant="light">M1 (mock)</Badge>
          <Text size="xs" c="dimmed">
            Institutional View
          </Text>

          {/* giữ badge net position nếu bạn muốn */}
          {position && position.symbol === symbol ? (
            <Badge
              variant="outline"
              color={position.side === "BUY" ? "green" : "red"}
            >
              POS {position.side} {position.lots.toFixed(2)} @{" "}
              {formatPrice(symbol as any, position.entry)}
            </Badge>
          ) : null}
        </Group>

        <Group gap="xs">{rightBadges}</Group>
      </Group>

      {/* zoom controls (GIỮ CŨ) */}
      <Group
        gap="xs"
        style={{
          position: "absolute",
          zIndex: 4,
          bottom: 12,
          right: 12,
          pointerEvents: "auto",
        }}
      >
        <Button
          size="xs"
          variant="light"
          onClick={zoomOut}
          disabled={!ready}
          leftSection={<IconZoomOut size={14} />}
        >
          Zoom -
        </Button>
        <Button
          size="xs"
          variant="light"
          onClick={zoomIn}
          disabled={!ready}
          leftSection={<IconZoomIn size={14} />}
        >
          Zoom +
        </Button>
        <Button
          size="xs"
          variant="light"
          onClick={resetZoom}
          disabled={!ready}
          leftSection={<IconRefresh size={14} />}
        >
          Reset
        </Button>
      </Group>

      <div ref={ref} style={{ height: "100%", width: "100%" }} />
    </Box>
  );
}