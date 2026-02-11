"use client";

import { Paper, NumberInput, Select, Button, Stack } from "@mantine/core";

export function OrderPanel() {
  return (
    <Paper withBorder radius="lg" p="md">
      <Stack>
        <Select
          label="Order Type"
          data={["Market", "Limit", "Stop"]}
          defaultValue="Market"
        />
        <NumberInput label="Lot Size" defaultValue={0.1} min={0.01} step={0.01} />
        <Button color="green">BUY</Button>
        <Button color="red">SELL</Button>
      </Stack>
    </Paper>
  );
}
