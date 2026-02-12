// lib/tradeStore.ts
import { create } from "zustand";
import type { Order, PlaceOrderRequest, Position, SymbolName, Tick, TradeEvent } from "./tradeTypes";
import { SYMBOL_SPECS, roundToDigits } from "./symbolSpecs";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function calcSlTpPrices(req: PlaceOrderRequest, entryPrice: number) {
  const spec = SYMBOL_SPECS[req.symbol];
  const pip = spec.pipSize;

  const slPips = req.slPips ?? null;
  const tpPips = req.tpPips ?? null;

  let slPrice: number | null = null;
  let tpPrice: number | null = null;

  if (slPips && slPips > 0) {
    slPrice = req.side === "BUY" ? entryPrice - slPips * pip : entryPrice + slPips * pip;
    slPrice = roundToDigits(slPrice, spec.digits);
  }
  if (tpPips && tpPips > 0) {
    tpPrice = req.side === "BUY" ? entryPrice + tpPips * pip : entryPrice - tpPips * pip;
    tpPrice = roundToDigits(tpPrice, spec.digits);
  }

  return { slPrice, tpPrice };
}

function markPriceFromTick(tick: Tick, spread?: number | null, side?: "BUY" | "SELL") {
  const last = tick.last ?? 0;
  const spr = spread ?? 0;
  const bid = tick.bid ?? (last - spr / 2);
  const ask = tick.ask ?? (last + spr / 2);

  if (side === "BUY") return ask;
  if (side === "SELL") return bid;
  return last;
}

function computeUnrealized(symbol: SymbolName, side: "BUY" | "SELL", lots: number, entry: number, last: number) {
  const { pipSize, pipValuePerLotUSD } = SYMBOL_SPECS[symbol];
  const diff = side === "BUY" ? last - entry : entry - last;
  const pips = diff / pipSize;
  return pips * pipValuePerLotUSD * lots;
}

type TradeState = {
  orders: Order[];
  positions: Position[];
  events: TradeEvent[];
  lastTickBySymbol: Partial<Record<SymbolName, Tick>>;

  placeOrder: (req: PlaceOrderRequest, ctx: { tick: Tick; spread?: number | null }) =>
    | { ok: true; order: Order }
    | { ok: false; reason: string };

  cancelOrder: (orderId: string) => void;
  closePosition: (positionId: string) => void;

  onTick: (symbol: SymbolName, tick: Tick, spread?: number | null) => void;

  getOpenPosition: (symbol: SymbolName) => Position | undefined;
};

