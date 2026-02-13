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

import { HTSAppShell } from "@/components/AppShell";
import RouteLoader from "@/components/RouteLoader";

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
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MantineProvider defaultColorScheme="dark">
          <Notifications position="top-right" />

          {/* ✅ route-change loader overlay */}
          <RouteLoader />

          <HTSAppShell>
            <Component {...pageProps} />
          </HTSAppShell>
        </MantineProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
