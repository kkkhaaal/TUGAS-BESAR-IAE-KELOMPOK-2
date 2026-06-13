export default function StatCard({ icon: Icon, label, value, sub, accentColor = "amber", trend }) {
  const colorMap = {
    amber: {
      iconBg: "bg-amber-500/10 border-amber-500/20",
      iconColor: "text-amber-400",
      badge: "bg-amber-500/10 text-amber-400",
    },
    emerald: {
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      iconColor: "text-emerald-400",
      badge: "bg-emerald-500/10 text-emerald-400",
    },
    cyan: {
      iconBg: "bg-cyan-500/10 border-cyan-500/20",
      iconColor: "text-cyan-400",
      badge: "bg-cyan-500/10 text-cyan-400",
    },
    violet: {
      iconBg: "bg-violet-500/10 border-violet-500/20",
      iconColor: "text-violet-400",
      badge: "bg-violet-500/10 text-violet-400",
    },
  };

  const c = colorMap[accentColor] ?? colorMap.amber;

  return (
    <div className="group relative bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5 hover:border-zinc-700/80 hover:bg-zinc-900/90 transition-all duration-200 cursor-default overflow-hidden">
      {/* Subtle top accent line */}
      <div
        className={`absolute inset-x-0 top-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
          accentColor === "amber"
            ? "bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
            : accentColor === "emerald"
            ? "bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"
            : accentColor === "cyan"
            ? "bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"
            : "bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"
        }`}
      />

      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${c.iconBg}`}>
          <Icon size={18} className={c.iconColor} />
        </div>
        {trend !== undefined && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
            {trend}
          </span>
        )}
      </div>

      <div>
        <div className="text-white text-2xl font-bold tracking-tight leading-none mb-1.5 tabular-nums">
          {value}
        </div>
        <div className="text-zinc-400 text-[12px] font-medium leading-tight">{label}</div>
        {sub && (
          <div className="text-zinc-600 text-[11px] mt-1.5 font-medium">{sub}</div>
        )}
      </div>
    </div>
  );
}
