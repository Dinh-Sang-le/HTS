"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

import {
  IconArrowRight,
  IconAt,
  IconLanguage,
  IconLock,
  IconMoonStars,
  IconShieldCheck,
  IconSun,
  IconUser,
  IconUserPlus,
  IconLogin,
} from "@tabler/icons-react";

import { setToken } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import { tFrom } from "@/lib/i18n";

type AuthMode = "login" | "register";

type LocalUser = {
  username: string;
  email?: string;
  password: string; // demo only
  createdAt: number;
};

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem("hts-locale") as Locale | null;
  return saved || "en";
}

/** ===== LocalStorage Users (Frontend mock) ===== */
const LS_USERS_KEY = "hts-users";

function readUsers(): LocalUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_USERS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as LocalUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: LocalUser[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
}

function findUser(username: string): LocalUser | undefined {
  const u = username.trim().toLowerCase();
  return readUsers().find((x) => x.username.trim().toLowerCase() === u);
}

function emailTaken(email: string): boolean {
  const e = email.trim().toLowerCase();
  return readUsers().some((x) => (x.email || "").trim().toLowerCase() === e);
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // ✅ switch login/register
  const [mode, setMode] = useState<AuthMode>("login");

  // ✅ Language
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const t = (key: string) => tFrom(locale, key);

  // ✅ Mantine theme (realtime)
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    localStorage.setItem("hts-theme", next);
    window.location.reload();
  };

  // ✅ Random background per mount
  const bg = useMemo(() => {
    const arr = ["/login/bg-dark.jpg", "/login/bg-light.jpg"];
    return arr[Math.floor(Math.random() * arr.length)];
  }, []);

  const brandGradient = useMemo(() => {
    return isDark
      ? "linear-gradient(90deg, #ffffff, #9ecbff)"
      : "linear-gradient(90deg, #111827, #2563eb)";
  }, [isDark]);

  /** ===== LOGIN submit ===== */
  const onSubmitLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");

    setLoading(true);
    await new Promise((r) => setTimeout(r, 450));

    // ✅ 1) check localStorage users first
    const user = findUser(username);
    if (user && user.password === password) {
      setToken("local-auth-token");

      notifications.show({
        title: t("login.ok_title") || "Access Granted",
        message: t("login.ok_msg") || "Welcome to Home Trading System",
        color: "green",
        icon: <IconShieldCheck size={18} />,
      });

      router.replace("/dashboard");
      setLoading(false);
      return;
    }

    // ✅ 2) fallback demo account
    const DEMO_USER = "admin";
    const DEMO_PASS = "123456";

    if (username === DEMO_USER && password === DEMO_PASS) {
      setToken("demo-auth-token");

      notifications.show({
        title: t("login.ok_title") || "Access Granted",
        message: t("login.ok_msg") || "Welcome to Home Trading System",
        color: "green",
        icon: <IconShieldCheck size={18} />,
      });

      router.replace("/dashboard");
    } else {
      notifications.show({
        title: t("login.fail_title") || "Authentication Failed",
        message:
          t("login.fail_msg") ||
          "Invalid username or password (or not registered).",
        color: "red",
      });
    }

    setLoading(false);
  };

  /** ===== REGISTER submit (frontend only) ===== */
  const onSubmitRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");

    // ✅ basic validate (i18n) — Mantine requires message
    if (username.length < 3) {
      notifications.show({
        title: t("register.err_title") || "Invalid input",
        message:
          t("register.err_username") ||
          "Username must be at least 3 characters.",
        color: "red",
      });
      return;
    }
    if (!email.includes("@") || email.length < 5) {
      notifications.show({
        title: t("register.err_title") || "Invalid input",
        message: t("register.err_email") || "Please enter a valid email.",
        color: "red",
      });
      return;
    }
    if (password.length < 6) {
      notifications.show({
        title: t("register.err_title") || "Invalid input",
        message:
          t("register.err_password") ||
          "Password must be at least 6 characters.",
        color: "red",
      });
      return;
    }
    if (password !== confirm) {
      notifications.show({
        title: t("register.err_title") || "Invalid input",
        message:
          t("register.err_confirm") || "Confirm password does not match.",
        color: "red",
      });
      return;
    }

    // duplicate checks (i18n)
    if (findUser(username)) {
      notifications.show({
        title: t("register.err_title") || "Invalid input",
        message:
          t("register.err_username_exists") ||
          "Please choose another username.",
        color: "red",
      });
      return;
    }
    if (emailTaken(email)) {
      notifications.show({
        title: t("register.err_title") || "Invalid input",
        message: t("register.err_email_exists") || "Please use another email.",
        color: "red",
      });
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    const users = readUsers();
    users.push({
      username,
      email,
      password,
      createdAt: Date.now(),
    });
    writeUsers(users);

    notifications.show({
      title: t("register.ok_title") || "Registered",
      message:
        t("register.ok_msg") ||
        "Account created locally (frontend demo). You can sign in now.",
      color: "green",
      icon: <IconShieldCheck size={18} />,
    });

    setLoading(false);
    setMode("login");
  };

  return (
    <Box className="hts-login">
      {/* Animated background */}
      <div className="hts-login-bg">
        <div
          className="hts-login-bgimg"
          style={{ backgroundImage: `url(${bg})` }}
        />
        <div className="hts-login-overlay" />
        <div className="hts-login-grid" />
        <div className="hts-login-glow hts-login-glow-a" />
        <div className="hts-login-glow hts-login-glow-b" />
        <div className="hts-login-pulse" />
      </div>

      {/* Foreground layout */}
      <Box className="hts-login-inner">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {/* Brand header */}
          <Group
            gap="sm"
            mb="lg"
            className="hts-login-brand"
            justify="space-between"
            wrap="nowrap"
          >
            <Group gap="sm" wrap="nowrap">
              <Box className="hts-login-badge">KJ</Box>

              <Stack gap={2}>
                <Text
                  fw={800}
                  style={{
                    whiteSpace: "nowrap",
                    letterSpacing: "0.4px",
                    background: brandGradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    opacity: isDark ? 0.92 : 0.96,
                    textShadow: isDark
                      ? "0 0 10px rgba(59,130,246,0.30)"
                      : "none",
                    fontSize: 18,
                    lineHeight: 1.1,
                  }}
                >
                  Home Trading System
                </Text>

                <Text size="xs" c={isDark ? "dimmed" : "gray.7"}>
                  {t("login.subtitle") ||
                    "Secure access • Real-time analytics • Execution-ready UI"}
                </Text>
              </Stack>
            </Group>

            <Tooltip label={isDark ? "Light mode" : "Dark mode"} withArrow>
              <ActionIcon
                variant="subtle"
                size="lg"
                radius="xl"
                className="hts-login-themebtn"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {isDark ? <IconSun size={18} /> : <IconMoonStars size={18} />}
              </ActionIcon>
            </Tooltip>
          </Group>

          {/* Card */}
          <Paper className="hts-login-card" withBorder radius="lg" p="xl">
            <Stack gap="md">
              <div>
                <Title order={3} fw={900}>
                  {mode === "login"
                    ? t("login.title") || "Sign in"
                    : t("register.title") || "Create account"}
                </Title>
                <Text size="sm" c="dimmed">
                  {mode === "login"
                    ? t("login.desc") || "Please authenticate to continue."
                    : t("register.desc") ||
                      "Frontend demo register (saved in localStorage)."}
                </Text>
              </div>

              <Divider />

              {/* ===== LOGIN ===== */}
              {mode === "login" ? (
                <form onSubmit={onSubmitLogin}>
                  <Stack gap="sm">
                    <TextInput
                      name="username"
                      label={t("login.username_label") || "Username"}
                      placeholder={t("login.username_ph") || "admin"}
                      leftSection={<IconUser size={16} />}
                      required
                      autoComplete="username"
                    />

                    <PasswordInput
                      name="password"
                      label={t("login.password_label") || "Password"}
                      placeholder={t("login.password_ph") || "123456"}
                      leftSection={<IconLock size={16} />}
                      required
                      autoComplete="current-password"
                    />

                    <Group justify="space-between" mt={2}>
                      <Checkbox label={t("login.remember") || "Remember me"} />
                      <Button variant="subtle" size="xs">
                        {t("login.forgot") || "Forgot password?"}
                      </Button>
                    </Group>

                    {/* ✅ Language dropdown under Remember me */}
                    <Select
                      value={locale}
                      onChange={(v) => {
                        if (!v) return;
                        const next = v as Locale;
                        setLocale(next);
                        localStorage.setItem("hts-locale", next);
                        window.location.reload();
                      }}
                      data={[
                        { value: "vi", label: "🇻🇳 Tiếng Việt" },
                        { value: "en", label: "🇺🇸 English" },
                        { value: "ko", label: "🇰🇷 한국어" },
                        { value: "ja", label: "🇯🇵 日本語" },
                      ]}
                      leftSection={<IconLanguage size={16} />}
                      size="sm"
                      radius="md"
                      comboboxProps={{ withinPortal: true }}
                      aria-label="Language"
                    />

                    <Button
                      type="submit"
                      loading={loading}
                      rightSection={<IconArrowRight size={16} />}
                      className="hts-login-primary"
                      leftSection={<IconLogin size={16} />}
                    >
                      {t("login.cta") || "Continue"}
                    </Button>

                    {/* ✅ Register CTA (i18n) */}
                    <Group justify="center" gap="xs" mt="xs">
                      <Text size="xs" c="dimmed">
                        {t("login.no_account") || "No account?"}
                      </Text>
                      <Anchor
                        size="xs"
                        onClick={(e) => {
                          e.preventDefault();
                          setMode("register");
                        }}
                      >
                        {t("login.create_one") || "Create one"}
                      </Anchor>
                    </Group>

                    
                  </Stack>
                </form>
              ) : (
                /* ===== REGISTER ===== */
                <form onSubmit={onSubmitRegister}>
                  <Stack gap="sm">
                    <TextInput
                      name="username"
                      label={t("register.username_label") || "Username"}
                      placeholder={t("register.username_ph") || "e.g. trader01"}
                      leftSection={<IconUser size={16} />}
                      required
                      autoComplete="username"
                    />

                    <TextInput
                      name="email"
                      label={t("register.email_label") || "Email"}
                      placeholder={t("register.email_ph") || "you@company.com"}
                      leftSection={<IconAt size={16} />}
                      required
                      autoComplete="email"
                    />

                    <PasswordInput
                      name="password"
                      label={t("register.password_label") || "Password"}
                      placeholder={t("register.password_ph") || "Min 6 chars"}
                      leftSection={<IconLock size={16} />}
                      required
                      autoComplete="new-password"
                    />

                    <PasswordInput
                      name="confirm"
                      label={t("register.confirm_label") || "Confirm password"}
                      placeholder={
                        t("register.confirm_ph") || "Re-enter password"
                      }
                      leftSection={<IconLock size={16} />}
                      required
                      autoComplete="new-password"
                    />

                    <Button
                      type="submit"
                      loading={loading}
                      rightSection={<IconArrowRight size={16} />}
                      className="hts-login-primary"
                      leftSection={<IconUserPlus size={16} />}
                    >
                      {t("register.cta") || "Create account"}
                    </Button>

                    <Group justify="center" gap="xs" mt="xs">
                      <Text size="xs" c="dimmed">
                        {t("register.have_account") || "Already have an account?"}
                      </Text>
                      <Anchor
                        size="xs"
                        onClick={(e) => {
                          e.preventDefault();
                          setMode("login");
                        }}
                      >
                        {t("register.signin") || "Sign in"}
                      </Anchor>
                    </Group>

                    {/* <Text size="xs" c="dimmed" ta="center" mt="xs">
                      {t("register.note") ||
                        "Note: This is a frontend-only demo. Users are stored in localStorage."}
                    </Text> */}
                  </Stack>
                </form>
              )}
            </Stack>
          </Paper>

          {/* Footer */}
          <Text size="xs" c="dimmed" ta="center" mt="md">
            © {new Date().getFullYear()} KJ Group • Financial Technology Division
          </Text>
        </motion.div>
      </Box>
    </Box>
  );
}