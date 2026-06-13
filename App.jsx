import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import OrderCreator from "./components/OrderCreator";
import OrdersList from "./components/OrdersList";
import TrackingBoard from "./components/TrackingBoard";
import WarehouseOverview from "./components/WarehouseOverview";
import ShippingPanel from "./components/ShippingPanel";
import IntegrationPage from "./components/IntegrationPage";
import "./index.css";

// Database User bawaan (in-memory & persist via sessionStorage)
const USER_DB = [
  { username: "operator1", password: "ops123",   role: "operasional",    name: "Aisya Devina",    initials: "AD" },
  { username: "operator2", password: "ops456",   role: "operasional",    name: "Naufal Athallah", initials: "NA" },
  { username: "infra1",    password: "infra123",  role: "infrastruktur",  name: "Khalifa Almaira", initials: "KA" },
  { username: "infra2",    password: "infra456",  role: "infrastruktur",  name: "Queen Naomi",     initials: "QN" },
];

export default function App() {
  // Load session dari sessionStorage jika ada
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem("currentUser");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeNav, setActiveNav] = useState("ringkasan");
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [errorMsg, setErrorMsg] = useState("");

  // Input states
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [regName, setRegName] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regRole, setRegRole] = useState("operasional");

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    if (!loginUser || !loginPass) {
      setErrorMsg("Username dan password harus diisi.");
      return;
    }
    const found = USER_DB.find((u) => u.username === loginUser && u.password === loginPass);
    if (found) {
      sessionStorage.setItem("currentUser", JSON.stringify(found));
      setUser(found);
      setErrorMsg("");
      setLoginUser("");
      setLoginPass("");
      setActiveNav("ringkasan");
    } else {
      setErrorMsg("Username atau password salah.");
    }
  };

  const handleRegister = (e) => {
    if (e) e.preventDefault();
    if (!regName || !regUser || !regPass) {
      setErrorMsg("Semua field harus diisi.");
      return;
    }
    if (regPass.length < 4) {
      setErrorMsg("Password minimal 4 karakter.");
      return;
    }
    if (USER_DB.find((u) => u.username === regUser)) {
      setErrorMsg("Username sudah digunakan, pilih yang lain.");
      return;
    }

    const initials = regName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const newUser = { username: regUser, password: regPass, role: regRole, name: regName, initials };
    USER_DB.push(newUser);

    sessionStorage.setItem("currentUser", JSON.stringify(newUser));
    setUser(newUser);
    setErrorMsg("");
    setRegName("");
    setRegUser("");
    setRegPass("");
    setRegRole("operasional");
    setActiveNav("ringkasan");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("currentUser");
    setUser(null);
    setActiveNav("ringkasan");
  };

  // Guard halaman berdasarkan role user
  const isPageAllowed = (page) => {
    if (!user) return false;
    if (page === "ringkasan") return true;
    if (user.role === "operasional") {
      return ["buat-pesanan", "daftar-pesanan", "pelacakan"].includes(page);
    }
    if (user.role === "infrastruktur") {
      return ["gudang", "pengiriman", "alur-integrasi"].includes(page);
    }
    return false;
  };

  const renderPage = () => {
    if (!isPageAllowed(activeNav)) {
      return (
        <div className="flex items-center justify-center h-full bg-[#09090b]">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm">Akses Ditolak: Halaman ini tidak sesuai dengan peran Anda.</p>
          </div>
        </div>
      );
    }

    switch (activeNav) {
      case "ringkasan":
        return <Dashboard />;
      case "buat-pesanan":
        return <OrderCreator />;
      case "daftar-pesanan":
        return <OrdersList />;
      case "pelacakan":
        return <TrackingBoard />;
      case "gudang":
        return <WarehouseOverview />;
      case "pengiriman":
        return <ShippingPanel />;
      case "alur-integrasi":
        return <IntegrationPage />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-zinc-500 text-sm">Halaman tidak ditemukan</p>
            </div>
          </div>
        );
    }
  };

  // Tampilkan form autentikasi jika belum login
  if (!user) {
    return (
      <div className="auth-overlay">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-brand-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div className="auth-brand-name">EDLIE</div>
              <div className="auth-brand-tagline">Logistics Platform</div>
            </div>
          </div>

          {authMode === "login" ? (
            <>
              <div className="auth-title">Selamat Datang</div>
              <div className="auth-subtitle">Masuk untuk mengakses dashboard</div>
              {errorMsg && <div className="auth-alert auth-alert-error"><span>⚠</span> {errorMsg}</div>}
              <form onSubmit={handleLogin} className="auth-form">
                <div className="auth-field">
                  <label>Username</label>
                  <input
                    type="text"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    placeholder="Masukkan username"
                    autoComplete="username"
                  />
                </div>
                <div className="auth-field">
                  <label>Password</label>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                  />
                </div>
                <button type="submit" className="auth-btn-primary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Masuk
                </button>
              </form>
              <div className="auth-footer">
                Belum punya akun?{" "}
                <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode("register"); setErrorMsg(""); }}>
                  Daftar sekarang
                </a>
              </div>
              <div className="auth-hint">
                <div className="auth-hint-title">Demo Akun</div>
                <div className="auth-hint-row">
                  <span className="auth-hint-badge ops">Operasional</span>
                  <code>operator1 / ops123</code>
                </div>
                <div className="auth-hint-row">
                  <span className="auth-hint-badge infra">Infrastruktur</span>
                  <code>infra1 / infra123</code>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="auth-title">Buat Akun Baru</div>
              <div className="auth-subtitle">Daftarkan akun untuk mengakses platform</div>
              {errorMsg && <div className="auth-alert auth-alert-error"><span>⚠</span> {errorMsg}</div>}
              <form onSubmit={handleRegister} className="auth-form">
                <div className="auth-field">
                  <label>Nama Lengkap</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Nama lengkap Anda"
                  />
                </div>
                <div className="auth-field">
                  <label>Username</label>
                  <input
                    type="text"
                    value={regUser}
                    onChange={(e) => setRegUser(e.target.value)}
                    placeholder="Pilih username unik"
                    autoComplete="username"
                  />
                </div>
                <div className="auth-field">
                  <label>Password</label>
                  <input
                    type="password"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    placeholder="Buat password"
                    autoComplete="new-password"
                  />
                </div>
                <div className="auth-field">
                  <label>Role</label>
                  <select value={regRole} onChange={(e) => setRegRole(e.target.value)}>
                    <option value="operasional">Operasional — New Order, Orders, Tracking</option>
                    <option value="infrastruktur">Infrastruktur — Warehouse, Shipping, Integration</option>
                  </select>
                </div>
                <button type="submit" className="auth-btn-primary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  Daftar
                </button>
              </form>
              <div className="auth-footer">
                Sudah punya akun?{" "}
                <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode("login"); setErrorMsg(""); }}>
                  Masuk di sini
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Tampilkan dashboard utama jika sudah login
  return (
    <div className="flex h-screen bg-[#09090b] overflow-hidden font-['DM_Sans',_sans-serif]">
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} user={user} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
