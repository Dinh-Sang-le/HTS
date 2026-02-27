"use client";

import { useEffect, useMemo, useState } from "react";

export type RuleStatus = "PASS" | "WARN" | "FAIL";

export type AccountRules = {
  plan: string;
  accountSize: number;
  startBalance: number;
  dailyLossLimitPct: number;
  maxDrawdownPct: number;
  exposureCapPct: number;
  consistencyRulePct: number;
  newsTradingAllowed: boolean;
  overnightAllowed: boolean;
};

export type RuleRow = { name: string; status: RuleStatus; detail: string };

export function usePropRiskMock() {
  const account: AccountRules = useMemo(
    () => ({
      plan: "Evaluation Phase 1",
      accountSize: 25000,
      startBalance: 25000,
      dailyLossLimitPct: 3.0,
      maxDrawdownPct: 6.0,
      exposureCapPct: 80.0,
      consistencyRulePct: 35.0,
      newsTradingAllowed: false,
      overnightAllowed: false,
    }),
    []
  );

  // “Realtime” states
  const [currentEquity, setCurrentEquity] = useState(24990);
  const [pnlTodayPct, setPnlTodayPct] = useState(-0.8);
  const [openPL, setOpenPL] = useState(430);
  const [exposureUsedPct, setExposureUsedPct] = useState(61);
  const [consistencyUsedPct, setConsistencyUsedPct] = useState(28);

  const [equityCurve, setEquityCurve] = useState<{ t: string; v: number }[]>([
    { t: "Mon", v: 25000 },
    { t: "Tue", v: 25120 },
    { t: "Wed", v: 24940 },
    { t: "Thu", v: 25230 },
    { t: "Fri", v: 24990 },
  ]);

  const [dailyPnL, setDailyPnL] = useState<{ t: string; p: number }[]>([
    { t: "Mon", p: 120 },
    { t: "Tue", p: 80 },
    { t: "Wed", p: -180 },
    { t: "Thu", p: 260 },
    { t: "Fri", p: -40 },
  ]);

  // Mock ticks update (nhẹ)
  useEffect(() => {
    const id = setInterval(() => {
      // equity wiggle
      setCurrentEquity((v) => Math.max(0, Math.round(v + (Math.random() - 0.5) * 18)));

      // pnl today wiggle
      setPnlTodayPct((p) => +(p + (Math.random() - 0.5) * 0.08).toFixed(2));

      // open PL wiggle
      setOpenPL((p) => Math.round(p + (Math.random() - 0.5) * 25));

      // exposure / consistency small noise
      setExposureUsedPct((x) => Math.max(0, Math.min(100, +(x + (Math.random() - 0.5) * 1.2).toFixed(0))));
      setConsistencyUsedPct((x) => Math.max(0, Math.min(100, +(x + (Math.random() - 0.5) * 1.0).toFixed(0))));

      // update last point of equity curve (simulate)
      setEquityCurve((arr) => {
        const next = [...arr];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, v: currentEquity };
        return next;
      });

      // update last bar of daily pnl slightly
      setDailyPnL((arr) => {
        const next = [...arr];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, p: Math.round(last.p + (Math.random() - 0.5) * 18) };
        return next;
      });
    }, 900);

    return () => clearInterval(id);
  }, [currentEquity]);

  // Derived metrics
  const start = account.startBalance;
  const equity = currentEquity;

  const maxDDLimit$ = (account.maxDrawdownPct / 100) * start;
  const dailyLossLimit$ = (account.dailyLossLimitPct / 100) * start;

  const ddUsed$ = Math.max(0, start - equity);
  const ddUsedPctOfLimit = (ddUsed$ / maxDDLimit$) * 100;

  const todayLoss$ = pnlTodayPct < 0 ? (Math.abs(pnlTodayPct) / 100) * start : 0;
  const dailyUsedPct = (todayLoss$ / dailyLossLimit$) * 100;

  const rules: RuleRow[] = useMemo(() => {
    const maxDDStatus: RuleStatus =
      ddUsedPctOfLimit >= 100 ? "FAIL" : ddUsedPctOfLimit >= 80 ? "WARN" : "PASS";

    const dailyLossStatus: RuleStatus =
      dailyUsedPct >= 100 ? "FAIL" : dailyUsedPct >= 80 ? "WARN" : "PASS";

    const exposureStatus: RuleStatus =
      exposureUsedPct >= 100 ? "FAIL" : exposureUsedPct >= 85 ? "WARN" : "PASS";

    const consistencyStatus: RuleStatus =
      consistencyUsedPct > account.consistencyRulePct ? "WARN" : "PASS";

    const newsStatus: RuleStatus = account.newsTradingAllowed ? "PASS" : "WARN";
    const overnightStatus: RuleStatus = account.overnightAllowed ? "PASS" : "WARN";

    return [
      { name: "Max Drawdown", status: maxDDStatus, detail: `Used $${ddUsed$.toFixed(0)} of $${maxDDLimit$.toFixed(0)}` },
      { name: "Daily Loss Limit", status: dailyLossStatus, detail: `Today $${todayLoss$.toFixed(0)} of $${dailyLossLimit$.toFixed(0)}` },
      { name: "Exposure Cap", status: exposureStatus, detail: `${exposureUsedPct}% of ${account.exposureCapPct}%` },
      { name: "Consistency", status: consistencyStatus, detail: `Best day ${consistencyUsedPct}% (limit ${account.consistencyRulePct}%)` },
      { name: "News Trading", status: newsStatus, detail: account.newsTradingAllowed ? "Allowed" : "Restricted" },
      { name: "Overnight Holding", status: overnightStatus, detail: account.overnightAllowed ? "Allowed" : "Restricted" },
    ];
  }, [
    account.consistencyRulePct,
    account.exposureCapPct,
    account.newsTradingAllowed,
    account.overnightAllowed,
    ddUsed$,
    ddUsedPctOfLimit,
    maxDDLimit$,
    todayLoss$,
    dailyLossLimit$,
    dailyUsedPct,
    exposureUsedPct,
    consistencyUsedPct,
  ]);

  const overallStatus = useMemo(() => {
    const hasFail = rules.some((r) => r.status === "FAIL");
    const hasWarn = rules.some((r) => r.status === "WARN");
    if (hasFail) return { label: "VIOLATION" as const, color: "red" as const };
    if (hasWarn) return { label: "AT RISK" as const, color: "yellow" as const };
    return { label: "COMPLIANT" as const, color: "green" as const };
  }, [rules]);

  return {
    account,
    equity,
    openPL,
    pnlTodayPct,
    equityCurve,
    dailyPnL,
    ddUsed$,
    ddUsedPctOfLimit,
    maxDDLimit$,
    todayLoss$,
    dailyUsedPct,
    dailyLossLimit$,
    exposureUsedPct,
    consistencyUsedPct,
    rules,
    overallStatus,
  };
}
