import { Warehouse, Boxes, Archive, BarChart3 } from "lucide-react";

const INVENTORY = [
  { sku: "INV-001", name: "Karton 500ml", stock: 1240, status: "Aman" },
  { sku: "INV-002", name: "Tape Perekat", stock: 380, status: "Aman" },
  { sku: "INV-003", name: "Bubble Wrap", stock: 92, status: "Perlu restock" },
  { sku: "INV-004", name: "Pallet Kayu", stock: 60, status: "Aman" },
];

const statusClasses = {
  "Aman": "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  "Perlu restock": "bg-amber-500/10 text-amber-300 border-amber-500/20",
};

export default function WarehouseOverview() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-white text-xl font-bold tracking-tight">Gudang</h2>
          <p className="text-zinc-500 text-sm mt-1">Monitoring stok dan kapasitas gudang utama.</p>
        </div>
        <div className="flex items-center gap-2 text-zinc-500 text-sm bg-zinc-900/70 border border-zinc-800/60 rounded-xl px-4 py-2">
          <Warehouse size={14} /> Stok dan aliran barang
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.85fr]">
        <section className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              { label: "Total SKU", value: 128, icon: Boxes },
              { label: "Ruang tersisa", value: "42%", icon: Archive },
              { label: "Aktivitas 24 jam", value: "+18%", icon: BarChart3 },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-zinc-800/70 bg-zinc-950/70 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-2xl bg-zinc-900/80 p-3 text-cyan-400"><item.icon size={18} /></div>
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-[0.18em]">{item.label}</p>
                    <p className="text-white text-lg font-semibold mt-2">{item.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-zinc-800/70 bg-zinc-950/70 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white text-base font-semibold">Status persediaan</h3>
                <p className="text-zinc-500 text-sm">Level stok berdasarkan kategori.</p>
              </div>
              <span className="text-zinc-500 text-xs uppercase tracking-[0.22em]">Stabil</span>
            </div>
            <div className="space-y-3">
              {INVENTORY.map((item) => (
                <div key={item.sku} className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/70 px-4 py-4">
                  <div>
                    <div className="text-white text-sm font-semibold">{item.name}</div>
                    <div className="text-zinc-500 text-[11px] mt-1">SKU {item.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">{item.stock}</div>
                    <div className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClasses[item.status]}`}>
                      {item.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Warehouse size={18} className="text-cyan-400" />
              <div>
                <h3 className="text-white text-base font-semibold">Kapasitas</h3>
                <p className="text-zinc-500 text-sm">Preferensi ruang dan area prioritas.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl bg-zinc-950/70 p-4">
                <p className="text-zinc-400 text-sm">Gudang Utama</p>
                <p className="text-white text-2xl font-semibold mt-2">58%</p>
              </div>
              <div className="rounded-2xl bg-zinc-950/70 p-4">
                <p className="text-zinc-400 text-sm">Area penyimpanan dingin</p>
                <p className="text-white text-2xl font-semibold mt-2">72%</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 size={18} className="text-amber-400" />
              <div>
                <h3 className="text-white text-base font-semibold">Permintaan Restock</h3>
                <p className="text-zinc-500 text-sm">SKU penting yang harus diisi ulang.</p>
              </div>
            </div>
            <div className="space-y-3 text-zinc-400 text-sm">
              <div className="rounded-2xl bg-zinc-950/70 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span>Bubble Wrap</span>
                  <span className="text-amber-300 font-semibold">92 unit</span>
                </div>
              </div>
              <div className="rounded-2xl bg-zinc-950/70 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span>Pallet Kayu</span>
                  <span className="text-emerald-300 font-semibold">60 unit</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
