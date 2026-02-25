// components/AppShell.tsx
"use client";

import React, { useState } from "react";
import { AppShell, Group, Text, Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { SideNav } from "@/components/SideNav";
import { TopBar } from "@/components/TopBar";
import { BrandLogo } from "@/components/BrandLogo";
import { useI18n } from "@/lib/i18nProvider";

export function HTSAppShell({
  children,
  colorScheme,
  toggleColorScheme,
}: {
  children: React.ReactNode;
  colorScheme: "dark" | "light";
  toggleColorScheme: () => void;
}) {
  const { t } = useI18n();

  const [opened] = useDisclosure(); // giữ y logic cũ của bạn
  const isDark = colorScheme === "dark";

  // ✅ mỗi lần hover -> tăng "mực hồng" dâng lên (tích lũy)
  const [rise, setRise] = useState(0); // 0..10
  const bumpRise = () => setRise((v) => Math.min(10, v + 1));

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
      styles={{
        header: {
          background: "var(--mantine-color-body)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
        },
        navbar: {
          background: "var(--mantine-color-body)",
          borderRight: "1px solid var(--mantine-color-default-border)",
        },
        main: {
          background: "var(--mantine-color-body)",
        },
      }}
    >
      <AppShell.Header>
        <Group
          justify="space-between"
          px="md"
          style={{ height: 60, alignItems: "center", minWidth: 0 }}
        >
          <Group gap="sm" style={{ minWidth: 0, alignItems: "center" }}>
            <Box
              className="hts-logoPlate"
              data-rise={rise}
              onMouseEnter={bumpRise}
              style={{
                height: 40,
                display: "flex",
                alignItems: "center",
                padding: "0 10px",
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div
                className="hts-logoInner"
                style={{
                  position: "relative",
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  borderRadius: 10,
                  background: isDark
                    ? "linear-gradient(180deg, rgba(10,10,10,0.22), rgba(10,10,10,0.10))"
                    : "linear-gradient(180deg, rgba(255,255,255,0.75), rgba(255,255,255,0.35))",
                  backdropFilter: "blur(10px)",
                  overflow: "hidden",
                }}
              >
                {/* ✅ Lớp “pink liquid” dâng lên */}
                <div className="hts-pinkRiseLayer" />

                {/* Lotus petals */}
                <div className="hts-lotusPetals" />

                {/* Core glow */}
                <div className="hts-lotusCore" />

                {/* Sweep */}
                <div className="hts-logoSweep" />

                {/* Logo */}
                <div className="hts-logoMark">
                  <BrandLogo height={26} />
                </div>
              </div>
            </Box>

            {/* ✅ Bạn muốn label này đổi theo ngôn ngữ thì map vào i18n */}
            <Text size="sm" fw={1000} className="hts-brand-text">
              {t("Home Trading System") ?? "Home Trading System"}
            </Text>
          </Group>

          {/* Right side */}
          <Group gap="sm" style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
              <TopBar colorScheme={colorScheme} toggleColorScheme={toggleColorScheme} />
            </div>
          </Group>
        </Group>

        {/* ✅ CSS global (giữ y nguyên) */}
        <style jsx global>{`
          /* map rise 0..10 -> 0..22px */
          .hts-logoPlate[data-rise="0"] { --risePx: 0px; }
          .hts-logoPlate[data-rise="1"] { --risePx: 3px; }
          .hts-logoPlate[data-rise="2"] { --risePx: 5px; }
          .hts-logoPlate[data-rise="3"] { --risePx: 7px; }
          .hts-logoPlate[data-rise="4"] { --risePx: 9px; }
          .hts-logoPlate[data-rise="5"] { --risePx: 11px; }
          .hts-logoPlate[data-rise="6"] { --risePx: 13px; }
          .hts-logoPlate[data-rise="7"] { --risePx: 15px; }
          .hts-logoPlate[data-rise="8"] { --risePx: 18px; }
          .hts-logoPlate[data-rise="9"] { --risePx: 20px; }
          .hts-logoPlate[data-rise="10"] { --risePx: 22px; }

          /* ====== Liquid rise ====== */
          .hts-pinkRiseLayer {
            position: absolute;
            inset: 0;
            pointer-events: none;

            background: radial-gradient(
                closest-side at 30% 82%,
                rgba(255, 0, 120, 0.58),
                transparent 62%
              ),
              radial-gradient(
                closest-side at 55% 98%,
                rgba(255, 170, 220, 0.40),
                transparent 66%
              ),
              radial-gradient(
                closest-side at 78% 86%,
                rgba(255, 0, 120, 0.34),
                transparent 60%
              ),
              linear-gradient(
                180deg,
                rgba(255, 0, 120, 0.00),
                rgba(255, 0, 120, 0.20)
              );

            mix-blend-mode: multiply;
            filter: blur(10px);
            opacity: 0;
            transform: translateY(28px);
            transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
              opacity 320ms ease;
          }

          .hts-logoPlate:hover .hts-pinkRiseLayer {
            opacity: 1;
            transform: translateY(calc(28px - var(--risePx)));
          }

          /* ====== Lotus petals: trắng -> hồng ====== */
          .hts-lotusPetals {
            position: absolute;
            inset: -30px;
            pointer-events: none;
            opacity: 1;
          }

          .hts-lotusPetals::before {
            content: "";
            position: absolute;
            inset: 0;

            background: radial-gradient(
                closest-side at 35% 58%,
                rgba(255, 255, 255, 0.95),
                transparent 58%
              ),
              radial-gradient(
                closest-side at 55% 30%,
                rgba(255, 255, 255, 0.85),
                transparent 60%
              ),
              radial-gradient(
                closest-side at 66% 63%,
                rgba(255, 255, 255, 0.70),
                transparent 62%
              ),
              radial-gradient(
                closest-side at 46% 78%,
                rgba(255, 255, 255, 0.65),
                transparent 66%
              );

            filter: blur(0.8px);
            opacity: 0.85;
            transform: translateY(10px);
            transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
              opacity 420ms ease;
            mix-blend-mode: screen;
          }

          .hts-lotusPetals::after {
            content: "";
            position: absolute;
            inset: 0;

            background: radial-gradient(
                closest-side at 35% 58%,
                rgba(255, 0, 120, 0.65),
                transparent 58%
              ),
              radial-gradient(
                closest-side at 55% 30%,
                rgba(255, 90, 170, 0.52),
                transparent 60%
              ),
              radial-gradient(
                closest-side at 66% 63%,
                rgba(255, 160, 220, 0.42),
                transparent 62%
              ),
              radial-gradient(
                closest-side at 46% 78%,
                rgba(255, 0, 120, 0.38),
                transparent 66%
              );

            filter: blur(1.2px);
            opacity: 0.15;
            transform: translateY(26px);
            transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
              opacity 420ms ease;
            mix-blend-mode: multiply;
          }

          .hts-logoPlate:hover .hts-lotusPetals::before {
            transform: translateY(calc(10px - var(--risePx) - 10px));
            opacity: 0.20;
          }

          .hts-logoPlate:hover .hts-lotusPetals::after {
            transform: translateY(calc(26px - var(--risePx) - 18px));
            opacity: 0.78;
          }

          /* Core glow */
          .hts-lotusCore {
            position: absolute;
            width: 140px;
            height: 140px;
            top: 50%;
            left: 42%;
            transform: translate(-50%, -50%);
            background: radial-gradient(
              circle,
              rgba(255, 0, 120, 0.70) 0%,
              rgba(255, 0, 120, 0.30) 42%,
              transparent 72%
            );
            filter: blur(16px);
            opacity: 0.55;
            pointer-events: none;
            transition: opacity 420ms ease,
              transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
          }

          .hts-logoPlate:hover .hts-lotusCore {
            opacity: 0.88;
            transform: translate(-50%, -50%) scale(1.15);
          }

          /* Sweep */
          .hts-logoSweep {
            position: absolute;
            inset: -50px;
            background: conic-gradient(
              from 200deg,
              transparent 0 76%,
              rgba(255, 0, 120, 0.10) 86%,
              rgba(255, 255, 255, 0.12) 92%,
              transparent 100%
            );
            filter: blur(18px);
            opacity: 0.28;
            animation: logoSweep 7s linear infinite;
            pointer-events: none;
          }

          /* Logo nổi rõ hơn */
          .hts-logoMark {
            position: relative;
            z-index: 2;
            display: flex;
            align-items: center;
            filter: brightness(1.25) contrast(1.25) saturate(1.20)
              drop-shadow(0 0 8px rgba(255, 0, 120, 0.35))
              drop-shadow(0 0 18px rgba(0, 0, 0, 0.22));
          }

          @keyframes logoSweep {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <SideNav />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}