// pages/Portfolio.tsx
"use client";

import Web3WalletPanel from "@/components/Web3WalletPanel";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { motion, type HTMLMotionProps } from "framer-motion";
import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  type PaperProps,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBriefcase, IconDownload, IconTrendingUp } from "@tabler/icons-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Sector,
} from "recharts";

import type { SymbolName } from "@/lib/fakeFeed";
import { useI18n } from "@/lib/i18nProvider";

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
  hidden: { opacity: 0, y: 10, scale: 0.995 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22 } },
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fmtPrice(sym: SymbolName, n: number) {
  const dp = sym === "XAUUSD" || sym === "USDJPY" ? 2 : 5;
  return n.toFixed(dp);
}

/** ======= Allocation types ======= */
type AllocRow = { name: SymbolName; value: number }; // %
type Holding = {
  s: SymbolName;
  side: "LONG" | "SHORT";
  lots: number;
  entry: number;
  last: number;
  uPnL: number;
  exposurePct: number;
};
type Trade = {
  id: string;
  t: string;
  s: SymbolName;
  side: "BUY" | "SELL";
  lots: number;
  pnl: number;
};

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

/** ======= Bloom active shape (SVG glow) ======= */
function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  const rOut = outerRadius + 6;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 1}
        outerRadius={rOut}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.45}
        filter="url(#allocGlow)"
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 2}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={1.6}
      />
    </g>
  );
}

function AllocTooltip({
  active,
  payload,
  t,
}: {
  active?: boolean;
  payload?: any[];
  t: (k: string, vars?: Record<string, any>) => string;
}) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  const name = p?.name ?? "";
  const val = p?.value ?? 0;
  const color = p?.payload?.__color ?? "rgba(255,255,255,0.7)";

  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        background: "rgba(15,15,15,0.98)",
        border: "1px solid rgba(255,255,255,0.14)",
        backdropFilter: "blur(8px)",
        minWidth: 160,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      <Group justify="space-between" gap="xs" mb={6}>
        <Group gap={8}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: color,
              boxShadow: `0 0 12px ${color}`,
            }}
          />
          <Text fw={800} size="sm" style={{ color: "rgba(255,255,255,0.92)" }}>
            {name}
          </Text>
        </Group>
        <Badge variant="light">{val}%</Badge>
      </Group>
      <Text size="xs" style={{ color: "rgba(255,255,255,0.55)" }}>
        {t("portfolio.allocation_mock")}
      </Text>
    </div>
  );
}

