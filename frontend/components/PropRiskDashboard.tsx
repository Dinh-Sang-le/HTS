"use client";

import { useEffect, useMemo, useState } from "react";
import { Divider } from "@mantine/core";
import { PieChart, Pie, Cell } from "recharts";
import { RingProgress } from "@mantine/core";
import {
  Badge,
  Button,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  FileCheck2,
  PlayCircle,
  Scale,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { RuleStatus, usePropRiskMock } from "@/lib/usePropRiskMock";
import { useI18n } from "@/lib/i18nProvider";

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

function statusKey(s: RuleStatus) {
  if (s === "PASS") return "status.pass";
  if (s === "WARN") return "status.warn";
  return "status.fail";
}

function StatusBadge({ s }: { s: RuleStatus }) {
  const { t } = useI18n();
  if (s === "PASS") return <Badge color="green" variant="light">{t(statusKey(s))}</Badge>;
  if (s === "WARN") return <Badge color="yellow" variant="light">{t(statusKey(s))}</Badge>;
  return <Badge color="red" variant="light">{t(statusKey(s))}</Badge>;
}

function RiskBar({
  labelKey,
  used,
  limit,
  unit,
  warnAt = 70,
  dangerAt = 90,
}: {
  labelKey: string;
  used: number;
  limit: number;
  unit: string;
  warnAt?: number;
  dangerAt?: number;
}) {
  const { t } = useI18n();
  const pct = Math.max(0, Math.min(100, (used / limit) * 100));
  const color = pct >= dangerAt ? "red" : pct >= warnAt ? "yellow" : "green";
  return (
    <div>
      <Group justify="space-between" mb={6}>
        <Text size="sm" c="dimmed">{t(labelKey)}</Text>
        <Text size="sm" fw={700}>
          {used.toFixed(2)}{unit} / {limit.toFixed(2)}{unit}
        </Text>
      </Group>
      <Progress value={pct} color={color} />
      <Text size="xs" c="dimmed" mt={6}>
        {t("risk.usage")}: {pct.toFixed(0)}%
      </Text>
    </div>
  );
}

function overallKey(label: string) {
  if (label === "VIOLATION") return "overall.violation";
  if (label === "AT RISK") return "overall.at_risk";
  if (label === "COMPLIANT") return "overall.compliant";
  return "overall.unknown";
}

export function PropRiskDashboard() {
  const { t } = useI18n();

  const {
    account,
    equity,
    openPL,
    pnlTodayPct,
    ddUsed$,
    ddUsedPctOfLimit,
    maxDDLimit$,
    todayLoss$,
    dailyUsedPct,
    dailyLossLimit$,
    exposureUsedPct,
    consistencyUsedPct,
    rules,
    overallStatus,
  } = usePropRiskMock();

  const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

  function mulberry32(seed: number) {
    return function () {
      let t0 = (seed += 0x6d2b79f5);
      t0 = Math.imul(t0 ^ (t0 >>> 15), t0 | 1);
      t0 ^= t0 + Math.imul(t0 ^ (t0 >>> 7), t0 | 61);
      return ((t0 ^ (t0 >>> 14)) >>> 0) / 4294967296;
    };
  }

  const [rand] = useState(() => mulberry32(1337));
  const rnd = (a: number, b: number) => a + rand() * (b - a);

  // ===== i18n helpers for days/sessions =====
  type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "now";
  const dayLabel = (k: string) => t(`day.${k}`);

  // ===== DEMO: chart data (realtime mock) =====
  const [demoEquity, setDemoEquity] = useState<{ t: DayKey; v: number }[]>([
    { t: "mon", v: 25000 },
    { t: "tue", v: 25850 },
    { t: "wed", v: 24600 },
    { t: "thu", v: 26200 },
    { t: "fri", v: 24990 },
  ]);

  const [demoPnL, setDemoPnL] = useState<{ t: DayKey; p: number }[]>([
    { t: "mon", p: 120 },
    { t: "tue", p: 80 },
    { t: "wed", p: -180 },
    { t: "thu", p: 260 },
    { t: "fri", p: -40 },
  ]);

  // ===== Session performance + heatmap (mock) =====
  type SessionKey = "asia" | "london" | "ny";
  type SessionRow = { session: SessionKey; pnl: number; win: number; trades: number };

  const sessions: SessionRow[] = useMemo(
    () => [
      { session: "asia", pnl: 185, win: 56, trades: 18 },
      { session: "london", pnl: 420, win: 61, trades: 23 },
      { session: "ny", pnl: -95, win: 47, trades: 19 },
    ],
    []
  );

  const heatDays: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];
  const heatSessions: SessionKey[] = ["asia", "london", "ny"];

  const [heat, setHeat] = useState<Record<string, number>>(() => {
    const obj: Record<string, number> = {};
    for (const d of heatDays) for (const s of heatSessions) obj[`${d}-${s}`] = Math.round(rnd(-180, 220));
    return obj;
  });

  useEffect(() => {
    const id = setInterval(() => {
      setHeat((prev) => {
        const next = { ...prev };
        for (let k = 0; k < 2; k++) {
          const d = heatDays[Math.floor(Math.random() * heatDays.length)];
          const s = heatSessions[Math.floor(Math.random() * heatSessions.length)];
          next[`${d}-${s}`] = clamp(Math.round(next[`${d}-${s}`] + rnd(-60, 60)), -300, 300);
        }
        return next;
      });
    }, 1200);
    return () => clearInterval(id);
  }, []);

  // ===== Volatility meter (ATR + Spread mock) =====
  type VolRow = { s: string; atr: number; atrPct: number; spread: number; spreadPct: number };

  const [vol, setVol] = useState<VolRow[]>([
    { s: "XAUUSD", atr: 8.4, atrPct: 0.41, spread: 0.18, spreadPct: 0.01 },
    { s: "EURUSD", atr: 0.0014, atrPct: 0.13, spread: 0.0001, spreadPct: 0.01 },
    { s: "GBPUSD", atr: 0.0019, atrPct: 0.15, spread: 0.00012, spreadPct: 0.01 },
    { s: "USDJPY", atr: 0.42, atrPct: 0.28, spread: 0.02, spreadPct: 0.01 },
  ]);

  useEffect(() => {
    const id = setInterval(() => {
      setVol((prev) =>
        prev.map((x) => {
          const atrStep = (Math.random() - 0.5) * (x.s === "XAUUSD" ? 0.9 : x.s === "USDJPY" ? 0.06 : 0.00025);
          const sprStep = (Math.random() - 0.5) * (x.s === "XAUUSD" ? 0.04 : x.s === "USDJPY" ? 0.01 : 0.00003);
          const atr = +(x.atr + atrStep).toFixed(x.s === "XAUUSD" ? 2 : x.s === "USDJPY" ? 2 : 5);
          const spread = +(x.spread + sprStep).toFixed(x.s === "XAUUSD" ? 2 : x.s === "USDJPY" ? 2 : 5);
          return {
            ...x,
            atr: clamp(atr, 0, 999),
            spread: clamp(spread, 0, 999),
          };
        })
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const volBadge = (atrPct: number, spreadPct: number) => {
    const score = atrPct * 100 + spreadPct * 200;
    if (score >= 40) return { key: "vol.high", color: "red" as const };
    if (score >= 22) return { key: "vol.med", color: "yellow" as const };
    return { key: "vol.low", color: "green" as const };
  };

  // ===== Trade Journal (mock) =====
  type TradeRow = {
    id: string;
    t: string;
    s: string;
    side: "BUY" | "SELL";
    lots: number;
    entry: number;
    exit: number;
    pnl: number;
  };

  const seedTimes = ["09:58","09:49","09:40","09:31","09:22","09:13","09:04","08:55","08:46","08:37"];

  const [trades, setTrades] = useState<TradeRow[]>(() => {
    const rows: TradeRow[] = [];
    const syms = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY"] as const;

    for (let i = 0; i < 10; i++) {
      const s = syms[Math.floor(rnd(0, syms.length))];
      const side = rnd(0, 1) > 0.5 ? "BUY" : "SELL";
      const lots = +rnd(0.1, 1.2).toFixed(2);
      const pnl = Math.round(rnd(-120, 180));

      rows.push({
        id: `T${1000 + i}`,
        t: seedTimes[i],
        s,
        side,
        lots,
        entry: s === "XAUUSD" ? +rnd(2020, 2050).toFixed(2) : +rnd(1, 150).toFixed(4),
        exit: s === "XAUUSD" ? +rnd(2020, 2050).toFixed(2) : +rnd(1, 150).toFixed(4),
        pnl,
      });
    }
    return rows;
  });

  useEffect(() => {
    const id = setInterval(() => {
      const syms = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY"] as const;
      const s = syms[Math.floor(Math.random() * syms.length)];
      const side = Math.random() > 0.5 ? "BUY" : "SELL";
      const lots = +(rnd(0.1, 1.2).toFixed(2));
      const pnl = Math.round(rnd(-120, 180));

      const newRow: TradeRow = {
        id: `T${Math.floor(1000 + Math.random() * 9000)}`,
        t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        s,
        side,
        lots,
        entry: s === "XAUUSD" ? +rnd(2020, 2050).toFixed(2) : +rnd(1, 150).toFixed(4),
        exit: s === "XAUUSD" ? +rnd(2020, 2050).toFixed(2) : +rnd(1, 150).toFixed(4),
        pnl,
      };

      setTrades((prev) => [newRow, ...prev].slice(0, 10));
    }, 6000);

    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    const n = trades.length || 1;
    const wins = trades.filter((tt) => tt.pnl > 0).length;
    const winRate = (wins / n) * 100;

    const avgWin = trades.filter((tt) => tt.pnl > 0).reduce((a, b) => a + b.pnl, 0) / Math.max(1, wins);
    const losses = trades.filter((tt) => tt.pnl < 0);
    const avgLoss = losses.reduce((a, b) => a + Math.abs(b.pnl), 0) / Math.max(1, losses.length);

    const wr = winRate / 100;
    const expectancy = wr * (avgWin || 0) - (1 - wr) * (avgLoss || 0);

    return {
      winRate,
      avgWin: avgWin || 0,
      avgLoss: avgLoss || 0,
      expectancy,
      total: trades.reduce((a, b) => a + b.pnl, 0),
    };
  }, [trades]);

  // realtime tick: update last point every ~900ms
  useEffect(() => {
    const id = setInterval(() => {
      setDemoEquity((prev) => {
        const next = prev.slice(1);
        const last = prev[prev.length - 1]?.v ?? 25000;
        const spike = Math.random() < 0.22 ? rnd(-900, 900) : 0;
        const drift = rnd(-380, 420) + spike;
        const newV = clamp(Math.round(last + drift), 23000, 26500);
        next.push({ t: "now", v: newV });
        return next;
      });

      setDemoPnL((prev) => {
        const next = [...prev];
        const i = next.length - 1;
        const last = next[i]?.p ?? 0;
        const step = rnd(-25, 25);
        next[i] = { ...next[i], p: clamp(Math.round(last + step), -300, 300) };
        return next;
      });
    }, 900);

    return () => clearInterval(id);
  }, []);

  const equityCurveLive = demoEquity;
  const dailyPnLLive = demoPnL;

  // ===== Watchlist realtime (mock) =====
  type WL = { s: string; bid: number; ask: number; chg: number };
  const [watch, setWatch] = useState<WL[]>([
    { s: "XAUUSD", bid: 2031.24, ask: 2031.41, chg: +0.42 },
    { s: "EURUSD", bid: 1.0832, ask: 1.0833, chg: -0.12 },
    { s: "GBPUSD", bid: 1.2671, ask: 1.2673, chg: +0.08 },
    { s: "USDJPY", bid: 148.52, ask: 148.54, chg: +0.21 },
  ]);

  const [pulse, setPulse] = useState<Record<string, "up" | "down" | "">>({
    XAUUSD: "",
    EURUSD: "",
    GBPUSD: "",
    USDJPY: "",
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const id = setInterval(() => {
      setWatch((prev) =>
        prev.map((x) => {
          const step = (Math.random() - 0.5) * (x.s === "XAUUSD" ? 0.9 : x.s === "USDJPY" ? 0.06 : 0.0012);
          const bid = +(x.bid + step).toFixed(x.s === "XAUUSD" ? 2 : x.s === "USDJPY" ? 2 : 4);
          const ask = +(bid + (x.s === "XAUUSD" ? 0.17 : x.s === "USDJPY" ? 0.02 : 0.0001)).toFixed(
            x.s === "XAUUSD" ? 2 : x.s === "USDJPY" ? 2 : 4
          );

          const dir = bid > x.bid ? "up" : bid < x.bid ? "down" : "";
          if (dir) {
            setPulse((p) => ({ ...p, [x.s]: dir }));
            setTimeout(() => setPulse((p) => ({ ...p, [x.s]: "" })), 220);
          }

          const chg = +(x.chg + (Math.random() - 0.5) * 0.08).toFixed(2);
          return { ...x, bid, ask, chg };
        })
      );
    }, 700);

    return () => clearInterval(id);
  }, []);

  // ===== Exposure breakdown (mock) =====
  const exposurePie = useMemo(
    () => [
      { name: "XAUUSD", value: 38 },
      { name: "EURUSD", value: 22 },
      { name: "GBPUSD", value: 18 },
      { name: "USDJPY", value: 22 },
    ],
    []
  );

  const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

  // ===== Economic calendar (mock) =====
  const [baseTs, setBaseTs] = useState<number>(0);
  const [nowTs, setNowTs] = useState<number>(0);

  useEffect(() => {
    if (!mounted) return;

    const b = Date.now();
    setBaseTs(b);
    setNowTs(b);

    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [mounted]);

  const econ = useMemo(() => {
    if (!baseTs) return [];
    return [
      { t: baseTs + 6 * 60 * 1000, impact: "HIGH", titleKey: "econ.usd_cpi_mm", prev: "0.2%", fc: "0.3%" },
      { t: baseTs + 18 * 60 * 1000, impact: "MED", titleKey: "econ.ecb_speech", prev: "-", fc: "-" },
      { t: baseTs + 33 * 60 * 1000, impact: "HIGH", titleKey: "econ.usd_claims", prev: "212K", fc: "215K" },
    ] as const;
  }, [baseTs]);

  const fmtMoney = (n: number) => "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const fmtSignedMoney = (n: number) =>
    (n >= 0 ? "+" : "-") + "$" + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  const Icon =
    overallStatus.label === "VIOLATION"
      ? ShieldAlert
      : overallStatus.label === "AT RISK"
        ? TriangleAlert
        : ShieldCheck;

  const overallText = t(overallKey(overallStatus.label));

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between">
        <Stack gap={2}>
          <Title order={2}>{t("dashboard.title")}</Title>
          <Text size="sm" c="dimmed">
            {account.plan} • {t("dashboard.account")} ${account.accountSize.toLocaleString()} • {t("dashboard.subtitle_tail")}
          </Text>
        </Stack>

        <Group>
          <Badge variant="light" color={overallStatus.color as any} leftSection={<Icon size={14} />}>
            {overallText}
          </Badge>

          <Button
            variant="light"
            leftSection={<FileCheck2 size={16} />}
            onClick={() =>
              notifications.show({
                title: t("notify.compliance.title"),
                message: t("notify.compliance.msg"),
              })
            }
          >
            {t("common.export")}
          </Button>

          <Button
            leftSection={<PlayCircle size={16} />}
            onClick={() =>
              notifications.show({
                title: t("notify.gate.title"),
                message:
                  overallStatus.label === "VIOLATION"
                    ? t("notify.gate.blocked")
                    : t("notify.gate.enabled"),
              })
            }
          >
            {t("common.gate")}
          </Button>
        </Group>
      </Group>

      {/* KPI row */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <MotionCard>
          <Paper withBorder radius="lg" p="md" style={{ minWidth: 0 }}>
            <Text size="sm" c="dimmed">{t("kpi.equity")}</Text>
            <Title order={3}>{fmtMoney(equity)}</Title>
            <Group gap={8} mt={6}>
              <Badge variant="light" color={pnlTodayPct >= 0 ? "green" : "red"}>
                {pnlTodayPct >= 0 ? "+" : ""}{pnlTodayPct.toFixed(2)}% {t("kpi.today")}
              </Badge>
              {pnlTodayPct >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            </Group>
          </Paper>
        </MotionCard>

        <MotionCard>
          <Paper withBorder radius="lg" p="md" style={{ minWidth: 0 }}>
            <Text size="sm" c="dimmed">{t("kpi.open_pl")}</Text>
            <Title order={3} c={openPL >= 0 ? "green" : "red"}>
              {fmtSignedMoney(openPL)}
            </Title>
            <Text size="sm" c="dimmed" mt={6}>
              {t("kpi.open_pl_sub")}
            </Text>
          </Paper>
        </MotionCard>

        <MotionCard>
          <Paper withBorder radius="lg" p="md" style={{ minWidth: 0 }}>
            <Text size="sm" c="dimmed">{t("kpi.max_dd")}</Text>
            <Title order={3}>{account.maxDrawdownPct}%</Title>
            <Text size="sm" c="dimmed" mt={6}>
              {t("common.limit")} ${maxDDLimit$.toFixed(0)}
            </Text>
          </Paper>
        </MotionCard>

        <MotionCard>
          <Paper withBorder radius="lg" p="md" style={{ minWidth: 0 }}>
            <Text size="sm" c="dimmed">{t("kpi.daily_loss")}</Text>
            <Title order={3}>{account.dailyLossLimitPct}%</Title>
            <Text size="sm" c="dimmed" mt={6}>
              {t("common.limit")} ${dailyLossLimit$.toFixed(0)}
            </Text>
          </Paper>
        </MotionCard>
      </SimpleGrid>

      {/* Risk meters + Charts */}
      <SimpleGrid cols={{ base: 1, lg: 3 }}>
        {/* Risk meters */}
        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <Scale size={16} />
              <Text fw={700}>{t("risk.title")}</Text>
            </Group>
            <StatusBadge
              s={
                overallStatus.label === "COMPLIANT"
                  ? "PASS"
                  : overallStatus.label === "AT RISK"
                    ? "WARN"
                    : "FAIL"
              }
            />
          </Group>

          <Stack gap="md">
            <RiskBar labelKey="risk.max_dd_used" used={ddUsed$} limit={maxDDLimit$} unit="$" />
            <RiskBar labelKey="risk.daily_loss_used" used={todayLoss$} limit={dailyLossLimit$} unit="$" />
            <RiskBar
              labelKey="risk.exposure_used"
              used={exposureUsedPct}
              limit={account.exposureCapPct}
              unit="%"
              warnAt={75}
              dangerAt={90}
            />
            <RiskBar
              labelKey="risk.consistency_used"
              used={consistencyUsedPct}
              limit={account.consistencyRulePct}
              unit="%"
              warnAt={85}
              dangerAt={100}
            />
          </Stack>
        </Paper>

        {/* Equity curve */}
        <Paper withBorder radius="lg" p="md" style={{ gridColumn: "span 2" as any }}>
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{t("chart.equity_curve")}</Text>
            <Badge variant="light">{t("common.realtime_mock")}</Badge>
          </Group>

          <div style={{ height: 260, minHeight: 260, width: "100%", minWidth: 0 }}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityCurveLive} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="t" tickFormatter={(v) => dayLabel(String(v))} />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(v) => dayLabel(String(v))}
                  />
                  <Area type="monotone" dataKey="v" strokeWidth={2} fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "100%" }} />
            )}
          </div>

          <Group mt="md" justify="space-between">
            <Text size="sm" c="dimmed">
              {t("risk.dd_used_line")}: ${ddUsed$.toFixed(0)} ({ddUsedPctOfLimit.toFixed(0)}% {t("common.of_limit")})
            </Text>
            <Badge variant="light" color={ddUsedPctOfLimit >= 80 ? "yellow" : "green"}>
              {t("risk.drawdown")} {ddUsedPctOfLimit >= 80 ? t("common.near_limit") : t("common.ok")}
            </Badge>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Rules & Daily PnL */}
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{t("rules.title")}</Text>
            <Badge variant="light">{t("rules.auto_check")}</Badge>
          </Group>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("rules.col.rule")}</Table.Th>
                <Table.Th>{t("rules.col.status")}</Table.Th>
                <Table.Th>{t("rules.col.detail")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rules.map((r) => (
                <Table.Tr key={r.name}>
                  <Table.Td>{r.name}</Table.Td>
                  <Table.Td><StatusBadge s={r.status} /></Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{r.detail}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Group mt="md" justify="space-between">
            <Button
              variant="light"
              onClick={() =>
                notifications.show({
                  title: t("notify.rules_engine.title"),
                  message: t("notify.rules_engine.msg"),
                })
              }
            >
              {t("rules.connect_metrics")}
            </Button>

            <Button
              color={overallStatus.label === "VIOLATION" ? "red" : "green"}
              onClick={() =>
                notifications.show({
                  title: t("notify.gate.title"),
                  message:
                    overallStatus.label === "VIOLATION"
                      ? t("notify.gate.should_block")
                      : t("notify.gate.keep_monitor"),
                })
              }
            >
              {overallStatus.label === "VIOLATION" ? t("common.block_trading") : t("common.allow_trading")}
            </Button>
          </Group>
        </Paper>

        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{t("chart.daily_pl")}</Text>
            <Badge variant="light">{t("common.realtime_mock")}</Badge>
          </Group>

          <div style={{ height: 300, minHeight: 300, width: "100%", minWidth: 0 }}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnLLive} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="t" tickFormatter={(v) => dayLabel(String(v))} />
                  <YAxis />
                  <Tooltip labelFormatter={(v) => dayLabel(String(v))} />
                  <Bar dataKey="p">
                    {dailyPnLLive.map((x, i) => (
                      <Cell
                        key={i}
                        fill={x.p >= 0 ? "rgba(16,185,129,0.9)" : "rgba(239,68,68,0.9)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "100%" }} />
            )}
          </div>

          <Group mt="md" justify="space-between">
            <Text size="sm" c="dimmed">
              {t("risk.daily_used_line")}: ${todayLoss$.toFixed(0)} ({dailyUsedPct.toFixed(0)}% {t("common.of_limit")})
            </Text>
            <Badge variant="light" color={dailyUsedPct >= 80 ? "yellow" : "green"}>
              {t("kpi.daily_loss")} {dailyUsedPct >= 80 ? t("common.near_limit") : t("common.ok")}
            </Badge>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Trading Widgets */}
      <SimpleGrid cols={{ base: 1, lg: 3 }}>
        {/* Watchlist */}
        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{t("wl.title")}</Text>
            <Badge variant="light">{t("wl.realtime")}</Badge>
          </Group>

          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("wl.col.symbol")}</Table.Th>
                <Table.Th>{t("wl.col.bid")}</Table.Th>
                <Table.Th>{t("wl.col.ask")}</Table.Th>
                <Table.Th>{t("wl.col.spread")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {watch.map((w) => {
                const bg =
                  pulse[w.s] === "up"
                    ? "rgba(16,185,129,0.12)"
                    : pulse[w.s] === "down"
                      ? "rgba(239,68,68,0.12)"
                      : "transparent";
                const color = pulse[w.s] === "up" ? "lime" : pulse[w.s] === "down" ? "red" : undefined;

                const spread = +(w.ask - w.bid).toFixed(w.s === "XAUUSD" ? 2 : 4);

                return (
                  <Table.Tr key={w.s} style={{ background: bg, transition: "background 180ms ease" }}>
                    <Table.Td>
                      <Text fw={700}>{w.s}</Text>
                      <Text size="xs" c={w.chg >= 0 ? "green" : "red"}>
                        {w.chg >= 0 ? "+" : ""}{w.chg}% {t("wl.change")}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ color }}>{w.bid}</Table.Td>
                    <Table.Td style={{ color }}>{w.ask}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{spread}</Badge>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Paper>

        {/* Exposure Pie */}
        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{t("exposure.title")}</Text>
            <Badge variant="light">{exposureUsedPct}% {t("exposure.used")}</Badge>
          </Group>

          <div style={{ height: 260, minHeight: 260, width: "100%", minWidth: 0 }}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                <PieChart>
                  <Pie
                    data={exposurePie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="rgba(255,255,255,0.10)"
                    strokeWidth={1}
                    isAnimationActive={false}
                  >
                    {exposurePie.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(v: any, n: any) => [`${v}%`, n]}
                    contentStyle={{
                      background: "rgba(20,20,20,0.95)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 10,
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "100%" }} />
            )}
          </div>

          <Divider my="sm" />
          <Stack gap={6}>
            {exposurePie.map((x, i) => (
              <Group key={x.name} justify="space-between">
                <Group gap="xs">
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  />
                  <Text size="sm" c="dimmed">{x.name}</Text>
                </Group>
                <Text size="sm" fw={700}>{x.value}%</Text>
              </Group>
            ))}
          </Stack>
        </Paper>

        {/* Economic Calendar */}
        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{t("econ.title")}</Text>
            <Badge variant="light">{t("econ.next_1h")}</Badge>
          </Group>

          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("econ.col.in")}</Table.Th>
                <Table.Th>{t("econ.col.impact")}</Table.Th>
                <Table.Th>{t("econ.col.event")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {mounted && econ.length ? (
                econ.map((e, idx) => {
                  const sec = Math.max(0, Math.floor((e.t - nowTs) / 1000));
                  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
                  const ss = String(sec % 60).padStart(2, "0");
                  const c = e.impact === "HIGH" ? "red" : "yellow";

                  return (
                    <Table.Tr key={idx}>
                      <Table.Td>
                        <Badge variant="light">{mm}:{ss}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={c} variant="light">
                          {t(`impact.${e.impact.toLowerCase()}`)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={700} size="sm">{t(e.titleKey)}</Text>
                        <Text size="xs" c="dimmed">
                          {t("econ.prev")} {e.prev} • {t("econ.fcst")} {e.fc}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              ) : (
                <>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Table.Tr key={`econ-ph-${i}`}>
                      <Table.Td><Badge variant="light">--:--</Badge></Table.Td>
                      <Table.Td><Badge variant="light">--</Badge></Table.Td>
                      <Table.Td>
                        <Text fw={700} size="sm">{t("common.loading")}</Text>
                        <Text size="xs" c="dimmed">{t("econ.prev")} -- • {t("econ.fcst")} --</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </>
              )}
            </Table.Tbody>
          </Table>

          <Text size="xs" c="dimmed" mt="sm">
            {t("econ.tip")}
          </Text>
        </Paper>
      </SimpleGrid>

      {/* Pro Trading Analytics */}
      <SimpleGrid cols={{ base: 1, lg: 3 }}>
        {/* Session performance + heatmap */}
        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{t("session.title")}</Text>
            <Badge variant="light">{t("session.badge")}</Badge>
          </Group>

          <Stack gap="sm">
            {sessions.map((s) => (
              <Group key={s.session} justify="space-between">
                <Text fw={700}>{t(`session.${s.session}`)}</Text>
                <Group gap="xs">
                  <Badge variant="light" color={s.pnl >= 0 ? "green" : "red"}>
                    {s.pnl >= 0 ? "+" : ""}${s.pnl}
                  </Badge>
                  <Badge variant="light">{s.win}% {t("journal.wr")}</Badge>
                  <Badge variant="light">{s.trades} {t("journal.trades")}</Badge>
                </Group>
              </Group>
            ))}
          </Stack>

          <Text fw={700} mt="md" mb={6}>{t("heatmap.title")}</Text>
          <div style={{ display: "grid", gridTemplateColumns: "80px repeat(3, 1fr)", gap: 6 }}>
            <div />
            {heatSessions.map((s) => (
              <Text key={s} size="xs" c="dimmed" style={{ textAlign: "center" }}>
                {t(`session.${s}`)}
              </Text>
            ))}

            {heatDays.map((d) => (
              <div key={d} style={{ display: "contents" }}>
                <Text size="xs" c="dimmed">{dayLabel(d)}</Text>
                {heatSessions.map((s) => {
                  const v = heat[`${d}-${s}`] ?? 0;
                  const bg =
                    v >= 120 ? "rgba(16,185,129,0.25)" :
                      v >= 0 ? "rgba(16,185,129,0.12)" :
                        v <= -120 ? "rgba(239,68,68,0.25)" :
                          "rgba(239,68,68,0.12)";
                  return (
                    <div
                      key={`${d}-${s}`}
                      style={{
                        height: 26,
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                      }}
                      title={`${dayLabel(d)} • ${t(`session.${s}`)}: ${v >= 0 ? "+" : ""}${v}`}
                    >
                      {v >= 0 ? "+" : ""}{v}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Paper>

        {/* Volatility meter */}
        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{t("vol.title")}</Text>
            <Badge variant="light">{t("vol.badge")}</Badge>
          </Group>

          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("wl.col.symbol")}</Table.Th>
                <Table.Th>{t("vol.col.atr")}</Table.Th>
                <Table.Th>{t("vol.col.spread")}</Table.Th>
                <Table.Th>{t("vol.col.level")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {vol.map((x) => {
                const lvl = volBadge(x.atrPct, x.spreadPct);
                return (
                  <Table.Tr key={x.s}>
                    <Table.Td><Text fw={700}>{x.s}</Text></Table.Td>
                    <Table.Td>
                      <Text size="sm">{x.atr}</Text>
                      <Text size="xs" c="dimmed">{x.atrPct}%</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{x.spread}</Text>
                      <Text size="xs" c="dimmed">{x.spreadPct}%</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={lvl.color}>{t(lvl.key)}</Badge>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>

          <Text size="xs" c="dimmed" mt="sm">
            {t("vol.tip")}
          </Text>
        </Paper>

        {/* Trade journal + stats */}
        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{t("journal.title")}</Text>
            <Badge variant="light">{t("journal.badge_last10")}</Badge>
          </Group>

          <Group mb="sm" justify="space-between">
            {mounted ? (
              <RingProgress
                size={96}
                thickness={10}
                sections={[
                  {
                    value: Math.max(0, Math.min(100, stats.winRate)),
                    color: stats.winRate >= 55 ? "green" : "yellow",
                  },
                ]}
                label={
                  <Text size="sm" fw={700} style={{ textAlign: "center" }}>
                    {stats.winRate.toFixed(0)}%
                  </Text>
                }
              />
            ) : (
              <RingProgress
                size={96}
                thickness={10}
                sections={[{ value: 0, color: "gray" }]}
                label={
                  <Text size="sm" fw={700} style={{ textAlign: "center" }}>
                    --
                  </Text>
                }
              />
            )}

            <Stack gap={4} style={{ flex: 1 }}>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">{t("journal.expectancy")}</Text>

                {mounted ? (
                  <Badge variant="light" color={stats.expectancy >= 0 ? "green" : "red"}>
                    {stats.expectancy >= 0 ? "+" : ""}{stats.expectancy.toFixed(1)} {t("journal.per_trade")}
                  </Badge>
                ) : (
                  <Badge variant="light" color="gray">-- {t("journal.per_trade")}</Badge>
                )}
              </Group>

              <Group justify="space-between">
                <Text size="sm" c="dimmed">{t("journal.avg_win")}</Text>
                {mounted ? <Text size="sm" fw={700}>+{stats.avgWin.toFixed(0)}</Text> : <Text size="sm" fw={700}>--</Text>}
              </Group>

              <Group justify="space-between">
                <Text size="sm" c="dimmed">{t("journal.avg_loss")}</Text>
                {mounted ? <Text size="sm" fw={700}>-{stats.avgLoss.toFixed(0)}</Text> : <Text size="sm" fw={700}>--</Text>}
              </Group>

              <Group justify="space-between">
                <Text size="sm" c="dimmed">{t("journal.total_10")}</Text>
                {mounted ? (
                  <Text size="sm" fw={700} style={{ color: stats.total >= 0 ? "lime" : "red" }}>
                    {stats.total >= 0 ? "+" : ""}{stats.total}
                  </Text>
                ) : (
                  <Text size="sm" fw={700}>--</Text>
                )}
              </Group>
            </Stack>
          </Group>

          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("journal.col.time")}</Table.Th>
                <Table.Th>{t("journal.col.symbol")}</Table.Th>
                <Table.Th>{t("journal.col.side")}</Table.Th>
                <Table.Th>{t("journal.col.lots")}</Table.Th>
                <Table.Th>{t("journal.col.pl")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {mounted ? (
                trades.map((tr, idx) => (
                  <Table.Tr key={tr.id ?? `${tr.t}-${tr.s}-${idx}`}>
                    <Table.Td><Text size="sm" c="dimmed">{tr.t}</Text></Table.Td>
                    <Table.Td><Text fw={700}>{tr.s}</Text></Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={tr.side === "BUY" ? "green" : "blue"}>
                        {t(tr.side === "BUY" ? "side.buy" : "side.sell")}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{tr.lots}</Table.Td>
                    <Table.Td style={{ color: tr.pnl >= 0 ? "lime" : "red" }}>
                      {tr.pnl >= 0 ? "+" : ""}{tr.pnl}
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Table.Tr key={`ph-${i}`}>
                      <Table.Td><Text size="sm" c="dimmed">--:--</Text></Table.Td>
                      <Table.Td><Text fw={700}>----</Text></Table.Td>
                      <Table.Td><Badge variant="light">--</Badge></Table.Td>
                      <Table.Td>--</Table.Td>
                      <Table.Td><Text c="dimmed">--</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </>
              )}
            </Table.Tbody>
          </Table>

          <Text size="xs" c="dimmed" mt="sm">
            {t("journal.tip")}
          </Text>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}