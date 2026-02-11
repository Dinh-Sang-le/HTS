"use client";

import { Table, Paper } from "@mantine/core";

export function PositionsTable() {
  const data = [
    { symbol: "XAUUSD", type: "BUY", lots: 0.5, profit: 120 },
    { symbol: "EURUSD", type: "SELL", lots: 1.0, profit: -45 },
  ];

  return (
    <Paper withBorder radius="lg" p="md">
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Symbol</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Lots</Table.Th>
            <Table.Th>Profit</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.map((row, i) => (
            <Table.Tr key={i}>
              <Table.Td>{row.symbol}</Table.Td>
              <Table.Td>{row.type}</Table.Td>
              <Table.Td>{row.lots}</Table.Td>
              <Table.Td
                style={{ color: row.profit >= 0 ? "lime" : "red" }}
              >
                {row.profit}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
