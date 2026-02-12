// pages/_app.tsx
import type { AppProps } from "next/app";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import { HTSAppShell } from "@/components/AppShell";

// Nếu bạn muốn dùng globals.css thì để ở /styles/globals.css (khuyến nghị)
// Còn nếu file của bạn đang nằm ở app/globals.css thì vẫn import được như dưới:
import "../app/globals.css";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider defaultColorScheme="dark">
      <Notifications position="top-right" />
      <HTSAppShell>
        <Component {...pageProps} />
      </HTSAppShell>
    </MantineProvider>
  );
}