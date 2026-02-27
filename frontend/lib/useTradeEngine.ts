// lib/useTradeEngine.ts
"use client";

import { useEffect } from "react";
import type { SymbolName } from "@/lib/fakeFeed";
import type { TickLike } from "@/lib/tradeStore";
import { useTradeStore } from "@/lib/tradeStore";

/**
 * Push ticks từ feed -> store
 * - fill LIMIT pending
 * - update last & unrealized P/L
 */
export function useTradeEngine(
  symbol: SymbolName,
  tick: TickLike | null | undefined,
  spread?: number | null
) {
  const onTick = useTradeStore((s) => s.onTick);

  useEffect(() => {
    if (!tick || !Number.isFinite(tick.last) || tick.last <= 0) return;
    onTick(symbol, tick, spread ?? null);
  }, [symbol, tick?.last, spread, onTick]);
}
