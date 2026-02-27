// pages/markets.tsx
"use client";
import { useMantineColorScheme } from "@mantine/core";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import {
  ActionIcon,
  Popover,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  RangeSlider,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  type PaperProps,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBolt,
  IconChartCandle,
  IconFilter,
  IconRefresh,
  IconSearch,
  IconStar,
  IconTrendingUp,
} from "@tabler/icons-react";
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

import type { SymbolName } from "@/lib/fakeFeed";
import { useFeed } from "@/lib/useFeed";
import { useI18n } from "@/lib/i18nProvider";

// Chart SSR off
const TradingChart = dynamic(() => import("@/components/TradingChart"), {
  ssr: false,
  loading: () => <div style={{ height: "100%", width: "100%" }} />,
});

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

/* ===================== Types ===================== */

type TF = "M1" | "M5" | "M15" | "H1";
type WL = { s: SymbolName; bid: number; ask: number; chg: number; vol: number };
type HeatCell = { s: SymbolName; tf: TF; v: number }; // momentum score
type EconRow = { t: number; impact: "HIGH" | "MED" | "LOW"; title: string; prev: string; fc: string };
type SparkPoint = { t: number; v: number };
type NewsRow = { id: string; t: string; title: string; s: SymbolName | "ALL"; sentiment: "BULL" | "BEAR" | "NEUTRAL" };

// ✅ Order Queue
type OrderSide = "BUY" | "SELL";
type OrderType = "MARKET" | "LIMIT";
type QueuedOrder = {
  id: string;
  ts: number;
  symbol: SymbolName;
  side: OrderSide;
  type: OrderType;
  lots: number;
  price?: number; // LIMIT only
  slPips?: number;
  tpPips?: number;
  comment?: string;
};

/* ===================== Page ===================== */

