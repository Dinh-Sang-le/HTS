// lib/tradeStore.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SymbolName } from "@/lib/fakeFeed";

export type Side = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";
export type OrderStatus = "FILLED" | "OPEN" | "REJECTED" | "CANCELLED";

export type TickLike = {
  last: number;
  bid?: number;
  ask?: number;
  ts?: number;
};

export type PlaceCtx = {
  tick: TickLike;
  spread?: number | null;
};

/** Lưu order history (nhiều bản ghi) */
export type SavedOrder = {
  id: string;
  ts: number;
  sym: SymbolName;

  side: Side;
  type: OrderType;
  status: OrderStatus;

  lots: number;

  limitPrice?: number; // LIMIT
  price?: number; // filled price

  slPrice?: number | null;
  tpPrice?: number | null;

  comment?: string;
};

/** Position hiển thị trong PositionsTable (giữ nguyên Price & P/L) */
export type Position = {
  id: string; // PositionsTable dùng p.id
  symbol: SymbolName;
  side: Side;
  lots: number;
  entry: number;

  // ✅ GIỮ NGUYÊN
  last: number; // Price column
  unrealizedPnl: number; // P/L column

  openedAt: number;
};

type PlaceOrderInput = {
  symbol: SymbolName;
  side: Side;
  type: OrderType;
  lots: number;

  limitPrice?: number;

  slPips?: number | null;
  tpPips?: number | null;

  comment?: string;
  riskPct?: number | null;
};

type EngineOrder = {
  id: string;
  symbol: SymbolName;
  side: Side;
  type: OrderType;
  lots: number;
  comment?: string;

  filledPrice?: number;
  limitPrice?: number;

  slPrice?: number | null;
  tpPrice?: number | null;

  status: OrderStatus;
};

type PlaceResult =
  | { ok: true; order: EngineOrder }
  | { ok: false; reason: string };

