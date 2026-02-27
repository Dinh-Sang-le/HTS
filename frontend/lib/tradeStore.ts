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

/** Position hiển thị trong PositionsTable (mỗi fill => 1 position) */
export type Position = {
  id: string; // PositionsTable dùng p.id
  orderId: string;

  symbol: SymbolName;
  side: Side;
  lots: number;
  entry: number;

  // ✅ GIỮ NGUYÊN các cột đang dùng
  last: number; // Price column
  unrealizedPnl: number; // P/L column

  openedAt: number;
};

/** Fill marker để vẽ lên chart */
export type Fill = {
  id: string;
  orderId: string;
  symbol: SymbolName;
  side: Side;
  lots: number;
  price: number;
  ts: number; // epoch ms
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

/** P/L demo: USD-ish, dùng last - entry * lots * 100 (tuỳ bạn scale) */
function calcPnlUSD(p: Pick<Position, "side" | "lots" | "entry">, last: number) {
  const diff = p.side === "BUY" ? last - p.entry : p.entry - last;
  // scale demo (giữ y như logic cũ style)
  return diff * p.lots * 100;
}

/**
 * ✅ HEDGING MODE:
 * Mỗi fill tạo 1 Position riêng + thêm Fill marker
 */
function createPositionFromFill(args: {
  orderId: string;
  sym: SymbolName;
  side: Side;
  lots: number;
  price: number;
  last: number;
  ts: number;
}): Position {
  const p: Position = {
    id: uid("pos_"),
    orderId: args.orderId,
    symbol: args.sym,
    side: args.side,
    lots: args.lots,
    entry: args.price,
    last: args.last,
    unrealizedPnl: 0,
    openedAt: args.ts,
  };
  p.unrealizedPnl = calcPnlUSD(p, p.last);
  return p;
}

/** Net position (gộp) để giữ UI badge/line entry như cũ */
function computeNetPosition(positions: Position[], symbol: SymbolName): Position | null {
  const ps = positions.filter((p) => p.symbol === symbol);
  if (!ps.length) return null;

  // nếu có hedge BUY+SELL cùng lúc thì net cần phức tạp hơn
  // hiện tại giả định user vào 1 phía / hoặc bạn muốn hiển thị theo phía đang nhiều nhất
  const buyLots = ps.filter((p) => p.side === "BUY").reduce((s, p) => s + p.lots, 0);
  const sellLots = ps.filter((p) => p.side === "SELL").reduce((s, p) => s + p.lots, 0);

  const side: Side = buyLots >= sellLots ? "BUY" : "SELL";
  const sameSide = ps.filter((p) => p.side === side);
  const totalLots = sameSide.reduce((s, p) => s + p.lots, 0);
  if (totalLots <= 0) return null;

  const avgEntry = sameSide.reduce((s, p) => s + p.entry * p.lots, 0) / totalLots;
  const last = sameSide[0].last;

  const net: Position = {
    id: `net_${symbol}_${side}`,
    orderId: "NET",
    symbol,
    side,
    lots: totalLots,
    entry: avgEntry,
    last,
    unrealizedPnl: calcPnlUSD({ side, lots: totalLots, entry: avgEntry }, last),
    openedAt: sameSide[0].openedAt,
  };

  return net;
}

type TradeStore = {
  // hydration flag (fix mismatch SSR/client with persist)
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  orders: SavedOrder[];
  positions: Position[];
  fills: Fill[];

  placeOrder: (input: PlaceOrderInput, ctx: PlaceCtx) => PlaceResult;

  /** ✅ giữ API cũ: trả về NET position (gộp) */
  getOpenPosition: (symbol: SymbolName) => Position | null;

  /** ✅ NEW: lấy list positions (nhiều dòng) */
  getPositions: (symbol?: SymbolName) => Position[];

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
      fills: [],

      getOpenPosition: (symbol) => {
        return computeNetPosition(get().positions, symbol);
      },

      getPositions: (symbol) => {
        const ps = get().positions;
        return symbol ? ps.filter((p) => p.symbol === symbol) : ps;
      },

      clearOrders: () => set({ orders: [] }),
      resetAll: () => set({ orders: [], positions: [], fills: [] }),

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
          const fillPrice = marketFillPrice(input.side, tick, spread);

          const ord: SavedOrder = {
            id,
            ts,
            sym: input.symbol,
            side: input.side,
            type: "MARKET",
            status: "FILLED",
            lots,
            price: +fillPrice,
            comment: input.comment,
            slPrice: null,
            tpPrice: null,
          };

          set((st) => {
            const nextOrders = [ord, ...st.orders].slice(0, 500);

            const pos = createPositionFromFill({
              orderId: ord.id,
              sym: input.symbol,
              side: input.side,
              lots,
              price: +fillPrice,
              last: tick.last,
              ts,
            });

            const fill: Fill = {
              id: uid("fill_"),
              orderId: ord.id,
              symbol: input.symbol,
              side: input.side,
              lots,
              price: +fillPrice,
              ts,
            };

            return {
              orders: nextOrders,
              positions: [pos, ...st.positions],
              fills: [fill, ...st.fills].slice(0, 300),
            };
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

        const fillsToApply: Array<{ id: string; price: number; sym: SymbolName; side: Side; lots: number; ts: number }> = [];

        for (const o of openLimits) {
          const lp = o.limitPrice!;
          if (shouldFillLimit(o.side, lp, tick, spread)) {
            fillsToApply.push({ id: o.id, price: lp, sym: o.sym, side: o.side, lots: o.lots, ts: Date.now() });
          }
        }

        if (!fillsToApply.length) return;

        set((prev) => {
          // update orders -> mark them FILLED
          const nextOrders = prev.orders.map((o) => {
            const f = fillsToApply.find((x) => x.id === o.id);
            if (!f) return o;
            return { ...o, status: "FILLED" as const, price: f.price };
          });

          // create positions + fills markers
          const newPositions: Position[] = [];
          const newFills: Fill[] = [];

          for (const f of fillsToApply) {
            newPositions.push(
              createPositionFromFill({
                orderId: f.id,
                sym: f.sym,
                side: f.side,
                lots: f.lots,
                price: f.price,
                last: tick.last,
                ts: f.ts,
              })
            );

            newFills.push({
              id: uid("fill_"),
              orderId: f.id,
              symbol: f.sym,
              side: f.side,
              lots: f.lots,
              price: f.price,
              ts: f.ts,
            });
          }

          return {
            orders: nextOrders,
            positions: [...newPositions, ...prev.positions],
            fills: [...newFills, ...prev.fills].slice(0, 300),
          };
        });
      },

      /** ✅ useTradeEngine.ts sẽ gọi onTick(...) */
      onTick: (symbol, tick, spread) => {
        // gọi chung 1 đường: update mark + fill limit
        get().processTick(symbol, tick, spread ?? null);
      },
    }),
    {
      name: "hts_trade_store_v2",
      version: 2,
      partialize: (st) => ({
        orders: st.orders,
        positions: st.positions,
        fills: st.fills,
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