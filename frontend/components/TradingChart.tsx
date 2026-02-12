"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
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
  position?: Position | null;
};

type Marker = {
  time: any;
  position: "aboveBar" | "belowBar" | "inBar";
  color: string;
  shape: "arrowUp" | "arrowDown" | "circle" | "square";
  text?: string;
};

export default function TradingChart({ symbol, candles, rightBadges, position }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const priceLinesRef = useRef<any[]>([]);
  const markerKeyRef = useRef<string>("");

  const [ready, setReady] = useState(false);

  // track whether user has zoomed/panned
  const userInteractedRef = useRef(false);

  // track last candle time so we can update() instead of setData()
  const lastTimeRef = useRef<any>(null);

  // for symbol switch: allow 1-time fit
  const lastSymbolRef = useRef<string>("");

  const dp = useMemo(() => (symbol === "XAUUSD" || symbol === "USDJPY" ? 2 : 4), [symbol]);

  // ===== marker compatibility wrapper (no crash)
  const setSeriesMarkersSafe = (markers: Marker[]) => {
    const s: any = seriesRef.current as any;
    if (!s) return;
    if (typeof s.setMarkers === "function") {
      s.setMarkers(markers);
      return;
    }
    // older/newer versions without markers => ignore (still show price lines)
  };

  // ===== init chart
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { color: "transparent" },
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
        barSpacing: 14, // ✅ mặc định rõ hơn
        fixLeftEdge: true,
        fixRightEdge: false, // ✅ cho phép user pan/zoom mà không bị kéo về
      },
      crosshair: {
        vertLine: { color: "rgba(59,130,246,0.35)" },
        horzLine: { color: "rgba(59,130,246,0.35)" },
      },
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

    // add series
    let series: any = null;
    const anyChart = chart as any;

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

    chartRef.current = chart;
    seriesRef.current = series;
    setReady(true);

    // detect user interaction (zoom/pan)
    const ts = chart.timeScale();
    const unsub = ts.subscribeVisibleTimeRangeChange(() => {
      userInteractedRef.current = true;
    });

    const ro = new ResizeObserver(() => {
      if (!ref.current) return;
      chart.applyOptions({ width: ref.current.clientWidth, height: ref.current.clientHeight });
    });
    ro.observe(el);

    // ✅ wheel zoom stronger + doesn’t reset
    const wheel = (ev: WheelEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(ev.target as Node)) return;

      ev.preventDefault();
      userInteractedRef.current = true;

      const ts = chart.timeScale();
      const cur = ts.options().barSpacing ?? 14;

      const direction = ev.deltaY < 0 ? 1 : -1;
      const step = ev.ctrlKey ? 6 : 3; // ✅ mạnh hơn nhiều

      const next = Math.max(2, Math.min(140, cur + direction * step));
      ts.applyOptions({ barSpacing: next });
    };

    el.addEventListener("wheel", wheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", wheel as any);
      ro.disconnect();
      // @ts-ignore older versions may not return unsubscribe
      unsub?.();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setReady(false);
    };
  }, []);

  // ===== set/update candles WITHOUT resetting zoom
  useEffect(() => {
    const series = seriesRef.current as any;
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
      userInteractedRef.current = false; // allow 1-time fit on new symbol
      lastTimeRef.current = null;
    }

    // If no previous candle => setData + fitContent (only once per symbol)
    if (lastTimeRef.current == null || data.length < 2) {
      series.setData(data);
      lastTimeRef.current = data[data.length - 1]?.time ?? null;

      // ✅ only fit when user hasn't interacted yet (fresh load/switch symbol)
      if (!userInteractedRef.current) {
        chart.timeScale().fitContent();
      }
      return;
    }

    // Incremental update: update last candle if time same, else update new candle
    const last = data[data.length - 1];
    if (!last) return;

    if (last.time === lastTimeRef.current) {
      series.update(last);
    } else {
      series.update(last);
      lastTimeRef.current = last.time;
    }

    // 🚫 DO NOT fitContent here => keep zoom/pan
  }, [candles, dp, symbol]);

  // ===== helpers
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

  // ===== draw entry/SL/TP (no reset zoom)
  useEffect(() => {
    const s: any = seriesRef.current;
    if (!s) return;

    clearPriceLines();

    if (!position || position.symbol !== symbol) {
      setSeriesMarkersSafe([]);
      markerKeyRef.current = "";
      return;
    }

    const isBuy = position.side === "BUY";
    const entryColor = isBuy ? "rgba(16,185,129,0.95)" : "rgba(239,68,68,0.95)";
    const glowColor = isBuy ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)";

    const glow = s.createPriceLine({
      price: position.entry,
      color: glowColor,
      lineWidth: 6,
      lineStyle: 0,
      axisLabelVisible: false,
      title: "",
    });

    const entryLine = s.createPriceLine({
      price: position.entry,
      color: entryColor,
      lineWidth: 2,
      lineStyle: 0,
      axisLabelVisible: true,
      title: `${position.side} @ ${formatPrice(symbol as any, position.entry)}`,
    });

    priceLinesRef.current.push(glow, entryLine);

    if (position.slPrice != null) {
      priceLinesRef.current.push(
        s.createPriceLine({
          price: position.slPrice,
          color: "rgba(239,68,68,0.85)",
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `SL ${formatPrice(symbol as any, position.slPrice)}`,
        })
      );
    }

    if (position.tpPrice != null) {
      priceLinesRef.current.push(
        s.createPriceLine({
          price: position.tpPrice,
          color: "rgba(16,185,129,0.85)",
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `TP ${formatPrice(symbol as any, position.tpPrice)}`,
        })
      );
    }

    // marker safe (if supported)
    const key = `${position.id}_${position.openedTs}_${position.entry}_${position.side}`;
    if (markerKeyRef.current !== key) {
      markerKeyRef.current = key;

      const openSec = Math.floor(position.openedTs / 1000);

      let nearestTime: any = candles[0]?.time as any;
      let best = Math.abs((candles[0]?.time ?? openSec) - openSec);

      for (const c of candles) {
        const d = Math.abs((c.time as any) - openSec);
        if (d < best) {
          best = d;
          nearestTime = c.time as any;
        }
      }

      setSeriesMarkersSafe([
        {
          time: nearestTime,
          position: isBuy ? "belowBar" : "aboveBar",
          color: entryColor,
          shape: isBuy ? "arrowUp" : "arrowDown",
          text: `${position.side} ${position.lots.toFixed(2)} @ ${formatPrice(symbol as any, position.entry)}`,
        },
      ]);
    }
  }, [
    symbol,
    position?.id,
    position?.symbol,
    position?.side,
    position?.entry,
    position?.slPrice,
    position?.tpPrice,
    position?.openedTs,
    candles,
  ]);

  // ===== zoom buttons (don’t reset)
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
    <Box style={{ height: "100%", width: "100%", position: "relative" }}>
      {/* top overlay */}
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

          {position && position.symbol === symbol ? (
            <Badge variant="outline" color={position.side === "BUY" ? "green" : "red"}>
              POS {position.side} {position.lots.toFixed(2)} @ {formatPrice(symbol as any, position.entry)}
            </Badge>
          ) : null}
        </Group>

        <Group gap="xs">{rightBadges}</Group>
      </Group>

      {/* zoom controls */}
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
        <Button size="xs" variant="light" onClick={zoomOut} disabled={!ready} leftSection={<IconZoomOut size={14} />}>
          Zoom -
        </Button>
        <Button size="xs" variant="light" onClick={zoomIn} disabled={!ready} leftSection={<IconZoomIn size={14} />}>
          Zoom +
        </Button>
        <Button size="xs" variant="light" onClick={resetZoom} disabled={!ready} leftSection={<IconRefresh size={14} />}>
          Reset
        </Button>
      </Group>

      <div ref={ref} style={{ height: "100%", width: "100%" }} />
    </Box>
  );
}
