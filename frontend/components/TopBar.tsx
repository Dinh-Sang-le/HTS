"use client";

import {
  Group,
  TextInput,
  ActionIcon,
  SegmentedControl,
  Avatar,
} from "@mantine/core";
import { Search, Bell } from "lucide-react";
import { IconSun, IconMoonStars } from "@tabler/icons-react";
import { Menu, Divider, UnstyledButton } from "@mantine/core";
import {
  IconChevronDown,
  IconUser,
  IconSettings,
  IconLogout,
  IconShieldCheck,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { clearToken } from "@/lib/auth";


export function TopBar({
  colorScheme,
  toggleColorScheme,
}: {
  colorScheme: "dark" | "light";
  toggleColorScheme: () => void;

  
}) {

  const router = useRouter();

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };
  const isDark = colorScheme === "dark";

  // ✅ style giống AppShell: glass/subtle
  const glassStyle: React.CSSProperties = {
    background: isDark
      ? "rgba(255,255,255,0.06)"
      : "rgba(0,0,0,0.04)",
    border: isDark
      ? "1px solid rgba(255,255,255,0.10)"
      : "1px solid rgba(0,0,0,0.08)",
    color: isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.75)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    transition: "all 0.2s ease",
  };

  return (
    <Group justify="space-between" align="center" className="hts-topbar" w="100%">
      {/* LEFT */}
      <Group gap="md">
        <TextInput
          className="hts-search"
          leftSection={<Search size={16} />}
          placeholder="Search symbol (XAUUSD, EURUSD...)"
          w={340}
        />

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
      </Group>

      {/* RIGHT */}
      <Group gap={8} align="center">
        {/* 🔔 */}
        <ActionIcon
          variant="subtle"
          aria-label="Notifications"
          className="hts-icon"
          style={glassStyle}
        >
          <Bell size={17} />
        </ActionIcon>

        {/* 🌙/☀ giống nút AppShell */}
        <ActionIcon
          variant="subtle"
          aria-label="Toggle theme"
          className="hts-icon"
          onClick={toggleColorScheme}
          style={glassStyle}
        >
          {isDark ? <IconSun size={18} /> : <IconMoonStars size={18} />}
        </ActionIcon>

        <Menu
  width={240}
  position="bottom-end"
  withArrow
  shadow="md"
  transitionProps={{ transition: "pop", duration: 120 }}
>
  <Menu.Target>
    <UnstyledButton className="hts-userbtn">
      <Group gap={8} wrap="nowrap">
        <Avatar radius="xl" size="sm" className="hts-avatar">
          S
        </Avatar>

        <div className="hts-usermeta">
          <div className="hts-username">Admin</div>
          <div className="hts-userrole">Corporate • Operator</div>
        </div>

        <IconChevronDown size={14} className="hts-userchev" />
      </Group>
    </UnstyledButton>
  </Menu.Target>

  <Menu.Dropdown className="hts-user-menu">
    <Menu.Label>Account</Menu.Label>

    <Menu.Item leftSection={<IconUser size={16} />}>Profile</Menu.Item>
    <Menu.Item leftSection={<IconSettings size={16} />}>Settings</Menu.Item>

    <Divider my="xs" />

    <Menu.Item leftSection={<IconShieldCheck size={16} />}>
      Security & Audit
    </Menu.Item>

    <Divider my="xs" />

    <Menu.Item
      color="red"
      leftSection={<IconLogout size={16} />}
      onClick={handleLogout}
    >
      Logout
    </Menu.Item>
  </Menu.Dropdown>
</Menu>
      </Group>

      {/* hover giống AppShell */}
      <style jsx global>{`
        .hts-icon:hover {
          transform: translateY(-1px);
          filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.12));
        }
        :root[data-mantine-color-scheme="dark"] .hts-icon:hover {
          background: rgba(255, 255, 255, 0.10) !important;
          border-color: rgba(255, 255, 255, 0.16) !important;
        }
        :root[data-mantine-color-scheme="light"] .hts-icon:hover {
          background: rgba(0, 0, 0, 0.06) !important;
          border-color: rgba(0, 0, 0, 0.12) !important;
        }
      `}</style>
    </Group>
  );
}