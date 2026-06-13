import IntegrationFlow from "./IntegrationFlow";
import ServiceStatus from "./ServiceStatus";
import { Zap, Database, ArrowRight, Activity } from "lucide-react";

const METRICS = [
  { label: "Event masuk", value: "1.2k", icon: Zap, accentClass: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { label: "Queue aktif", value: "4", icon: Database, accentClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { label: "Throughput", value: "720 evt/s", icon: Activity, accentClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
];

export default function IntegrationPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-white text-xl font-bold tracking-tight">Alur Integrasi</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Pantau pipeline event-driven dan kesehatan sistem integrasi.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/70 border border-zinc-800/60 rounded-xl px-4 py-2 text-zinc-500 text-sm">
          <Zap size={14} /> Event queue & broker
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6">
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            {METRICS.map((metric) => (
              <div key={metric.label} className="rounded-3xl border border-zinc-800/70 bg-zinc-950/70 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`rounded-2xl border p-3 ${metric.accentClass}`}>
                    <metric.icon size={18} />
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-[0.18em]">{metric.label}</p>
                    <p className="text-white text-lg font-semibold mt-2">{metric.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white text-base font-semibold">Peta integrasi</h3>
                <p className="text-zinc-500 text-sm">Bagan alur data dan event.</p>
              </div>
              <span className="inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-amber-300 text-xs font-semibold">Stable</span>
            </div>
            <IntegrationFlow />
          </div>
        </section>

        <aside className="space-y-4">
          <ServiceStatus />
          <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <ArrowRight size={18} className="text-cyan-400" />
              <div>
                <h3 className="text-white text-base font-semibold">Pipeline events</h3>
                <p className="text-zinc-500 text-sm">Kondisi alur data dan throughput.</p>
              </div>
            </div>
            <div className="space-y-3 text-zinc-400 text-sm">
              <div className="rounded-2xl bg-zinc-950/70 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span>Topik terpublish</span>
                  <span className="text-white font-semibold">12</span>
                </div>
              </div>
              <div className="rounded-2xl bg-zinc-950/70 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span>Retry queue</span>
                  <span className="text-amber-300 font-semibold">1</span>
                </div>
              </div>
              <div className="rounded-2xl bg-zinc-950/70 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span>Event errors</span>
                  <span className="text-red-300 font-semibold">0</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
