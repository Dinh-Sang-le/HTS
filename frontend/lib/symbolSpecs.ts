// lib/symbolSpecs.ts
import type { SymbolName } from "./tradeTypes";

export type SymbolSpec = {
  pipSize: number;        // 1 pip = bao nhiêu giá
  digits: number;         // số chữ số hiển thị
  pipValuePerLotUSD: number; // demo: lời/lỗ theo USD cho 1 pip / 1 lot
};

export const SYMBOL_SPECS: Record<SymbolName, SymbolSpec> = {
  // demo hợp lý cho UI (không cần đúng 100% broker)
  XAUUSD: { pipSize: 0.01, digits: 2, pipValuePerLotUSD: 1.0 },     // 1 pip=0.01, 1 lot ~ $1/pip (demo)
  EURUSD: { pipSize: 0.0001, digits: 4, pipValuePerLotUSD: 10.0 },  // FX chuẩn hay dùng ~$10/pip/lot
  GBPUSD: { pipSize: 0.0001, digits: 4, pipValuePerLotUSD: 10.0 },
  USDJPY: { pipSize: 0.01, digits: 2, pipValuePerLotUSD: 9.0 },     // demo
};

export function roundToDigits(x: number, digits: number) {
  const p = Math.pow(10, digits);
  return Math.round(x * p) / p;
}

export function formatPrice(symbol: SymbolName, price: number) {
  const d = SYMBOL_SPECS[symbol].digits;
  return price.toFixed(d);
}
