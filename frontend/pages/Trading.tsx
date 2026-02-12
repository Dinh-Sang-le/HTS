// pages/trading.tsx
"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  type PaperProps,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBolt,
  IconChartCandle,
  IconDashboard,
  IconLayersLinked,
  IconLock,
  IconPlayerPlay,
} from "@tabler/icons-react";

import type { SymbolName } from "@/lib/fakeFeed";
import { useFeed } from "@/lib/useFeed";
import { evaluateRisk } from "@/lib/riskRules";
import { useTradeEngine } from "@/lib/useTradeEngine";
import { useTradeStore } from "@/lib/tradeStore";
import { formatPrice } from "@/lib/symbolSpecs";

import FloatingPanel from "@/components/FloatingPanel";
import DOMLadder from "@/components/DOMLadder";
import FootprintMock from "@/components/FootprintMock";
import PositionSizingMatrix from "@/components/PositionSizingMatrix";

import OrderPanel, { type OrderDraft } from "@/components/OrderPanel";
import OrderBook from "@/components/OrderBook";
import PositionsTable from "@/components/PositionsTable";

// Chart SSR off
const TradingChart = dynamic(() => import("@/components/TradingChart"), {
  ssr: false,
  loading: () => <div style={{ height: "100%", width: "100%" }} />,
});

type MotionCardProps = PaperProps &
  HTMLMotionProps<"div"> & {
    children: React.ReactNode;
  };

function MotionCard({ children, style, ...props }: MotionCardProps) {
  const {
    withBorder,
    radius,
    p,
    px,
    py,
    m,
    mx,
    my,
    shadow,
    bg,
    className,
    variants,
    initial,
    animate,
    exit,
    whileHover,
    whileTap,
    transition,
    layout,
    layoutId,
    ...rest
  } = props as any;

  return (
    <motion.div
      variants={variants}
      initial={initial}
      animate={animate}
      exit={exit}
      whileHover={whileHover}
      whileTap={whileTap}
      transition={transition}
      layout={layout}
      layoutId={layoutId}
      style={{ minWidth: 0, ...(style as any) }}
      className={className}
    >
      <Paper
        withBorder={withBorder}
        radius={radius}
        p={p}
        px={px}
        py={py}
        m={m}
        mx={mx}
        my={my}
        shadow={shadow}
        bg={bg}
        {...rest}
      >
        {children}
      </Paper>
    </motion.div>
  );
}

const cardAnim = {
  hidden: { opacity: 0, y: 10, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22 } },
};

function fmtSignedPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
}

