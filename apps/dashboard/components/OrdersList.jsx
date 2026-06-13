import { useState } from "react";
import { Search, ClipboardList, ChevronDown } from "lucide-react";

const INITIAL_ORDERS = [
  { id: "ORD-1045", customer: "PT. Arjuna", total: 280000, status: "DIPROSES", date: "2026-06-08", service: "SLS" },
  { id: "ORD-1042", customer: "UD. Sejahtera", total: 145000, status: "DIPROSES", date: "2026-06-07", service: "WMS" },
  { id: "ORD-1039", customer: "CV. Prima", total: 520000, status: "DIKIRIM", date: "2026-06-06", service: "CTN" },
  { id: "ORD-1038", customer: "PT. Garda", total: 725000, status: "SELESAI", date: "2026-06-05", service: "OMS" },
  { id: "ORD-1037", customer: "PT. Lintas", total: 390000, status: "GAGAL", date: "2026-06-05", service: "SLS" },
];

const STATUS_OPTIONS = ["PENDING", "DIPROSES", "DIKIRIM", "SELESAI", "GAGAL"];

const statusStyles = {
  PENDING:  "bg-amber-500/10 text-amber-300 border-amber-500/20",
  DIPROSES: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  DIKIRIM:  "bg-blue-500/10 text-blue-300 border-blue-500/20",
  SELESAI:  "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  GAGAL:    "bg-red-500/10 text-red-300 border-red-500/20",
};

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OrdersList() {
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);

  const filtered = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase())
  );

  function updateStatus(id, newStatus) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    );
    setEditingId(null);
    showToast(`Status ${id} diperbarui ke ${newStatus}`);
  }

  function markAllDone() {
    setOrders((prev) =>
      prev.map((o) => (o.status !== "GAGAL" ? { ...o, status: "SELESAI" } : o))
    );
    showToast("Semua pesanan aktif ditandai selesai");
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const counts = orders.reduce(
    (acc, o) => {
      acc.total++;
      if (o.status === "DIPROSES") acc.diproses++;
      if (o.status === "SELESAI") acc.selesai++;
      if (o.status === "DIKIRIM") acc.dikirim++;
      return acc;
    },
    { total: 0, diproses: 0, selesai: 0, dikirim: 0 }
  );

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-zinc-800 border border-zinc-700 px-5 py-3 text-white text-sm shadow-xl animate-pulse">
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-white text-xl font-bold tracking-tight">Daftar Pesanan</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Klik status pada baris pesanan untuk mengubahnya secara manual.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/70 border border-zinc-800/60 rounded-xl px-4 py-2">
          <Search size={14} className="text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ID atau pelanggan..."
            className="bg-transparent text-sm text-white outline-none placeholder-zinc-500 w-48"
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Tabel */}
        <section className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                {["ID Pesanan", "Pelanggan", "Layanan", "Jumlah", "Status", "Tanggal"].map((label) => (
                  <th key={label} className="px-4 py-3">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className="rounded-3xl border border-zinc-800/70 bg-zinc-950/70 transition hover:bg-zinc-900/80"
                >
                  <td className="px-4 py-4 text-amber-300 font-semibold">{order.id}</td>
                  <td className="px-4 py-4 text-zinc-300">{order.customer}</td>
                  <td className="px-4 py-4 text-zinc-400">{order.service}</td>
                  <td className="px-4 py-4 text-zinc-300 font-medium">{formatRupiah(order.total)}</td>
                  <td className="px-4 py-4">
                    {editingId === order.id ? (
                      <select
                        autoFocus
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        className="rounded-xl border border-zinc-700 bg-zinc-900 text-white text-xs px-3 py-1.5 outline-none cursor-pointer"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingId(order.id)}
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border cursor-pointer hover:opacity-80 transition ${statusStyles[order.status]}`}
                        title="Klik untuk ubah status"
                      >
                        <span className="w-2 h-2 rounded-full bg-current/60" />
                        {order.status}
                        <ChevronDown size={10} />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 text-zinc-500">{order.date}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 text-sm">
                    Tidak ada pesanan ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white text-base font-semibold">Statistik Pesanan</h3>
                <p className="text-zinc-500 text-sm">Kinerja pesanan hari ini</p>
              </div>
              <div className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-300 text-xs font-semibold">Live</div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-zinc-400 text-sm">
                <span>Total pesanan</span>
                <span className="text-white font-semibold">{counts.total}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400 text-sm">
                <span>Pesanan diproses</span>
                <span className="text-cyan-300 font-semibold">{counts.diproses}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400 text-sm">
                <span>Sedang dikirim</span>
                <span className="text-blue-300 font-semibold">{counts.dikirim}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400 text-sm">
                <span>Pesanan selesai</span>
                <span className="text-emerald-300 font-semibold">{counts.selesai}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <ClipboardList size={18} className="text-amber-400" />
              <div>
                <h3 className="text-white text-base font-semibold">Tindakan Cepat</h3>
                <p className="text-zinc-500 text-sm">Lakukan update cepat pada pesanan.</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <button
                onClick={markAllDone}
                className="w-full rounded-2xl border border-emerald-700/40 bg-emerald-900/20 px-4 py-3 text-left text-emerald-300 hover:bg-emerald-900/40 transition font-medium"
              >
                ✓ Tandai semua pesanan aktif selesai
              </button>
              <button
                onClick={() => {
                  const csv = [
                    ["ID", "Pelanggan", "Layanan", "Total", "Status", "Tanggal"],
                    ...orders.map((o) => [o.id, o.customer, o.service, o.total, o.status, o.date]),
                  ]
                    .map((row) => row.join(","))
                    .join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "pesanan.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                  showToast("CSV berhasil diunduh");
                }}
                className="w-full rounded-2xl border border-zinc-700/60 bg-zinc-950/70 px-4 py-3 text-left text-white hover:bg-zinc-900 transition"
              >
                ↓ Export CSV pesanan
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}