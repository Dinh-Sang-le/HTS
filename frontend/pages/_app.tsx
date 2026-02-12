// pages/_app.tsx
import type { AppProps } from "next/app";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "../app/globals.css";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { HTSAppShell } from "@/components/AppShell";
import HTSLoader from "@/components/HTSLoader";

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

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // avoid flicker: only show loader if route change takes > 120ms
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const start = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setLoading(true), 120);
    };

    const done = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      setLoading(false);
    };

    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", done);
    router.events.on("routeChangeError", done);

    return () => {
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", done);
      router.events.off("routeChangeError", done);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [router.events]);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MantineProvider defaultColorScheme="dark">
          <Notifications position="top-right" />

          {/* Loader overlay sits above everything */}
          {loading ? <HTSLoader label="Loading page…" /> : null}

          <HTSAppShell>
            <Component {...pageProps} />
          </HTSAppShell>
        </MantineProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
