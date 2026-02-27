// pages/settings.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
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
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBell,
  IconCheck,
  IconCloudUpload,
  IconDeviceFloppy,
  IconKey,
  IconLock,
  IconPalette,
  IconRefresh,
  IconScale,
  IconSettings,
  IconShield,
  IconSwitchHorizontal,
  IconTrendingUp,
  IconUser,
  IconWand,
  IconAlertTriangle,
  IconTrash,
} from "@tabler/icons-react";

import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18nProvider";

type ThemeMode = "dark" | "light" | "system";
type Accent = "blue" | "green" | "purple" | "orange";
type MantineAccent = "blue" | "green" | "violet" | "orange";

const LS_SETTINGS = "hts-settings-v1";

type SettingsState = {
  // general
  displayName: string;
  email: string;
  timezone: string;
  // language
  locale: Locale;

  // workspace
  comfortSpacing: boolean;
  animations: boolean;
  reduceBlur: boolean;

  // appearance
  themeMode: ThemeMode;
  accent: Accent;
  glassPanels: boolean;
  microInteractions: boolean;

  // trading
  defaultLots: number;
  defaultRiskPct: number;
  defaultSLPips: number;
  defaultTPPips: number;
  oneClickTrading: boolean;
  confirmBeforePlace: boolean;
  autoFollowPrice: boolean;
  hotkeysEnabled: boolean;

  // risk
  maxDailyLossPct: number;
  maxDrawdownPct: number;
  maxExposurePct: number;
  blockTradingOnViolation: boolean;
  showWarningsEarly: boolean;

  // notifications
  nOrderPlaced: boolean;
  nOrderFilled: boolean;
  nSLTPHit: boolean;
  nRiskWarnings: boolean;
  nSoundAlerts: boolean;
  nDesktop: boolean;

  // security
  autoLockMinutes: number;
  confirmSensitiveActions: boolean;
  maskBalances: boolean;
  allowClipboard: boolean;

  // sync
  cloudSyncEnabled: boolean;
};

