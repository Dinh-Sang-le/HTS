import { HTSAppShell } from "@/components/AppShell";
import { KpiCards } from "@/components/KpiCards";
import { PositionsTable } from "@/components/PositionsTable";

export default function Page() {
  return (
    <HTSAppShell>
      <KpiCards />
      <div style={{ height: 16 }} />
      <PositionsTable />
    </HTSAppShell>
  );
}
