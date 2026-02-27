"use client";

import { useMemo } from "react";
import { Badge, Group, Paper, Text } from "@mantine/core";
import type { SymbolName } from "@/lib/fakeFeed";

type Props = {
  symbol: SymbolName;
  mid: number | null;
};

function dp(sym: SymbolName) {
  return sym === "XAUUSD" || sym === "USDJPY" ? 2 : 4;
}

export default function FootprintMock({ symbol, mid }: Props) {
  const grid = useMemo(() => {
    const rows = 18;
    const cols = 10;
    const out: { buy: number; sell: number }[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: { buy: number; sell: number }[] = [];
      for (let c = 0; c < cols; c++) {
        // deterministic-ish
        const buy = Math.round(20 + Math.abs(Math.sin((r + 1) * (c + 2))) * 180);
        const sell = Math.round(20 + Math.abs(Math.cos((r + 2) * (c + 1))) * 180);
        row.push({ buy, sell });
      }
      out.push(row);
    }
    return out;
  }, []);

  const priceLevels = useMemo(() => {
    const m = mid ?? (symbol === "XAUUSD" ? 2030 : symbol === "USDJPY" ? 148.5 : 1.1);
    const step = symbol === "XAUUSD" ? 0.2 : symbol === "USDJPY" ? 0.02 : 0.0002;
    const rows = 18;
    const start = m + step * Math.floor(rows / 2);
    return Array.from({ length: rows }, (_, i) => +(start - i * step).toFixed(dp(symbol)));
  }, [mid, symbol]);

  return (
    <Paper withBorder radius="lg" p="md" style={{ minWidth: 0 }}>
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <Text fw={700}>Footprint (mock)</Text>
          <Badge variant="light">{symbol}</Badge>
        </Group>
        <Badge variant="light">Orderflow View</Badge>
      </Group>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "72px repeat(10, 1fr)",
          gap: 6,
        }}
      >
        {/* header row */}
        <div />
        {Array.from({ length: 10 }).map((_, c) => (
          <Text key={c} size="xs" c="dimmed" style={{ textAlign: "center" }}>
            T-{9 - c}
          </Text>
        ))}

        {grid.map((row, r) => (
          <div key={r} style={{ display: "contents" }}>
            <Text size="xs" c="dimmed">
              {priceLevels[r]}
            </Text>

            {row.map((cell, c) => {
              const intensity = Math.min(1, (cell.buy + cell.sell) / 300);
              const bias = cell.buy - cell.sell;

              const bg =
                bias >= 0
                  ? `rgba(16,185,129,${0.10 + intensity * 0.35})`
                  : `rgba(239,68,68,${0.10 + intensity * 0.35})`;

              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    height: 22,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 6px",
                    fontSize: 11,
                  }}
                  title={`Buy ${cell.buy} / Sell ${cell.sell}`}
                >
                  <span style={{ opacity: 0.9 }}>{cell.buy}</span>
                  <span style={{ opacity: 0.7 }}>{cell.sell}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      
    </Paper>
  );
}