const DEFAULTS: SettingsState = {
  displayName: "Admin",
  email: "admin@demo.local",
  timezone: "Asia/Ho_Chi_Minh (GMT+7)",
  locale: "vi",

  comfortSpacing: true,
  animations: true,
  reduceBlur: false,

  themeMode: "system",
  accent: "orange",
  glassPanels: true,
  microInteractions: true,

  defaultLots: 0.1,
  defaultRiskPct: 1,
  defaultSLPips: 0,
  defaultTPPips: 0,
  oneClickTrading: true,
  confirmBeforePlace: true,
  autoFollowPrice: true,
  hotkeysEnabled: true,

  maxDailyLossPct: 5,
  maxDrawdownPct: 10,
  maxExposurePct: 80,
  blockTradingOnViolation: true,
  showWarningsEarly: true,

  nOrderPlaced: true,
  nOrderFilled: true,
  nSLTPHit: true,
  nRiskWarnings: true,
  nSoundAlerts: false,
  nDesktop: false,

  autoLockMinutes: 30,
  confirmSensitiveActions: true,
  maskBalances: false,
  allowClipboard: true,

  cloudSyncEnabled: true,
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

// ✅ Mantine không có "purple" => map sang "violet"
function accentToMantine(a: Accent): MantineAccent {
  return a === "purple" ? "violet" : a;
}

export default function SettingsPage() {
  const { locale, setLocale, t } = useI18n();

  const [activeTab, setActiveTab] = useState<string>("general");

  // persisted state
  const [s, setS] = useState<SettingsState>({ ...DEFAULTS, locale });

  // draft language (apply on Save)
  const [draftLang, setDraftLang] = useState<Locale>(locale);

  // load saved settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SettingsState>;
        const merged: SettingsState = {
          ...DEFAULTS,
          ...parsed,
          locale: parsed.locale ?? locale,
        };
        setS(merged);
        setDraftLang(merged.locale);
      } else {
        setS((prev) => ({ ...prev, locale }));
        setDraftLang(locale);
      }
    } catch {
      setS((prev) => ({ ...prev, locale }));
      setDraftLang(locale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // if locale changed externally, keep draft in sync
  useEffect(() => {
    setDraftLang(locale);
    setS((prev) => ({ ...prev, locale }));
  }, [locale]);

  const languageData = useMemo(
    () => [
      { value: "vi", label: "Tiếng Việt" },
      { value: "en", label: "English" },
      { value: "ko", label: "한국어" },
      { value: "ja", label: "日本語" },
    ],
    []
  );

  const timezoneData = useMemo(
    () => [
      "Asia/Ho_Chi_Minh (GMT+7)",
      "Asia/Seoul (GMT+9)",
      "Asia/Tokyo (GMT+9)",
      "UTC (GMT+0)",
    ],
    []
  );

  const onReset = () => {
    const next = { ...DEFAULTS, locale };
    setS(next);
    setDraftLang(locale);
    localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
    notifications.show({
      title: t("common.reset"),
      message: t("settings.toast.reset_done"),
      color: "blue",
      icon: <IconRefresh size={18} />,
    });
  };

  const applyThemeAndAccent = (themeMode: ThemeMode, accent: Accent) => {
    if (themeMode === "dark" || themeMode === "light") {
      window.dispatchEvent(new CustomEvent("hts-theme-changed", { detail: themeMode }));
    }
    window.dispatchEvent(new CustomEvent("hts-accent-changed", { detail: accent }));
  };

  const onSave = () => {
    const next: SettingsState = { ...s, locale: draftLang };

    localStorage.setItem(LS_SETTINGS, JSON.stringify(next));

    // ✅ chỉ đổi ngôn ngữ khi bấm Save
    setLocale(draftLang);

    applyThemeAndAccent(next.themeMode, next.accent);

    notifications.show({
      title: t("common.save"),
      message: t("settings.toast.saved", {
        lang: String(draftLang).toUpperCase(),
        theme: next.themeMode,
        accent: next.accent,
      }),
      color: "green",
      icon: <IconCheck size={18} />,
    });
  };

  const wipeLocalSettings = () => {
    localStorage.removeItem(LS_SETTINGS);
    localStorage.removeItem("hts-accent");
    notifications.show({
      title: t("settings.toast.wiped_title"),
      message: t("settings.toast.wiped_msg"),
      color: "red",
      icon: <IconTrash size={18} />,
    });
    const next = { ...DEFAULTS, locale };
    setS(next);
    setDraftLang(locale);
  };

  return (
    <Box className="hts-settings-page">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Stack gap={6}>
            <Group gap="sm">
              <ActionIcon radius="xl" variant="light" color="teal">
                <IconSettings size={18} />
              </ActionIcon>

              <Title order={2} fw={900} className="hts-section-title">
                {t("settings.title")}
              </Title>

              <Badge variant="light" color="blue">
                HTS
              </Badge>

              {/* ✅ FIX: badge đổi đúng màu accent */}
              <Badge variant="light" color={accentToMantine(s.accent)}>
                {String(s.accent).toUpperCase()}
              </Badge>
            </Group>

            <Text size="sm" c="dimmed">
              {t("settings.subtitle")}
            </Text>
          </Stack>

          <Group>
            <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={onReset}>
              {t("common.reset")}
            </Button>
            <Button leftSection={<IconDeviceFloppy size={16} />} color="green" onClick={onSave}>
              {t("common.save")}
            </Button>
          </Group>
        </Group>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(v) => setActiveTab(v || "general")} variant="default">
          <Tabs.List>
            <Tabs.Tab value="general" leftSection={<IconUser size={14} />}>
              {t("settings.tabs.general")}
            </Tabs.Tab>
            <Tabs.Tab value="appearance" leftSection={<IconPalette size={14} />}>
              {t("settings.tabs.appearance")}
            </Tabs.Tab>
            <Tabs.Tab value="trading" leftSection={<IconTrendingUp size={14} />}>
              {t("settings.tabs.trading")}
            </Tabs.Tab>
            <Tabs.Tab value="risk" leftSection={<IconScale size={14} />}>
              {t("settings.tabs.risk")}
            </Tabs.Tab>
            <Tabs.Tab value="notifications" leftSection={<IconBell size={14} />}>
              {t("settings.tabs.notifications")}
            </Tabs.Tab>
            <Tabs.Tab value="security" leftSection={<IconShield size={14} />}>
              {t("settings.tabs.security")}
            </Tabs.Tab>
            <Tabs.Tab value="sync" leftSection={<IconCloudUpload size={14} />}>
              {t("settings.tabs.sync")}
            </Tabs.Tab>
          </Tabs.List>

          {/* GENERAL */}
          <Tabs.Panel value="general" pt="md">
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
              {/* Profile */}
              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ActionIcon variant="light" radius="md" color="teal">
                      <IconUser size={16} />
                    </ActionIcon>
                    <Text fw={800} className="hts-section-title">
                      {t("settings.profile.title")}
                    </Text>
                  </Group>
                  <Badge variant="light" color="blue">
                    LOCAL
                  </Badge>
                </Group>

                <Text size="xs" c="dimmed" mb="sm">
                  {t("settings.profile.desc")}
                </Text>

                <Stack gap="sm">
                  <TextInput
                    label={t("settings.profile.display_name")}
                    value={s.displayName}
                    onChange={(e) => setS((p) => ({ ...p, displayName: e.currentTarget.value }))}
                  />
                  <TextInput
                    label={t("settings.profile.email")}
                    value={s.email}
                    onChange={(e) => setS((p) => ({ ...p, email: e.currentTarget.value }))}
                  />

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <Select
                      label={t("settings.profile.timezone")}
                      value={s.timezone}
                      onChange={(v) => setS((p) => ({ ...p, timezone: v || p.timezone }))}
                      data={timezoneData}
                    />
                    <Select
                      label={t("settings.language")}
                      value={draftLang}
                      onChange={(v) => setDraftLang((v as Locale) || "vi")}
                      data={languageData}
                    />
                  </SimpleGrid>

                  <Text size="xs" c="dimmed">
                    {t("settings.language_tip")}
                  </Text>
                </Stack>
              </Paper>

              {/* Workspace */}
              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ActionIcon variant="light" radius="md" color="teal">
                      <IconSwitchHorizontal size={16} />
                    </ActionIcon>
                    <Text fw={800} className="hts-section-title">
                      {t("settings.workspace.title")}
                    </Text>
                  </Group>

                  <Badge variant="light" color="blue">
                    UX
                  </Badge>
                </Group>

                <Text size="xs" c="dimmed" mb="sm">
                  {t("settings.workspace.desc")}
                </Text>

                <Stack gap="sm">
                  <Switch
                    checked={s.comfortSpacing}
                    onChange={(e) => setS((p) => ({ ...p, comfortSpacing: e.currentTarget.checked }))}
                    label={t("settings.workspace.comfort_spacing")}
                    description={t("settings.workspace.comfort_spacing_desc")}
                  />
                  <Switch
                    checked={s.animations}
                    onChange={(e) => setS((p) => ({ ...p, animations: e.currentTarget.checked }))}
                    label={t("settings.workspace.animations")}
                    description={t("settings.workspace.animations_desc")}
                  />
                  <Switch
                    checked={s.reduceBlur}
                    onChange={(e) => setS((p) => ({ ...p, reduceBlur: e.currentTarget.checked }))}
                    label={t("settings.workspace.reduce_blur")}
                    description={t("settings.workspace.reduce_blur_desc")}
                  />

                  <Divider my="xs" />
                  <Text size="xs" c="dimmed">
                    {t("settings.workspace.tip")}
                  </Text>
                </Stack>
              </Paper>
            </SimpleGrid>
          </Tabs.Panel>

          {/* APPEARANCE */}
          <Tabs.Panel value="appearance" pt="md">
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ActionIcon variant="light" radius="md" color="teal">
                      <IconPalette size={16} />
                    </ActionIcon>
                    <Text fw={800} className="hts-section-title">
                      {t("settings.appearance.theme_title")}
                    </Text>
                  </Group>

                  {/* ✅ FIX: badge đổi đúng màu */}
                  <Badge variant="light" color={accentToMantine(s.accent)}>
                    {String(s.accent).toUpperCase()}
                  </Badge>
                </Group>

                <Text size="xs" c="dimmed" mb="sm">
                  {t("settings.appearance.theme_desc")}
                </Text>

                <Stack gap="sm">
                  <SegmentedControl
                    fullWidth
                    value={s.themeMode}
                    onChange={(v) => setS((p) => ({ ...p, themeMode: v as ThemeMode }))}
                    data={[
                      { value: "dark", label: t("settings.appearance.dark") },
                      { value: "light", label: t("settings.appearance.light") },
                      { value: "system", label: t("settings.appearance.system") },
                    ]}
                  />

                  {/* ✅ FIX: tab accent đổi đúng màu (không còn cam mọi lựa chọn) */}
                  <SegmentedControl
                    fullWidth
                    value={s.accent}
                    color={accentToMantine(s.accent)}
                    onChange={(v) => setS((p) => ({ ...p, accent: v as Accent }))}
                    data={[
                      { value: "blue", label: t("settings.appearance.accent_blue") },
                      { value: "green", label: t("settings.appearance.accent_green") },
                      { value: "purple", label: t("settings.appearance.accent_purple") },
                      { value: "orange", label: t("settings.appearance.accent_orange") },
                    ]}
                  />

                  <Text size="xs" c="dimmed">
                    {t("settings.appearance.tip")}
                  </Text>
                </Stack>
              </Paper>

              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ActionIcon variant="light" radius="md" color="teal">
                      <IconWand size={16} />
                    </ActionIcon>
                    <Text fw={800} className="hts-section-title">
                      {t("settings.appearance.polish_title")}
                    </Text>
                  </Group>
                  <Badge variant="light" color="blue">
                    PRO
                  </Badge>
                </Group>

                <Stack gap="sm">
                  <Switch
                    checked={s.glassPanels}
                    onChange={(e) => setS((p) => ({ ...p, glassPanels: e.currentTarget.checked }))}
                    label={t("settings.appearance.glass_panels")}
                    description={t("settings.appearance.glass_panels_desc")}
                  />
                  <Switch
                    checked={s.microInteractions}
                    onChange={(e) => setS((p) => ({ ...p, microInteractions: e.currentTarget.checked }))}
                    label={t("settings.appearance.micro_interactions")}
                    description={t("settings.appearance.micro_interactions_desc")}
                  />
                </Stack>
              </Paper>
            </SimpleGrid>
          </Tabs.Panel>

          {/* TRADING */}
          <Tabs.Panel value="trading" pt="md">
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ActionIcon variant="light" radius="md" color="teal">
                      <IconTrendingUp size={16} />
                    </ActionIcon>
                    <Text fw={800} className="hts-section-title">
                      {t("settings.trading.defaults_title")}
                    </Text>
                  </Group>
                  <Badge variant="light" color="blue">
                    TICKET
                  </Badge>
                </Group>

                <Text size="xs" c="dimmed" mb="sm">
                  {t("settings.trading.defaults_desc")}
                </Text>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <TextInput
                    label={t("settings.trading.default_lots")}
                    value={String(s.defaultLots)}
                    onChange={(e) =>
                      setS((p) => ({
                        ...p,
                        defaultLots: clamp(Number(e.currentTarget.value || 0), 0, 100),
                      }))
                    }
                  />
                  <TextInput
                    label={t("settings.trading.default_risk_pct")}
                    value={String(s.defaultRiskPct)}
                    onChange={(e) =>
                      setS((p) => ({
                        ...p,
                        defaultRiskPct: clamp(Number(e.currentTarget.value || 0), 0, 100),
                      }))
                    }
                  />
                  <TextInput
                    label={t("settings.trading.default_sl_pips")}
                    value={String(s.defaultSLPips)}
                    onChange={(e) =>
                      setS((p) => ({
                        ...p,
                        defaultSLPips: clamp(Number(e.currentTarget.value || 0), 0, 100000),
                      }))
                    }
                  />
                  <TextInput
                    label={t("settings.trading.default_tp_pips")}
                    value={String(s.defaultTPPips)}
                    onChange={(e) =>
                      setS((p) => ({
                        ...p,
                        defaultTPPips: clamp(Number(e.currentTarget.value || 0), 0, 100000),
                      }))
                    }
                  />
                </SimpleGrid>

                <Divider my="sm" />

                <Stack gap="sm">
                  <Switch
                    checked={s.oneClickTrading}
                    onChange={(e) => setS((p) => ({ ...p, oneClickTrading: e.currentTarget.checked }))}
                    label={t("settings.trading.one_click")}
                    description={t("settings.trading.one_click_desc")}
                  />
                  <Switch
                    checked={s.confirmBeforePlace}
                    onChange={(e) => setS((p) => ({ ...p, confirmBeforePlace: e.currentTarget.checked }))}
                    label={t("settings.trading.confirm_before_place")}
                    description={t("settings.trading.confirm_before_place_desc")}
                  />
                  <Switch
                    checked={s.autoFollowPrice}
                    onChange={(e) => setS((p) => ({ ...p, autoFollowPrice: e.currentTarget.checked }))}
                    label={t("settings.trading.auto_follow")}
                    description={t("settings.trading.auto_follow_desc")}
                  />
                </Stack>
              </Paper>

              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ActionIcon variant="light" radius="md" color="teal">
                      <IconKey size={16} />
                    </ActionIcon>
                    <Text fw={800} className="hts-section-title">
                      {t("settings.trading.hotkeys_title")}
                    </Text>
                  </Group>
                  <Badge variant="light" color="blue">
                    PRO
                  </Badge>
                </Group>

                <Switch
                  checked={s.hotkeysEnabled}
                  onChange={(e) => setS((p) => ({ ...p, hotkeysEnabled: e.currentTarget.checked }))}
                  label={t("settings.trading.hotkeys_enable")}
                  description={t("settings.trading.hotkeys_desc")}
                />

                <Divider my="sm" />

                <Paper withBorder radius="md" p="sm">
                  <Group justify="space-between">
                    <Text size="sm">{t("settings.trading.hk_buy")}</Text>
                    <Badge variant="light">B</Badge>
                  </Group>
                  <Group justify="space-between" mt="xs">
                    <Text size="sm">{t("settings.trading.hk_sell")}</Text>
                    <Badge variant="light">S</Badge>
                  </Group>
                  <Group justify="space-between" mt="xs">
                    <Text size="sm">{t("settings.trading.hk_dom")}</Text>
                    <Badge variant="light">L</Badge>
                  </Group>
                </Paper>

                <Text size="xs" c="dimmed" mt="sm">
                  {t("settings.trading.hotkeys_tip")}
                </Text>
              </Paper>
            </SimpleGrid>
          </Tabs.Panel>

          {/* RISK */}
          <Tabs.Panel value="risk" pt="md">
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ActionIcon variant="light" radius="md" color="teal">
                      <IconScale size={16} />
                    </ActionIcon>
                    <Text fw={800} className="hts-section-title">
                      {t("settings.risk.limits_title")}
                    </Text>
                  </Group>
                  <Badge variant="light" color="blue">
                    PROP
                  </Badge>
                </Group>

                <Text size="xs" c="dimmed" mb="sm">
                  {t("settings.risk.limits_desc")}
                </Text>

                <Stack gap="md">
                  <Box>
                    <Group justify="space-between" mb={6}>
                      <Text size="sm">{t("settings.risk.max_daily_loss")}</Text>
                      <Badge variant="light">{s.maxDailyLossPct}%</Badge>
                    </Group>
                    <Slider
                      value={s.maxDailyLossPct}
                      onChange={(v) => setS((p) => ({ ...p, maxDailyLossPct: v }))}
                      min={1}
                      max={20}
                      step={1}
                    />
                  </Box>

                  <Box>
                    <Group justify="space-between" mb={6}>
                      <Text size="sm">{t("settings.risk.max_drawdown")}</Text>
                      <Badge variant="light">{s.maxDrawdownPct}%</Badge>
                    </Group>
                    <Slider
                      value={s.maxDrawdownPct}
                      onChange={(v) => setS((p) => ({ ...p, maxDrawdownPct: v }))}
                      min={1}
                      max={30}
                      step={1}
                    />
                  </Box>

                  <Box>
                    <Group justify="space-between" mb={6}>
                      <Text size="sm">{t("settings.risk.max_exposure")}</Text>
                      <Badge variant="light">{s.maxExposurePct}%</Badge>
                    </Group>
                    <Slider
                      value={s.maxExposurePct}
                      onChange={(v) => setS((p) => ({ ...p, maxExposurePct: v }))}
                      min={10}
                      max={100}
                      step={5}
                    />
                  </Box>

                  <Switch
                    checked={s.blockTradingOnViolation}
                    onChange={(e) => setS((p) => ({ ...p, blockTradingOnViolation: e.currentTarget.checked }))}
                    label={t("settings.risk.block_on_violation")}
                    description={t("settings.risk.block_on_violation_desc")}
                  />
                  <Switch
                    checked={s.showWarningsEarly}
                    onChange={(e) => setS((p) => ({ ...p, showWarningsEarly: e.currentTarget.checked }))}
                    label={t("settings.risk.show_warnings")}
                    description={t("settings.risk.show_warnings_desc")}
                  />
                </Stack>
              </Paper>

              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ActionIcon variant="light" radius="md" color="teal">
                      <IconAlertTriangle size={16} />
                    </ActionIcon>
                    <Text fw={800} className="hts-section-title">
                      {t("settings.risk.preview_title")}
                    </Text>
                  </Group>
                  <Badge variant="light" color="blue">
                    UX
                  </Badge>
                </Group>

                <Paper withBorder radius="md" p="sm">
                  <Group justify="space-between">
                    <Text size="sm" fw={700}>
                      {t("settings.risk.trade_gate")}
                    </Text>
                    <Badge variant="light" color={s.blockTradingOnViolation ? "yellow" : "green"}>
                      {s.blockTradingOnViolation ? t("settings.risk.strict") : t("settings.risk.open")}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mt={6}>
                    {t("settings.risk.strict_desc")}
                  </Text>
                </Paper>

                <Paper withBorder radius="md" p="sm" mt="sm">
                  <Group justify="space-between">
                    <Text size="sm" fw={700}>
                      {t("settings.risk.warnings")}
                    </Text>
                    <Badge variant="light" color={s.showWarningsEarly ? "blue" : "gray"}>
                      {s.showWarningsEarly ? t("common.on") : t("common.off")}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mt={6}>
                    {t("settings.risk.warnings_desc")}
                  </Text>
                </Paper>
              </Paper>
            </SimpleGrid>
          </Tabs.Panel>

          {/* NOTIFICATIONS */}
          <Tabs.Panel value="notifications" pt="md">
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ActionIcon variant="light" radius="md" color="teal">
                      <IconBell size={16} />
                    </ActionIcon>
                    <Text fw={800} className="hts-section-title">
                      {t("settings.notifications.events_title")}
                    </Text>
                  </Group>
                  <Badge variant="light" color="blue">
                    TOASTS
                  </Badge>
                </Group>

                <Stack gap="sm">
                  <Switch
                    checked={s.nOrderPlaced}
                    onChange={(e) => setS((p) => ({ ...p, nOrderPlaced: e.currentTarget.checked }))}
                    label={t("settings.notifications.order_placed")}
                  />
                  <Switch
                    checked={s.nOrderFilled}
                    onChange={(e) => setS((p) => ({ ...p, nOrderFilled: e.currentTarget.checked }))}
                    label={t("settings.notifications.order_filled")}
                  />
                  <Switch
                    checked={s.nSLTPHit}
                    onChange={(e) => setS((p) => ({ ...p, nSLTPHit: e.currentTarget.checked }))}
                    label={t("settings.notifications.sltp_hit")}
                  />
                  <Switch
                    checked={s.nRiskWarnings}
                    onChange={(e) => setS((p) => ({ ...p, nRiskWarnings: e.currentTarget.checked }))}
                    label={t("settings.notifications.risk_warnings")}
                  />

                  <Divider my="xs" />

                  <Switch
                    checked={s.nSoundAlerts}
                    onChange={(e) => setS((p) => ({ ...p, nSoundAlerts: e.currentTarget.checked }))}
                    label={t("settings.notifications.sound_alerts")}
                  />
                  <Switch
                    checked={s.nDesktop}
                    onChange={(e) => setS((p) => ({ ...p, nDesktop: e.currentTarget.checked }))}
                    label={t("settings.notifications.desktop")}
                  />
                </Stack>
              </Paper>

              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ActionIcon variant="light" radius="md" color="teal">
                      <IconBell size={16} />
                    </ActionIcon>
                    <Text fw={800} className="hts-section-title">
                      {t("settings.notifications.test_title")}
                    </Text>
                  </Group>
                  <Badge variant="light" color="blue">
                    DEMO
                  </Badge>
                </Group>

                <Text size="xs" c="dimmed" mb="sm">
                  {t("settings.notifications.test_desc")}
                </Text>

                <Button
                  fullWidth
                  onClick={() =>
                    notifications.show({
                      title: t("settings.notifications.demo_toast_title"),
                      message: t("settings.notifications.demo_toast_msg"),
                      color: "blue",
                      icon: <IconCheck size={18} />,
                    })
                  }
                >
                  {t("settings.notifications.show_toast")}
                </Button>
              </Paper>
            </SimpleGrid>
          </Tabs.Panel>

          {/* SECURITY */}
          <Tabs.Panel value="security" pt="md">
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ActionIcon variant="light" radius="md" color="teal">
                      <IconLock size={16} />
                    </ActionIcon>
                    <Text fw={800} className="hts-section-title">
                      {t("settings.security.title")}
                    </Text>
                  </Group>
                  <Badge variant="light" color="blue">
                    LOCAL
                  </Badge>
                </Group>

                <Stack gap="sm">
                  <TextInput
                    label={t("settings.security.auto_lock_minutes")}
                    value={String(s.autoLockMinutes)}
                    onChange={(e) =>
                      setS((p) => ({
                        ...p,
                        autoLockMinutes: clamp(Number(e.currentTarget.value || 0), 0, 9999),
                      }))
                    }
                  />

                  <Switch
                    checked={s.confirmSensitiveActions}
                    onChange={(e) => setS((p) => ({ ...p, confirmSensitiveActions: e.currentTarget.checked }))}
                    label={t("settings.security.confirm_sensitive")}
                    description={t("settings.security.confirm_sensitive_desc")}
                  />

                  <Switch
                    checked={s.maskBalances}
                    onChange={(e) => setS((p) => ({ ...p, maskBalances: e.currentTarget.checked }))}
                    label={t("settings.security.mask_balances")}
                    description={t("settings.security.mask_balances_desc")}
                  />

                  <Switch
                    checked={s.allowClipboard}
                    onChange={(e) => setS((p) => ({ ...p, allowClipboard: e.currentTarget.checked }))}
                    label={t("settings.security.allow_clipboard")}
                    description={t("settings.security.allow_clipboard_desc")}
                  />
                </Stack>
              </Paper>

              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ActionIcon variant="light" radius="md" color="teal">
                      <IconShield size={16} />
                    </ActionIcon>
                    <Text fw={800} className="hts-section-title">
                      {t("settings.session.title")}
                    </Text>
                  </Group>
                  <Badge variant="light" color="blue">
                    DEMO
                  </Badge>
                </Group>

                <Paper withBorder radius="md" p="sm">
                  <Group justify="space-between">
                    <Text fw={700} size="sm">
                      2FA
                    </Text>
                    <Badge variant="light" color="yellow">
                      {t("common.soon")}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mt={6}>
                    {t("settings.session.2fa_desc")}
                  </Text>
                </Paper>

                <Button
                  fullWidth
                  mt="sm"
                  leftSection={<IconLock size={16} />}
                  variant="light"
                  onClick={() =>
                    notifications.show({
                      title: t("settings.session.locked_title"),
                      message: t("settings.session.locked_msg"),
                      color: "gray",
                    })
                  }
                >
                  {t("settings.session.lock_now")}
                </Button>
              </Paper>
            </SimpleGrid>
          </Tabs.Panel>

          {/* SYNC */}
          <Tabs.Panel value="sync" pt="md">
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ActionIcon variant="light" radius="md" color="teal">
                      <IconCloudUpload size={16} />
                    </ActionIcon>
                    <Text fw={800} className="hts-section-title">
                      {t("settings.sync.title")}
                    </Text>
                  </Group>
                  <Badge variant="light" color="blue">
                    LATER
                  </Badge>
                </Group>

                <Text size="xs" c="dimmed" mb="sm">
                  {t("settings.sync.desc")}
                </Text>

                <Switch
                  checked={s.cloudSyncEnabled}
                  onChange={(e) => setS((p) => ({ ...p, cloudSyncEnabled: e.currentTarget.checked }))}
                  label={t("settings.sync.enabled")}
                  description={t("settings.sync.enabled_desc")}
                />

                <Button
                  fullWidth
                  mt="sm"
                  leftSection={<IconCloudUpload size={16} />}
                  onClick={() =>
                    notifications.show({
                      title: t("settings.sync.toast_title"),
                      message: t("settings.sync.toast_msg"),
                      color: "blue",
                    })
                  }
                >
                  {t("settings.sync.now")}
                </Button>
              </Paper>

              <Paper withBorder radius="lg" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ActionIcon variant="light" radius="md" color="teal">
                      <IconWand size={16} />
                    </ActionIcon>
                    <Text fw={800} className="hts-section-title">
                      {t("settings.advanced.title")}
                    </Text>
                  </Group>
                  <Badge variant="light" color="blue">
                    DEV
                  </Badge>
                </Group>

                <Button
                  fullWidth
                  color="red"
                  variant="light"
                  leftSection={<IconTrash size={16} />}
                  onClick={wipeLocalSettings}
                >
                  {t("settings.advanced.wipe")}
                </Button>

                <Text size="xs" c="dimmed" mt="sm">
                  {t("settings.advanced.note")}
                </Text>
              </Paper>
            </SimpleGrid>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Box>
  );
}