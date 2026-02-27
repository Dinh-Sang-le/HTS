"use client";

import { Badge, Group, Paper, Table, Text } from "@mantine/core";
import { useMemo } from "react";

type AnyDepth = any;
type Row = { bid: number; bidQty: number; ask: number; askQty: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function pickPQ(x: any): { p: number; q: number } {
  // support {price, qty} or {p, q} or [p,q]
  if (Array.isArray(x)) return { p: Number(x[0] ?? 0), q: Number(x[1] ?? 0) };
  const p = Number(x?.price ?? x?.p ?? 0);
  const q = Number(x?.qty ?? x?.q ?? x?.size ?? 0);
  return { p, q };
}

function makeRowsFromDepth(depth: AnyDepth | null | undefined, fallbackMid = 2030.99): Row[] {
  const bidsRaw = depth?.bids ?? depth?.bid ?? [];
  const asksRaw = depth?.asks ?? depth?.ask ?? [];

  const bids = Array.isArray(bidsRaw) ? bidsRaw : [];
  const asks = Array.isArray(asksRaw) ? asksRaw : [];

  const N = 10;

  if (bids.length && asks.length) {
    const rows: Row[] = [];
    for (let i = 0; i < N; i++) {
      const b = pickPQ(bids[i] ?? bids[bids.length - 1]);
      const a = pickPQ(asks[i] ?? asks[asks.length - 1]);
      rows.push({
        bid: b.p,
        bidQty: clamp(b.q, 0.01, 999),
        ask: a.p,
        askQty: clamp(a.q, 0.01, 999),
      });
    }
    return rows;
  }

  // fallback mock ladder from mid
  const mid = fallbackMid;
  return Array.from({ length: N }).map((_, i) => ({
    bid: +(mid - (i + 1) * 0.05).toFixed(2),
    bidQty: +(0.3 + i * 0.08).toFixed(2),
    ask: +(mid + (i + 1) * 0.05).toFixed(2),
    askQty: +(0.35 + i * 0.07).toFixed(2),
  }));
}

export default function OrderBook(props: { depth?: AnyDepth; mid?: number | null }) {
  const rows = useMemo(() => makeRowsFromDepth(props.depth, props.mid ?? 2030.99), [props.depth, props.mid]);

  const mid =
    rows[0] ? ((rows[0].bid + rows[0].ask) / 2).toFixed(2) : "--";

  return (
    <Paper withBorder radius="lg" p="md">
      <Group justify="space-between" mb="xs">
        <Text fw={800}>Order Book</Text>
        <Badge variant="light">MID {mid}</Badge>
      </Group>

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Bid</Table.Th>
            <Table.Th ta="right">Qty</Table.Th>
            <Table.Th>Ask</Table.Th>
            <Table.Th ta="right">Qty</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {rows.map((r, i) => (
            <Table.Tr key={i}>
              <Table.Td c="green" fw={700}>
                {r.bid.toFixed(2)}
              </Table.Td>
              <Table.Td ta="right" c="dimmed">
                {r.bidQty.toFixed(2)}
              </Table.Td>
              <Table.Td c="red" fw={700}>
                {r.ask.toFixed(2)}
              </Table.Td>
              <Table.Td ta="right" c="dimmed">
                {r.askQty.toFixed(2)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Text size="xs" c="dimmed" mt="sm">
        Depth from feed if available, otherwise fallback mock.
      </Text>
    </Paper>
  );
}
