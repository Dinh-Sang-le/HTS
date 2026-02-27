// frontend/pages/trading.tsx
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
  IconLock,
  IconPlayerPlay,
} from "@tabler/icons-react";

import type { SymbolName } from "@/lib/fakeFeed";
import { useFeed } from "@/lib/useFeed";
import { evaluateRisk } from "@/lib/riskRules";
import { useTradeEngine } from "@/lib/useTradeEngine";
import { useTradeStore, type SavedOrder } from "@/lib/tradeStore";
import { formatPrice } from "@/lib/symbolSpecs";

import FloatingPanel from "@/components/FloatingPanel";
import DOMLadder from "@/components/DOMLadder";
import FootprintMock from "@/components/FootprintMock";
import PositionSizingMatrix from "@/components/PositionSizingMatrix";

import OrderPanel, { type OrderDraft } from "@/components/OrderPanel";
import OrderBook from "@/components/OrderBook";
import PositionsTable from "@/components/PositionsTable";

import { useI18n } from "@/lib/i18nProvider";

// ✅ PATCH: give dynamic component a stable typed signature (prevents “red underline” JSX inference issues)
import type { TradingChartProps } from "@/components/TradingChart";

// Chart SSR off
const TradingChart = dynamic<TradingChartProps>(
  () => import("@/components/TradingChart").then((m) => m.default),
  {
    ssr: false,
    loading: () => <div style={{ height: "100%", width: "100%" }} />,
  }
);

/* ===================== i18n helpers ===================== */

function fmtVars(s: string, vars?: Record<string, any>) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