export default function PortfolioPage() {
  const router = useRouter();
  const { t } = useI18n();

  const cardBg =
    "linear-gradient(180deg, rgba(18,18,18,0.78), rgba(18,18,18,0.62))";

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // deterministic random (TS-safe: initialValue required)
  const randRef = useRef<() => number>(mulberry32(13579));
  const rnd = (a: number, b: number) => a + randRef.current() * (b - a);

  const symbols: SymbolName[] = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY"];

  // ======= KPI (mock) =======
  const [equity, setEquity] = useState(25000);
  const [openPL, setOpenPL] = useState(0);
  const [todayPL, setTodayPL] = useState(0);
  const [usedPct, setUsedPct] = useState(57);

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      setOpenPL((p) => clamp(Math.round(p + rnd(-60, 60)), -1200, 1200));
      setTodayPL((p) => clamp(Math.round(p + rnd(-25, 25)), -800, 800));
      setEquity((e) => clamp(Math.round(e + rnd(-90, 110)), 23000, 28000));
      setUsedPct((u) => clamp(Math.round(u + rnd(-2.2, 2.2)), 5, 98));
    }, 950);
    return () => clearInterval(id);
  }, [mounted]);

  const fmtMoney = (n: number) =>
    "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const fmtSignedMoney = (n: number) =>
    (n >= 0 ? "+" : "-") +
    "$" +
    Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  // ======= Allocation =======
  const allocation: AllocRow[] = useMemo(
    () => [
      { name: "XAUUSD", value: 36 },
      { name: "EURUSD", value: 22 },
      { name: "GBPUSD", value: 18 },
      { name: "USDJPY", value: 24 },
    ],
    []
  );

  const allocationWithColor = useMemo(
    () =>
      allocation.map((x, i) => ({
        ...x,
        __color: PIE_COLORS[i % PIE_COLORS.length],
      })),
    [allocation]
  );

  // ✅ FIX activeIndex: use -1 as “none”, do NOT use undefined
  const [activeAlloc, setActiveAlloc] = useState<number>(-1);

  // ======= Daily P/L bars =======
  const [dailyPnL, setDailyPnL] = useState<{ t: string; p: number }[]>([
    { t: "Mon", p: 120 },
    { t: "Tue", p: 80 },
    { t: "Wed", p: -180 },
    { t: "Thu", p: 260 },
    { t: "Fri", p: -40 },
  ]);

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      setDailyPnL((prev) => {
        const next = [...prev];
        const i = next.length - 1;
        next[i] = {
          ...next[i],
          p: clamp(Math.round(next[i].p + rnd(-35, 35)), -300, 300),
        };
        return next;
      });
    }, 1100);
    return () => clearInterval(id);
  }, [mounted]);

  // ======= Equity curve =======
  const [eqCurve, setEqCurve] = useState<{ t: string; v: number }[]>([
    { t: "Mon", v: 25000 },
    { t: "Tue", v: 25850 },
    { t: "Wed", v: 24600 },
    { t: "Thu", v: 26200 },
    { t: "Fri", v: 24990 },
  ]);

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      setEqCurve((prev) => {
        const next = prev.slice(1);
        const last = prev[prev.length - 1]?.v ?? 25000;
        const spike = Math.random() < 0.18 ? rnd(-800, 800) : 0;
        const v = clamp(Math.round(last + rnd(-260, 320) + spike), 23000, 27500);
        next.push({ t: "Now", v });
        return next;
      });
    }, 950);
    return () => clearInterval(id);
  }, [mounted]);

  // ======= Holdings table =======
  const [holdings, setHoldings] = useState<Holding[]>(() => [
    { s: "XAUUSD", side: "LONG", lots: 0.45, entry: 2030.2, last: 2031.4, uPnL: 210, exposurePct: 36 },
    { s: "EURUSD", side: "SHORT", lots: 1.1, entry: 1.0835, last: 1.0832, uPnL: 55, exposurePct: 22 },
    { s: "GBPUSD", side: "LONG", lots: 0.8, entry: 1.2664, last: 1.2671, uPnL: 38, exposurePct: 18 },
    { s: "USDJPY", side: "SHORT", lots: 0.6, entry: 148.6, last: 148.52, uPnL: 75, exposurePct: 24 },
  ]);

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      setHoldings((prev) =>
        prev.map((h) => {
          const step =
            (Math.random() - 0.5) *
            (h.s === "XAUUSD" ? 0.45 : h.s === "USDJPY" ? 0.03 : 0.0006);
          const last = +(h.last + step).toFixed(h.s === "XAUUSD" || h.s === "USDJPY" ? 2 : 5);
          const dir = h.side === "LONG" ? 1 : -1;
          const uPnL = clamp(Math.round(h.uPnL + dir * rnd(-25, 25)), -900, 900);
          return { ...h, last, uPnL };
        })
      );
    }, 800);
    return () => clearInterval(id);
  }, [mounted]);

  // ======= Recent trades =======
  const [trades, setTrades] = useState<Trade[]>(() => [
    { id: "T1201", t: "09:58", s: "XAUUSD", side: "BUY", lots: 0.25, pnl: 42 },
    { id: "T1202", t: "09:49", s: "EURUSD", side: "SELL", lots: 0.8, pnl: -18 },
    { id: "T1203", t: "09:40", s: "USDJPY", side: "SELL", lots: 0.4, pnl: 26 },
    { id: "T1204", t: "09:31", s: "GBPUSD", side: "BUY", lots: 0.6, pnl: 15 },
  ]);

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      const s = symbols[Math.floor(rnd(0, symbols.length))];
      const side = Math.random() > 0.5 ? "BUY" : "SELL";
      const lots = +rnd(0.1, 1.2).toFixed(2);
      const pnl = Math.round(rnd(-120, 180));
      const row: Trade = {
        id: `T${Math.floor(1000 + Math.random() * 9000)}`,
        t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        s,
        side,
        lots,
        pnl,
      };
      setTrades((prev) => [row, ...prev].slice(0, 8));
    }, 5200);
    return () => clearInterval(id);
  }, [mounted]);

  const goTrade = (s: SymbolName) =>
    router.push(`/trading?symbol=${encodeURIComponent(s)}`);

  return (
    <Stack gap="md">
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
              <IconBriefcase size={18} />
            </Box>

            <Title order={2}>{t("portfolio.title")}</Title>
            <Badge variant="light">{t("portfolio.realtime_mock")}</Badge>
            <Badge variant="light" leftSection={<IconTrendingUp size={14} />}>
              {t("portfolio.badge.bloom_pro")}
            </Badge>
          </Group>

          <Text size="sm" c="dimmed">
            {t("portfolio.subtitle")}
          </Text>
        </Stack>

        <Group gap="xs">
          <Button
            variant="light"
            leftSection={<IconDownload size={16} />}
            onClick={() =>
              notifications.show({
                title: t("portfolio.export_toast_title"),
                message: t("portfolio.export_toast_msg"),
              })
            }
          >
            {t("portfolio.export")}
          </Button>

          <Button
            onClick={() => goTrade("XAUUSD")}
            styles={{ root: { background: "rgba(59,130,246,0.90)" } }}
          >
            {t("portfolio.trade_xauusd")}
          </Button>
        </Group>
      </Group>

      {/* KPI row (Equity vẫn ở đây ✅) */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <MotionCard
          withBorder
          radius="lg"
          p="md"
          variants={cardAnim}
          initial="hidden"
          animate="show"
          style={{ background: cardBg }}
        >
          <Text size="sm" c="dimmed">
            {t("portfolio.kpi.equity")}
          </Text>
          <Title order={3}>{mounted ? fmtMoney(equity) : "--"}</Title>
          <Text size="sm" c="dimmed" mt={6}>
            {t("portfolio.kpi.live_account_value")}
          </Text>
        </MotionCard>

        <MotionCard
          withBorder
          radius="lg"
          p="md"
          variants={cardAnim}
          initial="hidden"
          animate="show"
          style={{ background: cardBg }}
        >
          <Text size="sm" c="dimmed">
            {t("portfolio.kpi.open_pl")}
          </Text>
          <Title order={3} c={mounted ? (openPL >= 0 ? "green" : "red") : "dimmed"}>
            {mounted ? fmtSignedMoney(openPL) : "--"}
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            {t("portfolio.kpi.unrealized")}
          </Text>
        </MotionCard>

        <MotionCard
          withBorder
          radius="lg"
          p="md"
          variants={cardAnim}
          initial="hidden"
          animate="show"
          style={{ background: cardBg }}
        >
          <Text size="sm" c="dimmed">
            {t("portfolio.kpi.today_pl")}
          </Text>
          <Title order={3} c={mounted ? (todayPL >= 0 ? "green" : "red") : "dimmed"}>
            {mounted ? fmtSignedMoney(todayPL) : "--"}
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            {t("portfolio.kpi.intraday")}
          </Text>
        </MotionCard>

        <MotionCard
          withBorder
          radius="lg"
          p="md"
          variants={cardAnim}
          initial="hidden"
          animate="show"
          style={{ background: cardBg }}
        >
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="sm" c="dimmed">
                {t("portfolio.kpi.exposure_used")}
              </Text>
              <Title order={3}>{mounted ? `${usedPct}%` : "--"}</Title>
            </div>
            <Badge variant="light">
              {mounted ? (t as any)("portfolio.kpi.used_badge", { pct: usedPct }) : "--"}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" mt={6}>
            {t("portfolio.kpi.portfolio_cap")}
          </Text>
        </MotionCard>
      </SimpleGrid>

      {/* Allocation + Performance */}
      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
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
              <Text fw={800}>{t("portfolio.allocation")}</Text>
              <Badge variant="light">
                {mounted ? (t as any)("portfolio.kpi.used_badge", { pct: usedPct }) : "--"}
              </Badge>
            </Group>
            <Badge variant="light">{t("portfolio.badge.bloom_glow")}</Badge>
          </Group>

          <div
            style={{
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
              padding: 14,
            }}
          >
            <div style={{ height: 260, minHeight: 260, width: "100%", minWidth: 0 }}>
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <filter id="allocGlow" x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    <Pie
                      data={allocationWithColor as any}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={2}
                      stroke="rgba(255,255,255,0.10)"
                      strokeWidth={1}
                      {...({
                        activeIndex: typeof activeAlloc === "number" ? activeAlloc : -1,
                        activeShape: renderActiveShape,
                        onMouseEnter: (_: any, idx: number) => setActiveAlloc(idx),
                        onMouseLeave: () => setActiveAlloc(-1),
                        isAnimationActive: true,
                        animationDuration: 420,
                      } as any)}
                    >
                      {(allocationWithColor as any[]).map((_, i) => {
                        const isActive = i === activeAlloc;
                        const c = PIE_COLORS[i % PIE_COLORS.length];

                        return (
                          <Cell
                            key={`cell-${i}`}
                            fill={c}
                            stroke={
                              isActive
                                ? "rgba(255,255,255,0.9)"
                                : "rgba(255,255,255,0.12)"
                            }
                            strokeWidth={isActive ? 1.6 : 1}
                            style={{
                              cursor: "pointer",
                              filter: isActive
                                ? `drop-shadow(0px 0px 12px ${c}) brightness(1.12)`
                                : "none",
                              transition: "filter 140ms ease, stroke-width 140ms ease",
                            }}
                          />
                        );
                      })}
                    </Pie>

                    <Tooltip content={<AllocTooltip t={t} />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: "100%" }} />
              )}
            </div>

            <Divider my="sm" />

            <Stack gap={8}>
              {allocationWithColor.map((x, i) => {
                const c = PIE_COLORS[i % PIE_COLORS.length];
                const isActive = i === activeAlloc;
                return (
                  <Group
                    key={x.name}
                    justify="space-between"
                    onMouseEnter={() => setActiveAlloc(i)}
                    onMouseLeave={() => setActiveAlloc(-1)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                      cursor: "pointer",
                      transition: "background 140ms ease",
                    }}
                  >
                    <Group gap={10}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: c,
                          boxShadow: isActive ? `0 0 12px ${c}` : "none",
                          transition: "box-shadow 140ms ease",
                        }}
                      />
                      <Text size="sm" c="dimmed">
                        {x.name}
                      </Text>
                    </Group>
                    <Text size="sm" fw={800}>
                      {x.value}%
                    </Text>
                  </Group>
                );
              })}
            </Stack>
          </div>
        </MotionCard>

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
            <Text fw={800}>{t("portfolio.performance")}</Text>
            <Badge variant="light">{t("portfolio.performance_realtime")}</Badge>
          </Group>

          <Text size="sm" c="dimmed">
            {t("portfolio.equity_curve")}
          </Text>

          <div style={{ height: 180, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={eqCurve} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                <XAxis dataKey="t" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,15,15,0.98)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    backdropFilter: "blur(8px)",
                  }}
                />
                <Area type="monotone" dataKey="v" strokeWidth={2} fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <Divider my="sm" />

          <Text size="sm" c="dimmed" mb={6}>
            {t("portfolio.daily_pl")}
          </Text>

          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyPnL} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                <XAxis dataKey="t" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,15,15,0.98)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    backdropFilter: "blur(8px)",
                  }}
                />
                <Bar dataKey="p">
                  {dailyPnL.map((x, i) => (
                    <Cell key={i} fill={x.p >= 0 ? "rgba(16,185,129,0.9)" : "rgba(239,68,68,0.9)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Text size="xs" c="dimmed" mt="sm">
            {t("portfolio.tip_alloc_hover")}
          </Text>
        </MotionCard>
      </SimpleGrid>

      {/* Holdings + Trades + Web3 Wallet */}
      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        {/* Holdings (2 cols) */}
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
            <Text fw={800}>{t("portfolio.holdings")}</Text>
            <Badge variant="light">{t("portfolio.holdings_live_mock")}</Badge>
          </Group>

          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("portfolio.table.symbol")}</Table.Th>
                <Table.Th>{t("portfolio.table.side")}</Table.Th>
                <Table.Th>{t("portfolio.table.lots")}</Table.Th>
                <Table.Th>{t("portfolio.table.entry")}</Table.Th>
                <Table.Th>{t("portfolio.table.last")}</Table.Th>
                <Table.Th>{t("portfolio.table.pl")}</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>{t("portfolio.table.action")}</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {holdings.map((h) => (
                <Table.Tr
                  key={h.s}
                  style={{ cursor: "pointer" }}
                  onDoubleClick={() => goTrade(h.s)}
                >
                  <Table.Td>
                    <Text fw={900}>{h.s}</Text>
                    <Text size="xs" c="dimmed">
                      {(t as any)("portfolio.exposure", { pct: h.exposurePct })}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Badge variant="light" color={h.side === "LONG" ? "green" : "blue"}>
                      {h.side}
                    </Badge>
                  </Table.Td>

                  <Table.Td>{h.lots}</Table.Td>
                  <Table.Td>{fmtPrice(h.s, h.entry)}</Table.Td>
                  <Table.Td>{fmtPrice(h.s, h.last)}</Table.Td>

                  <Table.Td style={{ color: h.uPnL >= 0 ? "lime" : "red", fontWeight: 800 }}>
                    {h.uPnL >= 0 ? "+" : ""}
                    {h.uPnL}
                  </Table.Td>

                  <Table.Td style={{ textAlign: "right" }}>
                    <Button
                      size="xs"
                      variant="light"
                      onClick={(e) => {
                        e.stopPropagation();
                        goTrade(h.s);
                      }}
                    >
                      {t("common.trade")}
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Text size="xs" c="dimmed" mt="sm">
            {t("portfolio.double_click_trade")}
          </Text>
        </MotionCard>

        {/* Right column: Web3 Wallet Panel */}
        <div style={{ minWidth: 0 }}>
          <Web3WalletPanel />
          <Divider my="md" />

          <MotionCard
            withBorder
            radius="lg"
            p="md"
            variants={cardAnim}
            initial="hidden"
            animate="show"
            style={{ background: cardBg }}
          >
            <Group justify="space-between" mb="xs">
              <Text fw={800}>{t("portfolio.recent_trades")}</Text>
              <Badge variant="light">{t("portfolio.last_8")}</Badge>
            </Group>

            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t("portfolio.table.time")}</Table.Th>
                  <Table.Th>{t("portfolio.table.sym")}</Table.Th>
                  <Table.Th>{t("portfolio.table.side")}</Table.Th>
                  <Table.Th>{t("portfolio.table.lots")}</Table.Th>
                  <Table.Th>{t("portfolio.table.pl")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {trades.map((tt) => (
                  <Table.Tr key={tt.id}>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {tt.t}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={800}>{tt.s}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={tt.side === "BUY" ? "green" : "blue"}>
                        {tt.side}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{tt.lots}</Table.Td>
                    <Table.Td style={{ color: tt.pnl >= 0 ? "lime" : "red", fontWeight: 800 }}>
                      {tt.pnl >= 0 ? "+" : ""}
                      {tt.pnl}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Divider my="sm" />

            <Button
              fullWidth
              variant="light"
              onClick={() =>
                notifications.show({
                  title: t("portfolio.journal_toast_title"),
                  message: t("portfolio.journal_toast_msg"),
                })
              }
            >
              {t("portfolio.open_journal")}
            </Button>
          </MotionCard>
        </div>
      </SimpleGrid>
    </Stack>
  );
}