function uid(prefix = "id_") {
  return `${prefix}${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

/** MARKET fill price: BUY=ask, SELL=bid (derive from last +/- spread/2 if missing) */
function marketFillPrice(side: Side, tick: TickLike, spread?: number | null) {
  const last = tick.last ?? 0;
  const spr = spread ?? 0;
  const bid = tick.bid ?? (last - spr / 2);
  const ask = tick.ask ?? (last + spr / 2);
  return side === "BUY" ? ask : bid;
}

/** LIMIT fill condition */
function shouldFillLimit(side: Side, limitPrice: number, tick: TickLike, spread?: number | null) {
  const last = tick.last ?? 0;
  const spr = spread ?? 0;
  const bid = tick.bid ?? (last - spr / 2);
  const ask = tick.ask ?? (last + spr / 2);

  // BUY LIMIT fills when ask <= limit
  // SELL LIMIT fills when bid >= limit
  if (side === "BUY") return ask <= limitPrice;
  return bid >= limitPrice;
}

function weightedAvgPrice(p1: number, q1: number, p2: number, q2: number) {
  const q = q1 + q2;
  if (q <= 0) return p2;
  return (p1 * q1 + p2 * q2) / q;
}

/** Demo P/L: giữ đúng logic p.last + p.unrealizedPnl */
function calcPnlUSD(pos: Pick<Position, "symbol" | "side" | "lots" | "entry">, last: number) {
  const dir = pos.side === "BUY" ? 1 : -1;

  // multiplier demo (bạn có thể thay theo symbolSpecs nếu muốn)
  const mul =
    pos.symbol === "XAUUSD"
      ? 100
      : pos.symbol === "USDJPY"
      ? 100
      : 100000; // EURUSD/GBPUSD demo

  return (last - pos.entry) * dir * pos.lots * mul;
}

/** netting position: 1 position / symbol */
function applyFillToPositions(prevPositions: Position[], fill: { sym: SymbolName; side: Side; lots: number; price: number; last: number }) {
  const now = Date.now();
  const cur = prevPositions.find((p) => p.symbol === fill.sym);

  // no current => open new
  if (!cur) {
    const pos: Position = {
      id: uid("pos_"),
      symbol: fill.sym,
      side: fill.side,
      lots: fill.lots,
      entry: fill.price,
      last: fill.last,
      unrealizedPnl: 0,
      openedAt: now,
    };
    pos.unrealizedPnl = calcPnlUSD(pos, pos.last);
    return [...prevPositions, pos];
  }

  // same side => increase & avg entry
  if (cur.side === fill.side) {
    const newLots = cur.lots + fill.lots;
    const avgEntry = weightedAvgPrice(cur.entry, cur.lots, fill.price, fill.lots);

    const updated: Position = {
      ...cur,
      lots: newLots,
      entry: avgEntry,
      last: fill.last,
    };
    updated.unrealizedPnl = calcPnlUSD(updated, updated.last);

    return prevPositions.map((p) => (p.id === cur.id ? updated : p));
  }

  // opposite side => reduce/flip
  const remaining = cur.lots - fill.lots;

  // reduce (still cur side)
  if (remaining > 0) {
    const updated: Position = {
      ...cur,
      lots: remaining,
      last: fill.last,
    };
    updated.unrealizedPnl = calcPnlUSD(updated, updated.last);
    return prevPositions.map((p) => (p.id === cur.id ? updated : p));
  }

  // flat
  if (remaining === 0) {
    return prevPositions.filter((p) => p.id !== cur.id);
  }

  // flip: open new side with leftover
  const newPos: Position = {
    id: uid("pos_"),
    symbol: fill.sym,
    side: fill.side,
    lots: Math.abs(remaining),
    entry: fill.price,
    last: fill.last,
    unrealizedPnl: 0,
    openedAt: now,
  };
  newPos.unrealizedPnl = calcPnlUSD(newPos, newPos.last);

  return [...prevPositions.filter((p) => p.id !== cur.id), newPos];
}

type TradeStore = {
  // hydration flag (fix mismatch SSR/client with persist)
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  orders: SavedOrder[];
  positions: Position[];

  placeOrder: (input: PlaceOrderInput, ctx: PlaceCtx) => PlaceResult;
  getOpenPosition: (symbol: SymbolName) => Position | null;

  closePosition: (positionId: string) => void;

  /** update live mark -> keeps Price (last) & P/L (unrealizedPnl) */
  updateMark: (symbol: SymbolName, last: number) => void;

  /** fill open limit + update mark each tick */
  processTick: (symbol: SymbolName, tick: TickLike, spread?: number | null) => void;

  /** alias for your useTradeEngine.ts */
  onTick: (symbol: SymbolName, tick: TickLike, spread?: number | null) => void;

  clearOrders: () => void;
  resetAll: () => void;
};

export const useTradeStore = create<TradeStore>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      orders: [],
      positions: [],

      getOpenPosition: (symbol) => {
        const p = get().positions.find((x) => x.symbol === symbol);
        return p ?? null;
      },

      clearOrders: () => set({ orders: [] }),
      resetAll: () => set({ orders: [], positions: [] }),

      closePosition: (positionId) => {
        set((st) => ({
          positions: st.positions.filter((p) => p.id !== positionId),
        }));
      },

      updateMark: (symbol, last) => {
        if (!Number.isFinite(last) || last <= 0) return;

        set((st) => ({
          positions: st.positions.map((p) => {
            if (p.symbol !== symbol) return p;
            const pnl = calcPnlUSD(p, last);
            return { ...p, last, unrealizedPnl: pnl };
          }),
        }));
      },

      placeOrder: (input, ctx) => {
        const { tick, spread } = ctx;

        if (!input.symbol) return { ok: false, reason: "Symbol missing" };
        if (!input.side) return { ok: false, reason: "Side missing" };
        if (!input.type) return { ok: false, reason: "Type missing" };

        const lots = Number(input.lots ?? 0);
        if (!Number.isFinite(lots) || lots <= 0) return { ok: false, reason: "Lots must be > 0" };
        if (!tick?.last || !Number.isFinite(tick.last) || tick.last <= 0) return { ok: false, reason: "No tick price" };

        const id = uid("ord_");
        const ts = Date.now();

        // ===== MARKET: fill immediately
        if (input.type === "MARKET") {
          const fill = marketFillPrice(input.side, tick, spread);

          const ord: SavedOrder = {
            id,
            ts,
            sym: input.symbol,
            side: input.side,
            type: "MARKET",
            status: "FILLED",
            lots,
            price: +fill,
            comment: input.comment,
            slPrice: null,
            tpPrice: null,
          };

          // IMPORTANT: append new order, do not replace
          set((st) => {
            const nextOrders = [ord, ...st.orders].slice(0, 500);

            const nextPositions = applyFillToPositions(st.positions, {
              sym: input.symbol,
              side: input.side,
              lots,
              price: +fill,
              last: tick.last,
            });

            return { orders: nextOrders, positions: nextPositions };
          });

          return { ok: true, order: toEngineOrder(ord) };
        }

        // ===== LIMIT: store OPEN, fill later via processTick/onTick
        if (input.type === "LIMIT") {
          if (input.limitPrice == null || !Number.isFinite(input.limitPrice)) {
            return { ok: false, reason: "Limit price missing" };
          }

          const ord: SavedOrder = {
            id,
            ts,
            sym: input.symbol,
            side: input.side,
            type: "LIMIT",
            status: "OPEN",
            lots,
            limitPrice: +input.limitPrice,
            comment: input.comment,
            slPrice: null,
            tpPrice: null,
          };

          set((st) => ({
            orders: [ord, ...st.orders].slice(0, 500),
          }));

          // optional immediate fill if already touched
          if (shouldFillLimit(input.side, +input.limitPrice, tick, spread)) {
            get().processTick(input.symbol, tick, spread);
          }

          return { ok: true, order: toEngineOrder(ord) };
        }

        return { ok: false, reason: "Unsupported order type" };
      },

      processTick: (symbol, tick, spread) => {
        const st = get();

        // 1) update mark for Price/P&L
        get().updateMark(symbol, tick.last);

        // 2) fill OPEN LIMIT orders if touched
        const openLimits = st.orders.filter(
          (o) => o.sym === symbol && o.type === "LIMIT" && o.status === "OPEN" && o.limitPrice != null
        );
        if (!openLimits.length) return;

        const fills: Array<{ id: string; price: number; sym: SymbolName; side: Side; lots: number }> = [];

        for (const o of openLimits) {
          const lp = o.limitPrice!;
          if (shouldFillLimit(o.side, lp, tick, spread)) {
            fills.push({ id: o.id, price: lp, sym: o.sym, side: o.side, lots: o.lots });
          }
        }

        if (!fills.length) return;

        set((prev) => {
          // update orders -> mark them FILLED
          const nextOrders = prev.orders.map((o) => {
            const f = fills.find((x) => x.id === o.id);
            if (!f) return o;
            return { ...o, status: "FILLED" as const, price: f.price };
          });

          // apply fills to positions
          let nextPositions = prev.positions;
          for (const f of fills) {
            nextPositions = applyFillToPositions(nextPositions, {
              sym: f.sym,
              side: f.side,
              lots: f.lots,
              price: f.price,
              last: tick.last,
            });
          }

          return { orders: nextOrders, positions: nextPositions };
        });
      },

      /** ✅ useTradeEngine.ts sẽ gọi onTick(...) */
      onTick: (symbol, tick, spread) => {
        // gọi chung 1 đường: update mark + fill limit
        get().processTick(symbol, tick, spread ?? null);
      },
    }),
    {
      name: "hts_trade_store_v1",
      version: 1,
      partialize: (st) => ({
        orders: st.orders,
        positions: st.positions,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/** Adapter: shape mà trading.tsx đang dùng: r.order.side/type/lots + filledPrice/limitPrice */
function toEngineOrder(o: SavedOrder): EngineOrder {
  return {
    id: o.id,
    symbol: o.sym,
    side: o.side,
    type: o.type,
    lots: o.lots,
    comment: o.comment,

    filledPrice: o.status === "FILLED" ? o.price : undefined,
    limitPrice: o.type === "LIMIT" ? o.limitPrice : undefined,

    slPrice: o.slPrice ?? null,
    tpPrice: o.tpPrice ?? null,

    status: o.status,
  };
}
