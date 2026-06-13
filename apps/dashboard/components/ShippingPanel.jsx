/**
 * ShippingPanel - Modul Pengiriman EDLIE
 * Manual status control dropdown + ETA auto-delivery
 * Dark mode, Tailwind CSS, konsisten dengan desain EDLIE
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Truck, Package, Clock, RefreshCw,
  CheckCircle, XCircle, AlertCircle, ChevronDown
} from "lucide-react";

const SLS_API = "http://localhost:8080";  // via API Gateway
const CTN_API = "http://localhost:8080";  // via API Gateway

const STATUS_OPTIONS = ["DIMANIFES", "PICKUP", "IN TRANSIT", "DELIVERED", "CANCELLED"];
const STATUS_ORDER   = ["DIMANIFES", "PICKUP", "IN TRANSIT", "DELIVERED"];

const STATUS_META = {
  DIMANIFES:    { label: "DIMANIFES",   color: "text-blue-300",  bg: "bg-blue-500/10  border-blue-500/20",   dot: "bg-blue-400",   icon: "📋" },
  PICKUP:       { label: "PICKUP",      color: "text-cyan-300",  bg: "bg-cyan-500/10  border-cyan-500/20",   dot: "bg-cyan-400",   icon: "📦" },
  "IN TRANSIT": { label: "IN TRANSIT",  color: "text-yellow-300",bg: "bg-yellow-500/10 border-yellow-500/20",dot: "bg-yellow-400", icon: "🚚" },
  DELIVERED:    { label: "DELIVERED",   color: "text-green-300", bg: "bg-green-500/10  border-green-500/20", dot: "bg-green-400",  icon: "✅" },
  CANCELLED:    { label: "CANCELLED",   color: "text-red-300",   bg: "bg-red-500/10    border-red-500/20",   dot: "bg-red-400",    icon: "🚫" },
};

function formatDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: "text-zinc-300", bg: "bg-zinc-700/30 border-zinc-700", dot: "bg-zinc-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.bg} ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function StatusDropdown({ shipment, onUpdate, disabled }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const meta = STATUS_META[shipment.status] || STATUS_META["DIMANIFES"];

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isDelivered = shipment.status === "DELIVERED" || shipment.status === "CANCELLED";
  if (disabled || isDelivered) {
    return <StatusBadge status={shipment.status} />;
  }

  // Tentukan opsi yang valid
  const idxCurrent = STATUS_ORDER.indexOf(shipment.status);
  const availableOptions = STATUS_OPTIONS.filter(opt => {
    if (opt === shipment.status) return false;
    if (opt === "CANCELLED") return true; // boleh cancel kapan saja kecuali delivered
    const idx = STATUS_ORDER.indexOf(opt);
    return idx > idxCurrent;
  });

  async function selectStatus(newStatus) {
    setOpen(false);
    setLoading(true);
    await onUpdate(shipment.id_pengiriman, newStatus);
    setLoading(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer hover:opacity-90 transition-all ${meta.bg} ${meta.color}`}
      >
        {loading ? (
          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
        )}
        {meta.label}
        <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-2xl overflow-hidden">
          <div className="py-1">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
              Ubah Status
            </div>
            {availableOptions.map(opt => {
              const m = STATUS_META[opt] || {};
              return (
                <button
                  key={opt}
                  onClick={() => selectStatus(opt)}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-zinc-800 transition-colors ${m.color}`}
                >
                  <span>{m.icon}</span>
                  {m.label}
                  {opt === "CANCELLED" && (
                    <span className="ml-auto text-[9px] text-red-400/70 font-normal">batalkan</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}



function ShipmentRow({ shipment, onUpdateStatus, onDetail }) {
  return (
    <tr className="border-b border-zinc-800/60 hover:bg-zinc-900/40 transition-colors">
      <td className="px-4 py-3">
        <code className="text-xs text-zinc-400 font-mono">{shipment.id_pengiriman}</code>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-mono text-cyan-400">
          {shipment.detail_paket?.nomor_referensi || "—"}
        </span>
      </td>
      <td className="px-4 py-3">
        <code className="text-xs text-green-400 font-mono">{shipment.nomor_resi || "—"}</code>
      </td>
      <td className="px-4 py-3 text-xs text-zinc-400">{shipment.asal || "—"}</td>
      <td className="px-4 py-3 text-xs text-zinc-400">{shipment.alamat_tujuan || "—"}</td>
      <td className="px-4 py-3">
        <StatusDropdown
          shipment={shipment}
          onUpdate={onUpdateStatus}
          disabled={false}
        />
      </td>
      <td className="px-4 py-3 text-xs text-zinc-500">
        {formatDate(shipment.diperbarui_pada || shipment.dibuat_pada)}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onDetail(shipment)}
          className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-3 py-1.5 text-xs font-medium transition cursor-pointer"
        >
          Detail
        </button>
      </td>
    </tr>
  );
}

function TimelineModal({ shipment, onClose }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shipment) return;
    const orderId = shipment.detail_paket?.nomor_referensi;
    if (!orderId) { setLoading(false); return; }

    fetch(`${CTN_API}/api/pelacakan/${orderId}`)
      .then(r => r.json())
      .then(d => { setTimeline(d.timeline || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [shipment]);

  if (!shipment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-700/80 bg-zinc-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-white font-semibold">Event Timeline</h3>
            <p className="text-zinc-500 text-xs mt-0.5">
              {shipment.id_pengiriman} · {shipment.nomor_resi}
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition">
            <XCircle size={18} />
          </button>
        </div>
        <div className="p-6 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-zinc-500 text-sm gap-2">
              <span className="w-4 h-4 border-2 border-zinc-600 border-t-cyan-400 rounded-full animate-spin" />
              Memuat timeline...
            </div>
          ) : timeline.length === 0 ? (
            <p className="text-center text-zinc-500 text-sm py-6">Belum ada event tercatat.</p>
          ) : (
            <ol className="relative border-l border-zinc-700/60 space-y-6 ml-2">
              {timeline.map((item, i) => {
                const meta = STATUS_META[item.status] || STATUS_META["DIMANIFES"];
                return (
                  <li key={i} className="ml-6">
                    <span className={`absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full border-2 border-zinc-900 ${meta.dot} text-[8px]`}>
                      {meta.icon}
                    </span>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
                      <p className={`text-xs font-bold ${meta.color}`}>{item.tipe_event || item.status}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {formatDate(item.waktu)} · {item.sumber || "SLS"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShippingPanel() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState("success");
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [stats, setStats] = useState({});
  const pollingRef = useRef(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchShipments = useCallback(async () => {
    try {
      const [shipRes, statRes] = await Promise.all([
        fetch(`${SLS_API}/api/pengiriman`),
        fetch(`${SLS_API}/api/sls/statistik`),
      ]);
      if (shipRes.ok) {
        const d = await shipRes.json();
        setShipments(d.daftar_pengiriman || []);
      }
      if (statRes.ok) setStats(await statRes.json());
    } catch (err) {
      console.warn("[ShippingPanel] fetch silently failed:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
    pollingRef.current = setInterval(fetchShipments, 5000);
    return () => clearInterval(pollingRef.current);
  }, [fetchShipments]);

  const handleUpdateStatus = useCallback(async (id_pengiriman, newStatus) => {
    try {
      const res = await fetch(`${SLS_API}/api/pengiriman/${id_pengiriman}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, operator: "OPERATOR" }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(`Gagal: ${data.error}`, "error");
        return;
      }
      // Update lokal langsung
      setShipments(prev =>
        prev.map(s => s.id_pengiriman === id_pengiriman ? data.pengiriman : s)
      );
      showToast(`Status ${id_pengiriman} → ${newStatus}`, "success");
    } catch (e) {
      showToast("Gagal terhubung ke SLS", "error");
    }
  }, [showToast]);

  const statCards = [
    { label: "Total", value: stats.total_pengiriman ?? "—", icon: Package, color: "text-zinc-300" },
    { label: "DIMANIFES", value: stats.total_dimanifes ?? 0, icon: Package, color: "text-blue-300" },
    { label: "PICKUP", value: stats.total_pickup ?? 0, icon: Truck, color: "text-cyan-300" },
    { label: "IN TRANSIT", value: stats.total_in_transit ?? 0, icon: Truck, color: "text-yellow-300" },
    { label: "DELIVERED", value: stats.total_delivered ?? 0, icon: CheckCircle, color: "text-green-300" },
    { label: "CANCELLED", value: stats.total_cancelled ?? 0, icon: XCircle, color: "text-red-300" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm shadow-2xl animate-in fade-in slide-in-from-bottom-2 ${
          toastType === "error"
            ? "bg-red-950/90 border-red-800/60 text-red-200"
            : "bg-zinc-900 border-zinc-700 text-white"
        }`}>
          {toastType === "error"
            ? <AlertCircle size={14} className="text-red-400" />
            : <CheckCircle size={14} className="text-green-400" />
          }
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-white text-xl font-bold tracking-tight">Shipping</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Kontrol status pengiriman manual.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchShipments}
            className="flex items-center gap-2 rounded-xl bg-zinc-900/70 border border-zinc-800/60 px-4 py-2 text-zinc-400 text-sm hover:text-white hover:border-zinc-700 transition"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map(card => (
          <div key={card.label} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={13} className={card.color} />
              <span className="text-zinc-500 text-[10px] uppercase tracking-widest">{card.label}</span>
            </div>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Legenda Warna Status */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-zinc-600 text-xs">Status:</span>
        {Object.entries(STATUS_META).map(([k, v]) => (
          <span key={k} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${v.bg} ${v.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
            {v.label}
          </span>
        ))}
      </div>

      {/* Alur Status */}
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 px-5 py-3">
        <p className="text-zinc-500 text-xs mb-2 font-semibold uppercase tracking-widest">Alur Status Valid</p>
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_ORDER.map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              <StatusBadge status={s} />
              {i < STATUS_ORDER.length - 1 && <span className="text-zinc-600">→</span>}
            </span>
          ))}
          <span className="text-zinc-600 text-xs ml-2">| CANCELLED (sebelum DELIVERED)</span>
        </div>
      </div>

      {/* Tabel Shipment */}
      <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800/60 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Daftar Pengiriman</h3>
            <p className="text-zinc-500 text-xs mt-0.5">
              {shipments.length} shipment · Klik status untuk ubah
            </p>
          </div>
          <span className="text-xs text-zinc-600 bg-zinc-800/60 rounded-lg px-3 py-1">
            Auto-refresh 5s
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500 gap-2">
            <span className="w-5 h-5 border-2 border-zinc-700 border-t-cyan-400 rounded-full animate-spin" />
            Memuat data pengiriman...
          </div>
        ) : shipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
            <Package size={32} className="text-zinc-700" />
            <p className="text-sm">Belum ada shipment. Buat pesanan untuk memulai.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/60">
                  {["Shipment ID", "Order Ref", "No. Resi", "Asal", "Tujuan", "Status", "Terakhir Update"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipments.map(s => (
                  <ShipmentRow
                    key={s.id_pengiriman}
                    shipment={s}
                    onUpdateStatus={handleUpdateStatus}
                    onDetail={setSelectedShipment}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Riwayat Status per Shipment (expandable) */}
      {shipments.length > 0 && (
        <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6">
          <h3 className="text-white font-semibold mb-4">Detail & Timeline Tracking</h3>
          <p className="text-zinc-500 text-xs mb-4">
            Klik shipment untuk melihat event timeline lengkap dari CTN.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shipments.slice(0, 6).map(s => {
              const meta = STATUS_META[s.status] || STATUS_META["DIMANIFES"];
              return (
                <button
                  key={s.id_pengiriman}
                  onClick={() => setSelectedShipment(s)}
                  className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-left hover:border-zinc-700 hover:bg-zinc-900/60 transition group"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-zinc-400 text-[10px] uppercase tracking-widest">Shipment</p>
                      <p className="text-white text-sm font-mono font-semibold mt-1">{s.id_pengiriman}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                      <Package size={10} />
                      {s.detail_paket?.nomor_referensi || "—"}
                    </div>
                    {s.scheduled_pickup_date && (
                      <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                        <Clock size={10} />
                        Jadwal Pickup: <span className="text-cyan-200 ml-1">{formatDate(s.scheduled_pickup_date)}</span>
                        </div>
                      )}
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                      <MapPin size={10} />
                      {s.asal || "—"}
                    </div>
                  </div>
                  <p className="text-cyan-500 text-xs mt-3 opacity-0 group-hover:opacity-100 transition">
                    Lihat timeline →
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline Modal */}
      {selectedShipment && (
        <TimelineModal
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
        />
      )}
    </div>
  );
}
