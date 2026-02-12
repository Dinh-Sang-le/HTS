"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Group, Paper, Table, Text } from "@mantine/core";

type Row = { price: number; qty: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

// PRNG có seed để client-side update ổn định (không dùng Math.random trong render)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function OrderBook() {
  const [mounted, setMounted] = useState(false);

  // ✅ SSR-safe: dữ liệu cố định (server và client render lần đầu giống nhau)
  const [bids, setBids] = useState<Row[]>([
    { price: 2030.94, qty: 0.63 },
    { price: 2030.91, qty: 0.91 },
    { price: 2030.88, qty: 1.7 },
    { price: 2030.85, qty: 1.64 },
    { price: 2030.81, qty: 2.52 },
  ]);

  const [asks, setAsks] = useState<Row[]>([
    { price: 2031.05, qty: 0.37 },
    { price: 2031.08, qty: 0.57 },
    { price: 2031.11, qty: 1.1 },
    { price: 2031.14, qty: 0.8 },
    { price: 2031.21, qty: 1.06 },
  ]);

  const mid = useMemo(() => {
    const b = bids[0]?.price ?? 0;
    const a = asks[0]?.price ?? 0;
    return a && b ? (a + b) / 2 : 0;
  }, [bids, asks]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Realtime mock chỉ chạy SAU mount -> không gây hydration mismatch
  useEffect(() => {
    if (!mounted) return;

    const rand = mulberry32(777);

    const id = setInterval(() => {
      const step = () => (rand() - 0.5) * 0.06;

      setBids((prev) => {
        const next = prev.map((r, i) => {
          const p = +(r.price + step() - i * 0.01).toFixed(2);
          const q = +(clamp(r.qty + (rand() - 0.5) * 0.35, 0.1, 9)).toFixed(2);
          return { price: p, qty: q };
        });
        // sort bid desc
        next.sort((x, y) => y.price - x.price);
        return next;
      });

      setAsks((prev) => {
        const next = prev.map((r, i) => {
          const p = +(r.price + step() + i * 0.01).toFixed(2);
          const q = +(clamp(r.qty + (rand() - 0.5) * 0.35, 0.1, 9)).toFixed(2);
          return { price: p, qty: q };
        });
        // sort ask asc
        next.sort((x, y) => x.price - y.price);
        return next;
      });
    }, 700);

    return () => clearInterval(id);
  }, [mounted]);

  return (
    <Paper
      withBorder
      radius="lg"
      p="md"
      style={{
        background: "rgba(255,255,255,0.03)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <Group justify="space-between" mb="xs">
        <Text fw={800}>Order Book</Text>
        <Group gap="xs">
          <Badge variant="light">MOCK</Badge>
          <Badge variant="light" color="blue">
            MID {mid ? mid.toFixed(2) : "--"}
          </Badge>
        </Group>
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
          {(mounted ? bids : bids).map((b, i) => (
            <Table.Tr key={`ob-${i}`}>
              <Table.Td c="green" fw={700}>
                {b.price.toFixed(2)}
              </Table.Td>
              <Table.Td ta="right" c="dimmed">
                {b.qty.toFixed(2)}
              </Table.Td>

              <Table.Td c="red" fw={700}>
                {(asks[i]?.price ?? 0).toFixed(2)}
              </Table.Td>
              <Table.Td ta="right" c="dimmed">
                {(asks[i]?.qty ?? 0).toFixed(2)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Text size="xs" c="dimmed" mt="sm">
        * Mock realtime (updates after mount) — safe for SSR.
      </Text>
    </Paper>
  );
}