export const useTradeStore = create<TradeState>((set, get) => ({
  orders: [],
  positions: [],
  events: [],
  lastTickBySymbol: {},

  getOpenPosition: (symbol) => get().positions.find((p) => p.symbol === symbol),

  placeOrder: (req, ctx) => {
    if (!req.symbol) return { ok: false, reason: "Missing symbol" };
    if (!req.lots || req.lots <= 0) return { ok: false, reason: "Lots must be > 0" };
    if (req.type === "LIMIT") {
      if (!req.limitPrice || req.limitPrice <= 0) return { ok: false, reason: "Limit price is required" };
    }

    const order: Order = {
      id: uid("ord"),
      ts: Date.now(),
      symbol: req.symbol,
      side: req.side,
      type: req.type,
      lots: req.lots,
      limitPrice: req.type === "LIMIT" ? req.limitPrice : undefined,
      slPrice: null,
      tpPrice: null,
      comment: req.comment,
      status: "PENDING",
    };

    // ===== MARKET fill ngay
    if (req.type === "MARKET") {
      const fill = markPriceFromTick(ctx.tick, ctx.spread, req.side);
      const { slPrice, tpPrice } = calcSlTpPrices(req, fill);

      order.status = "FILLED";
      order.filledPrice = fill;
      order.filledTs = Date.now();
      order.slPrice = slPrice;
      order.tpPrice = tpPrice;

      const positions = [...get().positions];
      const existing = positions.find((p) => p.symbol === req.symbol);

      let nextPos: Position;

      if (!existing) {
        nextPos = {
          id: uid("pos"),
          symbol: req.symbol,
          side: req.side,
          lots: req.lots,
          entry: fill,
          slPrice,
          tpPrice,
          openedTs: Date.now(),
          last: ctx.tick.last,
          unrealizedPnl: 0,
          lastUpdateTs: Date.now(),
        };
        positions.push(nextPos);
      } else {
        // netting đơn giản
        if (existing.side === req.side) {
          const newLots = existing.lots + req.lots;
          const avg = (existing.entry * existing.lots + fill * req.lots) / newLots;
          nextPos = {
            ...existing,
            lots: newLots,
            entry: avg,
            slPrice: slPrice ?? existing.slPrice ?? null,
            tpPrice: tpPrice ?? existing.tpPrice ?? null,
            last: ctx.tick.last,
            lastUpdateTs: Date.now(),
          };
          positions[positions.findIndex((p) => p.id === existing.id)] = nextPos;
        } else {
          const newLots = existing.lots - req.lots;
          if (newLots > 0) {
            nextPos = { ...existing, lots: newLots, last: ctx.tick.last, lastUpdateTs: Date.now() };
            positions[positions.findIndex((p) => p.id === existing.id)] = nextPos;
          } else if (newLots < 0) {
            nextPos = {
              ...existing,
              side: req.side,
              lots: Math.abs(newLots),
              entry: fill,
              slPrice,
              tpPrice,
              last: ctx.tick.last,
              unrealizedPnl: 0,
              lastUpdateTs: Date.now(),
            };
            positions[positions.findIndex((p) => p.id === existing.id)] = nextPos;
          } else {
            positions.splice(positions.findIndex((p) => p.id === existing.id), 1);
            nextPos = { ...existing, last: ctx.tick.last, lastUpdateTs: Date.now() };
          }
        }
      }

      // ✅ ép kiểu events để TS không “đỏ set”
      set((s) => {
        const ev: TradeEvent[] = [
          { type: "ORDER_PLACED", order },
          { type: "ORDER_FILLED", order, position: nextPos },
          ...s.events,
        ].slice(0, 200);

        return { orders: [order, ...s.orders], positions, events: ev };
      });

      return { ok: true, order };
    }

    // ===== LIMIT pending
    set((s) => {
      const ev: TradeEvent[] = [{ type: "ORDER_PLACED", order }, ...s.events].slice(0, 200);
      return { orders: [order, ...s.orders], events: ev };
    });

    return { ok: true, order };
  },

  cancelOrder: (orderId) => {
    set((s) => {
      const ev: TradeEvent[] = [{ type: "ORDER_CANCELLED", orderId }, ...s.events].slice(0, 200);
      return {
        orders: s.orders.map((o) => (o.id === orderId && o.status === "PENDING" ? { ...o, status: "CANCELLED" } : o)),
        events: ev,
      };
    });
  },

  closePosition: (positionId) => {
    set((s) => {
      const ev: TradeEvent[] = [{ type: "POSITION_CLOSED", positionId, realizedPnl: 0 }, ...s.events].slice(0, 200);
      return { positions: s.positions.filter((p) => p.id !== positionId), events: ev };
    });
  },

  onTick: (symbol, tick, spread) => {
    set((s) => ({ lastTickBySymbol: { ...s.lastTickBySymbol, [symbol]: tick } }));

    const st = get();

    // fill LIMIT
    const pending = st.orders.filter(
      (o) => o.symbol === symbol && o.status === "PENDING" && o.type === "LIMIT" && o.limitPrice
    );

    let orders = st.orders;
    let positions = [...st.positions];
    let events = st.events;

    if (pending.length) {
      for (const o of pending) {
        const last = tick.last;
        const limit = o.limitPrice!;
        const shouldFill = o.side === "BUY" ? last <= limit : last >= limit;
        if (!shouldFill) continue;

        const fillPrice = limit;

        const filledOrder: Order = { ...o, status: "FILLED", filledPrice: fillPrice, filledTs: Date.now() };

        const existing = positions.find((p) => p.symbol === symbol);
        let nextPos: Position;

        if (!existing) {
          nextPos = {
            id: uid("pos"),
            symbol,
            side: o.side,
            lots: o.lots,
            entry: fillPrice,
            slPrice: o.slPrice ?? null,
            tpPrice: o.tpPrice ?? null,
            openedTs: Date.now(),
            last: tick.last,
            unrealizedPnl: 0,
            lastUpdateTs: Date.now(),
          };
          positions.push(nextPos);
        } else {
          if (existing.side === o.side) {
            const newLots = existing.lots + o.lots;
            const avg = (existing.entry * existing.lots + fillPrice * o.lots) / newLots;
            nextPos = {
              ...existing,
              lots: newLots,
              entry: avg,
              slPrice: (o.slPrice ?? existing.slPrice) ?? null,
              tpPrice: (o.tpPrice ?? existing.tpPrice) ?? null,
              last: tick.last,
              lastUpdateTs: Date.now(),
            };
            positions[positions.findIndex((p) => p.id === existing.id)] = nextPos;
          } else {
            const newLots = existing.lots - o.lots;
            if (newLots > 0) {
              nextPos = { ...existing, lots: newLots, last: tick.last, lastUpdateTs: Date.now() };
              positions[positions.findIndex((p) => p.id === existing.id)] = nextPos;
            } else if (newLots < 0) {
              nextPos = {
                ...existing,
                side: o.side,
                lots: Math.abs(newLots),
                entry: fillPrice,
                slPrice: o.slPrice ?? null,
                tpPrice: o.tpPrice ?? null,
                last: tick.last,
                lastUpdateTs: Date.now(),
              };
              positions[positions.findIndex((p) => p.id === existing.id)] = nextPos;
            } else {
              positions.splice(positions.findIndex((p) => p.id === existing.id), 1);
              nextPos = { ...existing, last: tick.last, lastUpdateTs: Date.now() };
            }
          }
        }

        orders = orders.map((x) => (x.id === o.id ? filledOrder : x));
        events = [{ type: "ORDER_FILLED", order: filledOrder, position: nextPos }, ...events].slice(0, 200);
      }
    }

    // update P/L
    positions = positions.map((p) => {
      if (p.symbol !== symbol) return p;
      const lastMark = markPriceFromTick(tick, spread, p.side === "BUY" ? "SELL" : "BUY");
      const u = computeUnrealized(p.symbol, p.side, p.lots, p.entry, lastMark);
      return { ...p, last: lastMark, unrealizedPnl: u, lastUpdateTs: Date.now() };
    });

    set({ orders, positions, events });
  },
}));
