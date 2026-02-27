"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Group,
  NumberInput,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import type { OrderType, Side, SymbolName } from "@/lib/tradeTypes";
import { SYMBOL_SPECS, formatPrice, roundToDigits } from "@/lib/symbolSpecs";

export type OrderDraft = {
  side: Side;
  type: OrderType;
  lots: number;
  limitPrice: number | null;
  slPips: number | null;
  tpPips: number | null;
  riskPct: number;
  comment: string;
};

export default function OrderPanel(props: {
  symbol: SymbolName;
  last: number;
  spread?: number | null;
  locked?: boolean;
  ticketPrice?: number | null; // click from DOM ladder
  onSubmit: (draft: OrderDraft) => void;
}) {
  const { symbol, last, spread, locked, ticketPrice, onSubmit } = props;
  const spec = SYMBOL_SPECS[symbol];

  const [draft, setDraft] = useState<OrderDraft>({
    side: "BUY",
    type: "MARKET",
    lots: 0.1,
    limitPrice: null,
    slPips: null,
    tpPips: null,
    riskPct: 1,
    comment: "",
  });

  // DOM click -> auto set LIMIT price
  useEffect(() => {
    if (ticketPrice == null) return;
    setDraft((d) => ({
      ...d,
      type: "LIMIT",
      limitPrice: roundToDigits(ticketPrice, spec.digits),
    }));
  }, [ticketPrice, spec.digits]);

  const canSubmit =
    !locked &&
    draft.lots > 0 &&
    (draft.type === "MARKET" || (draft.limitPrice != null && draft.limitPrice > 0));

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={700}>Order</Text>
        <Badge variant="light">{symbol}</Badge>
      </Group>

      <SegmentedControl
        value={draft.side}
        onChange={(v) => setDraft((d) => ({ ...d, side: v as Side }))}
        data={[
          { value: "BUY", label: "BUY" },
          { value: "SELL", label: "SELL" },
        ]}
      />

      <SegmentedControl
        value={draft.type}
        onChange={(v) => setDraft((d) => ({ ...d, type: v as OrderType }))}
        data={[
          { value: "MARKET", label: "Market" },
          { value: "LIMIT", label: "Limit" },
        ]}
      />

      <NumberInput
        label="Lots"
        value={draft.lots}
        onChange={(v) => setDraft((d) => ({ ...d, lots: Number(v ?? 0) }))}
        min={0}
        step={0.01}
        decimalScale={2}
      />

      {draft.type === "LIMIT" ? (
        <NumberInput
          label="Limit price"
          value={draft.limitPrice ?? undefined}
          onChange={(v) => setDraft((d) => ({ ...d, limitPrice: v == null ? null : Number(v) }))}
          min={0}
          decimalScale={spec.digits}
          step={spec.pipSize}
        />
      ) : (
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Market @
          </Text>
          <Text size="sm" fw={700}>
            {last ? formatPrice(symbol, last) : "--"}
          </Text>
          <Text size="sm" c="dimmed">
            Spread {spread ?? "--"}
          </Text>
        </Group>
      )}

      <Group grow>
        <NumberInput
          label="SL (pips)"
          value={draft.slPips ?? undefined}
          onChange={(v) => setDraft((d) => ({ ...d, slPips: v == null ? null : Number(v) }))}
          min={0}
          step={1}
        />
        <NumberInput
          label="TP (pips)"
          value={draft.tpPips ?? undefined}
          onChange={(v) => setDraft((d) => ({ ...d, tpPips: v == null ? null : Number(v) }))}
          min={0}
          step={1}
        />
      </Group>

      <Stack gap={6}>
        <Text size="sm" c="dimmed">
          Risk control (demo)
        </Text>
        <Slider
          value={draft.riskPct}
          onChange={(v) => setDraft((d) => ({ ...d, riskPct: v }))}
          min={0}
          max={5}
          step={0.5}
          label={(v) => `${v}%`}
        />
      </Stack>

      <TextInput
        label="Comment (optional)"
        placeholder="Breakout / Reversal / News..."
        value={draft.comment}
        onChange={(e) => setDraft((d) => ({ ...d, comment: e.currentTarget.value }))}
      />

      <Button
        fullWidth
        color={draft.side === "BUY" ? "green" : "red"}
        disabled={!canSubmit}
        onClick={() => onSubmit(draft)}
      >
        Place Order
      </Button>

      <Text size="xs" c="dimmed">
        Tip: click price in DOM ladder → auto set Limit price.
      </Text>
    </Stack>
  );
}
