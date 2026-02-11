"use client";

import { Paper, Table } from "@mantine/core";

export function OrderBook() {
  const bids = [
    { price: 1804, volume: 2.5 },
    { price: 1803, volume: 1.8 },
  ];

  const asks = [
    { price: 1806, volume: 2.1 },
    { price: 1807, volume: 1.2 },
  ];

  return (
    <Paper withBorder radius="lg" p="md">
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Bid</Table.Th>
            <Table.Th>Volume</Table.Th>
            <Table.Th>Ask</Table.Th>
            <Table.Th>Volume</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {bids.map((bid, i) => (
            <Table.Tr key={i}>
              <Table.Td style={{ color: "lime" }}>{bid.price}</Table.Td>
              <Table.Td>{bid.volume}</Table.Td>
              <Table.Td style={{ color: "red" }}>{asks[i]?.price}</Table.Td>
              <Table.Td>{asks[i]?.volume}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
