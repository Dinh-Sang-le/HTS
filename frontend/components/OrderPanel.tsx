"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { motion } from "framer-motion";
import { IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react";

export default function OrderPanel() {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [lots, setLots] = useState<number>(0.1);
  const [sl, setSl] = useState<number | undefined>(undefined);
  const [tp, setTp] = useState<number | undefined>(undefined);
  const [riskPct, setRiskPct] = useState<number>(1);

  const calc = useMemo(() => {
    // demo tính toán đơn giản
    const risk = sl ? Math.round(lots * 100 * 10) : 0;
    const reward = tp ? Math.round(lots * 100 * 10) : 0;
    return { risk, reward };
  }, [lots, sl, tp]);

  const accent = side === "BUY" ? "green" : "red";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <Paper radius="lg" p="md" style={{ background: "rgba(0,0,0,0.18)" }}>
        <Group justify="space-between" mb="sm">
          <Text fw={800}>Order</Text>
          <Badge variant="light" color={accent} leftSection={side === "BUY" ? <IconArrowUpRight size={14} /> : <IconArrowDownRight size={14} />}>
            {side}
          </Badge>
        </Group>

        <Stack gap="sm">
          <SegmentedControl
            value={side}
            onChange={(v) => setSide(v as any)}
            data={[
              { label: "BUY", value: "BUY" },
              { label: "SELL", value: "SELL" },
            ]}
            fullWidth
          />

          <NumberInput
            label="Lots"
            value={lots}
            onChange={(v) => setLots(Number(v) || 0)}
            min={0.01}
            step={0.01}
            decimalScale={2}
          />

          <Group grow>
            <NumberInput label="SL (pips)" value={sl} onChange={(v) => setSl(v as any)} min={0} />
            <NumberInput label="TP (pips)" value={tp} onChange={(v) => setTp(v as any)} min={0} />
          </Group>

          <Text size="sm" c="dimmed">
            Risk control (demo)
          </Text>
          <Slider value={riskPct} onChange={setRiskPct} min={0.25} max={3} step={0.25} marks={[{ value: 1, label: "1%" }]} />

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Risk (demo)
            </Text>
            <Text fw={800} c="red">
              -${calc.risk}
            </Text>
          </Group>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Reward (demo)
            </Text>
            <Text fw={800} c="green">
              +${calc.reward}
            </Text>
          </Group>

          <TextInput label="Comment (optional)" placeholder="Breakout / Reversal / News..." />

          <Button
            fullWidth
            radius="md"
            color={accent}
            onClick={() =>
              notifications.show({
                title: "Order placed (mock)",
                message: `${side} ${lots} lots • SL ${sl ?? "--"} • TP ${tp ?? "--"} • Risk ${riskPct}%`,
              })
            }
          >
            Place Order
          </Button>

          <Text size="xs" c="dimmed">
            * Demo UI. Sau này nối MT5/OMS API.
          </Text>
        </Stack>
      </Paper>
    </motion.div>
  );
}
