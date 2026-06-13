import { ArrowRight, Zap } from "lucide-react";

const FLOW_NODES = [
  { id: "OMS", label: "OMS", sub: "Order Created", color: "emerald", status: "active" },
  { id: "RABBIT", label: "RabbitMQ", sub: "Topic Exchange", color: "amber", status: "broker" },
  { id: "WMS", label: "WMS", sub: "Warehouse Pack", color: "red", status: "inactive" },
  { id: "SLS", label: "SLS", sub: "Shipment Label", color: "emerald", status: "active" },
  { id: "CTN", label: "CTN", sub: "Tracking Agg.", color: "cyan", status: "active" },
];

const colorMap = {
  emerald: "border-emerald-500/30 bg-emerald-500/8 text-emerald-400",
  amber: "border-amber-500/30 bg-amber-500/8 text-amber-400",
  red: "border-red-500/20 bg-red-500/6 text-red-400/80",
  cyan: "border-cyan-500/30 bg-cyan-500/8 text-cyan-400",
};

const dotColor = {
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  red: "bg-red-400/70",
  cyan: "bg-cyan-400",
};

export default function IntegrationFlow() {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Zap size={14} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-white text-[13px] font-semibold tracking-wide">Alur Integrasi Event</h2>
          <p className="text-zinc-600 text-[10.5px] mt-0.5">Visualisasi pipeline event-driven secara real-time</p>
        </div>
      </div>

      {/* Flow Visualization */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        {FLOW_NODES.map((node, i) => (
          <div key={node.id} className="flex items-center gap-2 flex-shrink-0">
            {/* Node */}
            <div
              className={`relative flex flex-col items-center justify-center w-[100px] h-[76px] rounded-xl border transition-all ${colorMap[node.color]}`}
            >
              {/* Pulse dot */}
              {node.status !== "inactive" && (
                <span className="absolute top-2.5 right-2.5 flex h-1.5 w-1.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${dotColor[node.color]}`} />
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor[node.color]}`} />
                </span>
              )}
              {node.status === "inactive" && (
                <span className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full ${dotColor[node.color]}`} />
              )}

              <span className="text-[12px] font-black tracking-widest">{node.label}</span>
              <span className="text-[9.5px] font-medium mt-0.5 opacity-70 text-center px-1 leading-tight">
                {node.sub}
              </span>
            </div>

            {/* Connector Arrow */}
            {i < FLOW_NODES.length - 1 && (
              <ArrowRight size={14} className="text-zinc-700 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800/60">
        {[
          { color: "bg-emerald-400", label: "Active" },
          { color: "bg-red-400/70", label: "Inactive" },
          { color: "bg-amber-400", label: "Broker" },
          { color: "bg-cyan-400", label: "Tracking" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-zinc-600 text-[10px] font-medium">{label}</span>
          </div>
        ))}
        <div className="ml-auto text-zinc-700 text-[10px] font-medium">
          logistics.events → topic exchange
        </div>
      </div>
    </div>
  );
}
