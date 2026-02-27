"use client";

import { Badge, Button, Group, Table, Text, Paper } from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTradeStore, type Position } from "@/lib/tradeStore";
import { formatPrice } from "@/lib/symbolSpecs";

export default function PositionsTable() {
  const positions = useTradeStore((s) => s.positions);
  const closePosition = useTradeStore((s) => s.closePosition);

  const rows = useMemo(() => {
    return [...(positions ?? [])].sort(
      (a, b) => (b.openedAt ?? 0) - (a.openedAt ?? 0)
    );
  }, [positions]);

  // ✨ panel pulse khi có position mới
  const prevCountRef = useRef<number>(rows.length);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const prev = prevCountRef.current;
    const next = rows.length;
    prevCountRef.current = next;

    if (next > prev) {
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 420);
      return () => window.clearTimeout(t);
    }
  }, [rows.length]);

  return (
    <Paper
      withBorder
      radius="lg"
      p="md"
      className={`hts-positions-panel ${pulse ? "is-pulse" : ""}`}
    >
      <Group justify="space-between" mb="xs">
        <Text fw={800}>Positions</Text>
        <Badge variant="light" color="blue">
          {rows.length} OPEN
        </Badge>
      </Group>

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Symbol</Table.Th>
            <Table.Th>Side</Table.Th>
            <Table.Th ta="right">Lots</Table.Th>
            <Table.Th ta="right">Entry</Table.Th>
            <Table.Th ta="right">Price</Table.Th>
            <Table.Th ta="right">P/L</Table.Th>
            <Table.Th ta="right">Action</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {rows.map((p: Position) => {
            const isProfit = p.unrealizedPnl > 0;
            const isLoss = p.unrealizedPnl < 0;

            return (
              <Table.Tr
                key={p.id}
                className="hts-position-row"
                data-profit={isProfit ? "1" : undefined}
                data-loss={isLoss ? "1" : undefined}
              >
                <Table.Td fw={800}>{p.symbol}</Table.Td>

                <Table.Td>
                  <Badge
                    variant="light"
                    color={p.side === "BUY" ? "green" : "red"}
                  >
                    {p.side}
                  </Badge>
                </Table.Td>

                <Table.Td ta="right">{Number(p.lots).toFixed(2)}</Table.Td>

                <Table.Td ta="right" c="dimmed">
                  {formatPrice(p.symbol as any, p.entry)}
                </Table.Td>

                <Table.Td ta="right" c="dimmed">
                  {formatPrice(p.symbol as any, p.last)}
                </Table.Td>

                <Table.Td
                  ta="right"
                  fw={800}
                  c={p.unrealizedPnl >= 0 ? "green" : "red"}
                >
                  {p.unrealizedPnl >= 0 ? "+" : "-"}$
                  {Math.abs(p.unrealizedPnl).toFixed(2)}
                </Table.Td>

                <Table.Td ta="right">
                  <Button
                    size="xs"
                    variant="light"
                    color="gray"
                    onClick={() => closePosition(p.id)}
                  >
                    Close
                  </Button>
                </Table.Td>
              </Table.Tr>
            );
          })}

          {!rows.length ? (
            <Table.Tr>
              <Table.Td colSpan={7}>
                <Text size="sm" c="dimmed">
                  No open positions.
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : null}
        </Table.Tbody>
      </Table>

      <Text size="xs" c="dimmed" mt="sm">
        * Realtime P/L is computed from ticks (demo OMS).
      </Text>
    </Paper>
  );
}