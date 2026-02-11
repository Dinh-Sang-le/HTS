"use client";

import { Group, TextInput, ActionIcon, SegmentedControl, Avatar } from "@mantine/core";
import { Search, Bell, Sun, Moon } from "lucide-react";

export function TopBar() {
  return (
    <Group gap="sm">
      <TextInput
        leftSection={<Search size={16} />}
        placeholder="Search symbol (XAUUSD, EURUSD...)"
        w={320}
      />
      <SegmentedControl
        data={[
          { label: "M1", value: "M1" },
          { label: "M5", value: "M5" },
          { label: "M15", value: "M15" },
          { label: "H1", value: "H1" },
          { label: "D1", value: "D1" },
        ]}
        defaultValue="M15"
      />
      <ActionIcon variant="subtle" aria-label="Notifications">
        <Bell size={18} />
      </ActionIcon>
      <ActionIcon variant="subtle" aria-label="Theme">
        <Sun size={18} />
      </ActionIcon>
      <Avatar radius="xl">S</Avatar>
    </Group>
  );
}
