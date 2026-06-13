import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  MapPin,
  Warehouse,
  Truck,
  GitBranch,
  Users,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Navigasi",
    items: [
      { id: "ringkasan", label: "Ringkasan", icon: LayoutDashboard },
      { id: "buat-pesanan", label: "Buat Pesanan", icon: PlusCircle },
      { id: "daftar-pesanan", label: "Daftar Pesanan", icon: ClipboardList },
      { id: "pelacakan", label: "Pelacakan", icon: MapPin },
    ],
  },
  {
    label: "Sistem",
    items: [
      { id: "gudang", label: "Gudang", icon: Warehouse },
      { id: "pengiriman", label: "Pengiriman", icon: Truck },
      { id: "alur-integrasi", label: "Alur Integrasi", icon: GitBranch },
    ],
  },
];

const TEAM_MEMBERS = [
  "Zhavira Putri A.",
  "Achmad Iqbal",
  "Haffidz Aditya",
  "Mukhtar Aulia",
  "Faris Al Ghifari",
];

export default function Sidebar({ activeNav, setActiveNav, user }) {
  const filteredNavSections = NAV_SECTIONS.map((section) => {
    const filteredItems = section.items.filter((item) => {
      // Halaman ringkasan/overview selalu diizinkan
      if (item.id === "ringkasan") return true;

      if (user?.role === "operasional") {
        return ["buat-pesanan", "daftar-pesanan", "pelacakan"].includes(item.id);
      }
      if (user?.role === "infrastruktur") {
        return ["gudang", "pengiriman", "alur-integrasi"].includes(item.id);
      }
      // Default jika tidak ada user (tampilkan semua agar tidak blank saat testing)
      return true;
    });
    return { ...section, items: filteredItems };
  }).filter((section) => section.items.length > 0);

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col bg-zinc-950 border-r border-zinc-800/60 h-screen sticky top-0">
      {/* Logo Area */}
      <div className="px-5 py-5 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-amber-400 font-black text-sm tracking-widest">E</span>
          </div>
          <div>
            <div className="text-white font-bold text-base tracking-widest leading-none">
              EDLIE
            </div>
            <div className="text-zinc-500 text-[10px] mt-0.5 tracking-wider uppercase font-medium">
              Logistics Integration
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {filteredNavSections.map((section) => (
          <div key={section.label}>
            <p className="text-zinc-600 text-[9px] font-semibold uppercase tracking-[0.18em] px-2 mb-2">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map(({ id, label, icon: Icon }) => {
                const isActive = activeNav === id;
                return (
                  <li key={id}>
                    <button
                      onClick={() => setActiveNav(id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 group ${
                        isActive
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                      }`}
                    >
                      <Icon
                        size={15}
                        className={`flex-shrink-0 transition-colors ${
                          isActive ? "text-amber-400" : "text-zinc-600 group-hover:text-zinc-400"
                        }`}
                      />
                      <span className="text-[12.5px] font-medium tracking-wide">{label}</span>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer - Team & Role Badge */}
      <div className="border-t border-zinc-800/60 px-4 py-4 space-y-4">
        {user && (
          <div className="px-3 py-2 rounded-lg bg-zinc-900/40 border border-zinc-800/50">
            <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider leading-none">Akses Terotorisasi</p>
            <div className={`mt-1.5 inline-block text-[9.5px] font-bold px-2.5 py-0.5 rounded-full leading-normal ${
              user.role === "operasional" 
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}>
              {user.role === "operasional" ? "Operasional" : "Infrastruktur"}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users size={11} className="text-zinc-600" />
            <span className="text-zinc-600 text-[9px] font-semibold uppercase tracking-[0.18em]">
              Kelompok 2
            </span>
          </div>
          <ul className="space-y-1">
            {TEAM_MEMBERS.map((name) => (
              <li key={name} className="text-zinc-600 text-[10px] font-medium pl-0.5 truncate hover:text-zinc-500 transition-colors">
                {name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
