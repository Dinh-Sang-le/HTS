// components/SideNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stack, NavLink } from "@mantine/core";
import {
  LayoutDashboard,
  LineChart,
  CandlestickChart,
  Wallet,
  Settings,
} from "lucide-react";
import { useI18n } from "@/lib/i18nProvider";

const items = [
  { href: "/", key: "nav.dashboard", fallback: "Dashboard", icon: LayoutDashboard },
  { href: "/trading", key: "nav.trading", fallback: "Trading", icon: CandlestickChart },
  { href: "/markets", key: "nav.markets", fallback: "Markets", icon: LineChart },
  { href: "/portfolio", key: "nav.portfolio", fallback: "Portfolio", icon: Wallet },
  { href: "/settings", key: "nav.settings", fallback: "Settings", icon: Settings },
];

export function SideNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <Stack gap={6}>
      {items.map((it) => {
        const Icon = it.icon;

        // ✅ "/" với Next navigation: có lúc pathname là "" hoặc null (tuỳ phiên bản)
        const active =
          it.href === "/" ? pathname === "/" || pathname === "" : pathname === it.href;

        return (
          <NavLink
            key={it.href}
            component={Link as any}
            href={it.href}
            label={t(it.key) || it.fallback}
            leftSection={<Icon size={18} />}
            active={active}
          />
        );
      })}
    </Stack>
  );
}