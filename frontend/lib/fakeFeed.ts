// lib/fakeFeed.ts
export type SymbolName = "XAUUSD" | "EURUSD" | "GBPUSD" | "USDJPY";

export type Candle = {
  time: number; // UTCTimestamp seconds
  open: number;
  high: number;
  low: number;
  close: number;
};

export type DepthLevel = {
  price: number;
  size: number;
};

export type Depth = {
  mid: number;
  bids: DepthLevel[];
  asks: DepthLevel[];
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(s0: string) {
  let s = 0;
  for (let i = 0; i < s0.length; i++) s = (s * 31 + s0.charCodeAt(i)) >>> 0;
  return s || 1337;
}

function basePrice(symbol: SymbolName) {
  if (symbol === "XAUUSD") return 2030;
  if (symbol === "USDJPY") return 148.5;
  if (symbol === "GBPUSD") return 1.267;
  return 1.083; // EURUSD
}

export function decimals(symbol: SymbolName) {
  return symbol === "XAUUSD" || symbol === "USDJPY" ? 2 : 5;
}

function stepSize(symbol: SymbolName) {
  if (symbol === "XAUUSD") return 0.9;
  if (symbol === "USDJPY") return 0.08;
  if (symbol === "GBPUSD") return 0.0012;
  return 0.001;
}

export function generateHistoryCandles(params: {
  symbol: SymbolName;
  bars?: number;
  tfSeconds?: number;
  endTimeSec?: number;
}): Candle[] {
  const { symbol, bars = 300, tfSeconds = 60 } = params;

  const rand = mulberry32(seedFromString(symbol));
  const dp = decimals(symbol);
  const step = stepSize(symbol);

  const nowSec = Math.floor(Date.now() / 1000);
  const end = params.endTimeSec ?? nowSec;
  const start = end - bars * tfSeconds;

  let last = basePrice(symbol);
  const out: Candle[] = [];

  for (let i = 0; i < bars; i++) {
    const t = start + i * tfSeconds;

    const drift = (rand() - 0.5) * step;
    const open = last;
    const close = open + drift;

    const wickUp = rand() * step * 0.8;
    const wickDn = rand() * step * 0.8;

    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDn;

    const candle: Candle = {
      time: t,
      open: +open.toFixed(dp),
      high: +high.toFixed(dp),
      low: +low.toFixed(dp),
      close: +close.toFixed(dp),
    };

    out.push(candle);
    last = candle.close;
  }

  return out;
}

/**
 * Generate a fake depth ladder around mid.
 * - deterministic-ish per "bucketMs" so it looks stable but moving
 */
export function generateDepth(params: {
  symbol: SymbolName;
  mid: number;
  levels?: number;     // each side
  bucketMs?: number;   // change pattern every bucket
}): Depth {
  const { symbol, mid, levels = 18, bucketMs = 700 } = params;
  const dp = decimals(symbol);

  const bucket = Math.floor(Date.now() / bucketMs);
  const rand = mulberry32(seedFromString(`${symbol}|${bucket}`));

  const tick =
    symbol === "XAUUSD" ? 0.01 :
    symbol === "USDJPY" ? 0.001 :
    0.00001;

  // spacing between levels
  const step =
    symbol === "XAUUSD" ? 0.05 :
    symbol === "USDJPY" ? 0.01 :
    0.00008;

  const asks: DepthLevel[] = [];
  const bids: DepthLevel[] = [];

  for (let i = 1; i <= levels; i++) {
    const aPrice = mid + i * step;
    const bPrice = mid - i * step;

    // “liquidity shape”
    const base = 30 + Math.floor((levels - i) * 2.2);
    const noiseA = Math.floor(rand() * 18);
    const noiseB = Math.floor(rand() * 18);

    asks.push({
      price: +((Math.round(aPrice / tick) * tick).toFixed(dp)),
      size: base + noiseA,
    });

    bids.push({
      price: +((Math.round(bPrice / tick) * tick).toFixed(dp)),
      size: base + noiseB,
    });
  }

  return {
    mid: +mid.toFixed(dp),
    asks,
    bids,
  };
}
