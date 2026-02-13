"use client";

import { Badge, Button, Group, Table, Text } from "@mantine/core";
import { useMemo } from "react";
import { useTradeStore } from "@/lib/tradeStore";
import { formatPrice } from "@/lib/symbolSpecs";

export default function PositionsTable() {
  // positions hiện tại là object Record => phải convert
  const positionsMap = useTradeStore((s) => s.positions);
  const closePosition = useTradeStore((s) => s.closePosition);

  const rows = useMemo(() => {
    // Object.values trả về (Position | undefined)[]
    return Object.values(positionsMap).filter(Boolean) as any[];
  }, [positionsMap]);

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
            <Table.Th ta="right">Action</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {rows.map((p) => (
            // ✅ positions dạng Record => key dùng symbol (unique per symbol)
            <Table.Tr key={p.symbol}>
              <Table.Td fw={800}>{p.symbol}</Table.Td>

              <Table.Td>
                <Badge variant="light" color={p.side === "BUY" ? "green" : "red"}>
                  {p.side}
                </Badge>
              </Table.Td>

              <Table.Td ta="right">{Number(p.lots).toFixed(2)}</Table.Td>

              <Table.Td ta="right" c="dimmed">
                {formatPrice(p.symbol, p.entry)}
              </Table.Td>

              {/* ✅ GIỮ NGUYÊN Price = p.last */}
              <Table.Td ta="right" c="dimmed">
                {formatPrice(p.symbol, p.last)}
              </Table.Td>

              {/* ✅ GIỮ NGUYÊN P/L = p.unrealizedPnl */}
              <Table.Td ta="right" fw={800} c={p.unrealizedPnl >= 0 ? "green" : "red"}>
                {p.unrealizedPnl >= 0 ? "+" : "-"}${Math.abs(p.unrealizedPnl).toFixed(2)}
              </Table.Td>

              <Table.Td ta="right">
                <Button
                  size="xs"
                  variant="light"
                  color="gray"
                  // ✅ close theo symbol (vì store đang là Record by symbol)
                  onClick={() => closePosition(p.symbol)}
                >
                  Close
                </Button>
              </Table.Td>
            </Table.Tr>
          ))}

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
    </>
  );
}
