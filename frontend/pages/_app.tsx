// pages/_app.tsx
import type { AppProps } from "next/app";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "../app/globals.css";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { I18nProvider } from "@/lib/i18nProvider";
import { HTSAppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/router";
import { isAuthed } from "@/lib/auth";

const queryClient = new QueryClient();

const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected({
      target: "metaMask",
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

type Accent = "blue" | "green" | "purple" | "orange";
type MantineAccent = "blue" | "green" | "violet" | "orange";

function accentToMantine(a: Accent): MantineAccent {
  return a === "purple" ? "violet" : a;
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  const [colorScheme, setColorScheme] = useState<"dark" | "light">("dark");

  // ✅ NEW: giữ accent trong state để MantineProvider đổi primaryColor
  const [accent, setAccent] = useState<Accent>("orange");

  // load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("hts-theme");
    if (saved === "light" || saved === "dark") {
      setColorScheme(saved);
    }

    // accent apply (optional)
    const savedAccent = localStorage.getItem("hts-accent");
    if (
      savedAccent === "blue" ||
      savedAccent === "green" ||
      savedAccent === "purple" ||
      savedAccent === "orange"
    ) {
      setAccent(savedAccent);
      document.documentElement.setAttribute("data-hts-accent", savedAccent);
    }

    // listen event (Settings có thể bắn event để đổi theme live)
    const onThemeChanged = (e: any) => {
      const next = e?.detail;
      if (next === "light" || next === "dark") {
        setColorScheme(next);
        localStorage.setItem("hts-theme", next);
      }
    };
    window.addEventListener("hts-theme-changed", onThemeChanged);

    const onAccentChanged = (e: any) => {
      const v = e?.detail;
      if (v === "blue" || v === "green" || v === "purple" || v === "orange") {
        setAccent(v); // ✅ NEW: update state
        document.documentElement.setAttribute("data-hts-accent", v);
        localStorage.setItem("hts-accent", v);
      }
    };
    window.addEventListener("hts-accent-changed", onAccentChanged);

    return () => {
      window.removeEventListener("hts-theme-changed", onThemeChanged);
      window.removeEventListener("hts-accent-changed", onAccentChanged);
    };
  }, []);

  const toggleColorScheme = () => {
    const next = colorScheme === "dark" ? "light" : "dark";
    setColorScheme(next);
    localStorage.setItem("hts-theme", next);
  };

  // chỉ /login là public
  const isPublicRoute = useMemo(() => router.pathname === "/login", [router.pathname]);

  // ✅ auth guard
  useEffect(() => {
    if (!router.isReady) return;

    const authed = isAuthed();

    // chưa login mà vào trang private -> đá về login
    if (!authed && !isPublicRoute) {
      router.replace("/login");
      return;
    }

    // đã login mà vào /login -> đá về dashboard
    if (authed && isPublicRoute) {
      router.replace("/dashboard");
    }
  }, [router.isReady, isPublicRoute, router]);

  // ✅ /login không wrap AppShell
  const content = isPublicRoute ? (
    <Component {...pageProps} />
  ) : (
    <HTSAppShell colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
      <Component {...pageProps} />
    </HTSAppShell>
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MantineProvider
          defaultColorScheme="dark"
          forceColorScheme={colorScheme}
          // ✅ NEW: apply accent vào Mantine theme
          theme={{
            primaryColor: accentToMantine(accent),
          }}
        >
          <Notifications position="top-right" />
          <I18nProvider>{content}</I18nProvider>
        </MantineProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}