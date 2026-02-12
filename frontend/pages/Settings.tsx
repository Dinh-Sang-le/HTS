// pages/Settings.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBell,
  IconBrush,
  IconCheck,
  IconCloud,
  IconDeviceFloppy,
  IconKey,
  IconLock,
  IconMoon,
  IconRefresh,
  IconShield,
  IconSun,
  IconUser,
  IconWand,
} from "@tabler/icons-react";

type ThemeMode = "DARK" | "LIGHT" | "SYSTEM";
type Accent = "BLUE" | "GREEN" | "PURPLE" | "ORANGE";

const cardAnim = {
  hidden: { opacity: 0, y: 10, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22 } },
};

function GlassCard(props: { title: string; icon: React.ReactNode; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div variants={cardAnim} initial="hidden" animate="show">
      <Paper
        withBorder
        radius="lg"
        p="md"
        style={{
          background: "linear-gradient(180deg, rgba(18,18,18,0.78), rgba(18,18,18,0.62))",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
        }}
      >
        <Group justify="space-between" mb="sm">
          <Group gap="sm">
            <Box
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: "rgba(59,130,246,0.14)",
                border: "1px solid rgba(59,130,246,0.22)",
              }}
            >
              {props.icon}
            </Box>
            <Stack gap={0}>
              <Text fw={800}>{props.title}</Text>
              <Text size="xs" c="dimmed">
                Configure your trading workspace (demo).
              </Text>
            </Stack>
          </Group>
          {props.badge}
        </Group>
        {props.children}
      </Paper>
    </motion.div>
  );
}

function useLocal<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setVal(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);

  return [val, setVal] as const;
}

