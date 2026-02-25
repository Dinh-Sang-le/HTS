"use client";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconMoonStars, IconSun } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconLock,
  IconUser,
  IconArrowRight,
  IconShieldCheck,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // ✅ Mantine theme (realtime)
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const toggleTheme = () => {
  const next = isDark ? "light" : "dark";
  // ✅ đồng bộ với _app.tsx của bạn
  localStorage.setItem("hts-theme", next);

  // đổi theme ngay lập tức bằng cách reload nhẹ trang login
  // vì MantineProvider theme đang lấy state ở _app.tsx
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

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") || "");
    const password = String(form.get("password") || "");

    setLoading(true);
    await new Promise((r) => setTimeout(r, 450)); // giả loading mượt

    // ✅ demo account
    const DEMO_USER = "admin";
    const DEMO_PASS = "123456";

    if (username === DEMO_USER && password === DEMO_PASS) {
      // ✅ login 1 lần: lưu token
      setToken("demo-auth-token");

      notifications.show({
        title: "Access Granted",
        message: "Welcome to Home Trading System",
        color: "green",
        icon: <IconShieldCheck size={18} />,
      });

      router.replace("/dashboard");
    } else {
      notifications.show({
        title: "Authentication Failed",
        message: "Invalid username or password",
        color: "red",
      });
    }

    setLoading(false);
  };

  return (
    <Box className="hts-login">
      {/* Animated background */}
      <div className="hts-login-bg">
        {/* ✅ Random Image */}
        <div
          className="hts-login-bgimg"
          style={{ backgroundImage: `url(${bg})` }}
        />

        {/* ✅ Overlay for readability */}
        <div className="hts-login-overlay" />

        {/* Fintech layers */}
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
          <Group gap="sm" mb="lg" className="hts-login-brand">
            {/* Bạn có thể thay bằng logo component của bạn */}
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
                Secure access • Real-time analytics • Execution-ready UI
              </Text>
            </Stack>
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
                  Sign in
                </Title>
                <Text size="sm" c="dimmed">
                  Please authenticate to continue.
                </Text>
              </div>

              <Divider />

              <form onSubmit={onSubmit}>
                <Stack gap="sm">
                  <TextInput
                    name="username"
                    label="Username"
                    placeholder="admin"
                    leftSection={<IconUser size={16} />}
                    required
                    autoComplete="username"
                  />

                  <PasswordInput
                    name="password"
                    label="Password"
                    placeholder="123456"
                    leftSection={<IconLock size={16} />}
                    required
                    autoComplete="current-password"
                  />

                  <Group justify="space-between" mt={2}>
                    <Checkbox label="Remember me" />
                    <Button variant="subtle" size="xs">
                      Forgot password?
                    </Button>
                  </Group>

                  <Button
                    type="submit"
                    loading={loading}
                    rightSection={<IconArrowRight size={16} />}
                    className="hts-login-primary"
                  >
                    Continue
                  </Button>

                  <Text size="xs" c="dimmed" ta="center" mt="xs">
                    Demo account: <b>admin</b> / <b>123456</b>
                  </Text>
                </Stack>
              </form>
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