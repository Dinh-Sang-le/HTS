// lib/useTradeEngine.ts
"use client";

import { useEffect } from "react";
import type { SymbolName, Tick } from "./tradeTypes";
import { useTradeStore } from "./tradeStore";

/**
 * Push ticks từ feed -> OMS demo store
 * - fill LIMIT pending
 * - update unrealized P/L
 */
export function useTradeEngine(
  symbol: SymbolName,
  tick: Tick | null | undefined,
  spread?: number | null
) {
  const onTick = useTradeStore((s) => s.onTick);

  useEffect(() => {
    if (!tick || !Number.isFinite(tick.last) || tick.last <= 0) return;
    onTick(symbol, tick, spread ?? null);
  }, [symbol, tick?.last, spread, onTick]);
}
