"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ActionIcon,
  Badge,
  Group,
  Paper,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { IconPin, IconPinnedOff, IconX } from "@tabler/icons-react";

type Props = {
  id: string;
  title: string;
  badge?: string;
  defaultDocked?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export default function FloatingPanel({
  id,
  title,
  badge,
  defaultDocked = true,
  onClose,
  children,
  style,
}: Props) {
  const theme = useMantineTheme();
  const isDark = theme.colorScheme === "dark";

  const [mounted, setMounted] = useState(false);
  const [docked, setDocked] = useState(defaultDocked);

  useEffect(() => setMounted(true), []);

  // persist dock state
  useEffect(() => {
    if (!mounted) return;
    const key = `panel:${id}:docked`;
    const saved = localStorage.getItem(key);
    if (saved === "0") setDocked(false);
    if (saved === "1") setDocked(true);
  }, [mounted, id]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(`panel:${id}:docked`, docked ? "1" : "0");
  }, [mounted, docked, id]);

  const Shell: any = useMemo(() => (docked ? Paper : motion.div), [docked]);

  // ✅ Only styling fix (no logic change)
  const panelSurfaceStyle: React.CSSProperties = {
    minWidth: 0,
    backdropFilter: "blur(10px)",
    background: isDark ? "rgba(24,24,24,0.88)" : "rgba(255,255,255,0.92)",
    border: isDark
      ? "1px solid rgba(255,255,255,0.08)"
      : "1px solid rgba(0,0,0,0.08)",
    boxShadow: isDark
      ? "0 20px 60px rgba(0,0,0,0.50)"
      : "0 20px 60px rgba(0,0,0,0.18)",
    ...style,
  };

  if (!mounted) {
    // SSR-stable placeholder
    return (
      <Paper withBorder radius="lg" p="md" style={{ minWidth: 0, ...style }}>
        <Group justify="space-between" mb="xs">
          <Text fw={700}>{title}</Text>
        </Group>
        {children}
      </Paper>
    );
  }

  if (docked) {
    return (
      <Paper
        withBorder
        radius="lg"
        p="md"
        style={{
          minWidth: 0,
          // (optional) also keep docked consistent in light mode
          background: isDark ? "rgba(18,18,18,0.60)" : "rgba(255,255,255,0.95)",
          border: isDark
            ? "1px solid rgba(255,255,255,0.06)"
            : "1px solid rgba(0,0,0,0.06)",
          ...style,
        }}
      >
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <Text fw={700}>{title}</Text>
            {badge ? <Badge variant="light">{badge}</Badge> : null}
          </Group>

          <Group gap={6}>
            <ActionIcon
              variant="subtle"
              onClick={() => setDocked(false)}
              title="Undock"
            >
              <IconPinnedOff size={16} />
            </ActionIcon>
            {onClose ? (
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={onClose}
                title="Close"
              >
                <IconX size={16} />
              </ActionIcon>
            ) : null}
          </Group>
        </Group>

        {children}
      </Paper>
    );
  }

  // floating draggable
  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      style={{
        position: "fixed",
        top: 120,
        right: 22,
        width: 420,
        zIndex: 500,
      }}
    >
      <Paper withBorder radius="lg" p="md" style={panelSurfaceStyle}>
        <Group justify="space-between" mb="xs" style={{ cursor: "grab" }}>
          <Group gap="xs">
            <Text fw={700}>{title}</Text>
            {badge ? <Badge variant="light">{badge}</Badge> : null}
          </Group>
          <Group gap={6}>
            <ActionIcon
              variant="subtle"
              onClick={() => setDocked(true)}
              title="Dock"
            >
              <IconPin size={16} />
            </ActionIcon>
            {onClose ? (
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={onClose}
                title="Close"
              >
                <IconX size={16} />
              </ActionIcon>
            ) : null}
          </Group>
        </Group>

        {children}
      </Paper>
    </motion.div>
  );
}