export default function SettingsPage() {
  // ===== persisted settings (localStorage)
  const [profile, setProfile] = useLocal("hts.settings.profile", {
    displayName: "Admin",
    email: "admin@demo.local",
    timezone: "Asia/Ho_Chi_Minh",
    language: "vi",
  });

  const [appearance, setAppearance] = useLocal("hts.settings.appearance", {
    theme: "DARK" as ThemeMode,
    accent: "BLUE" as Accent,
    motion: true,
    reduceBlur: false,
    compactMode: false,
  });

  const [trade, setTrade] = useLocal("hts.settings.trade", {
    defaultLots: 0.1,
    oneClick: true,
    confirmBeforePlace: true,
    slDefaultPips: 0,
    tpDefaultPips: 0,
    riskPctDefault: 1,
    autoFollowPrice: true,
    hotkeys: true,
  });

  const [risk, setRisk] = useLocal("hts.settings.risk", {
    maxDailyLossPct: 5,
    maxDrawdownPct: 10,
    maxExposurePct: 80,
    blockOnViolation: true,
    showWarnings: true,
  });

  const [notify, setNotify] = useLocal("hts.settings.notify", {
    orderPlaced: true,
    orderFilled: true,
    sltpHit: true,
    riskWarnings: true,
    sound: false,
    desktop: false,
  });

  const [security, setSecurity] = useLocal("hts.settings.security", {
    lockAfterMin: 30,
    requireConfirmSensitive: true,
    maskBalances: false,
    allowClipboard: true,
  });

  // ===== derived
  const accentBadge = useMemo(() => {
    const map: Record<Accent, { label: string; color: string }> = {
      BLUE: { label: "BLUE", color: "blue" },
      GREEN: { label: "GREEN", color: "green" },
      PURPLE: { label: "PURPLE", color: "grape" },
      ORANGE: { label: "ORANGE", color: "orange" },
    };
    const a = map[appearance.accent];
    return <Badge variant="light" color={a.color}>{a.label}</Badge>;
  }, [appearance.accent]);

  const saveAll = () => {
    notifications.show({
      title: "Saved",
      message: "Settings saved locally (demo).",
      color: "green",
      icon: <IconCheck size={16} />,
    });
  };

  const resetAll = () => {
    setProfile({ displayName: "Admin", email: "admin@demo.local", timezone: "Asia/Ho_Chi_Minh", language: "vi" });
    setAppearance({ theme: "DARK", accent: "BLUE", motion: true, reduceBlur: false, compactMode: false });
    setTrade({
      defaultLots: 0.1,
      oneClick: true,
      confirmBeforePlace: true,
      slDefaultPips: 0,
      tpDefaultPips: 0,
      riskPctDefault: 1,
      autoFollowPrice: true,
      hotkeys: true,
    });
    setRisk({ maxDailyLossPct: 5, maxDrawdownPct: 10, maxExposurePct: 80, blockOnViolation: true, showWarnings: true });
    setNotify({ orderPlaced: true, orderFilled: true, sltpHit: true, riskWarnings: true, sound: false, desktop: false });
    setSecurity({ lockAfterMin: 30, requireConfirmSensitive: true, maskBalances: false, allowClipboard: true });

    notifications.show({ title: "Reset", message: "Back to defaults.", color: "yellow", icon: <IconRefresh size={16} /> });
  };

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Group gap="xs">
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: "rgba(99,102,241,0.14)",
                border: "1px solid rgba(99,102,241,0.22)",
              }}
            >
              <IconWand size={18} />
            </Box>
            <Title order={2}>Settings</Title>
            <Badge variant="light">HTS</Badge>
            {accentBadge}
          </Group>
          <Text size="sm" c="dimmed">
            Modern settings page (demo). No charts — only controls, preferences, and UX.
          </Text>
        </Stack>

        <Group gap="xs">
          <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={resetAll}>
            Reset
          </Button>
          <Button leftSection={<IconDeviceFloppy size={16} />} color="green" onClick={saveAll}>
            Save
          </Button>
        </Group>
      </Group>

      <Tabs defaultValue="general" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="general" leftSection={<IconUser size={16} />}>General</Tabs.Tab>
          <Tabs.Tab value="appearance" leftSection={<IconBrush size={16} />}>Appearance</Tabs.Tab>
          <Tabs.Tab value="trading" leftSection={<IconKey size={16} />}>Trading</Tabs.Tab>
          <Tabs.Tab value="risk" leftSection={<IconShield size={16} />}>Risk</Tabs.Tab>
          <Tabs.Tab value="notifications" leftSection={<IconBell size={16} />}>Notifications</Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<IconLock size={16} />}>Security</Tabs.Tab>
          <Tabs.Tab value="sync" leftSection={<IconCloud size={16} />}>Sync</Tabs.Tab>
        </Tabs.List>

        {/* =================== GENERAL =================== */}
        <Tabs.Panel value="general" pt="md">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <GlassCard title="Profile" icon={<IconUser size={18} />} badge={<Badge variant="light">Local</Badge>}>
              <Stack gap="sm">
                <TextInput
                  label="Display name"
                  value={profile.displayName}
                  onChange={(e) => setProfile((p) => ({ ...p, displayName: e.currentTarget.value }))}
                />
                <TextInput
                  label="Email"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.currentTarget.value }))}
                />
                <Group grow>
                  <Select
                    label="Timezone"
                    data={[
                      { value: "Asia/Ho_Chi_Minh", label: "Asia/Ho_Chi_Minh (GMT+7)" },
                      { value: "Asia/Tokyo", label: "Asia/Tokyo (GMT+9)" },
                      { value: "Europe/London", label: "Europe/London" },
                      { value: "America/New_York", label: "America/New_York" },
                    ]}
                    value={profile.timezone}
                    onChange={(v) => setProfile((p) => ({ ...p, timezone: v || p.timezone }))}
                  />
                  <Select
                    label="Language"
                    data={[
                      { value: "vi", label: "Tiếng Việt" },
                      { value: "en", label: "English" },
                      { value: "ko", label: "한국어" },
                      { value: "ja", label: "日本語" },
                    ]}
                    value={profile.language}
                    onChange={(v) => setProfile((p) => ({ ...p, language: v || p.language }))}
                  />
                </Group>
              </Stack>
            </GlassCard>

            <GlassCard title="Workspace" icon={<IconWand size={18} />} badge={<Badge variant="light">UX</Badge>}>
              <Stack gap="sm">
                <Switch
                  checked={!appearance.compactMode}
                  onChange={(e) => setAppearance((a) => ({ ...a, compactMode: !e.currentTarget.checked }))}
                  label="Comfort spacing"
                  description="More padding / breathing room in panels."
                />
                <Switch
                  checked={appearance.motion}
                  onChange={(e) => setAppearance((a) => ({ ...a, motion: e.currentTarget.checked }))}
                  label="Animations"
                  description="Enable smooth transitions and micro-interactions."
                />
                <Switch
                  checked={appearance.reduceBlur}
                  onChange={(e) => setAppearance((a) => ({ ...a, reduceBlur: e.currentTarget.checked }))}
                  label="Reduce blur"
                  description="Improve performance on low-end devices."
                />
                <Divider />
                <Text size="sm" c="dimmed">
                  Tip: You can keep animations ON for a more premium feel.
                </Text>
              </Stack>
            </GlassCard>
          </SimpleGrid>
        </Tabs.Panel>

        {/* =================== APPEARANCE =================== */}
        <Tabs.Panel value="appearance" pt="md">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <GlassCard title="Theme" icon={<IconMoon size={18} />} badge={accentBadge}>
              <Stack gap="sm">
                <SegmentedControl
                  value={appearance.theme}
                  onChange={(v) => setAppearance((a) => ({ ...a, theme: v as ThemeMode }))}
                  data={[
                    { label: <Group gap={6}><IconMoon size={14} />Dark</Group>, value: "DARK" },
                    { label: <Group gap={6}><IconSun size={14} />Light</Group>, value: "LIGHT" },
                    { label: "System", value: "SYSTEM" },
                  ]}
                  fullWidth
                />

                <SegmentedControl
                  value={appearance.accent}
                  onChange={(v) => setAppearance((a) => ({ ...a, accent: v as Accent }))}
                  data={[
                    { label: "Blue", value: "BLUE" },
                    { label: "Green", value: "GREEN" },
                    { label: "Purple", value: "PURPLE" },
                    { label: "Orange", value: "ORANGE" },
                  ]}
                  fullWidth
                />

                <Divider />
                <Text size="sm" c="dimmed">
                  (Demo) Your UI theme can later map to Mantine theme provider.
                </Text>
              </Stack>
            </GlassCard>

            <GlassCard title="Polish" icon={<IconBrush size={18} />} badge={<Badge variant="light">Pro</Badge>}>
              <Stack gap="sm">
                <Card radius="lg" withBorder style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <Group justify="space-between">
                    <Text fw={700}>Glass panels</Text>
                    <Badge variant="light">Enabled</Badge>
                  </Group>
                  <Text size="sm" c="dimmed" mt={6}>
                    Subtle gradients, soft borders, premium shadows.
                  </Text>
                </Card>

                <Card radius="lg" withBorder style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <Group justify="space-between">
                    <Text fw={700}>Micro interactions</Text>
                    <Badge variant="light" color={appearance.motion ? "green" : "yellow"}>
                      {appearance.motion ? "ON" : "OFF"}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed" mt={6}>
                    Hover lift, smooth fades, responsive toggles.
                  </Text>
                </Card>
              </Stack>
            </GlassCard>
          </SimpleGrid>
        </Tabs.Panel>

        {/* =================== TRADING =================== */}
        <Tabs.Panel value="trading" pt="md">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <GlassCard title="Order defaults" icon={<IconKey size={18} />} badge={<Badge variant="light">Ticket</Badge>}>
              <Stack gap="sm">
                <Group grow>
                  <NumberInput
                    label="Default lots"
                    value={trade.defaultLots}
                    onChange={(v) => setTrade((t) => ({ ...t, defaultLots: Number(v) || 0 }))}
                    min={0.01}
                    step={0.01}
                    decimalScale={2}
                  />
                  <NumberInput
                    label="Risk % default"
                    value={trade.riskPctDefault}
                    onChange={(v) => setTrade((t) => ({ ...t, riskPctDefault: Number(v) || 0 }))}
                    min={0.25}
                    step={0.25}
                    decimalScale={2}
                  />
                </Group>

                <Group grow>
                  <NumberInput
                    label="SL default (pips)"
                    value={trade.slDefaultPips}
                    onChange={(v) => setTrade((t) => ({ ...t, slDefaultPips: Number(v) || 0 }))}
                    min={0}
                  />
                  <NumberInput
                    label="TP default (pips)"
                    value={trade.tpDefaultPips}
                    onChange={(v) => setTrade((t) => ({ ...t, tpDefaultPips: Number(v) || 0 }))}
                    min={0}
                  />
                </Group>

                <Divider />

                <Switch
                  checked={trade.oneClick}
                  onChange={(e) => setTrade((t) => ({ ...t, oneClick: e.currentTarget.checked }))}
                  label="One-click trading"
                  description="Place market orders instantly from hotkeys/buttons."
                />
                <Switch
                  checked={trade.confirmBeforePlace}
                  onChange={(e) => setTrade((t) => ({ ...t, confirmBeforePlace: e.currentTarget.checked }))}
                  label="Confirm before place"
                  description="Show confirm modal after submitting order."
                />
                <Switch
                  checked={trade.autoFollowPrice}
                  onChange={(e) => setTrade((t) => ({ ...t, autoFollowPrice: e.currentTarget.checked }))}
                  label="Auto follow price"
                  description="Keep the newest candles in view (like TradingView)."
                />
              </Stack>
            </GlassCard>

            <GlassCard title="Hotkeys" icon={<IconKey size={18} />} badge={<Badge variant="light">Pro</Badge>}>
              <Stack gap="sm">
                <Switch
                  checked={trade.hotkeys}
                  onChange={(e) => setTrade((t) => ({ ...t, hotkeys: e.currentTarget.checked }))}
                  label="Enable hotkeys"
                  description="B=Buy, S=Sell, L=DOM tip…"
                />

                <Card radius="lg" withBorder style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <Grid>
                    <Grid.Col span={6}><Text size="sm" c="dimmed">Buy Market</Text></Grid.Col>
                    <Grid.Col span={6}><Badge variant="light">B</Badge></Grid.Col>
                    <Grid.Col span={6}><Text size="sm" c="dimmed">Sell Market</Text></Grid.Col>
                    <Grid.Col span={6}><Badge variant="light">S</Badge></Grid.Col>
                    <Grid.Col span={6}><Text size="sm" c="dimmed">DOM Tip</Text></Grid.Col>
                    <Grid.Col span={6}><Badge variant="light">L</Badge></Grid.Col>
                  </Grid>
                </Card>

                <Text size="xs" c="dimmed">
                  Later you can bind hotkeys per layout/workspace.
                </Text>
              </Stack>
            </GlassCard>
          </SimpleGrid>
        </Tabs.Panel>

        {/* =================== RISK =================== */}
        <Tabs.Panel value="risk" pt="md">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <GlassCard title="Risk limits" icon={<IconShield size={18} />} badge={<Badge variant="light">Prop</Badge>}>
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  Set limits (demo). Your real risk engine can consume these values later.
                </Text>

                <Stack gap={6}>
                  <Group justify="space-between">
                    <Text size="sm">Max daily loss</Text>
                    <Badge variant="light">{risk.maxDailyLossPct}%</Badge>
                  </Group>
                  <Slider
                    value={risk.maxDailyLossPct}
                    onChange={(v) => setRisk((r) => ({ ...r, maxDailyLossPct: v }))}
                    min={1}
                    max={15}
                    step={1}
                  />
                </Stack>

                <Stack gap={6}>
                  <Group justify="space-between">
                    <Text size="sm">Max drawdown</Text>
                    <Badge variant="light">{risk.maxDrawdownPct}%</Badge>
                  </Group>
                  <Slider
                    value={risk.maxDrawdownPct}
                    onChange={(v) => setRisk((r) => ({ ...r, maxDrawdownPct: v }))}
                    min={2}
                    max={25}
                    step={1}
                  />
                </Stack>

                <Stack gap={6}>
                  <Group justify="space-between">
                    <Text size="sm">Max exposure</Text>
                    <Badge variant="light">{risk.maxExposurePct}%</Badge>
                  </Group>
                  <Slider
                    value={risk.maxExposurePct}
                    onChange={(v) => setRisk((r) => ({ ...r, maxExposurePct: v }))}
                    min={10}
                    max={100}
                    step={5}
                  />
                </Stack>

                <Divider />

                <Switch
                  checked={risk.blockOnViolation}
                  onChange={(e) => setRisk((r) => ({ ...r, blockOnViolation: e.currentTarget.checked }))}
                  label="Block trading on violation"
                  description="If enabled, trade gate becomes LOCKED."
                />

                <Switch
                  checked={risk.showWarnings}
                  onChange={(e) => setRisk((r) => ({ ...r, showWarnings: e.currentTarget.checked }))}
                  label="Show warnings"
                  description="Display AT RISK warnings earlier."
                />
              </Stack>
            </GlassCard>

            <GlassCard title="Risk preview" icon={<IconShield size={18} />} badge={<Badge variant="light">UX</Badge>}>
              <Stack gap="sm">
                <Card radius="lg" withBorder style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <Group justify="space-between">
                    <Text fw={700}>Trade gate</Text>
                    <Badge variant="light" color={risk.blockOnViolation ? "green" : "yellow"}>
                      {risk.blockOnViolation ? "STRICT" : "SOFT"}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed" mt={6}>
                    Strict mode locks ticket and disables market buttons on violation.
                  </Text>
                </Card>

                <Card radius="lg" withBorder style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <Group justify="space-between">
                    <Text fw={700}>Warnings</Text>
                    <Badge variant="light" color={risk.showWarnings ? "blue" : "gray"}>
                      {risk.showWarnings ? "ON" : "OFF"}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed" mt={6}>
                    If enabled, UI shows near-limit badges and toasts.
                  </Text>
                </Card>
              </Stack>
            </GlassCard>
          </SimpleGrid>
        </Tabs.Panel>

        {/* =================== NOTIFICATIONS =================== */}
        <Tabs.Panel value="notifications" pt="md">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <GlassCard title="Events" icon={<IconBell size={18} />} badge={<Badge variant="light">Toasts</Badge>}>
              <Stack gap="sm">
                <Switch checked={notify.orderPlaced} onChange={(e) => setNotify((n) => ({ ...n, orderPlaced: e.currentTarget.checked }))} label="Order placed" />
                <Switch checked={notify.orderFilled} onChange={(e) => setNotify((n) => ({ ...n, orderFilled: e.currentTarget.checked }))} label="Order filled" />
                <Switch checked={notify.sltpHit} onChange={(e) => setNotify((n) => ({ ...n, sltpHit: e.currentTarget.checked }))} label="SL/TP hit" />
                <Switch checked={notify.riskWarnings} onChange={(e) => setNotify((n) => ({ ...n, riskWarnings: e.currentTarget.checked }))} label="Risk warnings" />
                <Divider />
                <Switch checked={notify.sound} onChange={(e) => setNotify((n) => ({ ...n, sound: e.currentTarget.checked }))} label="Sound alerts" />
                <Switch checked={notify.desktop} onChange={(e) => setNotify((n) => ({ ...n, desktop: e.currentTarget.checked }))} label="Desktop notifications" />
              </Stack>
            </GlassCard>

            <GlassCard title="Test notification" icon={<IconBell size={18} />} badge={<Badge variant="light">Demo</Badge>}>
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  Click to show a preview toast.
                </Text>
                <Button
                  leftSection={<IconCheck size={16} />}
                  onClick={() =>
                    notifications.show({
                      title: "Order filled",
                      message: "XAUUSD BUY 0.10 @ 2034.16 (mock)",
                      color: "green",
                    })
                  }
                >
                  Show toast
                </Button>
              </Stack>
            </GlassCard>
          </SimpleGrid>
        </Tabs.Panel>

        {/* =================== SECURITY =================== */}
        <Tabs.Panel value="security" pt="md">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <GlassCard title="Security" icon={<IconLock size={18} />} badge={<Badge variant="light">Local</Badge>}>
              <Stack gap="sm">
                <NumberInput
                  label="Auto lock after (minutes)"
                  value={security.lockAfterMin}
                  onChange={(v) => setSecurity((s) => ({ ...s, lockAfterMin: Number(v) || 0 }))}
                  min={0}
                  step={5}
                />

                <Switch
                  checked={security.requireConfirmSensitive}
                  onChange={(e) => setSecurity((s) => ({ ...s, requireConfirmSensitive: e.currentTarget.checked }))}
                  label="Confirm sensitive actions"
                  description="Reset, wipe data, account changes..."
                />

                <Switch
                  checked={security.maskBalances}
                  onChange={(e) => setSecurity((s) => ({ ...s, maskBalances: e.currentTarget.checked }))}
                  label="Mask balances"
                  description="Hide equity / P&L in public screens."
                />

                <Switch
                  checked={security.allowClipboard}
                  onChange={(e) => setSecurity((s) => ({ ...s, allowClipboard: e.currentTarget.checked }))}
                  label="Allow clipboard"
                  description="Copy ticket details / order id."
                />
              </Stack>
            </GlassCard>

            <GlassCard title="Session" icon={<IconShield size={18} />} badge={<Badge variant="light">Demo</Badge>}>
              <Stack gap="sm">
                <Card radius="lg" withBorder style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <Group justify="space-between">
                    <Text fw={700}>2FA</Text>
                    <Badge variant="light" color="yellow">Soon</Badge>
                  </Group>
                  <Text size="sm" c="dimmed" mt={6}>
                    Add TOTP / device binding when connecting real auth.
                  </Text>
                </Card>

                <Button
                  variant="light"
                  leftSection={<IconLock size={16} />}
                  onClick={() =>
                    notifications.show({
                      title: "Locked (demo)",
                      message: "In real app: redirect to lock screen / re-auth.",
                    })
                  }
                >
                  Lock now
                </Button>
              </Stack>
            </GlassCard>
          </SimpleGrid>
        </Tabs.Panel>

        {/* =================== SYNC =================== */}
        <Tabs.Panel value="sync" pt="md">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <GlassCard title="Cloud sync" icon={<IconCloud size={18} />} badge={<Badge variant="light">Later</Badge>}>
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  This is a frontend demo. Later you can sync settings to backend (user profile).
                </Text>

                <Switch checked={true} readOnly label="Sync enabled (mock)" description="Will push local settings to server." />

                <Button
                  leftSection={<IconCloud size={16} />}
                  onClick={() =>
                    notifications.show({
                      title: "Sync",
                      message: "Mock sync OK. (Later: call /settings API)",
                      color: "blue",
                    })
                  }
                >
                  Sync now
                </Button>
              </Stack>
            </GlassCard>

            <GlassCard title="Advanced" icon={<IconWand size={18} />} badge={<Badge variant="light">Dev</Badge>}>
              <Stack gap="sm">
                <Tooltip label="Demo: wipe local settings from storage" withArrow>
                  <Button
                    color="red"
                    variant="light"
                    onClick={() => {
                      try {
                        localStorage.removeItem("hts.settings.profile");
                        localStorage.removeItem("hts.settings.appearance");
                        localStorage.removeItem("hts.settings.trade");
                        localStorage.removeItem("hts.settings.risk");
                        localStorage.removeItem("hts.settings.notify");
                        localStorage.removeItem("hts.settings.security");
                      } catch {}
                      resetAll();
                    }}
                  >
                    Wipe local settings
                  </Button>
                </Tooltip>

                <Text size="xs" c="dimmed">
                  Note: This is safe because everything is demo + localStorage only.
                </Text>
              </Stack>
            </GlassCard>
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
