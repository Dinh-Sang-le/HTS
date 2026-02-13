"use client";

import {
  Group,
  TextInput,
  ActionIcon,
  SegmentedControl,
  Avatar,
  Box,
} from "@mantine/core";
import { Search, Bell, Sun } from "lucide-react";

export function TopBar() {
  return (
    <Group gap="md" className="hts-topbar">
      {/* Search */}
      <TextInput
        className="hts-search"
        leftSection={<Search size={16} />}
        placeholder="Search symbol (XAUUSD, EURUSD...)"
        w={340}
      />

      {/* Timeframe */}
      <SegmentedControl
        className="hts-timeframe"
        data={[
          { label: "M1", value: "M1" },
          { label: "M5", value: "M5" },
          { label: "M15", value: "M15" },
          { label: "H1", value: "H1" },
          { label: "D1", value: "D1" },
        ]}
        defaultValue="M15"
        size="xs"
      />

      {/* Icons */}
      <Group gap="xs">
        <ActionIcon
          variant="subtle"
          aria-label="Notifications"
          className="hts-icon"
        >
          <Bell size={17} />
        </ActionIcon>

        <ActionIcon
          variant="subtle"
          aria-label="Theme"
          className="hts-icon"
        >
          <Sun size={17} />
        </ActionIcon>

        <Avatar radius="xl" size="sm" className="hts-avatar">
          S
        </Avatar>
      </Group>
    </Group>
  );
}
