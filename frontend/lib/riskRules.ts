// lib/riskRules.ts
export type RiskStatus = "COMPLIANT" | "AT_RISK" | "VIOLATION";

export type RiskSnapshot = {
  equity: number;
  ddUsedPct: number;       // 0..100
  dailyLossUsedPct: number;// 0..100
  exposureUsedPct: number; // 0..100
};

export function evaluateRisk(s: RiskSnapshot) {
  // rule thresholds (demo)
  const VIOLATION = {
    dd: 100,
    daily: 100,
    exposure: 95,
  };
  const RISK = {
    dd: 80,
    daily: 80,
    exposure: 80,
  };

  const violated =
    s.ddUsedPct >= VIOLATION.dd ||
    s.dailyLossUsedPct >= VIOLATION.daily ||
    s.exposureUsedPct >= VIOLATION.exposure;

  const atRisk =
    s.ddUsedPct >= RISK.dd ||
    s.dailyLossUsedPct >= RISK.daily ||
    s.exposureUsedPct >= RISK.exposure;

  const status: RiskStatus = violated ? "VIOLATION" : atRisk ? "AT_RISK" : "COMPLIANT";

  const reasons: string[] = [];
  if (s.ddUsedPct >= RISK.dd) reasons.push(`Drawdown ${s.ddUsedPct.toFixed(0)}%`);
  if (s.dailyLossUsedPct >= RISK.daily) reasons.push(`Daily loss ${s.dailyLossUsedPct.toFixed(0)}%`);
  if (s.exposureUsedPct >= RISK.exposure) reasons.push(`Exposure ${s.exposureUsedPct.toFixed(0)}%`);

  const blocked = status === "VIOLATION";

  return { status, blocked, reasons };
}
