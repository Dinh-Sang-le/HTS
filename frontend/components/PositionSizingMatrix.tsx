"use client";

import { useMemo } from "react";
import { Badge, Group, Paper, Table, Text } from "@mantine/core";
import type { SymbolName } from "@/lib/fakeFeed";

type Props = {
  symbol: SymbolName;
  equity: number;       // account size
  pipValuePerLot?: number; // $ per pip for 1 lot (demo)
};

function pipValue(sym: SymbolName) {
  // demo pipValue
  if (sym === "XAUUSD") return 1.0;  // $1 per 0.1 move per 1 lot (mock)
  if (sym === "USDJPY") return 0.9;
  return 10.0; // forex standard-ish (mock)
}

export default function PositionSizingMatrix({
  symbol,
  equity,
  pipValuePerLot,
}: Props) {
  const pv = pipValuePerLot ?? pipValue(symbol);

  const riskPcts = [0.25, 0.5, 1, 1.5, 2];
  const slPips = [5, 10, 15, 20, 30, 40, 60];

  const rows = useMemo(() => {
    return slPips.map((sl) => {
      const cells = riskPcts.map((rp) => {
        const risk$ = (equity * rp) / 100;
        const lots = risk$ / (sl * pv);
        return Math.max(0, +lots.toFixed(2));
      });
      return { sl, cells };
    });
  }, [equity, pv]);

  return (
    <Paper withBorder radius="lg" p="md" style={{ minWidth: 0 }}>
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <Text fw={700}>Position Sizing Matrix</Text>
          <Badge variant="light">{symbol}</Badge>
        </Group>
        <Badge variant="light">Risk → Lots</Badge>
      </Group>

      <Text size="xs" c="dimmed" mb="sm">
        Lots = (Equity × Risk%) / (SL pips × PipValue/lot). (Mock pip value)
      </Text>

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>SL (pips)</Table.Th>
            {riskPcts.map((rp) => (
              <Table.Th key={rp} style={{ textAlign: "right" }}>
                {rp}%
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {rows.map((r) => (
            <Table.Tr key={r.sl}>
              <Table.Td>
                <Badge variant="light">{r.sl}</Badge>
              </Table.Td>

              {r.cells.map((v, i) => (
                <Table.Td key={i} style={{ textAlign: "right" }}>
                  <Text fw={700}>{v}</Text>
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
