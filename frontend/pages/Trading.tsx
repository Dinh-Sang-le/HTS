import { HTSAppShell } from "@/components/AppShell";
import { TradingChart } from "@/components/TradingChart";
import { OrderPanel } from "@/components/OrderPanel";
import { OrderBook } from "@/components/OrderBook";

export default function Page() {
  return (
    <HTSAppShell>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
        <div>
          <TradingChart />
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          <OrderPanel />
          <OrderBook />
        </div>
      </div>
    </HTSAppShell>
  );
}