export default function MarketsPage() {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  const axisTick = isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.72)";
  const axisLine = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const gridLine = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";

  const tooltipBg = isDark ? "rgba(20,20,20,0.95)" : "rgba(255,255,255,0.98)";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const tooltipText = isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)";
  const router = useRouter();
  const { t } = useI18n();
  const tFmt = (key: string, vars?: Record<string, any>) => fmtVars(t(key), vars);

  const symbols: SymbolName[] = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY"];
  const tfs: TF[] = ["M1", "M5", "M15", "H1"];

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // selected symbol + timeframe for preview
  const [symbol, setSymbol] = useState<SymbolName>("XAUUSD");
  const [tf, setTf] = useState<TF>("M1");

  // preview chart uses useFeed(symbol)
  const { candles, tick, spread } = useFeed(symbol);
  const last = tick?.last ?? 0;
  const chg = tick?.chgPct ?? 0;

  const LS_FAV_KEY = "hts_favorites_v1";
  const LS_ORDERS_KEY = "hts_order_queue_v1";

  const [favorites, setFavorites] = useState<SymbolName[]>([]);
  const cardBg = "linear-gradient(180deg, rgba(18,18,18,0.78), rgba(18,18,18,0.62))";

  // deterministic random
  const randRef = useRef<(() => number) | null>(null);
  if (!randRef.current) {
    randRef.current = mulberry32(24680);
  }
  const rnd = (a: number, b: number) => {
    const r = randRef.current!;
    return a + r() * (b - a);
  };

  const goTrade = (s: SymbolName) => {
    router.push(`/trading?symbol=${encodeURIComponent(s)}`);
  };

  const [hoverSym, setHoverSym] = useState<SymbolName | null>(null);

  /* ===================== Favorites (load/save) ===================== */

  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem(LS_FAV_KEY);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      const cleaned = arr.filter((x) => (symbols as string[]).includes(String(x)));
      setFavorites(cleaned as SymbolName[]);
    } catch {
      setFavorites([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LS_FAV_KEY, JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [mounted, favorites]);

  const isFav = (s: SymbolName) => favorites.includes(s);

  const toggleFav = (s: SymbolName) => {
    setFavorites((prev) => {
      const next = prev.includes(s) ? prev.filter((x) => x !== s) : [s, ...prev].slice(0, 20);
      return next;
    });
  };

  /* ===================== Watchlist realtime ===================== */

  const [watch, setWatch] = useState<WL[]>([
    { s: "XAUUSD", bid: 2031.24, ask: 2031.41, chg: +0.42, vol: 62 },
    { s: "EURUSD", bid: 1.0832, ask: 1.0833, chg: -0.12, vol: 41 },
    { s: "GBPUSD", bid: 1.2671, ask: 1.2673, chg: +0.08, vol: 46 },
    { s: "USDJPY", bid: 148.52, ask: 148.54, chg: +0.21, vol: 52 },
  ]);

  const [pulse, setPulse] = useState<Record<string, "up" | "down" | "">>({
    XAUUSD: "",
    EURUSD: "",
    GBPUSD: "",
    USDJPY: "",
  });

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      setWatch((prev) =>
        prev.map((x) => {
          const step =
            (Math.random() - 0.5) * (x.s === "XAUUSD" ? 0.9 : x.s === "USDJPY" ? 0.06 : 0.0012);

          const bid = +(x.bid + step).toFixed(x.s === "XAUUSD" ? 2 : x.s === "USDJPY" ? 2 : 5);
          const spr = x.s === "XAUUSD" ? 0.17 : x.s === "USDJPY" ? 0.02 : 0.0001;
          const ask = +(bid + spr).toFixed(x.s === "XAUUSD" ? 2 : x.s === "USDJPY" ? 2 : 5);

          const dir = bid > x.bid ? "up" : bid < x.bid ? "down" : "";
          if (dir) {
            setPulse((p) => ({ ...p, [x.s]: dir }));
            setTimeout(() => setPulse((p) => ({ ...p, [x.s]: "" })), 170);
          }

          const chg = +(x.chg + (Math.random() - 0.5) * 0.08).toFixed(2);
          const vol = clamp(Math.round(x.vol + (Math.random() - 0.5) * 6), 12, 95);
          return { ...x, bid, ask, chg, vol };
        })
      );
    }, 650);

    return () => clearInterval(id);
  }, [mounted]);

  /* ===================== Order Queue (multi-orders) ===================== */

  const [orderSide, setOrderSide] = useState<OrderSide>("BUY");
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [orderLots, setOrderLots] = useState("0.01");
  const [orderLimitPrice, setOrderLimitPrice] = useState("");
  const [orderSLPips, setOrderSLPips] = useState("");
  const [orderTPPips, setOrderTPPips] = useState("");
  const [orderComment, setOrderComment] = useState("");

  const [orderQueue, setOrderQueue] = useState<QueuedOrder[]>([]);

  const safeNum = (s: string) => {
    const n = Number(String(s).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  const newId = () => `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;

  const symbolMid = (s: SymbolName) => {
    const w = watch.find((x) => x.s === s);
    if (!w) return NaN;
    return (w.bid + w.ask) / 2;
  };

  const addToQueue = () => {
    const lots = safeNum(orderLots);
    if (!Number.isFinite(lots) || lots <= 0) {
      notifications.show({ title: t("markets.order.toast_title"), message: t("markets.order.err_lots"), color: "red" });
      return;
    }

    let price: number | undefined = undefined;
    if (orderType === "LIMIT") {
      const p = safeNum(orderLimitPrice);
      if (!Number.isFinite(p) || p <= 0) {
        notifications.show({ title: t("markets.order.toast_title"), message: t("markets.order.err_limit"), color: "red" });
        return;
      }
      price = p;
    }

    const sl = orderSLPips.trim() ? safeNum(orderSLPips) : undefined;
    const tp = orderTPPips.trim() ? safeNum(orderTPPips) : undefined;

    if (sl !== undefined && (!Number.isFinite(sl) || sl < 0)) {
      notifications.show({ title: t("markets.order.toast_title"), message: t("markets.order.err_sl"), color: "red" });
      return;
    }
    if (tp !== undefined && (!Number.isFinite(tp) || tp < 0)) {
      notifications.show({ title: t("markets.order.toast_title"), message: t("markets.order.err_tp"), color: "red" });
      return;
    }

    const ord: QueuedOrder = {
      id: newId(),
      ts: Date.now(),
      symbol,
      side: orderSide,
      type: orderType,
      lots,
      price,
      slPips: sl,
      tpPips: tp,
      comment: orderComment?.trim() || undefined,
    };

    setOrderQueue((prev) => [ord, ...prev].slice(0, 200));

    const pricePart = ord.price ? ` @${ord.price}` : "";
    notifications.show({
      title: t("markets.order.saved_title"),
      message: tFmt("markets.order.saved_msg", {
        symbol: ord.symbol,
        side: ord.side,
        type: ord.type,
        lots: ord.lots,
        pricePart,
      }),
    });
  };

  const removeFromQueue = (id: string) => setOrderQueue((prev) => prev.filter((x) => x.id !== id));
  const clearQueue = () => setOrderQueue([]);

  const sendAllMock = () => {
    if (!orderQueue.length) {
      notifications.show({ title: t("markets.order.toast_title"), message: t("markets.order.send_empty"), color: "gray" });
      return;
    }
    notifications.show({
      title: t("markets.order.send_title"),
      message: tFmt("markets.order.send_msg", { n: orderQueue.length }),
      color: "green",
    });
    setOrderQueue([]);
  };

  // Load / Save queue to LocalStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem(LS_ORDERS_KEY);
      const arr = raw ? (JSON.parse(raw) as QueuedOrder[]) : [];
      const cleaned = Array.isArray(arr) ? arr.filter((o) => o && symbols.includes(o.symbol)) : [];
      setOrderQueue(cleaned);
    } catch {
      setOrderQueue([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(orderQueue));
    } catch {
      // ignore
    }
  }, [mounted, orderQueue]);

  /* ===================== Sparklines ===================== */

  const [sparks, setSparks] = useState<Record<string, SparkPoint[]>>(() => {
    const mk = (base: number, step: number) =>
      Array.from({ length: 18 }).map((_, i) => ({ t: i, v: base + (Math.random() - 0.5) * step * 2 }));
    return {
      XAUUSD: mk(2030, 0.9),
      EURUSD: mk(1.083, 0.0012),
      GBPUSD: mk(1.267, 0.0014),
      USDJPY: mk(148.5, 0.06),
    };
  });

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      setSparks((p) => {
        const next: Record<string, SparkPoint[]> = { ...p };
        (Object.keys(next) as SymbolName[]).forEach((s) => {
          const arr = next[s] ?? [];
          const lastV = arr[arr.length - 1]?.v ?? 1;

          const step = (Math.random() - 0.5) * (s === "XAUUSD" ? 0.9 : s === "USDJPY" ? 0.06 : 0.0012);
          const v = lastV + step;

          const shifted = arr.length
            ? [...arr.slice(1), { t: (arr[arr.length - 1]?.t ?? 0) + 1, v }]
            : [{ t: 0, v }];
          next[s] = shifted;
        });
        return next;
      });
    }, 650);
    return () => clearInterval(id);
  }, [mounted]);

  /* ===================== Heatmap (momentum) ===================== */

  const [heat, setHeat] = useState<HeatCell[]>(
    symbols.flatMap((s) =>
      tfs.map((tf0) => ({
        s,
        tf: tf0,
        v: Math.round(rnd(-100, 100)),
      }))
    )
  );

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      setHeat((prev) =>
        prev.map((c) => {
          const drift = (Math.random() - 0.5) * 18;
          return { ...c, v: clamp(Math.round(c.v + drift), -100, 100) };
        })
      );
    }, 900);
    return () => clearInterval(id);
  }, [mounted]);

  const heatColor = (v: number) => {
    const a = Math.min(0.55, 0.1 + Math.abs(v) / 220);
    if (v >= 45) return `rgba(16,185,129,${a})`;
    if (v >= 10) return `rgba(16,185,129,${Math.min(0.28, a)})`;
    if (v <= -45) return `rgba(239,68,68,${a})`;
    if (v <= -10) return `rgba(239,68,68,${Math.min(0.28, a)})`;
    return "rgba(255,255,255,0.03)";
  };

  /* ===================== Screener (sort/filter) ===================== */

  const [query, setQuery] = useState("");
  const [volRange, setVolRange] = useState<[number, number]>([20, 95]);
  const [sprRange, setSprRange] = useState<[number, number]>([0, 100]); // normalized
  const [chgRange, setChgRange] = useState<[number, number]>([-1.5, 1.5]);
  const [sortKey, setSortKey] = useState<"symbol" | "chg" | "vol" | "spread">("chg");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const screenerRows = useMemo(() => {
    const q = query.trim().toUpperCase();

    const rows = watch.map((w) => {
      const spreadRaw = w.ask - w.bid;

      // normalize spread for filter UI (so different symbols can fit same slider)
      const spreadNorm =
        w.s === "XAUUSD"
          ? clamp(Math.round((spreadRaw / 0.2) * 100), 0, 100)
          : w.s === "USDJPY"
          ? clamp(Math.round((spreadRaw / 0.04) * 100), 0, 100)
          : clamp(Math.round((spreadRaw / 0.0003) * 100), 0, 100);

      return { ...w, spreadRaw, spreadNorm };
    });

    const filtered = rows.filter((r) => {
      if (q && !r.s.includes(q as any)) return false;
      if (r.vol < volRange[0] || r.vol > volRange[1]) return false;
      if (r.spreadNorm < sprRange[0] || r.spreadNorm > sprRange[1]) return false;
      if (r.chg < chgRange[0] || r.chg > chgRange[1]) return false;
      return true;
    });

    const mul = sortDir === "asc" ? 1 : -1;

    filtered.sort((a, b) => {
      if (sortKey === "symbol") return a.s.localeCompare(b.s) * mul;
      if (sortKey === "chg") return (a.chg - b.chg) * mul;
      if (sortKey === "vol") return (a.vol - b.vol) * mul;
      return (a.spreadNorm - b.spreadNorm) * mul;
    });

    // favorites first (stable)
    filtered.sort((a, b) => {
      const af = favorites.includes(a.s) ? 1 : 0;
      const bf = favorites.includes(b.s) ? 1 : 0;
      return bf - af;
    });

    return filtered;
  }, [watch, query, volRange, sprRange, sortKey, sortDir, favorites]);

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey !== k) {
      setSortKey(k);
      setSortDir("desc");
      return;
    }
    setSortDir((d) => (d === "desc" ? "asc" : "desc"));
  };

  const sortMark = (k: typeof sortKey) => {
    if (sortKey !== k) return "";
    return sortDir === "desc" ? " ↓" : " ↑";
  };

  /* ===================== Movers & charts ===================== */

  const movers = useMemo(() => {
    const list = [...watch]
      .map((x) => ({
        s: x.s,
        chg: x.chg,
        vol: x.vol,
        spread: +(x.ask - x.bid).toFixed(x.s === "XAUUSD" ? 2 : x.s === "USDJPY" ? 2 : 5),
      }))
      .sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg));
    return list;
  }, [watch]);

  const volumeBars = useMemo(() => movers.map((m) => ({ s: m.s, v: m.vol })), [movers]);

  /* ===================== News (mock) ===================== */

  const [news, setNews] = useState<NewsRow[]>([
    { id: "n1", t: "Now", title: "Gold bid as USD softens ahead of CPI (mock)", s: "XAUUSD", sentiment: "BULL" },
    { id: "n2", t: "2m", title: "EUR ranges near key resistance; ECB tone watched (mock)", s: "EURUSD", sentiment: "NEUTRAL" },
    { id: "n3", t: "6m", title: "JPY volatility uptick; risk-off flows (mock)", s: "USDJPY", sentiment: "BEAR" },
    { id: "n4", t: "12m", title: "GBP steady as UK data surprises (mock)", s: "GBPUSD", sentiment: "BULL" },
    { id: "n5", t: "18m", title: "Cross-asset: equities flat, rates drift (mock)", s: "ALL", sentiment: "NEUTRAL" },
  ]);

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      const pool: Omit<NewsRow, "id" | "t">[] = [
        { title: "CPI preview: spreads widen into release (mock)", s: "ALL", sentiment: "NEUTRAL" },
        { title: "Gold options skew hints at upside hedge demand (mock)", s: "XAUUSD", sentiment: "BULL" },
        { title: "USDJPY liquidity thins near round number (mock)", s: "USDJPY", sentiment: "BEAR" },
        { title: "EURUSD flows: real money selling rallies (mock)", s: "EURUSD", sentiment: "BEAR" },
        { title: "GBPUSD: short covering into London fix (mock)", s: "GBPUSD", sentiment: "BULL" },
      ];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const newRow: NewsRow = {
        id: `n${Math.floor(Math.random() * 1e9)}`,
        t: "Now",
        ...pick,
      };
      setNews((prev) => [newRow, ...prev.map((x) => ({ ...x, t: x.t === "Now" ? "1m" : x.t }))].slice(0, 6));
    }, 8500);
    return () => clearInterval(id);
  }, [mounted]);

  const sentimentBadge = (s: NewsRow["sentiment"]) => {
    if (s === "BULL") return <Badge variant="light" color="green">{t("markets.sentiment.bull")}</Badge>;
    if (s === "BEAR") return <Badge variant="light" color="red">{t("markets.sentiment.bear")}</Badge>;
    return <Badge variant="light" color="gray">{t("markets.sentiment.neutral")}</Badge>;
  };

  /* ===================== Economic calendar (hydration-safe) ===================== */

  const [baseTs, setBaseTs] = useState(0);
  const [nowTs, setNowTs] = useState(0);

  useEffect(() => {
    if (!mounted) return;
    const b = Date.now();
    setBaseTs(b);
    setNowTs(b);
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [mounted]);

  const econ: EconRow[] = useMemo(() => {
    if (!baseTs) return [];
    return [
      { t: baseTs + 6 * 60 * 1000, impact: "HIGH", title: t("markets.econ.usd_cpi_mm"), prev: "0.2%", fc: "0.3%" },
      { t: baseTs + 18 * 60 * 1000, impact: "MED", title: t("markets.econ.ecb_speech"), prev: "-", fc: "-" },
      { t: baseTs + 33 * 60 * 1000, impact: "HIGH", title: t("markets.econ.usd_claims"), prev: "212K", fc: "215K" },
    ];
  }, [baseTs, t]);

  /* ===================== Render ===================== */

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
              <IconTrendingUp size={18} />
            </Box>

            <Title order={2}>{t("markets.title")}</Title>
            <Badge variant="light">{t("markets.badge.realtime_mock")}</Badge>
            <Badge variant="light" leftSection={<IconBolt size={14} />}>
              {t("markets.badge.turbo")}
            </Badge>
          </Group>

          <Text size="sm" c="dimmed">
            {t("markets.subtitle")}
          </Text>
        </Stack>

        <Group gap="xs">
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={() =>
              notifications.show({
                title: t("markets.btn.refresh_toast_title"),
                message: t("markets.btn.refresh_toast_msg"),
              })
            }
          >
            {t("markets.btn.refresh")}
          </Button>

          <Button leftSection={<IconChartCandle size={16} />} onClick={() => goTrade(symbol)}>
            {tFmt("markets.btn.trade_symbol", { symbol })}
          </Button>
        </Group>
      </Group>

      {/* Controls row */}
      <Group justify="space-between">
        <Group gap="xs" style={{ minWidth: 0 }}>
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            placeholder={t("markets.search_ph")}
            styles={{ input: { background: "rgba(255,255,255,0.04)" } }}
            style={{ width: 280, minWidth: 0 }}
          />

          <SegmentedControl
            value={tf}
            onChange={(v) => setTf(v as TF)}
            data={[
              { value: "M1", label: "M1" },
              { value: "M5", label: "M5" },
              { value: "M15", label: "M15" },
              { value: "H1", label: "H1" },
            ]}
          />

          <Badge variant="light" leftSection={<IconFilter size={14} />}>
            {t("markets.filters")}
          </Badge>
        </Group>

        <Group gap="xs">
          <Badge variant="light">
            {t("markets.active")} <b style={{ marginLeft: 6 }}>{symbol}</b>
          </Badge>
          <Badge variant="light">
            {t("markets.spread")} {spread ?? "--"}
          </Badge>
        </Group>
      </Group>

      {/* KPI strip */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Text size="sm" c="dimmed">{t("markets.kpi.last")}</Text>
          <Title order={3}>{mounted ? fmtPrice(symbol, last) : "--"}</Title>
          <Badge variant="light" color={chg >= 0 ? "green" : "red"} mt={6}>
            {mounted ? `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}% (mock)` : "--"}
          </Badge>
        </MotionCard>

        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Text size="sm" c="dimmed">{t("markets.kpi.momentum")}</Text>
          <Title order={3}>{mounted ? `${Math.round(rnd(35, 88))}%` : "--"}</Title>
          <Text size="sm" c="dimmed" mt={6}>
            {t("markets.kpi.momentum_sub")}
          </Text>
        </MotionCard>

        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Text size="sm" c="dimmed">{t("markets.kpi.volatility")}</Text>
          <Title order={3}>{mounted ? `${watch.find((m) => m.s === symbol)?.vol ?? 50}` : "--"}</Title>
          <Badge
            variant="light"
            color={(watch.find((m) => m.s === symbol)?.vol ?? 50) >= 70 ? "red" : "green"}
            mt={6}
          >
            {mounted ? ((watch.find((m) => m.s === symbol)?.vol ?? 50) >= 70 ? t("markets.kpi.high") : t("markets.kpi.ok")) : "--"}
          </Badge>
        </MotionCard>

        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Text size="sm" c="dimmed">{t("markets.kpi.liquidity")}</Text>
          <Title order={3}>{mounted ? `${Math.round(rnd(52, 96))}` : "--"}</Title>
          <Text size="sm" c="dimmed" mt={6}>
            {t("markets.kpi.liquidity_sub")}
          </Text>
        </MotionCard>
      </SimpleGrid>

      {/* Main grid */}
      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        {/* Chart preview (2 cols) */}
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
              <Text fw={700}>{t("markets.preview.title")}</Text>
              <Badge variant="light">{symbol}</Badge>
              <Badge variant="light">{tf}</Badge>
              <Badge variant="light">{t("markets.preview.badge.candles_mock")}</Badge>
            </Group>

            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                leftSection={<IconStar size={14} />}
                onClick={() => {
                  const wasFav = isFav(symbol);
                  toggleFav(symbol);
                  notifications.show({
                    title: t("markets.fav.toast_title"),
                    message: wasFav
                      ? tFmt("markets.fav.toast_msg_unpinned", { symbol })
                      : tFmt("markets.fav.toast_msg_pinned", { symbol }),
                  });
                }}
              >
                {isFav(symbol) ? t("markets.btn.unpin") : t("markets.btn.pin")}
              </Button>

              <Button size="xs" color="blue" leftSection={<IconChartCandle size={14} />} onClick={() => goTrade(symbol)}>
                {t("markets.btn.trade")}
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
              rightBadges={
                <>
                  <Badge variant="light">
                    {t("markets.spread")} {spread ?? "--"}
                  </Badge>
                  <Badge variant="light" color={chg >= 0 ? "green" : "red"}>
                    {mounted ? `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%` : "--"}
                  </Badge>
                </>
              }
            />
          </Box>

          <Divider my="sm" />
        </MotionCard>

        {/* News */}
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
            <Text fw={700}>{t("markets.news.title")}</Text>
            <Badge variant="light">{t("markets.news.badge.mock")}</Badge>
          </Group>

          <Stack gap="xs">
            {news.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "10px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.03)",
                  cursor: "pointer",
                }}
                onClick={() =>
                  notifications.show({
                    title: t("markets.news.toast_title"),
                    message: `${n.title} • (${n.s})`,
                  })
                }
              >
                <Group justify="space-between" align="flex-start">
                  <Group gap="xs">
                    <Text fw={800} size="sm">{n.s}</Text>
                    {sentimentBadge(n.sentiment)}
                  </Group>
                  <Text size="xs" c="dimmed">{n.t}</Text>
                </Group>
                <Text size="sm" style={{ marginTop: 6 }}>
                  {n.title}
                </Text>
              </div>
            ))}
          </Stack>

          <Text size="xs" c="dimmed" mt="sm">
            {t("markets.news.tip")}
          </Text>
        </MotionCard>
      </SimpleGrid>

      {/* Screener */}
      <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <Text fw={700}>{t("markets.screener.title")}</Text>
            <Badge variant="light">{tFmt("markets.screener.rows", { n: screenerRows.length })}</Badge>
          </Group>

          <Group gap="xs">
            <Badge variant="light">{tFmt("markets.screener.badge.vol", { a: volRange[0], b: volRange[1] })}</Badge>
            <Badge variant="light">{tFmt("markets.screener.badge.spread", { a: sprRange[0], b: sprRange[1] })}</Badge>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md" style={{ marginBottom: 12 }}>
          <div>
            <Text size="sm" c="dimmed" mb={6}>{t("markets.screener.vol_filter")}</Text>
            <RangeSlider value={volRange} onChange={setVolRange} min={0} max={100} step={1} label={(v) => `${v}`} />
          </div>

          <div>
            <Text size="sm" c="dimmed" mb={6}>{t("markets.screener.spread_filter")}</Text>
            <RangeSlider value={sprRange} onChange={setSprRange} min={0} max={100} step={1} label={(v) => `${v}`} />
          </div>

          <div>
            <Text size="sm" c="dimmed" mb={6}>{t("markets.screener.chg_filter")}</Text>
            <RangeSlider value={chgRange} onChange={setChgRange} min={-5} max={5} step={0.01} label={(v) => `${v.toFixed(2)}%`} />
          </div>

          <div>
            <Text size="sm" c="dimmed" mb={6}>{t("markets.screener.sort")}</Text>
            <SegmentedControl
              value={sortKey}
              onChange={(v) => setSortKey(v as any)}
              data={[
                { value: "chg", label: "Chg" },
                { value: "vol", label: "Vol" },
                { value: "spread", label: "Spread" },
                { value: "symbol", label: "Symbol" },
              ]}
            />
            <Group gap="xs" mt={8}>
              <Button size="xs" variant="light" onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}>
                {tFmt("markets.screener.dir", { dir: sortDir.toUpperCase() })}
              </Button>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconRefresh size={14} />}
                onClick={() =>
                  notifications.show({
                    title: t("markets.screener.sync_toast_title"),
                    message: t("markets.screener.sync_toast_msg"),
                  })
                }
              >
                {t("markets.screener.sync")}
              </Button>
            </Group>
          </div>
        </SimpleGrid>

        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ cursor: "pointer" }} onClick={() => toggleSort("symbol")}>
                {t("markets.screener.table.symbol")}{sortMark("symbol")}
              </Table.Th>
              <Table.Th>{t("markets.screener.table.trend")}</Table.Th>
              <Table.Th style={{ cursor: "pointer" }} onClick={() => toggleSort("chg")}>
                {t("markets.screener.table.chg")}{sortMark("chg")}
              </Table.Th>
              <Table.Th>{t("markets.screener.table.bid")}</Table.Th>
              <Table.Th>{t("markets.screener.table.ask")}</Table.Th>
              <Table.Th style={{ cursor: "pointer" }} onClick={() => toggleSort("spread")}>
                {t("markets.screener.table.spread")}{sortMark("spread")}
              </Table.Th>
              <Table.Th style={{ cursor: "pointer", textAlign: "right" }} onClick={() => toggleSort("vol")}>
                {t("markets.screener.table.vol")}{sortMark("vol")}
              </Table.Th>
              <Table.Th style={{ textAlign: "right" }}>{t("markets.screener.table.fav")}</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>{t("markets.screener.table.action")}</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {screenerRows.map((w) => {
              const bg =
                pulse[w.s] === "up"
                  ? "rgba(16,185,129,0.10)"
                  : pulse[w.s] === "down"
                  ? "rgba(239,68,68,0.10)"
                  : "transparent";

              const color = pulse[w.s] === "up" ? "lime" : pulse[w.s] === "down" ? "red" : undefined;

              const spreadRaw = w.ask - w.bid;
              const spreadText = w.s === "XAUUSD" || w.s === "USDJPY" ? spreadRaw.toFixed(2) : spreadRaw.toFixed(5);

              const favOn = isFav(w.s);

              return (
                <Table.Tr
                  key={w.s}
                  style={{
                    background: favOn ? "rgba(245,158,11,0.06)" : bg,
                    transition: "background 160ms ease",
                    cursor: "pointer",
                  }}
                  onClick={() => setSymbol(w.s)}
                  onDoubleClick={() => goTrade(w.s)}
                  onMouseEnter={() => setHoverSym(w.s)}
                  onMouseLeave={() => setHoverSym((cur) => (cur === w.s ? null : cur))}
                >
                  <Table.Td>
                    <Popover opened={hoverSym === w.s} position="right-start" offset={12} withArrow shadow="md">
                      <Popover.Target>
                        <div>
                          <Text fw={900}>{w.s}</Text>
                          <Text size="xs" c="dimmed">
                            {t("markets.screener.hint_hover")}
                          </Text>
                        </div>
                      </Popover.Target>

                      <Popover.Dropdown
                        style={{
                          width: 260,
                          background: "rgba(20,20,20,0.95)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 14,
                        }}
                      >
                        <Group justify="space-between" mb={6}>
                          <Badge variant="light">{w.s}</Badge>
                          <Badge variant="light" color={w.chg >= 0 ? "green" : "red"}>
                            {w.chg >= 0 ? "+" : ""}{w.chg}%
                          </Badge>
                        </Group>

                        <div style={{ height: 80 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparks[w.s] ?? []} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                              <Area type="monotone" dataKey="v" strokeWidth={2} fillOpacity={0.12} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        <Group mt="sm" gap="xs">
                          <Button size="xs" variant="light" onClick={() => setSymbol(w.s)}>
                            {t("markets.btn.preview")}
                          </Button>
                          <Button size="xs" onClick={() => goTrade(w.s)}>
                            {t("markets.btn.trade")}
                          </Button>
                        </Group>
                      </Popover.Dropdown>
                    </Popover>
                  </Table.Td>

                  <Table.Td style={{ width: 120 }}>
                    <div style={{ height: 26 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparks[w.s] ?? []}>
                          <Area type="monotone" dataKey="v" strokeWidth={1} fillOpacity={0.1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Table.Td>

                  <Table.Td>
                    <Badge variant="light" color={w.chg >= 0 ? "green" : "red"}>
                      {w.chg >= 0 ? "+" : ""}{w.chg}%
                    </Badge>
                  </Table.Td>

                  <Table.Td style={{ color }}>{fmtPrice(w.s, w.bid)}</Table.Td>
                  <Table.Td style={{ color }}>{fmtPrice(w.s, w.ask)}</Table.Td>

                  <Table.Td>
                    <Badge variant="light">{spreadText}</Badge>
                    <Text size="xs" c="dimmed">
                      norm {w.spreadNorm}
                    </Text>
                  </Table.Td>

                  <Table.Td style={{ textAlign: "right" }}>
                    <Badge variant="light" color={w.vol >= 70 ? "red" : w.vol >= 50 ? "yellow" : "green"}>
                      {w.vol}
                    </Badge>
                  </Table.Td>

                  <Table.Td style={{ textAlign: "right" }}>
                    <ActionIcon
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFav(w.s);
                      }}
                      aria-label="favorite"
                    >
                      <IconStar
                        size={16}
                        style={{
                          opacity: favOn ? 1 : 0.35,
                          color: favOn ? "gold" : "rgba(255,255,255,0.6)",
                          transition: "opacity 160ms ease, transform 160ms ease",
                          transform: favOn ? "scale(1.02)" : "scale(1)",
                        }}
                      />
                    </ActionIcon>
                  </Table.Td>

                  <Table.Td style={{ textAlign: "right" }}>
                    <Group justify="flex-end" gap="xs">
                      <Button size="xs" variant="light" onClick={(e) => { e.stopPropagation(); setSymbol(w.s); }}>
                        {t("markets.btn.preview")}
                      </Button>
                      <Button size="xs" onClick={(e) => { e.stopPropagation(); goTrade(w.s); }}>
                        {t("markets.btn.trade")}
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>

        <Text size="xs" c="dimmed" mt="sm">
          {t("markets.screener.note_norm")}
        </Text>
      </MotionCard>

      {/* ✅ Order Queue */}
      <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <Text fw={700}>{t("markets.orderq.title")}</Text>
            <Badge variant="light">{tFmt("markets.orderq.badge.orders", { n: orderQueue.length })}</Badge>
            <Badge variant="light" color="gray">{t("markets.orderq.badge.local")}</Badge>
          </Group>

          <Group gap="xs">
            <Button size="xs" variant="light" onClick={clearQueue}>
              {t("markets.orderq.clear")}
            </Button>
            <Button size="xs" color="green" onClick={sendAllMock}>
              {t("markets.orderq.send_all")}
            </Button>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
          <div>
            <Text size="sm" c="dimmed" mb={6}>{t("markets.orderq.side")}</Text>
            <SegmentedControl
              value={orderSide}
              onChange={(v) => setOrderSide(v as OrderSide)}
              data={[
                { value: "BUY", label: "BUY" },
                { value: "SELL", label: "SELL" },
              ]}
            />
          </div>

          <div>
            <Text size="sm" c="dimmed" mb={6}>{t("markets.orderq.type")}</Text>
            <SegmentedControl
              value={orderType}
              onChange={(v) => setOrderType(v as OrderType)}
              data={[
                { value: "MARKET", label: "Market" },
                { value: "LIMIT", label: "Limit" },
              ]}
            />
          </div>

          <div>
            <Text size="sm" c="dimmed" mb={6}>{t("markets.orderq.lots")}</Text>
            <TextInput
              value={orderLots}
              onChange={(e) => setOrderLots(e.currentTarget.value)}
              placeholder="0.01"
              styles={{ input: { background: "rgba(255,255,255,0.04)" } }}
            />
          </div>

          <div>
            <Text size="sm" c="dimmed" mb={6}>
              {t("markets.orderq.limit_price")} {orderType === "LIMIT" ? "" : t("markets.orderq.limit_disabled")}
            </Text>
            <TextInput
              value={orderLimitPrice}
              onChange={(e) => setOrderLimitPrice(e.currentTarget.value)}
              placeholder={mounted ? `${fmtPrice(symbol, (symbolMid(symbol) || last) as number)}` : "--"}
              disabled={orderType !== "LIMIT"}
              styles={{ input: { background: "rgba(255,255,255,0.04)" } }}
            />
          </div>

          <div>
            <Text size="sm" c="dimmed" mb={6}>{t("markets.orderq.sl_pips")}</Text>
            <TextInput
              value={orderSLPips}
              onChange={(e) => setOrderSLPips(e.currentTarget.value)}
              placeholder="e.g. 30"
              styles={{ input: { background: "rgba(255,255,255,0.04)" } }}
            />
          </div>

          <div>
            <Text size="sm" c="dimmed" mb={6}>{t("markets.orderq.tp_pips")}</Text>
            <TextInput
              value={orderTPPips}
              onChange={(e) => setOrderTPPips(e.currentTarget.value)}
              placeholder="e.g. 60"
              styles={{ input: { background: "rgba(255,255,255,0.04)" } }}
            />
          </div>

          <div style={{ gridColumn: "span 2" as any }}>
            <Text size="sm" c="dimmed" mb={6}>{t("markets.orderq.comment")}</Text>
            <TextInput
              value={orderComment}
              onChange={(e) => setOrderComment(e.currentTarget.value)}
              placeholder={t("markets.orderq.comment_ph")}
              styles={{ input: { background: "rgba(255,255,255,0.04)" } }}
            />
          </div>

          <div style={{ display: "grid", alignContent: "end" }}>
            <Button onClick={addToQueue}>
              {tFmt("markets.orderq.save_order", { symbol })}
            </Button>
            <Text size="xs" c="dimmed" mt={6}>
              {t("markets.orderq.tip")}
            </Text>
          </div>
        </SimpleGrid>

        <Divider my="sm" />

        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("markets.orderq.table.time")}</Table.Th>
              <Table.Th>{t("markets.orderq.table.symbol")}</Table.Th>
              <Table.Th>{t("markets.orderq.table.side")}</Table.Th>
              <Table.Th>{t("markets.orderq.table.type")}</Table.Th>
              <Table.Th>{t("markets.orderq.table.lots")}</Table.Th>
              <Table.Th>{t("markets.orderq.table.price")}</Table.Th>
              <Table.Th>{t("markets.orderq.table.sltp")}</Table.Th>
              <Table.Th>{t("markets.orderq.table.comment")}</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>{t("markets.orderq.table.action")}</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {orderQueue.length ? (
              orderQueue.map((o) => (
                <Table.Tr key={o.id}>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {new Date(o.ts).toLocaleTimeString()}
                    </Text>
                  </Table.Td>
                  <Table.Td><Text fw={800}>{o.symbol}</Text></Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={o.side === "BUY" ? "green" : "red"}>
                      {o.side}
                    </Badge>
                  </Table.Td>
                  <Table.Td><Badge variant="light">{o.type}</Badge></Table.Td>
                  <Table.Td>{o.lots}</Table.Td>
                  <Table.Td>
                    {o.type === "LIMIT" && o.price ? (
                      <Badge variant="light">{fmtPrice(o.symbol, o.price)}</Badge>
                    ) : (
                      <Text size="sm" c="dimmed">MKT</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {o.slPips !== undefined ? `SL ${o.slPips}` : "SL —"} •{" "}
                      {o.tpPips !== undefined ? `TP ${o.tpPips}` : "TP —"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {o.comment ?? "--"}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Button size="xs" variant="light" color="red" onClick={() => removeFromQueue(o.id)}>
                      {t("markets.orderq.remove")}
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={9}>
                  <Text c="dimmed" size="sm">
                    {t("markets.orderq.empty")}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </MotionCard>

      {/* Heatmap + Movers + Calendar */}
      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        {/* Heatmap */}
        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{t("markets.heatmap.title")}</Text>
            <Badge variant="light">{t("markets.heatmap.badge.momentum")}</Badge>
          </Group>

          <div style={{ display: "grid", gridTemplateColumns: "92px repeat(4, 1fr)", gap: 6 }}>
            <div />
            {tfs.map((x) => (
              <Text key={x} size="xs" c="dimmed" style={{ textAlign: "center" }}>
                {x}
              </Text>
            ))}

            {symbols.map((s) => (
              <div key={s} style={{ display: "contents" }}>
                <Text size="xs" c="dimmed" style={{ alignSelf: "center" }}>
                  {s}
                </Text>

                {tfs.map((tf0) => {
                  const cell = heat.find((h) => h.s === s && h.tf === tf0);
                  const v = cell?.v ?? 0;

                  return (
                    <div
                      key={`${s}-${tf0}`}
                      onClick={() => {
                        setSymbol(s);
                        setTf(tf0);
                        notifications.show({
                          title: t("markets.heatmap.toast_title"),
                          message: tFmt("markets.heatmap.toast_msg", { symbol: s, tf: tf0 }),
                        });
                      }}
                      onDoubleClick={() => goTrade(s)}
                      style={{
                        height: 30,
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: heatColor(v),
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer",
                        transition: "transform 120ms ease, border-color 120ms ease",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.16)";
                        (e.currentTarget as HTMLDivElement).style.transform = "scale(1.01)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)";
                        (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                      }}
                      title={`${s} ${tf0}: ${v}`}
                    >
                      <Text size="xs" fw={800}>
                        {v >= 0 ? "+" : ""}{v}
                      </Text>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <Text size="xs" c="dimmed" mt="sm">
            {t("markets.heatmap.tip")}
          </Text>
        </MotionCard>

        {/* Movers + Volume */}
        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{t("markets.movers.title")}</Text>
            <Badge variant="light">{t("markets.movers.badge.intraday")}</Badge>
          </Group>

          <Stack gap="xs">
            {movers.map((m) => (
              <div
                key={m.s}
                onClick={() => setSymbol(m.s)}
                onDoubleClick={() => goTrade(m.s)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr 60px",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <Text fw={900}>{m.s}</Text>

                <div style={{ alignSelf: "center" }}>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      overflow: "hidden",
                      background: "rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${clamp(m.vol, 0, 100)}%`,
                        background: m.vol >= 70 ? "rgba(239,68,68,0.7)" : "rgba(59,130,246,0.65)",
                      }}
                    />
                  </div>
                  <Text size="xs" c="dimmed" mt={6}>
                    {t("markets.movers.vol")} {m.vol} • {t("markets.spread")} {m.spread}
                  </Text>
                </div>

                <Badge variant="light" color={m.chg >= 0 ? "green" : "red"} style={{ justifySelf: "end" }}>
                  {m.chg >= 0 ? "+" : ""}{m.chg}%
                </Badge>
              </div>
            ))}
          </Stack>

          <Divider my="sm" />

          <Text fw={700} mb={6}>
            {t("markets.movers.volume_proxy")}
          </Text>

          <div style={{ height: 170 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeBars} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
  <CartesianGrid stroke={gridLine} strokeDasharray="3 3" />

<XAxis
  dataKey="s"
  tick={{ fill: axisTick, fontSize: 12 }}
  axisLine={{ stroke: axisLine }}
  tickLine={{ stroke: axisLine }}
/>

<YAxis
  tick={{ fill: axisTick, fontSize: 12 }}
  axisLine={{ stroke: axisLine }}
  tickLine={{ stroke: axisLine }}
/>

<Tooltip
  cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}
  contentStyle={{
    background: tooltipBg,
    border: `1px solid ${tooltipBorder}`,
    borderRadius: 10,
    color: tooltipText,
  }}
  labelStyle={{ color: tooltipText }}
  itemStyle={{ color: tooltipText }}
