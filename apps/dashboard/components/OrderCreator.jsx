import { useMemo, useState } from "react";
import {
  User,
  MapPin,
  ClipboardList,
  Truck,
  PackagePlus,
  CalendarDays,
} from "lucide-react";

const products = [
  { sku: "PRD-001", name: "Karton Elektronik", price: 175000, qty: 2 },
  { sku: "PRD-002", name: "Bahan Kemasan", price: 42000, qty: 5 },
];

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function OrderCreator() {
  const [order, setOrder] = useState({
    customer: "CV. Nusantara Logistik",
    destination: "Jl. Sukapura No. 20, Bandung",
    items: products,
    shipping: "Express",
    pickupDate: "2026-06-12",
  });

  const total = useMemo(
    () => order.items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [order.items]
  );

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-white text-xl font-bold tracking-tight">Buat Pesanan Baru</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Input pesanan pelanggan untuk diproses oleh OMS dan diteruskan ke WMS.
          </p>
        </div>
        <div className="text-zinc-500 text-[11px] bg-zinc-900/70 border border-zinc-800/60 rounded-xl px-4 py-2">
          <span className="font-semibold text-zinc-300">Formulir order</span> • Lengkapi data dan kirim ke sistem.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="space-y-6 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-300">
              <span className="font-semibold">Nama Pelanggan</span>
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 px-4 py-3">
                <User size={16} className="text-amber-400" />
                <input
                  value={order.customer}
                  onChange={(e) => setOrder({ ...order, customer: e.target.value })}
                  className="w-full bg-transparent outline-none text-white placeholder:text-zinc-500"
                  placeholder="Nama pelanggan"
                />
              </div>
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span className="font-semibold">Alamat Tujuan</span>
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 px-4 py-3">
                <MapPin size={16} className="text-cyan-400" />
                <select
                  value={order.destination}
                  onChange={(e) => setOrder({ ...order, destination: e.target.value })}
                  className="w-full bg-transparent outline-none text-white cursor-pointer"
                >
                  <option value="Jl. Sukapura No. 20, Bandung" className="bg-zinc-950 text-white">Jl. Sukapura No. 20, Bandung</option>
                  <option value="Jl. Telekomunikasi No. 1, Bandung" className="bg-zinc-950 text-white">Jl. Telekomunikasi No. 1, Bandung</option>
                  <option value="Jl. Melati No. 8, Surabaya" className="bg-zinc-950 text-white">Jl. Melati No. 8, Surabaya</option>
                  <option value="Jl. Sudirman No. 45, Jakarta" className="bg-zinc-950 text-white">Jl. Sudirman No. 45, Jakarta</option>
                  <option value="Jl. Gajah Mada No. 102, Yogyakarta" className="bg-zinc-950 text-white">Jl. Gajah Mada No. 102, Yogyakarta</option>
                </select>
              </div>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-300">
              <span className="font-semibold">Jenis Pengiriman</span>
              <select
                value={order.shipping}
                onChange={(e) => setOrder({ ...order, shipping: e.target.value })}
                className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-950/80 px-4 py-3 text-white outline-none"
              >
                <option>Standard</option>
                <option>Express</option>
                <option>Same Day</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span className="font-semibold">Tanggal Pengambilan</span>
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 px-4 py-3">
                <CalendarDays size={16} className="text-violet-400" />
                <input
                  type="date"
                  value={order.pickupDate}
                  onChange={(e) => setOrder({ ...order, pickupDate: e.target.value })}
                  className="w-full bg-transparent outline-none text-white"
                />
              </div>
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white text-base font-semibold">Item dalam pesanan</h3>
                <p className="text-zinc-500 text-sm">Kelola barang yang akan diproses oleh WMS.</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-amber-300 text-sm hover:bg-amber-500/15 transition">
                <PackagePlus size={16} /> Tambah Item
              </button>
            </div>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.sku} className="flex items-center justify-between gap-3 rounded-3xl border border-zinc-800/70 bg-zinc-950/70 px-4 py-3">
                  <div>
                    <div className="text-zinc-200 text-sm font-semibold">{item.name}</div>
                    <div className="text-zinc-500 text-xs">SKU {item.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-300 text-sm font-semibold">{item.qty} buah</div>
                    <div className="text-zinc-500 text-xs">{formatRupiah(item.price)} / unit</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800/60">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <ClipboardList size={16} />
              Total item: {order.items.length}
            </div>
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Truck size={16} />
              Layanan: {order.shipping}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-[0.22em]">Ringkasan</p>
                <h3 className="text-white text-lg font-semibold">Total Pesanan</h3>
              </div>
              <div className="rounded-2xl bg-zinc-950/70 px-3 py-2 text-amber-300 text-xs font-semibold">#{String(Date.now()).slice(-6)}</div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-zinc-400 text-sm">
                <span>Subtotal</span>
                <span>{formatRupiah(total)}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400 text-sm">
                <span>Biaya pengiriman</span>
                <span>{formatRupiah(35000)}</span>
              </div>
              <div className="border-t border-zinc-800/70 pt-4 flex items-center justify-between text-white text-lg font-semibold">
                <span>Estimasi Total</span>
                <span>{formatRupiah(total + 35000)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/60 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Truck size={18} className="text-cyan-400" />
              <div>
                <p className="text-white text-sm font-semibold">Pengiriman</p>
                <p className="text-zinc-500 text-xs">Cek estimasi dan lokasi pickup</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="flex items-center justify-between">
                <span>Metode</span>
                <span>{order.shipping}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pickup</span>
                <span>{order.pickupDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tujuan</span>
                <span className="text-right">{order.destination}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
