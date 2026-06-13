/**
 * TrackingBoard - Halaman Pelacakan EDLIE
 * UPDATED: Realtime tracking dengan timeline event SLS baru
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, MapPin, Clock, Activity, Package, RefreshCw, ChevronDown } from "lucide-react";

const CTN_API = "http://localhost:8080";  // via API Gateway
const SLS_API = "http://localhost:8080";  // via API Gateway

const STATUS_META = {
  PESANAN_DITEMPATKAN: { label: "PESANAN DITEMPATKAN", color: "text-blue-300",   dot: "bg-blue-400",   icon: "📋" },
  PENGEMASAN_SELESAI:  { label: "PENGEMASAN SELESAI",  color: "text-amber-300",  dot: "bg-amber-400",  icon: "📦" },
  DIMANIFES:           { label: "DIMANIFES",           color: "text-blue-300",   dot: "bg-blue-400",   icon: "📋" },
  PICKUP:              { label: "PICKUP",              color: "text-cyan-300",   dot: "bg-cyan-400",   icon: "📦" },
  "IN TRANSIT":        { label: "IN TRANSIT",          color: "text-yellow-300", dot: "bg-yellow-400", icon: "🚚" },
  DELIVERED:           { label: "DELIVERED",           color: "text-green-300",  dot: "bg-green-400",  icon: "✅" },
  CANCELLED:           { label: "CANCELLED",           color: "text-red-300",    dot: "bg-red-400",    icon: "🚫" },
  DIKIRIM:             { label: "DIKIRIM",             color: "text-blue-300",   dot: "bg-blue-400",   icon: "🚚" },
  TERKIRIM:            { label: "TERKIRIM",            color: "text-green-300",  dot: "bg-green-400",  icon: "✅" },
};

function formatDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: "text-zinc-300", dot: "bg-zinc-500" };
  const bgMap = {
    PESANAN_DITEMPATKAN: "bg-blue-500/10 border-blue-500/20",
    PENGEMASAN_SELESAI:  "bg-amber-500/10 border-amber-500/20",
    DIMANIFES:           "bg-blue-500/10 border-blue-500/20",
    PICKUP:              "bg-cyan-500/10 border-cyan-500/20",
    "IN TRANSIT":        "bg-yellow-500/10 border-yellow-500/20",
    DELIVERED:           "bg-green-500/10 border-green-500/20",
    CANCELLED:           "bg-red-500/10 border-red-500/20",
    DIKIRIM:             "bg-blue-500/10 border-blue-500/20",
    TERKIRIM:            "bg-green-500/10 border-green-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${bgMap[status] || "bg-zinc-700/30 border-zinc-700"} ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label || status}
    </span>
  );
}

export default function TrackingBoard() {
  const [allTracking, setAllTracking] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [trackDetail, setTrackDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [toast, setToast] = useState(null);
  const pollingRef = useRef(null);
  const detailPollingRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`${CTN_API}/api/pelacakan`);
      if (res.ok) {
        const d = await res.json();
        setAllTracking(d.daftar_pesanan || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDetail = useCallback(async (id) => {
    if (!id) return;
    setLoadingDetail(true);
    try {
      const res = await fetch(`${CTN_API}/api/pelacakan/${id}`);
      if (res.ok) {
        const d = await res.json();
        setTrackDetail(d);
      } else {
        setTrackDetail(null);
      }
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    pollingRef.current = setInterval(fetchAll, 4000);
    return () => clearInterval(pollingRef.current);
  }, [fetchAll]);

  useEffect(() => {
    if (!selectedId) return;
    fetchDetail(selectedId);
    detailPollingRef.current = setInterval(() => fetchDetail(selectedId), 4000);
    return () => clearInterval(detailPollingRef.current);
  }, [selectedId, fetchDetail]);

  const filtered = allTracking.filter(s =>
    s.id_pesanan?.toLowerCase().includes(query.toLowerCase()) ||
    s.nomor_resi?.toLowerCase().includes(query.toLowerCase()) ||
    s.id_pengiriman?.toLowerCase().includes(query.toLowerCase())
  );

  // Ringkasan status
  const statusCounts = allTracking.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-zinc-800 border border-zinc-700 px-5 py-3 text-white text-sm shadow-xl">
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-white text-xl font-bold tracking-tight">Pelacakan</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Realtime tracking & event timeline dari CTN · Auto-refresh 4s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900/70 border border-zinc-800/60 rounded-xl px-4 py-2">
            <Search size={13} className="text-zinc-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari Order ID / No Resi..."
              className="bg-transparent text-sm text-white outline-none placeholder-zinc-500 w-52"
            />
          </div>
          <button
            onClick={() => { fetchAll(); if (selectedId) fetchDetail(selectedId); }}
            className="flex items-center gap-2 rounded-xl bg-zinc-900/70 border border-zinc-800/60 px-3 py-2 text-zinc-400 text-sm hover:text-white transition"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Tabel kiri */}
        <section className="space-y-4">
          <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800/60">
              <h3 className="text-white font-semibold">Semua Order Tracked</h3>
              <p className="text-zinc-500 text-xs mt-0.5">{allTracking.length} order · Klik baris untuk detail</p>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-zinc-500 gap-2 text-sm">
                <span className="w-4 h-4 border-2 border-zinc-700 border-t-cyan-400 rounded-full animate-spin" />
                Memuat data tracking...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-2">
                <Package size={28} className="text-zinc-700" />
                <p className="text-sm">Tidak ada data tracking</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      {["Order ID", "Status", "Sumber", "No. Resi", "Terakhir Update"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => (
                      <tr
                        key={s.id_pesanan}
                        onClick={() => setSelectedId(s.id_pesanan === selectedId ? null : s.id_pesanan)}
                        className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${
                          selectedId === s.id_pesanan
                            ? "bg-cyan-500/5 border-cyan-500/20"
                            : "hover:bg-zinc-900/40"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <code className="text-xs text-cyan-400 font-mono">{s.id_pesanan}</code>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{s.sumber || "—"}</td>
                        <td className="px-4 py-3">
                          <code className="text-xs text-green-400 font-mono">{s.nomor_resi || "—"}</code>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {formatDate(s.terakhir_diperbarui)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail Panel saat dipilih */}
          {selectedId && (
            <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800/60 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">Event Timeline</h3>
                  <p className="text-cyan-400 font-mono text-xs mt-0.5">{selectedId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-600">
                    {trackDetail?.timeline?.length || 0} event
                  </span>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="rounded-lg p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-white transition text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6">
                {loadingDetail ? (
                  <div className="flex items-center gap-2 text-zinc-500 text-sm justify-center py-4">
                    <span className="w-4 h-4 border-2 border-zinc-700 border-t-cyan-400 rounded-full animate-spin" />
                    Memuat timeline...
                  </div>
                ) : !trackDetail?.timeline?.length ? (
                  <p className="text-zinc-500 text-sm text-center py-4">Belum ada event</p>
                ) : (
                  <ol className="relative border-l border-zinc-700/60 space-y-5 ml-2">
                    {trackDetail.timeline.map((item, i) => {
                      const meta = STATUS_META[item.status] || { color: "text-zinc-300", dot: "bg-zinc-500", icon: "◉" };
                      const isLast = i === trackDetail.timeline.length - 1;
                      return (
                        <li key={i} className="ml-6">
                          <span className={`absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full border-2 border-zinc-900 text-[9px] ${isLast ? "bg-cyan-500" : meta.dot}`}>
                            {meta.icon}
                          </span>
                          <div className={`rounded-2xl border px-4 py-3 ${isLast ? "border-cyan-500/30 bg-cyan-500/5" : "border-zinc-800/60 bg-zinc-950/40"}`}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className={`text-xs font-bold ${meta.color}`}>
                                {item.tipe_event || item.status}
                              </p>
                              {isLast && (
                                <span className="text-[9px] text-cyan-500 bg-cyan-500/10 rounded-full px-2 py-0.5">TERBARU</span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500">
                              {formatDate(item.waktu)}
                              {item.sumber && ` · ${item.sumber}`}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Sidebar kanan */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity size={16} className="text-amber-400" />
              <div>
                <h3 className="text-white text-sm font-semibold">Ringkasan Status</h3>
                <p className="text-zinc-500 text-xs">Distribusi status pengiriman</p>
              </div>
            </div>
            <div className="space-y-2">
              {Object.entries(STATUS_META).map(([key, meta]) => {
                const count = statusCounts[key] || 0;
                if (count === 0 &&
                  !["DIMANIFES","PICKUP","IN TRANSIT","DELIVERED","CANCELLED"].includes(key)
                ) return null;
                return (
                  <div key={key} className="flex items-center justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                      <span className="text-zinc-400 text-xs">{meta.label || key}</span>
                    </div>
                    <span className={`font-bold text-sm ${count > 0 ? meta.color : "text-zinc-700"}`}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin size={16} className="text-cyan-400" />
              <h3 className="text-white text-sm font-semibold">Info Sistem</h3>
            </div>
            <div className="space-y-2 text-xs text-zinc-400">
              <div className="flex items-center justify-between rounded-2xl bg-zinc-950/70 px-3 py-2">
                <span>CTN (Redis)</span>
                <span className="text-cyan-300 font-mono">Port 8004</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-zinc-950/70 px-3 py-2">
                <span>SLS (MongoDB)</span>
                <span className="text-cyan-300 font-mono">Port 8003</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-zinc-950/70 px-3 py-2">
                <span>RabbitMQ</span>
                <span className="text-green-300 font-mono">Exchange</span>
              </div>
              <div className="rounded-2xl bg-zinc-950/70 px-3 py-2">
                <p className="text-zinc-500 mb-1">Routing Keys:</p>
                {["pengiriman.dimanifes","pengiriman.pickup","pengiriman.in_transit","pengiriman.delivered","pengiriman.cancelled"].map(k => (
                  <p key={k} className="text-zinc-600 font-mono text-[10px]">{k}</p>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
