// lib/tradeTypes.ts
export type Side = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";
export type OrderStatus = "PENDING" | "FILLED" | "CANCELLED" | "REJECTED";

export type SymbolName = "XAUUSD" | "EURUSD" | "GBPUSD" | "USDJPY";

export type Tick = {
  last: number;
  bid?: number;
  ask?: number;
  chgPct?: number;
  ts?: number;
};

export type PlaceOrderRequest = {
  symbol: SymbolName;
  side: Side;
  type: OrderType;
  lots: number;

  limitPrice?: number;

  slPips?: number | null;
  tpPips?: number | null;

  comment?: string;
  riskPct?: number;
};

export type Order = {
  id: string;
  ts: number;

  symbol: SymbolName;
  side: Side;
  type: OrderType;

  lots: number;
  limitPrice?: number;

  slPrice?: number | null;
  tpPrice?: number | null;

  comment?: string;

  status: OrderStatus;
  rejectReason?: string;

  filledPrice?: number;
  filledTs?: number;
};

export type Position = {
  id: string;
  symbol: SymbolName;
  side: Side;
  lots: number;
  entry: number;

  slPrice?: number | null;
  tpPrice?: number | null;

  openedTs: number;

  last: number;
  unrealizedPnl: number;
  lastUpdateTs: number;
};

// ✅ TradeEvent khớp đúng các object bạn đang push vào store
export type TradeEvent =
  | { type: "ORDER_PLACED"; order: Order }
  | { type: "ORDER_FILLED"; order: Order; position: Position }
  | { type: "ORDER_CANCELLED"; orderId: string }
  | { type: "POSITION_CLOSED"; positionId: string; realizedPnl: number };
