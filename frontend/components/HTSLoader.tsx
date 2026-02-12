"use client";

import { Box, Text } from "@mantine/core";

export default function HTSLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <Box
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(900px 550px at 20% 15%, rgba(59,130,246,0.10), transparent 60%)," +
          "radial-gradient(900px 550px at 80% 15%, rgba(236,72,153,0.10), transparent 60%)," +
          "rgba(10,10,12,0.62)",
        backdropFilter: "blur(10px)",
      }}
    >
      <Box style={{ display: "grid", placeItems: "center", gap: 12 }}>
        <Box
          style={{
            width: 86,
            height: 86,
            borderRadius: 22,
            display: "grid",
            placeItems: "center",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 70px rgba(0,0,0,0.55)",
          }}
        >
          <Box
            className="hts-loader-spin"
            style={{
              width: 64,
              height: 64,
              backgroundImage: 'url("/assets/hts-mark.png")',
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "contain",
              filter: "drop-shadow(0 12px 18px rgba(236,72,153,0.18))",
            }}
          />
        </Box>

        <Text size="sm" c="dimmed" style={{ letterSpacing: 0.2 }}>
          {label}
        </Text>
      </Box>
    </Box>
  );
}
