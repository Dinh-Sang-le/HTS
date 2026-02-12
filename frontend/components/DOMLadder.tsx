"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Badge, Group, Paper, Stack, Text, SegmentedControl } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { animated, useSprings } from "@react-spring/web";
import { scaleSqrt } from "d3-scale";
import type { Depth, SymbolName } from "@/lib/fakeFeed";

type Mode = "BOOKMAP" | "FUTURES" | "MINIMAL";

type Props = {
  symbol: SymbolName;
  depth: Depth | null;
  onPriceClick?: (price: number) => void;
  defaultMode?: Mode;
};

function fmt(sym: SymbolName, n: number) {
  const dp = sym === "XAUUSD" || sym === "USDJPY" ? 2 : 5;
  return n.toFixed(dp);
}

/* ===================== Scroll Preserve ===================== */

function usePreserveScroll(
  containerRef: React.RefObject<HTMLDivElement | null>,
  deps: any[]
) {
  const lastScrollTop = useRef(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    lastScrollTop.current = el.scrollTop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = lastScrollTop.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ===================== Component ===================== */

type Row = {
  side: "ASK" | "BID" | "MID";
  levelIndex: number;
  price: number;
  size: number;
  delta: number;
  isWall: boolean;
};

export default function DOMLadder({
  symbol,
  depth,
  onPriceClick,
  defaultMode = "BOOKMAP",
}: Props) {
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<Mode>(defaultMode);

  const prevSizesRef = useRef<Map<string, number>>(new Map());

  /* ===================== Build Rows ===================== */

  const rows: Row[] = useMemo(() => {
    if (!depth) return [];

    const asks = depth.asks.slice(0, 12).slice().reverse();
    const bids = depth.bids.slice(0, 12);

    const prev = prevSizesRef.current;
    const out: Row[] = [];

    const sizes = [...asks.map(a => a.size), ...bids.map(b => b.size)];
    const mean =
      sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;

    const variance =
      sizes.length > 1
        ? sizes.reduce((a, s) => a + (s - mean) * (s - mean), 0) /
          (sizes.length - 1)
        : 0;

    const std = Math.sqrt(Math.max(variance, 1e-9));
    const wallCut = mean + std * 1.2;

    const pushRow = (
      side: "ASK" | "BID",
      levelIndex: number,
      price: number,
      size: number
    ) => {
      const key = `${side}-${levelIndex}`;
      const old = prev.get(key) ?? size;
      const delta = size - old;
      prev.set(key, size);

      out.push({
        side,
        levelIndex,
        price,
        size,
        delta,
        isWall: size >= wallCut,
      });
    };

    asks.forEach((a, i) => pushRow("ASK", i, a.price, a.size));

    out.push({
      side: "MID",
      levelIndex: 0,
      price: depth.mid,
      size: 0,
      delta: 0,
      isWall: false,
    });

    bids.forEach((b, i) => pushRow("BID", i, b.price, b.size));

    return out;
  }, [depth]);

  usePreserveScroll(scrollRef, [rows.length, symbol, mode]);

  const maxSize = useMemo(
    () => Math.max(1, ...rows.map(r => r.size)),
    [rows]
  );

  const heat = useMemo(() => {
    const range =
      mode === "BOOKMAP"
        ? [0.1, 0.6]
        : mode === "FUTURES"
        ? [0.06, 0.4]
        : [0.03, 0.15];

    return scaleSqrt().domain([0, maxSize]).range(range).clamp(true);
  }, [maxSize, mode]);

  /* ===================== Springs ===================== */

  const springs = useSprings(
    rows.length,
    rows.map(r => {
      const isMid = r.side === "MID";
      const pulse =
        reduceMotion || isMid
          ? 1
          : 1 + Math.min(0.02, Math.abs(r.delta) / Math.max(1, maxSize) * 0.4);

      return {
        to: {
          transform: `scale(${pulse})`,
          opacity: 1,
        },
        from: {
          opacity: 0,
          transform: "scale(0.995)",
        },
        immediate: reduceMotion,
        config: { tension: 340, friction: 28 },
      };
    })
  );

  /* ===================== Render ===================== */

  return (
    <Paper
      withBorder
      radius="lg"
      p="md"
      style={{
        background:
          "linear-gradient(180deg, rgba(20,20,20,0.84), rgba(20,20,20,0.55))",
      }}
    >
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <Text fw={700}>DOM Ladder</Text>
          <Badge variant="light">{symbol}</Badge>
        </Group>

        <SegmentedControl
          size="xs"
          value={mode}
          onChange={v => setMode(v as Mode)}
          data={[
            { value: "BOOKMAP", label: "Bookmap" },
            { value: "FUTURES", label: "Futures" },
            { value: "MINIMAL", label: "Minimal" },
          ]}
        />
      </Group>

      <div
        ref={scrollRef}
        style={{
          maxHeight: 420,
          overflow: "auto",
          paddingRight: 6,
        }}
      >
        <Stack gap={6}>
          {rows.map((r, idx) => {
            const isMid = r.side === "MID";
            const key = `${r.side}-${r.levelIndex}`;
            const a = heat(r.size);

            const bg =
              mode === "MINIMAL"
                ? "rgba(255,255,255,0.03)"
                : r.side === "ASK"
                ? `linear-gradient(90deg, rgba(239,68,68,0), rgba(239,68,68,${a}))`
                : r.side === "BID"
                ? `linear-gradient(90deg, rgba(16,185,129,${a}), rgba(16,185,129,0))`
                : "rgba(59,130,246,0.18)";

            return (
              <animated.div
                key={key}
                style={{
                  ...springs[idx],
                  background: bg,
                  display: "grid",
                  gridTemplateColumns: "70px 1fr 64px",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.06)",
                  cursor:
                    onPriceClick && !isMid ? "pointer" : "default",
                  overflow: "hidden",
                }}
                onClick={() =>
                  !isMid && onPriceClick?.(r.price)
                }
              >
                <Text
                  size="sm"
                  fw={700}
                  c={
                    r.side === "ASK"
                      ? "red"
                      : r.side === "BID"
                      ? "green"
                      : "blue"
                  }
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.side}
                </Text>

                <Text
                  size="sm"
                  fw={800}
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  {fmt(symbol, r.price)}
                  {mode === "BOOKMAP" && r.isWall && !isMid && (
                    <span style={{ marginLeft: 6 }}>• WALL</span>
                  )}
                  {mode === "FUTURES" &&
                    !isMid &&
                    Math.abs(r.delta) > 2 && (
                      <span
                        style={{
                          marginLeft: 6,
                          color:
                            r.delta > 0
                              ? "rgba(16,185,129,0.9)"
                              : "rgba(239,68,68,0.9)",
                        }}
                      >
                        {r.delta > 0
                          ? `↑ ${r.delta}`
                          : `↓ ${Math.abs(r.delta)}`}
                      </span>
                    )}
                </Text>

                <Text
                  size="sm"
                  c="dimmed"
                  style={{
                    textAlign: "right",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isMid ? "-" : r.size}
                </Text>
              </animated.div>
            );
          })}
        </Stack>
      </div>
    </Paper>
  );
}
