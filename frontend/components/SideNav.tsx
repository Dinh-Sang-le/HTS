"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stack, NavLink } from "@mantine/core";
import { LayoutDashboard, LineChart, CandlestickChart, Wallet, Settings } from "lucide-react";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trading", label: "Trading", icon: CandlestickChart },
  { href: "/markets", label: "Markets", icon: LineChart },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <Stack gap={6}>
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <NavLink
            key={it.href}
            component={Link}
            href={it.href}
            label={it.label}
            leftSection={<Icon size={18} />}
            active={pathname === it.href}
          />
        );
      })}
    </Stack>
  );
}