/>

  <Bar
    dataKey="v"
    fill="rgba(59,130,246,0.70)"
    stroke="rgba(59,130,246,0.95)"
    strokeWidth={1}
    radius={[8, 8, 0, 0]}
    activeBar={{ fill: "rgba(59,130,246,0.95)" }}
  />
</BarChart>
            </ResponsiveContainer>
          </div>
        </MotionCard>

        {/* Calendar */}
        <MotionCard withBorder radius="lg" p="md" variants={cardAnim} initial="hidden" animate="show" style={{ background: cardBg }}>
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{t("markets.calendar.title")}</Text>
            <Badge variant="light">{t("markets.calendar.badge.next1h")}</Badge>
          </Group>

          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("markets.calendar.col.in")}</Table.Th>
                <Table.Th>{t("markets.calendar.col.impact")}</Table.Th>
                <Table.Th>{t("markets.calendar.col.event")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {mounted && econ.length ? (
                econ.map((e, idx) => {
                  const sec = Math.max(0, Math.floor((e.t - nowTs) / 1000));
                  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
                  const ss = String(sec % 60).padStart(2, "0");
                  const c = e.impact === "HIGH" ? "red" : e.impact === "MED" ? "yellow" : "green";

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
                        <Text size="xs" c="dimmed">
                          {t("markets.calendar.prev")} {e.prev} • {t("markets.calendar.fcst")} {e.fc}
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
                        <Text fw={700} size="sm">{t("markets.loading")}</Text>
                        <Text size="xs" c="dimmed">{t("markets.calendar.prev")} -- • {t("markets.calendar.fcst")} --</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </>
              )}
            </Table.Tbody>
          </Table>

          <Text size="xs" c="dimmed" mt="sm">
            {t("markets.calendar.tip")}
          </Text>
        </MotionCard>
      </SimpleGrid>
    </Stack>
  );
}