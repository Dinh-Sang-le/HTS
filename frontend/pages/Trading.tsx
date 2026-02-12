"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { FileCheck2, PlayCircle, TriangleAlert } from "lucide-react";

import OrderPanel from "@/components/OrderPanel";
import OrderBook from "@/components/OrderBook";
import PositionsTable from "@/components/PositionsTable";

// Chart dùng window => tắt SSR
const TradingChart = dynamic(() => import("@/components/TradingChart"), {
  ssr: false,
  loading: () => <div style={{ height: 520, width: "100%" }} />,
});

function MotionCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      whileHover={{ scale: 1.01 }}
    >
      {children}
    </motion.div>
  );
}

const cardStyle = {
  background: "rgba(255,255,255,0.03)",
  borderColor: "rgba(255,255,255,0.08)",
  boxShadow: "0 18px 45px rgba(0,0,0,0.25)",
};

export default function TradingPage() {
  // mock header values (đồng bộ vibe dashboard)
  const symbol = "XAUUSD";
  const tf = "M15";
  const spread = 0.17;
  const pnlToday = -0.42;
  const openPos = 2;

  return (
    <Stack gap="md">
      {/* Header giống dashboard */}
      <Group justify="space-between" align="flex-start">
        <Stack gap={2}>
          <Title order={2}>Trading</Title>
          <Text size="sm" c="dimmed">
            {symbol} • {tf} • Spread {spread.toFixed(2)} • Live UI (mock) — ready for MT5/OMS
          </Text>
        </Stack>

        <Group>
          <Badge variant="light" color="yellow" leftSection={<TriangleAlert size={14} />}>
            AT RISK
          </Badge>

          <Button
            variant="light"
            leftSection={<FileCheck2 size={16} />}
            onClick={() =>
              notifications.show({
                title: "Export",
                message: "Export (PDF/CSV) sẽ nối backend sau.",
              })
            }
          >
            Export
          </Button>

          <Button
            leftSection={<PlayCircle size={16} />}
            onClick={() =>
              notifications.show({
                title: "Gate",
                message: "Gate mock — sau nối OMS/MT5 để block/allow.",
              })
            }
          >
            Gate
          </Button>
        </Group>
      </Group>

      {/* KPI row giống dashboard */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        {[
          { k: "Symbol", v: symbol, sub: `Timeframe ${tf}` },
          { k: "Spread", v: spread.toFixed(2), sub: "Avg (mock)" },
          { k: "P/L Today", v: `${pnlToday >= 0 ? "+" : ""}${pnlToday.toFixed(2)}%`, sub: "Mark-to-market (mock)", color: pnlToday >= 0 ? "green" : "red" },
          { k: "Open Positions", v: String(openPos), sub: "Across symbols" },
        ].map((x) => (
          <MotionCard key={x.k}>
            <Paper withBorder radius="lg" p="md" style={{ ...cardStyle, minWidth: 0 }}>
              <Text size="sm" c="dimmed">{x.k}</Text>
              <Text fw={900} size="xl" c={x.color as any}>
                {x.v}
              </Text>
              <Text size="sm" c="dimmed" mt={6}>
                {x.sub}
              </Text>
            </Paper>
          </MotionCard>
        ))}
      </SimpleGrid>

      {/* Main grid (tone + spacing giống dashboard) */}
      <SimpleGrid cols={{ base: 1, lg: 3 }}>
        <MotionCard>
          <Paper withBorder radius="lg" p="md" style={{ ...cardStyle, minWidth: 0, gridColumn: "span 2" as any }}>
            <Group justify="space-between" mb="xs">
              <Text fw={800}>Chart</Text>
              <Group gap="xs">
                <Badge variant="light">{symbol}</Badge>
                <Badge variant="light">{tf}</Badge>
                <Badge variant="light" color="blue">REALTIME MOCK</Badge>
              </Group>
            </Group>

            <div
              style={{
                height: 520,
                minHeight: 520,
                width: "100%",
                minWidth: 0,
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(0,0,0,0.25)",
              }}
            >
              <TradingChart />
            </div>

            <Group mt="sm" justify="space-between">
              <Text size="xs" c="dimmed">
                Spread: {spread.toFixed(2)} • Feed: mock
              </Text>
              <Badge variant="light" color="yellow">CAUTION</Badge>
            </Group>
          </Paper>
        </MotionCard>

        <MotionCard>
          <Paper withBorder radius="lg" p="md" style={{ ...cardStyle, minWidth: 0 }}>
            <Group justify="space-between" mb="xs">
              <Text fw={800}>Order</Text>
              <Badge variant="light" color="green">READY</Badge>
            </Group>
            <OrderPanel />
            <Text size="xs" c="dimmed" mt="sm">
              Tip: khi tin HIGH impact → giảm lot / tránh entry sát giờ ra tin.
            </Text>
          </Paper>
        </MotionCard>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 3 }}>
        <MotionCard>
          <Paper withBorder radius="lg" p="md" style={{ ...cardStyle, minWidth: 0 }}>
            <OrderBook />
          </Paper>
        </MotionCard>

        <MotionCard>
          <Paper withBorder radius="lg" p="md" style={{ ...cardStyle, minWidth: 0, gridColumn: "span 2" as any }}>
            <Group justify="space-between" mb="xs">
              <Text fw={800}>Positions</Text>
              <Badge variant="light" color="blue">LIVE (MOCK)</Badge>
            </Group>
            <PositionsTable />
          </Paper>
        </MotionCard>
      </SimpleGrid>
    </Stack>
  );
}
