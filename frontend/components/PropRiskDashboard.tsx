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

function StatusBadge({ s }: { s: RuleStatus }) {
  if (s === "PASS") return <Badge color="green" variant="light">PASS</Badge>;
  if (s === "WARN") return <Badge color="yellow" variant="light">WARN</Badge>;
  return <Badge color="red" variant="light">FAIL</Badge>;
}

function RiskBar({
  label,
  used,
  limit,
  unit,
  warnAt = 70,
  dangerAt = 90,
}: {
  label: string;
  used: number;
  limit: number;
  unit: string;
  warnAt?: number;
  dangerAt?: number;
}) {
  const pct = Math.max(0, Math.min(100, (used / limit) * 100));
  const color = pct >= dangerAt ? "red" : pct >= warnAt ? "yellow" : "green";
  return (
    <div>
      <Group justify="space-between" mb={6}>
        <Text size="sm" c="dimmed">{label}</Text>
        <Text size="sm" fw={700}>
          {used.toFixed(2)}{unit} / {limit.toFixed(2)}{unit}
        </Text>
      </Group>
      <Progress value={pct} color={color} />
      <Text size="xs" c="dimmed" mt={6}>
        Usage: {pct.toFixed(0)}%
      </Text>
    </div>
  );
}

export function PropRiskDashboard() {
  const {
    account,
    equity,
    openPL,
    pnlTodayPct,
    equityCurve,
    dailyPnL,
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
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const [rand] = useState(() => mulberry32(1337));
const rnd = (a: number, b: number) => a + rand() * (b - a);

  
    // ===== DEMO: chart data (realtime mock) =====
  const [demoEquity, setDemoEquity] = useState<{ t: string; v: number }[]>([
  { t: "Mon", v: 25000 },
  { t: "Tue", v: 25850 },
  { t: "Wed", v: 24600 },
  { t: "Thu", v: 26200 },
  { t: "Fri", v: 24990 },
]);

  const [demoPnL, setDemoPnL] = useState<{ t: string; p: number }[]>([
    { t: "Mon", p: 120 },
    { t: "Tue", p: 80 },
    { t: "Wed", p: -180 },
    { t: "Thu", p: 260 },
    { t: "Fri", p: -40 },
  ]);
    // ===== Session performance + heatmap (mock) =====
  type SessionRow = { session: "Asia" | "London" | "New York"; pnl: number; win: number; trades: number };
  const sessions: SessionRow[] = useMemo(
    () => [
      { session: "Asia", pnl: 185, win: 56, trades: 18 },
      { session: "London", pnl: 420, win: 61, trades: 23 },
      { session: "New York", pnl: -95, win: 47, trades: 19 },
    ],
    []
  );

  // heatmap: 5 days x 3 sessions
  const heatDays = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
  const heatSessions = ["Asia", "London", "New York"] as const;
  const [heat, setHeat] = useState<Record<string, number>>(() => {
    const obj: Record<string, number> = {};
    for (const d of heatDays) for (const s of heatSessions) obj[`${d}-${s}`] = Math.round(rnd(-180, 220));
    return obj;
  });

  useEffect(() => {
    const id = setInterval(() => {
      // update 2 random cells mỗi 1.2s để “sống”
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
    const score = atrPct * 100 + spreadPct * 200; // điểm demo
    if (score >= 40) return { label: "HIGH", color: "red" as const };
    if (score >= 22) return { label: "MED", color: "yellow" as const };
    return { label: "LOW", color: "green" as const };
  };

  // ===== Trade Journal (mock) =====
  type TradeRow = { id: string; t: string; s: string; side: "BUY" | "SELL"; lots: number; entry: number; exit: number; pnl: number };
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
        t: seedTimes[i], // <- cố định
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


  // “stream” thêm trade mới mỗi 6s
  useEffect(() => {
    const id = setInterval(() => {
      const syms = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY"] as const;
      const s = syms[Math.floor(Math.random() * syms.length)];
      const side = Math.random() > 0.5 ? "BUY" : "SELL";
      const lots = +(rnd(0.1, 1.2).toFixed(2));
      const pnl = Math.round(rnd(-120, 180));
      const newRow = {
        id: `T${Math.floor(1000 + Math.random() * 9000)}`,
        t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        s,
        side,
        lots,
        entry: s === "XAUUSD" ? +rnd(2020, 2050).toFixed(2) : +rnd(1, 150).toFixed(4),
        exit: s === "XAUUSD" ? +rnd(2020, 2050).toFixed(2) : +rnd(1, 150).toFixed(4),
        pnl,
      } as TradeRow;

      setTrades((prev) => [newRow, ...prev].slice(0, 10));
    }, 6000);

    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    const n = trades.length || 1;
    const wins = trades.filter((t) => t.pnl > 0).length;
    const winRate = (wins / n) * 100;

    const avgWin = trades.filter((t) => t.pnl > 0).reduce((a, b) => a + b.pnl, 0) / Math.max(1, wins);
    const losses = trades.filter((t) => t.pnl < 0);
    const avgLoss = losses.reduce((a, b) => a + Math.abs(b.pnl), 0) / Math.max(1, losses.length);

    // Expectancy per trade: WR*AvgWin - (1-WR)*AvgLoss
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
      // Equity curve: update last day (Fri) + small drift
      setDemoEquity((prev) => {
        // dịch toàn bộ series sang trái như realtime feed:
        // Mon <- Tue <- Wed <- Thu <- Fri <- newPoint
        const next = prev.slice(1);

        const last = prev[prev.length - 1]?.v ?? 25000;

        // Biên độ lớn hơn + đôi lúc spike mạnh
        const spike = Math.random() < 0.22 ? rnd(-900, 900) : 0;
        const drift = rnd(-380, 420) + spike;

        const newV = clamp(Math.round(last + drift), 23000, 26500);

        next.push({ t: "Now", v: newV });
        return next;
        });

      // Daily P/L: update last bar (Fri)
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

  // use demo data for charts
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
            { t: baseTs + 6 * 60 * 1000, impact: "HIGH", title: "USD CPI (m/m)", prev: "0.2%", fc: "0.3%" },
            { t: baseTs + 18 * 60 * 1000, impact: "MED",  title: "EUR ECB Speech", prev: "-",   fc: "-" },
            { t: baseTs + 33 * 60 * 1000, impact: "HIGH", title: "USD Unemployment Claims", prev: "212K", fc: "215K" },
        ] as const;
        }, [baseTs]);


  const fmtMoney = (n: number) =>
    "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const fmtSignedMoney = (n: number) =>
    (n >= 0 ? "+" : "-") +
    "$" +
    Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  // OPTIONAL: bar color per value (profit vs loss)
  const pnlBarFill = useMemo(() => {
    const last = dailyPnLLive[dailyPnLLive.length - 1]?.p ?? 0;
    return last >= 0 ? "green" : "red";
  }, [dailyPnLLive]);

  const Icon =
    overallStatus.label === "VIOLATION"
      ? ShieldAlert
      : overallStatus.label === "AT RISK"
      ? TriangleAlert
      : ShieldCheck;

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between">
        <Stack gap={2}>
          <Title order={2}>Prop Risk Dashboard</Title>
          <Text size="sm" c="dimmed">
            {account.plan} • Account ${account.accountSize.toLocaleString()} • Live compliance monitoring (mock)
          </Text>
        </Stack>

        <Group>
          <Badge
            variant="light"
            color={overallStatus.color as any}
            leftSection={<Icon size={14} />}
          >
            {overallStatus.label}
          </Badge>

          <Button
            variant="light"
            leftSection={<FileCheck2 size={16} />}
            onClick={() =>
              notifications.show({
                title: "Compliance Report",
                message: "Export report will be added next (PDF/CSV).",
              })
            }
          >
            Export
          </Button>

          <Button
            leftSection={<PlayCircle size={16} />}
            onClick={() =>
              notifications.show({
                title: "Trading Gate",
                message:
                  overallStatus.label === "VIOLATION"
                    ? "Trading blocked (violation)."
                    : "Trading enabled.",
              })
            }
          >
            Gate
          </Button>
        </Group>
      </Group>

      {/* KPI row */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <MotionCard>
          <Paper withBorder radius="lg" p="md" style={{ minWidth: 0 }}>
            <Text size="sm" c="dimmed">Equity</Text>
            <Title order={3}>{fmtMoney(equity)}</Title>
            <Group gap={8} mt={6}>
              <Badge variant="light" color={pnlTodayPct >= 0 ? "green" : "red"}>
                {pnlTodayPct >= 0 ? "+" : ""}{pnlTodayPct.toFixed(2)}% Today
              </Badge>
              {pnlTodayPct >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            </Group>
          </Paper>
        </MotionCard>

        <MotionCard>
          <Paper withBorder radius="lg" p="md" style={{ minWidth: 0 }}>
            <Text size="sm" c="dimmed">Open P/L</Text>
            <Title order={3} c={openPL >= 0 ? "green" : "red"}>
              {fmtSignedMoney(openPL)}
            </Title>
            <Text size="sm" c="dimmed" mt={6}>
              Unrealized across positions
            </Text>
          </Paper>
        </MotionCard>

        <MotionCard>
          <Paper withBorder radius="lg" p="md" style={{ minWidth: 0 }}>
            <Text size="sm" c="dimmed">Max Drawdown</Text>
            <Title order={3}>{account.maxDrawdownPct}%</Title>
            <Text size="sm" c="dimmed" mt={6}>
              Limit ${maxDDLimit$.toFixed(0)}
            </Text>
          </Paper>
        </MotionCard>

        <MotionCard>
          <Paper withBorder radius="lg" p="md" style={{ minWidth: 0 }}>
            <Text size="sm" c="dimmed">Daily Loss</Text>
            <Title order={3}>{account.dailyLossLimitPct}%</Title>
            <Text size="sm" c="dimmed" mt={6}>
              Limit ${dailyLossLimit$.toFixed(0)}
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
              <Text fw={700}>Risk Meters</Text>
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
            <RiskBar label="Max Drawdown Used" used={ddUsed$} limit={maxDDLimit$} unit="$" />
            <RiskBar label="Daily Loss Used" used={todayLoss$} limit={dailyLossLimit$} unit="$" />
            <RiskBar label="Exposure Used" used={exposureUsedPct} limit={account.exposureCapPct} unit="%" warnAt={75} dangerAt={90} />
            <RiskBar label="Consistency (Best Day)" used={consistencyUsedPct} limit={account.consistencyRulePct} unit="%" warnAt={85} dangerAt={100} />
          </Stack>
        </Paper>

        {/* Equity curve */}
        <Paper withBorder radius="lg" p="md" style={{ gridColumn: "span 2" as any }}>
          <Group justify="space-between" mb="xs">
            <Text fw={700}>Equity Curve</Text>
            <Badge variant="light">Realtime mock</Badge>
          </Group>

          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurveLive} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="t" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="v" strokeWidth={2} fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <Group mt="md" justify="space-between">
            <Text size="sm" c="dimmed">
              DD used: ${ddUsed$.toFixed(0)} ({ddUsedPctOfLimit.toFixed(0)}% of limit)
            </Text>
            <Badge variant="light" color={ddUsedPctOfLimit >= 80 ? "yellow" : "green"}>
              Drawdown {ddUsedPctOfLimit >= 80 ? "Near limit" : "OK"}
            </Badge>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Rules & Daily PnL */}
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>Rules & Compliance</Text>
            <Badge variant="light">Auto-check</Badge>
          </Group>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Rule</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Detail</Table.Th>
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
                  title: "Rules Engine",
                  message: "Next: connect real metrics from backend (MT5/OMS).",
                })
              }
            >
              Connect Metrics
            </Button>

            <Button
              color={overallStatus.label === "VIOLATION" ? "red" : "green"}
              onClick={() =>
                notifications.show({
                  title: "Trading Gate",
                  message:
                    overallStatus.label === "VIOLATION"
                      ? "Trading should be blocked due to violation."
                      : "Trading allowed. Continue monitoring.",
                })
              }
            >
              {overallStatus.label === "VIOLATION" ? "Block Trading" : "Allow Trading"}
            </Button>
          </Group>
        </Paper>

        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>Daily P/L</Text>
            <Badge variant="light">Realtime mock</Badge>
          </Group>

          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyPnLLive} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="t" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="p" fill={pnlBarFill} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Group mt="md" justify="space-between">
            <Text size="sm" c="dimmed">
              Daily loss used: ${todayLoss$.toFixed(0)} ({dailyUsedPct.toFixed(0)}% of limit)
            </Text>
            <Badge variant="light" color={dailyUsedPct >= 80 ? "yellow" : "green"}>
              Daily {dailyUsedPct >= 80 ? "Near limit" : "OK"}
            </Badge>
          </Group>
        </Paper>
      </SimpleGrid>

            {/* Trading Widgets */}
      <SimpleGrid cols={{ base: 1, lg: 3 }}>
        {/* Watchlist */}
        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>Watchlist</Text>
            <Badge variant="light">Realtime</Badge>
          </Group>

          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Symbol</Table.Th>
                <Table.Th>Bid</Table.Th>
                <Table.Th>Ask</Table.Th>
                <Table.Th>Spread</Table.Th>
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
                        {w.chg >= 0 ? "+" : ""}{w.chg}%
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
            <Text fw={700}>Exposure Breakdown</Text>
            <Badge variant="light">{exposureUsedPct}% used</Badge>
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
                    isAnimationActive={false}   // ✅ khuyên tắt để đỡ glitch đo size
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
            <Text fw={700}>Economic Calendar</Text>
            <Badge variant="light">Next 1H</Badge>
          </Group>

          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>In</Table.Th>
                <Table.Th>Impact</Table.Th>
                <Table.Th>Event</Table.Th>
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
                        <Badge color={c} variant="light">{e.impact}</Badge>
                    </Table.Td>
                    <Table.Td>
                        <Text fw={700} size="sm">{e.title}</Text>
                        <Text size="xs" c="dimmed">Prev {e.prev} • Fcst {e.fc}</Text>
                    </Table.Td>
                    </Table.Tr>
                );
                })
            ) : (
                // placeholder ổn định để khỏi “trống”
                <>
                {Array.from({ length: 3 }).map((_, i) => (
                    <Table.Tr key={`econ-ph-${i}`}>
                    <Table.Td><Badge variant="light">--:--</Badge></Table.Td>
                    <Table.Td><Badge variant="light">--</Badge></Table.Td>
                    <Table.Td>
                        <Text fw={700} size="sm">Loading…</Text>
                        <Text size="xs" c="dimmed">Prev -- • Fcst --</Text>
                    </Table.Td>
                    </Table.Tr>
                ))}
                </>
            )}
            </Table.Tbody>

          </Table>

          <Text size="xs" c="dimmed" mt="sm">
            Tip: HIGH impact → widen spreads / avoid entries near release.
          </Text>
        </Paper>
      </SimpleGrid>

            {/* Pro Trading Analytics */}
      <SimpleGrid cols={{ base: 1, lg: 3 }}>
        {/* Session performance + heatmap */}
        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>Session Performance</Text>
            <Badge variant="light">Asia / London / NY</Badge>
          </Group>

          <Stack gap="sm">
            {sessions.map((s) => (
              <Group key={s.session} justify="space-between">
                <Text fw={700}>{s.session}</Text>
                <Group gap="xs">
                  <Badge variant="light" color={s.pnl >= 0 ? "green" : "red"}>
                    {s.pnl >= 0 ? "+" : ""}${s.pnl}
                  </Badge>
                  <Badge variant="light">{s.win}% WR</Badge>
                  <Badge variant="light">{s.trades} trades</Badge>
                </Group>
              </Group>
            ))}
          </Stack>

          <Text fw={700} mt="md" mb={6}>Heatmap (5D)</Text>
          <div style={{ display: "grid", gridTemplateColumns: "80px repeat(3, 1fr)", gap: 6 }}>
            <div />
            {heatSessions.map((s) => (
              <Text key={s} size="xs" c="dimmed" style={{ textAlign: "center" }}>{s}</Text>
            ))}

            {heatDays.map((d) => (
                <div key={d} style={{ display: "contents" }}>
                    <Text size="xs" c="dimmed">{d}</Text>
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
                        title={`${d} • ${s}: ${v >= 0 ? "+" : ""}${v}`}
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
            <Text fw={700}>Volatility Meter</Text>
            <Badge variant="light">ATR + Spread</Badge>
          </Group>

          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Symbol</Table.Th>
                <Table.Th>ATR</Table.Th>
                <Table.Th>Spread</Table.Th>
                <Table.Th>Level</Table.Th>
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
                      <Badge variant="light" color={lvl.color}>{lvl.label}</Badge>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>

          <Text size="xs" c="dimmed" mt="sm">
            Tip: Vol HIGH → giảm lot / tránh entry lúc tin ra.
          </Text>
        </Paper>

        {/* Trade journal + stats */}
        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>Trade Journal</Text>
            <Badge variant="light">Last 10</Badge>
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
                        />) : (
                // placeholder SSR ổn định
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
                <Text size="sm" c="dimmed">Expectancy</Text>

                {mounted ? (
                <Badge variant="light" color={stats.expectancy >= 0 ? "green" : "red"}>
                    {stats.expectancy >= 0 ? "+" : ""}
                    {stats.expectancy.toFixed(1)} /trade
                </Badge>
                ) : (
                <Badge variant="light" color="gray">
                    -- /trade
                </Badge>
                )}
            </Group>

            <Group justify="space-between">
                <Text size="sm" c="dimmed">Avg Win</Text>
                {mounted ? (
                <Text size="sm" fw={700}>+{stats.avgWin.toFixed(0)}</Text>
                ) : (
                <Text size="sm" fw={700}>--</Text>
                )}
            </Group>

            <Group justify="space-between">
                <Text size="sm" c="dimmed">Avg Loss</Text>
                {mounted ? (
                <Text size="sm" fw={700}>-{stats.avgLoss.toFixed(0)}</Text>
                ) : (
                <Text size="sm" fw={700}>--</Text>
                )}
            </Group>

            <Group justify="space-between">
                <Text size="sm" c="dimmed">Total (10)</Text>
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
                <Table.Th>Time</Table.Th>
                <Table.Th>Symbol</Table.Th>
                <Table.Th>Side</Table.Th>
                <Table.Th>Lots</Table.Th>
                <Table.Th>P/L</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {mounted ? (
                    trades.map((t, idx) => (
                    <Table.Tr key={t.id ?? `${t.t}-${t.s}-${idx}`}>
                        <Table.Td>
                        <Text size="sm" c="dimmed">{t.t}</Text>
                        </Table.Td>

                        <Table.Td>
                        <Text fw={700}>{t.s}</Text>
                        </Table.Td>

                        <Table.Td>
                        <Badge variant="light" color={t.side === "BUY" ? "green" : "blue"}>
                            {t.side}
                        </Badge>
                        </Table.Td>

                        <Table.Td>{t.lots}</Table.Td>

                        <Table.Td style={{ color: t.pnl >= 0 ? "lime" : "red" }}>
                        {t.pnl >= 0 ? "+" : ""}{t.pnl}
                        </Table.Td>
                    </Table.Tr>
                    ))
                ) : (
                    // SSR placeholder: luôn giống nhau
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
            Next: connect real fills from backend (MT5 deals) + tags (setup, reason, screenshot).
          </Text>
        </Paper>
      </SimpleGrid>


    </Stack>
  );
}
