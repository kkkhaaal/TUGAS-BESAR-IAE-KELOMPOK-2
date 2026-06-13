import { useState, useEffect } from "react";
import {
  ShoppingCart,
  BadgeDollarSign,
  PackageCheck,
  MapPinned,
} from "lucide-react";
import StatCard from "./StatCard";
import ServiceStatus from "./ServiceStatus";
import RecentOrdersTable from "./RecentOrdersTable";
import IntegrationFlow from "./IntegrationFlow";

const GATEWAY = "http://localhost:8080";

function formatRupiah(n) {
  const v = parseFloat(n) || 0;
  if (v >= 1_000_000_000) return "Rp " + (v / 1_000_000_000).toFixed(1) + "M";
  if (v >= 1_000_000) return "Rp " + (v / 1_000_000).toFixed(1) + "jt";
  if (v >= 1_000) return "Rp " + (v / 1_000).toFixed(0) + "K";
  return "Rp " + v.toLocaleString("id-ID");
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPesanan: "—",
    pesananHariIni: "—",
    totalPendapatan: "—",
    totalPengiriman: "—",
    totalDimanifes: "—",
    totalTracked: "—",
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const omsRes = await fetch(`${GATEWAY}/api/statistik`);
        if (omsRes.ok) {
          const d = await omsRes.json();
          setStats(prev => ({
            ...prev,
            totalPesanan: String(d.total_pesanan ?? "—"),
            pesananHariIni: String(d.pesanan_hari_ini ?? 0),
            totalPendapatan: d.total_pendapatan ? formatRupiah(d.total_pendapatan) : "Rp 0",
          }));
        }
      } catch (_) {}

      try {
        const slsRes = await fetch(`${GATEWAY}/api/sls/statistik`);
        if (slsRes.ok) {
          const d = await slsRes.json();
          setStats(prev => ({
            ...prev,
            totalPengiriman: String(d.total_pengiriman ?? "—"),
            totalDimanifes: String(d.total_dimanifes ?? 0),
          }));
        }
      } catch (_) {}

      try {
        const ctnRes = await fetch(`${GATEWAY}/api/pelacakan`);
        if (ctnRes.ok) {
          const d = await ctnRes.json();
          setStats(prev => ({
            ...prev,
            totalTracked: String(d.jumlah ?? "—"),
          }));
        }
      } catch (_) {}
    }

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const STATS = [
    {
      icon: ShoppingCart,
      label: "Total Pesanan",
      value: stats.totalPesanan,
      sub: `${stats.pesananHariIni} hari ini`,
      accentColor: "amber",
      trend: "+Live",
    },
    {
      icon: BadgeDollarSign,
      label: "Pendapatan",
      value: stats.totalPendapatan,
      sub: "Total nilai pesanan",
      accentColor: "emerald",
      trend: "—",
    },
    {
      icon: PackageCheck,
      label: "Pengiriman",
      value: stats.totalPengiriman,
      sub: `${stats.totalDimanifes} dimanifes`,
      accentColor: "cyan",
      trend: "—",
    },
    {
      icon: MapPinned,
      label: "Dilacak",
      value: stats.totalTracked,
      sub: "Pesanan aktif di CTN",
      accentColor: "violet",
      trend: "—",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold tracking-tight">Ringkasan Sistem</h2>
          <p className="text-zinc-500 text-[12px] mt-1 font-medium">
            Ikhtisar operasional terkini dari semua layanan
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800/60 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-zinc-500 text-[10.5px] font-medium tracking-wide uppercase">Live View</span>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <IntegrationFlow />

      <ServiceStatus />

      <RecentOrdersTable />
    </div>
  );
}
