import { useState, useEffect } from "react";
import { ClipboardList, ArrowUpRight, Clock } from "lucide-react";

const STATUS_CONFIG = {
  DIBUAT: {
    label: "Dibuat",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400",
  },
  DIPROSES: {
    label: "Diproses",
    className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    dot: "bg-cyan-400",
  },
  DIKIRIM: {
    label: "Dikirim",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400",
  },
  DALAM_PERJALANAN: {
    label: "Dalam Perjalanan",
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    dot: "bg-yellow-400",
  },
  SELESAI: {
    label: "Selesai",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  DIBATALKAN: {
    label: "Dibatalkan",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    dot: "bg-red-400",
  },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    dot: "bg-zinc-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10.5px] font-semibold ${config.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecentOrdersTable() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/pesanan");
        const data = await response.json();
        if (data.daftar_pesanan && Array.isArray(data.daftar_pesanan)) {
          setOrders(data.daftar_pesanan.slice(0, 5));
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const isEmpty = orders.length === 0;

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center">
            <ClipboardList size={14} className="text-zinc-400" />
          </div>
          <div>
            <h2 className="text-white text-[13px] font-semibold tracking-wide">Pesanan Terbaru</h2>
            <p className="text-zinc-600 text-[10.5px] mt-0.5">
              {isEmpty ? "Tidak ada pesanan" : `${orders.length} pesanan masuk`}
            </p>
          </div>
        </div>
        {!isEmpty && (
          <button className="flex items-center gap-1.5 text-zinc-500 hover:text-amber-400 text-[11px] font-medium transition-colors">
            Lihat Semua
            <ArrowUpRight size={12} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin mb-3" />
          <p className="text-zinc-500 text-[12px]">Memuat pesanan...</p>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-4">
            <ClipboardList size={28} className="text-zinc-700" />
          </div>
          <p className="text-zinc-400 text-[13px] font-semibold">Belum ada pesanan masuk</p>
          <p className="text-zinc-600 text-[11.5px] mt-1.5 text-center max-w-[220px] leading-relaxed">
            Pesanan baru akan muncul di sini setelah diterima oleh OMS
          </p>
          <div className="flex items-center gap-2 mt-5 px-3.5 py-1.5 bg-zinc-800/40 border border-zinc-700/30 rounded-lg">
            <Clock size={11} className="text-zinc-600" />
            <span className="text-zinc-600 text-[10.5px] font-medium">Menunggu aktivitas...</span>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/60">
                {["ID Pesanan", "Pelanggan", "Total Harga", "Status", "Dibuat Pada"].map((col) => (
                  <th
                    key={col}
                    className="px-5 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {orders.map((order) => (
                <tr
                  key={order.id_pesanan}
                  className="hover:bg-zinc-800/20 transition-colors duration-100 group"
                >
                  <td className="px-5 py-3.5">
                    <span className="text-amber-400 text-[12px] font-mono font-semibold">
                      {order.id_pesanan}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-zinc-300 text-[12.5px] font-medium">{order.nama_pelanggan}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-zinc-300 text-[12.5px] font-semibold tabular-nums">
                      {formatRupiah(order.total_harga)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-zinc-500 text-[11.5px]">{formatDate(order.dibuat_pada)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
