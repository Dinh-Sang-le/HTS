"use client";

import { useMemo } from "react";
import { Badge, Group, Table, Text } from "@mantine/core";

export default function PositionsTable() {
  const rows = useMemo(
    () => [
      { sym: "XAUUSD", side: "BUY" as const, lots: 0.2, entry: 2030.2, price: 2031.11, pnl: 14 },
      { sym: "EURUSD", side: "SELL" as const, lots: 0.5, entry: 1.0834, price: 1.08312, pnl: 12 },
    ],
    []
  );

  return (
    <>
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
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((p) => (
            <Table.Tr key={p.sym}>
              <Table.Td fw={800}>{p.sym}</Table.Td>
              <Table.Td>
                <Badge variant="light" color={p.side === "BUY" ? "green" : "blue"}>
                  {p.side}
                </Badge>
              </Table.Td>
              <Table.Td ta="right">{p.lots}</Table.Td>
              <Table.Td ta="right" c="dimmed">{p.entry}</Table.Td>
              <Table.Td ta="right" c="dimmed">{p.price}</Table.Td>
              <Table.Td ta="right" fw={800} c={p.pnl >= 0 ? "green" : "red"}>
                {p.pnl >= 0 ? "+" : ""}
                {p.pnl}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Text size="xs" c="dimmed" mt="sm">
        * Mock realtime.
      </Text>
    </>
  );
}