/* ===================== Motion wrapper ===================== */

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
  const { t } = useI18n();
  const tFmt = (key: string, vars?: Record<string, any>) => fmtVars(t(key), vars);

  const symbols: SymbolName[] = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY"];
  const [symbol, setSymbol] = useState<SymbolName>("XAUUSD");

  const { tick, depth, candles, spread, mounted } = useFeed(symbol);

  // OMS engine
  useTradeEngine(symbol as any, tick as any, spread);

  const placeOrder = useTradeStore((s) => s.placeOrder);
  const getOpenPosition = useTradeStore((s) => s.getOpenPosition);
  const orders = useTradeStore((s) => s.orders);
  const clearOrders = useTradeStore((s) => s.clearOrders);
  const hasHydrated = useTradeStore((s) => s.hasHydrated);

  const pos = getOpenPosition(symbol);

  const fills = useTradeStore((s) => s.fills);
  const fillsForSymbol = useMemo(() => fills.filter((f) => f.symbol === symbol), [fills, symbol]);

  const positions = useTradeStore((s) => s.positions);

  // ✅ PATCH: normalize data for chart rendering (NO logic change, only shape)
  const candlesSafe = useMemo(() => candles ?? [], [candles]);

  const positionsArr = useMemo(() => {
    // store positions is usually Record<id, Position> -> chart wants Position[]
    return Object.values(positions || {}).filter(Boolean) as any[];
  }, [positions]);

  const positionsForSymbol = useMemo(() => {
    return positionsArr.filter((p) => p.symbol === symbol);
  }, [positionsArr, symbol]);

  // confirm modal
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

  // risk snapshot mock
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
    if (risk.status === "VIOLATION")
      return (
        <Badge color="red" variant="light">
          {t("trading.risk.violation")}
        </Badge>
      );
    if (risk.status === "AT_RISK")
      return (
        <Badge color="yellow" variant="light">
          {t("trading.risk.at_risk")}
        </Badge>
      );
    return (
      <Badge color="green" variant="light">
        {t("trading.risk.compliant")}
      </Badge>
    );
  }, [risk.status, t]);

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

  const cardBg = "linear-gradient(180deg, rgba(18,18,18,0.78), rgba(18,18,18,0.62))";

  function doMarket(side: "BUY" | "SELL") {
    if (risk.blocked) {
      notifications.show({
        title: t("trading.toast.blocked_title"),
        message: t("trading.toast.blocked_msg"),
        color: "red",
      });
      return;
    }
    if (!tick?.last) return;

    const r = placeOrder(
      { symbol, side, type: "MARKET", lots: 0.1, slPips: null, tpPips: null, comment: "Market" } as any,
      { tick: tick as any, spread }
    );

    if (r.ok) {
      notifications.show({
        title: t("trading.toast.order_placed_title"),
        message: tFmt("trading.toast.order_placed_msg", { symbol, side, id: r.order.id }),
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
      notifications.show({ title: t("trading.toast.rejected_title"), message: r.reason, color: "red" });
    }
  }

  const recentOrders: SavedOrder[] = useMemo(() => orders.slice(0, 10), [orders]);

  return (
    <Stack gap="md">
      {/* Confirm Modal */}
      <Modal opened={confirmOpen} onClose={() => setConfirmOpen(false)} title={t("trading.modal.confirmed_title")} centered>
        {lastPlaced ? (
          <Stack gap="xs">
            <Text fw={800}>#{lastPlaced.id}</Text>
            <Text size="sm" c="dimmed">
              {tFmt("trading.modal.summary", {
                sym: lastPlaced.sym,
                type: lastPlaced.type,
                side: lastPlaced.side,
                lots: lastPlaced.lots,
              })}
            </Text>

            <Text size="sm">
              {t("trading.modal.price")}:{" "}
              <b>{lastPlaced.price ? formatPrice(lastPlaced.sym as any, lastPlaced.price) : "--"}</b>
            </Text>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {t("trading.modal.sl")}
              </Text>
              <Text size="sm">{lastPlaced.sl ? formatPrice(lastPlaced.sym as any, lastPlaced.sl) : "--"}</Text>
            </Group>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {t("trading.modal.tp")}
              </Text>
              <Text size="sm">{lastPlaced.tp ? formatPrice(lastPlaced.sym as any, lastPlaced.tp) : "--"}</Text>
            </Group>

            {lastPlaced.comment ? (
              <Text size="sm" c="dimmed">
                {tFmt("trading.modal.note", { note: lastPlaced.comment })}
              </Text>
            ) : null}

            <Button onClick={() => setConfirmOpen(false)} color="green">
              {t("trading.modal.ok")}
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

            <Title order={2}>{t("trading.title")}</Title>
            <Badge variant="light">{t("trading.badge.paper")}</Badge>
            {statusBadge}
          </Group>

          <Text size="sm" c="dimmed">
            {tFmt("trading.subtitle", {
              symbol,
              spread: spread ?? "--",
            })}
          </Text>
        </Stack>

        <Group gap="xs">
          <Badge variant="light" leftSection={<IconBolt size={14} />}>
            {t("trading.badge.turbo")}
          </Badge>

          <Button
            variant="light"
            leftSection={<IconDashboard size={16} />}
            onClick={() =>
              notifications.show({
                title: t("trading.toast.analytics_title"),
                message: t("trading.toast.analytics_msg"),
              })
            }
          >
            {t("trading.btn.analytics")}
          </Button>

          <Button
            leftSection={risk.blocked ? <IconLock size={16} /> : <IconPlayerPlay size={16} />}
            color={risk.blocked ? "red" : "blue"}
            onClick={() =>
              notifications.show({
                title: t("trading.toast.gate_title"),
                message: risk.blocked ? t("trading.toast.gate_blocked") : t("trading.toast.gate_open"),
              })
            }
          >
            {t("trading.btn.gate")}
          </Button>
        </Group>
      </Group>

      {/* Symbol tabs */}
      <Group justify="space-between">
        <SegmentedControl value={symbol} onChange={(v) => setSymbol(v as SymbolName)} data={symbols.map((s) => ({ value: s, label: s }))} />

        <Group gap="xs">
          <Button variant="light" onClick={() => setShowLadder((v) => !v)}>
            {showLadder ? t("trading.btn.hide_dom") : t("trading.btn.show_dom")}
          </Button>
          <Button variant="light" onClick={() => setShowFootprint((v) => !v)}>
            {showFootprint ? t("trading.btn.hide_footprint") : t("trading.btn.show_footprint")}
          </Button>
        </Group>
      </Group>

      {/* KPI row */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Text size="sm" c="dimmed">
            {t("trading.kpi.last")}
          </Text>
          <Title order={3}>{mounted ? last.toFixed(symbol === "XAUUSD" || symbol === "USDJPY" ? 2 : 4) : "--"}</Title>
          <Badge variant="light" color={chg >= 0 ? "green" : "red"} mt={6}>
            {mounted ? `${fmtSignedPct(chg)}% (mock)` : "--"}
          </Badge>
        </MotionCard>

        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Text size="sm" c="dimmed">
            {t("trading.kpi.open_pl")}
          </Text>
          <Title order={3} c={mounted ? (openPL >= 0 ? "green" : "red") : "dimmed"} suppressHydrationWarning>
            {mounted ? `${openPL >= 0 ? "+" : "-"}$${Math.abs(openPL).toFixed(0)}` : "--"}
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            {t("trading.kpi.mtm_mock")}
          </Text>
        </MotionCard>

        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Text size="sm" c="dimmed">
            {t("trading.kpi.exposure_used")}
          </Text>
          <Title order={3}>{mounted ? `${riskSnap.exposureUsedPct.toFixed(0)}%` : "--"}</Title>
          <Badge variant="light" color={riskSnap.exposureUsedPct >= 80 ? "yellow" : "green"} mt={6}>
            {mounted ? (riskSnap.exposureUsedPct >= 80 ? t("trading.kpi.near_cap") : t("trading.kpi.ok")) : "--"}
          </Badge>
        </MotionCard>

        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Text size="sm" c="dimmed">
            {t("trading.kpi.daily_loss_used")}
          </Text>
          <Title order={3}>{mounted ? `${riskSnap.dailyLossUsedPct.toFixed(0)}%` : "--"}</Title>
          <Badge variant="light" color={riskSnap.dailyLossUsedPct >= 80 ? "yellow" : "green"} mt={6}>
            {mounted ? (riskSnap.dailyLossUsedPct >= 80 ? t("trading.kpi.near_limit") : t("trading.kpi.ok")) : "--"}
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
              <Text fw={700}>{t("trading.chart.title")}</Text>
              <Badge variant="light">{symbol}</Badge>
              <Badge variant="light">{t("trading.badge.realtime_mock")}</Badge>

              {ticketPrice ? <Badge variant="outline">{tFmt("trading.badge.limit_at", { price: ticketPrice })}</Badge> : null}

              {hasHydrated && pos ? (
                <Badge variant="outline" color={pos.side === "BUY" ? "green" : "red"}>
                  {tFmt("trading.badge.position", {
                    side: pos.side,
                    lots: pos.lots.toFixed(2),
                    entry: formatPrice(pos.symbol as any, pos.entry),
                  })}
                </Badge>
              ) : null}
            </Group>

            <Group gap="xs">
              <Button size="xs" color="green" disabled={risk.blocked} onClick={() => doMarket("BUY")}>
                {t("trading.btn.market_buy")}
              </Button>
              <Button size="xs" color="red" disabled={risk.blocked} onClick={() => doMarket("SELL")}>
                {t("trading.btn.market_sell")}
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
              candles={candlesSafe}
              position={pos ?? null}
              positions={positionsForSymbol}
              fills={fillsForSymbol}
              rightBadges={
                <>
                  <Badge variant="light">
                    {t("trading.spread")} {spread ?? "--"}
                  </Badge>
                  <Badge variant="light" color={risk.blocked ? "red" : "green"}>
                    {risk.blocked ? t("trading.state.blocked") : t("trading.state.ready")}
                  </Badge>
                </>
              }
            />
          </Box>

          <Divider my="sm" />
        </MotionCard>

        {/* Order Ticket */}
        <MotionCard withBorder radius="lg" p="md" style={{ minWidth: 0, background: cardBg }} variants={cardAnim} initial="hidden" animate="show">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{t("trading.ticket.title")}</Text>
            <Badge variant="light" color={risk.blocked ? "red" : "green"}>
              {risk.blocked ? t("trading.ticket.locked") : t("trading.ticket.ready")}
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
                notifications.show({
                  title: t("trading.toast.blocked_title"),
                  message: t("trading.toast.blocked_msg"),
                  color: "red",
                });
                return;
              }
              if (!tick?.last) return;

              const r = placeOrder(
                {
                  symbol,
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
                  title: t("trading.toast.order_accepted_title"),
                  message: tFmt("trading.toast.order_accepted_msg", {
                    id: r.order.id,
                    type: draft.type,
                    side: draft.side,
                    symbol,
                  }),
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
                  title: t("trading.toast.order_rejected_title"),
                  message: r.reason,
                  color: "red",
                });
              }
            }}
          />

          <Divider my="sm" />
          <Text size="xs" c="dimmed">
            {t("trading.ticket.tip_dom_click")}
          </Text>
        </MotionCard>
      </SimpleGrid>

      {/* Bottom */}
      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{t("trading.orderbook.title")}</Text>
            <Badge variant="light">{t("trading.orderbook.badge")}</Badge>
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
            <Badge variant="light">{t("trading.positions.badge_live")}</Badge>
          </Group>
          <PositionsTable />
        </MotionCard>
      </SimpleGrid>

      {/* Order History */}
      <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <Text fw={700}>{t("trading.history.title")}</Text>
            <Badge variant="light">{tFmt("trading.history.badge_orders", { n: orders.length })}</Badge>
          </Group>
          <Group gap="xs">
            <Button size="xs" variant="light" onClick={() => clearOrders()}>
              {t("trading.history.clear")}
            </Button>
          </Group>
        </Group>

        <Stack gap="xs">
          {recentOrders.map((o) => (
            <Group
              key={o.id}
              justify="space-between"
              style={{
                padding: "10px 10px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div>
                <Text fw={800} size="sm">
                  #{o.id}
                </Text>
                <Text size="xs" c="dimmed">
                  {tFmt("trading.history.row_summary", {
                    sym: o.sym,
                    type: o.type,
                    side: o.side,
                    lots: o.lots,
                  })}
                  {o.type === "LIMIT" && o.limitPrice != null
                    ? ` • ${t("trading.history.lmt")} ${formatPrice(o.sym as any, o.limitPrice)}`
                    : ""}
                </Text>
              </div>

              <Badge variant="light" color={o.side === "BUY" ? "green" : "red"}>
                {o.price != null ? formatPrice(o.sym as any, o.price) : "--"}
              </Badge>
            </Group>
          ))}

          {!orders.length ? (
            <Text size="sm" c="dimmed">
              {t("trading.history.empty")}
            </Text>
          ) : null}
        </Stack>
      </MotionCard>

      {/* Docked analytics */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <FloatingPanel id="sizing" title={t("trading.fp.sizing_title")} badge={t("trading.fp.sizing_badge")} defaultDocked={true}>
          <PositionSizingMatrix symbol={symbol} equity={riskSnap.equity} />
        </FloatingPanel>

        <FloatingPanel
          id="footprint"
          title={t("trading.fp.orderflow_title")}
          badge={t("trading.fp.orderflow_badge")}
          defaultDocked={true}
          onClose={showFootprint ? () => setShowFootprint(false) : undefined}
        >
          {showFootprint ? (
            <FootprintMock symbol={symbol} mid={depth?.mid ?? tick?.last ?? null} />
          ) : (
            <Text size="sm" c="dimmed">
              {t("trading.fp.footprint_hidden")}
            </Text>
          )}
        </FloatingPanel>
      </SimpleGrid>

      {/* DOM Ladder */}
      {showLadder ? (
        <FloatingPanel
          id="dom"
          title={t("trading.fp.dom_title")}
          badge={t("trading.fp.dom_badge")}
          defaultDocked={false}
          onClose={() => setShowLadder(false)}
        >
          <DOMLadder
            symbol={symbol}
            depth={depth}
            onPriceClick={(p) => {
              setTicketPrice(p);
              notifications.show({
                title: t("trading.toast.limit_set_title"),
                message: tFmt("trading.toast.limit_set_msg", { symbol, price: p }),
              });
            }}
          />
        </FloatingPanel>
      ) : null}
    </Stack>
  );
}