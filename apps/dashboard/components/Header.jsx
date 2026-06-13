import { useEffect, useState } from "react";
import { Radio } from "lucide-react";

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function Header({ user, onLogout }) {
  const now = useClock();

  const pad = (n) => String(n).padStart(2, "0");
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const dateStr = now.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="h-[60px] flex-shrink-0 flex items-center justify-between px-6 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60 sticky top-0 z-40">
      {/* Left: Title */}
      <div>
        <h1 className="text-white text-[13.5px] font-semibold tracking-wide leading-tight">
          Dashboard Integrasi Logistik
        </h1>
        <p className="text-zinc-500 text-[10.5px] font-medium tracking-wider mt-0.5">
          Event-Driven Logistics Integration Engine
        </p>
      </div>

      {/* Right: Status + Clock + User Info */}
      <div className="flex items-center gap-5">
        {/* Service Status Indicator */}
        <div className="flex items-center gap-2.5 bg-zinc-900/80 border border-zinc-800/60 rounded-lg px-3.5 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          <div className="flex items-center gap-1.5">
            <Radio size={11} className="text-zinc-500" />
            <span className="text-zinc-400 text-[11px] font-semibold tracking-wide">
              3<span className="text-zinc-600">/4</span>
            </span>
            <span className="text-zinc-500 text-[10.5px]">Services Active</span>
          </div>
        </div>

        {/* Clock */}
        <div className="text-right">
          <div className="text-amber-400 text-[13px] font-mono font-semibold tracking-widest tabular-nums leading-tight">
            {timeStr}
          </div>
          <div className="text-zinc-600 text-[10px] tracking-wider mt-0.5">{dateStr}</div>
        </div>

        {/* User Profile & Logout */}
        {user && (
          <>
            <div className="w-[1px] h-5 bg-zinc-800" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 text-[11px] font-black">
                {user.initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-zinc-200 text-[12px] font-semibold leading-tight">{user.name}</div>
                <div className="text-zinc-500 text-[10px] font-medium tracking-wide">
                  {user.role === "operasional" ? "Operasional" : "Infrastruktur"}
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Keluar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
