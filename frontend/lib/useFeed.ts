// lib/useFeed.ts
"use client";

import { useEffect, useState } from "react";
import type { SymbolName, Candle, Depth } from "@/lib/fakeFeed";
import { decimals, generateDepth, generateHistoryCandles } from "@/lib/fakeFeed";

export function useFeed(symbol: SymbolName) {
  const [mounted, setMounted] = useState(false);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [spread, setSpread] = useState<number>(0.17);

  const [tick, setTick] = useState<{ last: number; chgPct: number } | null>(null);
  const [depth, setDepth] = useState<Depth | null>(null);

  useEffect(() => setMounted(true), []);

  // init history per symbol
  useEffect(() => {
    if (!mounted) return;

    const history = generateHistoryCandles({
      symbol,
      bars: 420,
      tfSeconds: 60,
    });

    setCandles(history);

    const last = history[history.length - 1]?.close ?? 0;
    setTick({ last, chgPct: 0 });

    setSpread(symbol === "XAUUSD" ? 0.17 : symbol === "USDJPY" ? 0.02 : 0.0001);

    // init depth
    setDepth(generateDepth({ symbol, mid: last }));
  }, [mounted, symbol]);

  // stream candle + tick + depth
  useEffect(() => {
    if (!mounted) return;

    const dp = decimals(symbol);
    const tf = 60;

    const id = setInterval(() => {
      // update candles, and derive tick/depth from the NEW candles inside same update
      setCandles((prev) => {
        if (prev.length < 5) return prev;

        const last = prev[prev.length - 1];
        const nowSec = Math.floor(Date.now() / 1000);
        const shouldRoll = nowSec >= last.time + tf;

        const next = [...prev];

        if (shouldRoll) {
          const open = last.close;
          const drift =
            (Math.random() - 0.5) *
            (symbol === "XAUUSD" ? 0.9 : symbol === "USDJPY" ? 0.08 : 0.001);

          const close = open + drift;

          const wick =
            symbol === "XAUUSD" ? 0.4 : symbol === "USDJPY" ? 0.04 : 0.00035;

          const high = Math.max(open, close) + Math.random() * wick;
          const low = Math.min(open, close) - Math.random() * wick;

          const c: Candle = {
            time: last.time + tf,
            open: +open.toFixed(dp),
            high: +high.toFixed(dp),
            low: +low.toFixed(dp),
            close: +close.toFixed(dp),
          };

          next.push(c);

          // ✅ tick + depth from fresh candle
          setTick((t) => {
            const prevLast = t?.last ?? c.close;
            const chgPct = ((c.close - prevLast) / (prevLast || 1)) * 100;
            return { last: c.close, chgPct };
          });

          setDepth(generateDepth({ symbol, mid: c.close }));

          return next.slice(-1200);
        } else {
          // update last candle
          const open = last.open;

          const drift =
            (Math.random() - 0.5) *
            (symbol === "XAUUSD" ? 0.25 : symbol === "USDJPY" ? 0.02 : 0.0003);

          const close = last.close + drift;
          const high = Math.max(last.high, close);
          const low = Math.min(last.low, close);

          const updated: Candle = {
            ...last,
            open: +open.toFixed(dp),
            close: +close.toFixed(dp),
            high: +high.toFixed(dp),
            low: +low.toFixed(dp),
          };

          next[next.length - 1] = updated;

          // ✅ tick + depth from fresh candle
          setTick((t) => {
            const prevLast = t?.last ?? updated.close;
            const chgPct = ((updated.close - prevLast) / (prevLast || 1)) * 100;
            return { last: updated.close, chgPct };
          });

          setDepth(generateDepth({ symbol, mid: updated.close }));

          return next;
        }
      });
    }, 1000);

    return () => clearInterval(id);
  }, [mounted, symbol]);

  return { mounted, candles, tick, depth, spread };
}
