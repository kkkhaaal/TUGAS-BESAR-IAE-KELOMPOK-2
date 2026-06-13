import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2, XCircle, Server, Zap } from "lucide-react";

const SERVICES_CONFIG = [
  {
    id: "OMS",
    fullName: "Order Management System",
    tech: "Node.js + PostgreSQL",
    port: 8001,
    badge: "REST",
  },
  {
    id: "WMS",
    fullName: "Warehouse Management System",
    tech: "Python + MySQL",
    port: 8002,
    badge: "XML API",
  },
  {
    id: "SLS",
    fullName: "Shipping & Logistics System",
    tech: "Node.js + MongoDB",
    port: 8003,
    badge: "REST",
  },
  {
    id: "CTN",
    fullName: "Container Tracking Node",
    tech: "Python + Redis",
    port: 8004,
    badge: "WS",
  },
];

function ServiceCard({ service }) {
  const isActive = service.status === "active";

  return (
    <div
      className={`relative group flex flex-col gap-3 p-4 rounded-xl border transition-all duration-200 ${
        isActive
          ? "bg-zinc-900/50 border-zinc-800/60 hover:border-emerald-900/60 hover:bg-zinc-900/80"
          : "bg-zinc-900/30 border-zinc-800/40 hover:border-red-900/40"
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              isActive
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-red-500/8 border-red-500/15"
            }`}
          >
            <Server
              size={14}
              className={isActive ? "text-emerald-400" : "text-red-400/70"}
            />
          </div>
          <div>
            <span className="text-white text-[13px] font-bold tracking-widest">
              {service.id}
            </span>
            <div className="text-zinc-600 text-[9.5px] font-semibold uppercase tracking-widest mt-0.5">
              Port {service.port}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
            isActive
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isActive ? "bg-emerald-400 animate-pulse" : "bg-red-400"
            }`}
          />
          {isActive ? "Active" : "Inactive"}
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-[11px] font-medium">{service.tech}</span>
        <span
          className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded border ${
            isActive
              ? "text-zinc-500 border-zinc-800 bg-zinc-900"
              : "text-zinc-600 border-zinc-800/50 bg-zinc-900/50"
          }`}
        >
          {service.badge}
        </span>
      </div>

      {/* Full name */}
      <div className="text-zinc-600 text-[10.5px] font-medium truncate">
        {service.fullName}
      </div>
    </div>
  );
}

export default function ServiceStatus() {
  const [services, setServices] = useState(SERVICES_CONFIG.map(s => ({ ...s, status: "inactive" })));
  const [loading, setLoading] = useState(false);

  const fetchServiceHealth = async () => {
    setLoading(true);
    try {
      const healthChecks = await Promise.all(
        SERVICES_CONFIG.map(service =>
          fetch(`http://localhost:8080/health/${service.id.toLowerCase()}`)
            .then(r => r.json())
            .then(() => ({ ...service, status: "active" }))
            .catch(() => ({ ...service, status: "inactive" }))
        )
      );
      setServices(healthChecks);
    } catch (error) {
      console.error("Error fetching service health:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceHealth();
    const interval = setInterval(fetchServiceHealth, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const activeCount = services.filter((s) => s.status === "active").length;

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Zap size={14} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-white text-[13px] font-semibold tracking-wide">
              Status Layanan
            </h2>
            <p className="text-zinc-600 text-[10.5px] mt-0.5">
              {activeCount}/{services.length} layanan aktif
            </p>
          </div>
        </div>

        <button
          onClick={fetchServiceHealth}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 hover:text-white hover:border-zinc-600/60 transition-all duration-150 text-[11px] font-medium"
        >
          <RefreshCw
            size={12}
            className={loading ? "animate-spin text-amber-400" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}