export default function TradingInstitutionalPage() {
  const router = useRouter();
  const symbols: SymbolName[] = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY"];
  const [symbol, setSymbol] = useState<SymbolName>("XAUUSD");

  const { tick, depth, candles, spread, mounted } = useFeed(symbol);

  // ===== OMS demo engine: tick -> fill limit + update pnl
  useTradeEngine(symbol as any, tick as any, spread);

  const placeOrder = useTradeStore((s) => s.placeOrder);
  const getOpenPosition = useTradeStore((s) => s.getOpenPosition);

  const pos = getOpenPosition(symbol as any);

  // ===== confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastPlaced, setLastPlaced] = useState<null | {
    id: string;
    sym: SymbolName;
    side: string;
    type: string;
    lots: number;
    price?: number;
    sl?: number | null;
    tp?: number | null;
    comment?: string;
  }>(null);

  const openConfirm = (payload: NonNullable<typeof lastPlaced>) => {
    setLastPlaced(payload);
    setConfirmOpen(true);
  };

  // ===== risk snapshot (mock)
  const [riskSnap, setRiskSnap] = useState({
    equity: 25000,
    ddUsedPct: 18,
    dailyLossUsedPct: 42,
    exposureUsedPct: 61,
  });

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      if (!router.isReady) return;

      const q = String(router.query.symbol ?? "").toUpperCase();
      if (q && (symbols as string[]).includes(q)) {
        setSymbol(q as SymbolName);
      }
      setRiskSnap((p) => ({
        ...p,
        ddUsedPct: Math.max(0, Math.min(100, p.ddUsedPct + (Math.random() - 0.5) * 1.2)),
        dailyLossUsedPct: Math.max(0, Math.min(100, p.dailyLossUsedPct + (Math.random() - 0.5) * 1.8)),
        exposureUsedPct: Math.max(0, Math.min(100, p.exposureUsedPct + (Math.random() - 0.5) * 1.4)),
      }));
    }, 1800);
    return () => clearInterval(id);
  }, [mounted, router.isReady, router.query.symbol]);

  const risk = useMemo(() => evaluateRisk(riskSnap), [riskSnap]);

  const statusBadge = useMemo(() => {
    if (risk.status === "VIOLATION") return <Badge color="red" variant="light">VIOLATION</Badge>;
    if (risk.status === "AT_RISK") return <Badge color="yellow" variant="light">AT RISK</Badge>;
    return <Badge color="green" variant="light">COMPLIANT</Badge>;
  }, [risk.status]);

  // ===== UI state
  const [ticketPrice, setTicketPrice] = useState<number | null>(null);
  const [showLadder, setShowLadder] = useState(true);
  const [showFootprint, setShowFootprint] = useState(true);

  // OpenPL mock
  const [openPL, setOpenPL] = useState(0);
  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      const v = (Math.sin(Date.now() / 8000) * 420) | 0;
      setOpenPL(v);
    }, 450);
    return () => clearInterval(id);
  }, [mounted]);

  // keyboard shortcuts (B/S)
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (!tick?.last) return;
      if (e.key.toLowerCase() === "b") doMarket("BUY");
      if (e.key.toLowerCase() === "s") doMarket("SELL");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, symbol, tick?.last, spread, risk.blocked]);

  const last = tick?.last ?? 0;
  const chg = tick?.chgPct ?? 0;

  const cardBg =
    "linear-gradient(180deg, rgba(18,18,18,0.78), rgba(18,18,18,0.62))";

  function doMarket(side: "BUY" | "SELL") {
    if (risk.blocked) {
      notifications.show({ title: "Blocked", message: "Risk rules violation. Trading blocked.", color: "red" });
      return;
    }
    if (!tick?.last) return;

    const r = placeOrder(
      { symbol: symbol as any, side, type: "MARKET", lots: 0.1, slPips: null, tpPips: null, comment: "Market" } as any,
      { tick: tick as any, spread }
    );

    if (r.ok) {
      notifications.show({
        title: "Order Placed",
        message: `${symbol} ${side} MARKET • #${r.order.id}`,
        color: side === "BUY" ? "green" : "red",
      });

      openConfirm({
        id: r.order.id,
        sym: symbol,
        side: r.order.side,
        type: r.order.type,
        lots: r.order.lots,
        price: r.order.filledPrice ?? r.order.limitPrice,
        sl: r.order.slPrice ?? null,
        tp: r.order.tpPrice ?? null,
        comment: r.order.comment,
      });
    } else {
      notifications.show({ title: "Rejected", message: r.reason, color: "red" });
    }
  }

  return (
    <Stack gap="md">
      {/* ===== Confirm Modal ===== */}
      <Modal opened={confirmOpen} onClose={() => setConfirmOpen(false)} title="Order Confirmed" centered>
        {lastPlaced ? (
          <Stack gap="xs">
            <Text fw={800}>#{lastPlaced.id}</Text>
            <Text size="sm" c="dimmed">
              {lastPlaced.sym} • {lastPlaced.type} • {lastPlaced.side} • Lots {lastPlaced.lots}
            </Text>
            <Text size="sm">
              Price:{" "}
              <b>
                {lastPlaced.price ? formatPrice(lastPlaced.sym as any, lastPlaced.price) : "--"}
              </b>
            </Text>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">SL</Text>
              <Text size="sm">{lastPlaced.sl ? formatPrice(lastPlaced.sym as any, lastPlaced.sl) : "--"}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">TP</Text>
              <Text size="sm">{lastPlaced.tp ? formatPrice(lastPlaced.sym as any, lastPlaced.tp) : "--"}</Text>
            </Group>

            {lastPlaced.comment ? (
              <Text size="sm" c="dimmed">
                Note: {lastPlaced.comment}
              </Text>
            ) : null}

            <Button onClick={() => setConfirmOpen(false)} color="green">
              OK
            </Button>
          </Stack>
        ) : null}
      </Modal>

      {/* Header */}
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Group gap="xs">
            <Box
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "rgba(59,130,246,0.16)",
                border: "1px solid rgba(59,130,246,0.28)",
              }}
            >
              <IconChartCandle size={18} />
            </Box>

            <Title order={2}>Trading</Title>
            <Badge variant="light">PAPER</Badge>
            {statusBadge}
          </Group>

          <Text size="sm" c="dimmed">
            {symbol} • M1 (mock) • Spread {spread ?? "--"} • Feed: Fake WS • Hotkeys: B=Buy, S=Sell
          </Text>
        </Stack>

        <Group gap="xs">
          <Badge variant="light" leftSection={<IconBolt size={14} />}>
            TURBO
          </Badge>

          <Button
            variant="light"
            leftSection={<IconDashboard size={16} />}
            onClick={() =>
              notifications.show({
                title: "Analytics",
                message: "Next: open Analytics panel / route to dashboard analytics.",
              })
            }
          >
            Analytics
          </Button>

          <Button
            leftSection={risk.blocked ? <IconLock size={16} /> : <IconPlayerPlay size={16} />}
            color={risk.blocked ? "red" : "blue"}
            onClick={() =>
              notifications.show({
                title: "Trading Gate",
                message: risk.blocked ? "Blocked by risk rules." : "Gate open (mock).",
              })
            }
          >
            Gate
          </Button>
        </Group>
      </Group>

      {/* Symbol tabs */}
      <Group justify="space-between">
        <SegmentedControl
          value={symbol}
          onChange={(v) => setSymbol(v as SymbolName)}
          data={symbols.map((s) => ({ value: s, label: s }))}
        />

        <Group gap="xs">
          <Button variant="light" onClick={() => setShowLadder((v) => !v)}>
            {showLadder ? "Hide DOM" : "Show DOM"}
          </Button>
          <Button variant="light" onClick={() => setShowFootprint((v) => !v)}>
            {showFootprint ? "Hide Footprint" : "Show Footprint"}
          </Button>
        </Group>
      </Group>

      {/* KPI row */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Text size="sm" c="dimmed">Last</Text>
          <Title order={3}>
            {mounted ? last.toFixed(symbol === "XAUUSD" || symbol === "USDJPY" ? 2 : 4) : "--"}
          </Title>
          <Badge variant="light" color={chg >= 0 ? "green" : "red"} mt={6}>
            {mounted ? `${fmtSignedPct(chg)}% (mock)` : "--"}
          </Badge>
        </MotionCard>

        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Text size="sm" c="dimmed">Open P/L</Text>
          <Title order={3} c={mounted ? (openPL >= 0 ? "green" : "red") : "dimmed"} suppressHydrationWarning>
            {mounted ? `${openPL >= 0 ? "+" : "-"}$${Math.abs(openPL).toFixed(0)}` : "--"}
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            Mark-to-market (mock)
          </Text>
        </MotionCard>

        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Text size="sm" c="dimmed">Exposure Used</Text>
          <Title order={3}>{mounted ? `${riskSnap.exposureUsedPct.toFixed(0)}%` : "--"}</Title>
          <Badge variant="light" color={riskSnap.exposureUsedPct >= 80 ? "yellow" : "green"} mt={6}>
            {mounted ? (riskSnap.exposureUsedPct >= 80 ? "Near cap" : "OK") : "--"}
          </Badge>
        </MotionCard>

        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Text size="sm" c="dimmed">Daily Loss Used</Text>
          <Title order={3}>{mounted ? `${riskSnap.dailyLossUsedPct.toFixed(0)}%` : "--"}</Title>
          <Badge variant="light" color={riskSnap.dailyLossUsedPct >= 80 ? "yellow" : "green"} mt={6}>
            {mounted ? (riskSnap.dailyLossUsedPct >= 80 ? "Near limit" : "OK") : "--"}
          </Badge>
        </MotionCard>
      </SimpleGrid>

      {/* Main grid */}
      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        {/* Chart */}
        <MotionCard
          withBorder
          radius="lg"
          p="md"
          style={{ minWidth: 0, gridColumn: "span 2" as any, background: cardBg }}
          variants={cardAnim}
          initial="hidden"
          animate="show"
        >
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <Text fw={700}>Chart</Text>
              <Badge variant="light">{symbol}</Badge>
              <Badge variant="light">Realtime mock</Badge>

              {ticketPrice ? <Badge variant="outline">Limit @{ticketPrice}</Badge> : null}

              {/* ✅ show open position entry right at chart header */}
              {pos ? (
                <Badge variant="outline" color={pos.side === "BUY" ? "green" : "red"}>
                  POS {pos.side} {pos.lots.toFixed(2)} @ {formatPrice(pos.symbol as any, pos.entry)}
                </Badge>
              ) : null}
            </Group>

            <Group gap="xs">
              <Button size="xs" color="green" disabled={risk.blocked} onClick={() => doMarket("BUY")}>
                Market Buy
              </Button>
              <Button size="xs" color="red" disabled={risk.blocked} onClick={() => doMarket("SELL")}>
                Market Sell
              </Button>
            </Group>
          </Group>

          <Box
            style={{
              height: 520,
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
              background: "radial-gradient(1200px 600px at 10% 10%, rgba(59,130,246,0.12), transparent 55%)",
            }}
          >
            <TradingChart
              symbol={symbol}
              candles={candles}
              position={pos ?? null}
              rightBadges={
                <>
                  <Badge variant="light">Spread {spread ?? "--"}</Badge>
                  <Badge variant="light" color={risk.blocked ? "red" : "green"}>
                    {risk.blocked ? "BLOCKED" : "READY"}
                  </Badge>
                </>
              }
            />
          </Box>

          <Divider my="sm" />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Risk engine: {risk.status} {risk.reasons.length ? `• ${risk.reasons.join(" • ")}` : ""}
            </Text>

            <Badge variant="light" leftSection={<IconLayersLinked size={14} />}>
              Fake WS + Depth + Candles
            </Badge>
          </Group>
        </MotionCard>

        {/* Order Ticket */}
        <MotionCard
          withBorder
          radius="lg"
          p="md"
          style={{ minWidth: 0, background: cardBg }}
          variants={cardAnim}
          initial="hidden"
          animate="show"
        >
          <Group justify="space-between" mb="xs">
            <Text fw={700}>Order Ticket</Text>
            <Badge variant="light" color={risk.blocked ? "red" : "green"}>
              {risk.blocked ? "LOCKED" : "READY"}
            </Badge>
          </Group>

          <OrderPanel
            symbol={symbol as any}
            last={last}
            spread={spread}
            locked={risk.blocked}
            ticketPrice={ticketPrice}
            onSubmit={(draft: OrderDraft) => {
              if (risk.blocked) {
                notifications.show({ title: "Blocked", message: "Risk rules violation. Trading blocked.", color: "red" });
                return;
              }
              if (!tick?.last) return;

              const r = placeOrder(
                {
                  symbol: symbol as any,
                  side: draft.side,
                  type: draft.type,
                  lots: draft.lots,
                  limitPrice: draft.type === "LIMIT" ? (draft.limitPrice ?? undefined) : undefined,
                  slPips: draft.slPips,
                  tpPips: draft.tpPips,
                  comment: draft.comment,
                  riskPct: draft.riskPct,
                } as any,
                { tick: tick as any, spread }
              );

              if (r.ok) {
                notifications.show({
                  title: "Order accepted",
                  message: `#${r.order.id} • ${draft.type} ${draft.side} ${symbol}`,
                  color: draft.side === "BUY" ? "green" : "red",
                });

                openConfirm({
                  id: r.order.id,
                  sym: symbol,
                  side: r.order.side,
                  type: r.order.type,
                  lots: r.order.lots,
                  price: r.order.filledPrice ?? r.order.limitPrice,
                  sl: r.order.slPrice ?? null,
                  tp: r.order.tpPrice ?? null,
                  comment: r.order.comment,
                });
              } else {
                notifications.show({
                  title: "Order rejected",
                  message: r.reason,
                  color: "red",
                });
              }
            }}
          />

          <Divider my="sm" />
          <Text size="xs" c="dimmed">
            Tip: click price in DOM ladder → set limit price.
          </Text>
        </MotionCard>
      </SimpleGrid>

      {/* Bottom */}
      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Group justify="space-between" mb="xs">
            <Text fw={700}>Order Book</Text>
            <Badge variant="light">mock/feed</Badge>
          </Group>

          <OrderBook depth={depth as any} mid={(depth?.mid ?? tick?.last) ?? null} />
        </MotionCard>

        <MotionCard
          withBorder
          radius="lg"
          p="md"
          style={{ gridColumn: "span 2" as any, background: cardBg }}
          variants={cardAnim}
          initial="hidden"
          animate="show"
        >
          <Group justify="space-between" mb="xs">
            <Text fw={700}>Positions</Text>
            <Badge variant="light">live (demo)</Badge>
          </Group>
          <PositionsTable />
        </MotionCard>
      </SimpleGrid>

      {/* Docked analytics */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <FloatingPanel id="sizing" title="Position Sizing" badge="Matrix" defaultDocked={true}>
          <PositionSizingMatrix symbol={symbol} equity={riskSnap.equity} />
        </FloatingPanel>

        <FloatingPanel
          id="footprint"
          title="Orderflow"
          badge="Footprint"
          defaultDocked={true}
          onClose={showFootprint ? () => setShowFootprint(false) : undefined}
        >
          {showFootprint ? (
            <FootprintMock symbol={symbol} mid={depth?.mid ?? tick?.last ?? null} />
          ) : (
            <Text size="sm" c="dimmed">
              Footprint hidden.
            </Text>
          )}
        </FloatingPanel>
      </SimpleGrid>

      {/* DOM Ladder floating */}
      {showLadder ? (
        <FloatingPanel id="dom" title="Depth Ladder" badge="DOM" defaultDocked={false} onClose={() => setShowLadder(false)}>
          <DOMLadder
            symbol={symbol}
            depth={depth}
            onPriceClick={(p) => {
              setTicketPrice(p);
              notifications.show({ title: "Limit price set", message: `${symbol} limit price = ${p}` });
            }}
          />
        </FloatingPanel>
      ) : null}
    </Stack>
  );
}
