"use client";

import { Box, Group, Text } from "@mantine/core";
import SpinnerLiquid from "@/components/spinners/SpinnerLiquid";
import SpinnerGlassOrb from "@/components/spinners/SpinnerGlassOrb";
import SpinnerPulseRipple from "@/components/spinners/SpinnerPulseRipple";
import SpinnerRadar from "@/components/spinners/SpinnerRadar";
import LotusLoader from "@/components/spinners/LotusLoader";

export default function HTSLoader({
  label = "Loading…",
  variant = "bloomberg",
  spinner = "lotus",
}: {
  label?: string;
  variant?: "bloomberg";
  spinner?: "liquid" | "orb" | "ripple" | "radar" | "lotus";
}) {
  const Spinner =
    spinner === "liquid"
      ? SpinnerLiquid
      : spinner === "orb"
      ? SpinnerGlassOrb
      : spinner === "ripple"
      ? SpinnerPulseRipple
      : spinner === "lotus"
      ? LotusLoader
      : SpinnerRadar;

  return (
    <Box
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(900px 600px at 18% 15%, rgba(34,197,94,0.10), transparent 60%)," +
          "radial-gradient(900px 600px at 82% 18%, rgba(59,130,246,0.10), transparent 60%)," +
          "linear-gradient(180deg, rgba(8,10,14,0.72), rgba(8,10,14,0.64))",
        backdropFilter: "blur(10px)",
      }}
    >
      <Box
        style={{
          width: 440,
          maxWidth: "92vw",
          borderRadius: 18,
          padding: 18,
          background: "rgba(12,14,18,0.62)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
        }}
      >
        {/* Bloomberg-ish header */}
        <Group justify="space-between" mb={10}>
          <Group gap="xs">
            <Box
              style={{
                width: 10,
                height: 10,
                borderRadius: 99,
                background: "rgba(34,197,94,0.9)",
                boxShadow: "0 0 18px rgba(34,197,94,0.35)",
              }}
            />
            <Text fw={800} style={{ letterSpacing: 0.2 }}>
              HTS Terminal
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            SECURE • DEMO
          </Text>
        </Group>

        <Box
          style={{
            borderRadius: 14,
            padding: 16,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Group align="center" gap="md">
            {/* nếu muốn size khác cho lotus */}
            {spinner === "lotus" ? <LotusLoader size={54} /> : <Spinner />}

            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text fw={800}>{label}</Text>
              <Text size="sm" c="dimmed">
                Routing workspace • syncing UI state • preparing panels
              </Text>

              {/* tiny progress bar illusion */}
              <Box
                className="hts-loader-bar"
                style={{
                  height: 6,
                  marginTop: 10,
                  borderRadius: 99,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <Box className="hts-loader-bar-fill" style={{ height: "100%" }} />
              </Box>
            </Box>
          </Group>
        </Box>
      </Box>
    </Box>
  );
}
