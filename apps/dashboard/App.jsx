import { useEffect } from "react";
import "./index.css";

const GATEWAY = "http://localhost:8080";
const API = {
  OMS: GATEWAY,
  WMS: GATEWAY,
  SLS: GATEWAY,
  CTN: GATEWAY,
};

const USER_DB = [
  { username: "operator1", password: "ops123",   role: "operasional",    name: "Aisya Devina",    initials: "AD" },
  { username: "operator2", password: "ops456",   role: "operasional",    name: "Naufal Athallah", initials: "NA" },
  { username: "infra1",    password: "infra123",  role: "infrastruktur",  name: "Khalifa Almaira", initials: "KA" },
  { username: "infra2",    password: "infra456",  role: "infrastruktur",  name: "Queen Naomi",     initials: "QN" },
];

let currentUser = null;
try {
  const saved = sessionStorage.getItem("currentUser");
  if (saved) {
    currentUser = JSON.parse(saved);
  }
} catch (e) {
  console.error("Gagal memuat session:", e);
}

function loginUser(username, password) {
  const found = USER_DB.find(u => u.username === username && u.password === password);
  if (found) {
    currentUser = found;
    try {
      sessionStorage.setItem("currentUser", JSON.stringify(found));
    } catch (e) {
      console.error("Gagal menyimpan session:", e);
    }
    return true;
  }
  return false;
}

function logoutUser() {
  currentUser = null;
  try {
    sessionStorage.removeItem("currentUser");
  } catch (e) {
    console.error("Gagal menghapus session:", e);
  }
}

function registerUser(username, password, role, name) {
  if (USER_DB.find(u => u.username === username)) return false;
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  USER_DB.push({ username, password, role, name, initials });
  return true;
}

const NAV_OPERASIONAL = ["overview", "new-order", "orders", "tracking"];
const NAV_INFRASTRUKTUR = ["overview", "warehouse", "shipping", "integration"];

function isPageAllowed(page) {
  if (!currentUser) return false;
  if (currentUser.role === "operasional") return NAV_OPERASIONAL.includes(page);
  if (currentUser.role === "infrastruktur") return NAV_INFRASTRUKTUR.includes(page);
  return false;
}

function getDefaultPage() {
  return "overview";
}

function apiFetch(url) {
  return fetch(url, {
    signal: AbortSignal.timeout(5000),
    headers: { "Cache-Control": "no-cache" },
  }).then((res) => {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  });
}

function formatIDR(n) {
  const v = parseFloat(n) || 0;
  if (v >= 1_000_000) return "Rp " + (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return "Rp " + (v / 1_000).toFixed(0) + "K";
  return "Rp " + v.toLocaleString("id-ID");
}

function formatDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  return (
    d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  );
}

function statusBadge(status) {
  if (!status) return '<span class="badge badge-slate">—</span>';
  const map = {
    DIBUAT: "badge-blue",
    PESANAN_DITEMPATKAN: "badge-blue",
    PENGEMASAN_SELESAI: "badge-amber",
    DIKEMAS: "badge-amber",
    DIMANIFES: "badge-blue",
    DIKIRIM: "badge-blue",
    TERKIRIM: "badge-green",
    DITERIMA: "badge-green",
    DIPROSES: "badge-amber",
    AKTIF: "badge-green",
  };
  const cls = map[status] || "badge-slate";
  return `<span class="badge ${cls}">${status}</span>`;
}

function showAlert(id, type, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = "alert alert-" + type + " show";
  el.innerHTML = `<span class="alert-icon">${type === "success" ? "✓" : type === "error" ? "⚠" : "ℹ"}</span><span>${msg}</span>`;
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.className = "alert";
}

function getSelectedSkuPrice(select) {
  const option = select?.selectedOptions?.[0];
  return option ? parseFloat(option.dataset.price) || 0 : 0;
}

function updateTotalPrice() {
  const rows = document.querySelectorAll("#item-list .item-row");
  let total = 0;
  rows.forEach((row) => {
    const qtyInput = row.querySelector(".inp-qty");
    let qty = parseInt(qtyInput?.value) || 0;
    if (qty < 0) { qty = 0; if (qtyInput) qtyInput.value = 0; }
    const price = getSelectedSkuPrice(row.querySelector(".inp-sku"));
    total += qty * price;
  });
  const priceInput = document.getElementById("inp-price");
  if (priceInput) {
    priceInput.value = total > 0 ? total : "";
  }
  return total;
}

function addItem() {
  const list = document.getElementById("item-list");
  if (!list) return;
  const row = document.createElement("div");
  row.className = "item-row";
  row.innerHTML = `
    <select class="inp-sku" onchange="updateTotalPrice()">
      <option value="SKU-NEON-01" data-price="175000">Widget Neon Alpha (SKU-NEON-01)</option>
      <option value="SKU-NEON-02" data-price="145000">Widget Neon Beta (SKU-NEON-02)</option>
      <option value="SKU-BOLT-01" data-price="85000">Konektor Bolt X (SKU-BOLT-01)</option>
    </select>
    <input type="number" class="inp-qty" placeholder="Qty" value="1" min="1" oninput="updateTotalPrice()" onchange="updateTotalPrice()"/>
    <button class="btn-remove" onclick="removeItem(this)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  `;
  list.appendChild(row);
  updateTotalPrice();
}

function removeItem(btn) {
  const list = document.getElementById("item-list");
  if (!list || list.children.length <= 1) return;
  btn.parentElement.remove();
  updateTotalPrice();
}

const notifications = [];

function addNotification(type, title, message) {
  const id = Date.now();
  notifications.unshift({ id, type, title, message, time: new Date() });
  if (notifications.length > 20) notifications.pop();
  renderNotifications();
}

function renderNotifications() {
  const list = document.getElementById('notif-list');
  const badge = document.getElementById('notif-badge');
  if (!list) return;
  if (!notifications.length) {
    list.innerHTML = '<div class="notif-empty"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><div>No notifications yet</div></div>';
    if (badge) badge.style.display = 'none';
    return;
  }
  const icons = { success: '✓', error: '⚠', info: 'ℹ' };
  list.innerHTML = notifications.map(n => `<div class="notif-item notif-${n.type}">
    <div class="notif-item-icon">${icons[n.type] || 'ℹ'}</div>
    <div class="notif-item-body">
      <div class="notif-item-title">${n.title}</div>
      <div class="notif-item-msg">${n.message}</div>
      <div class="notif-item-time">${n.time.toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})}</div>
    </div>
  </div>`).join('');
  if (badge) { badge.style.display = 'block'; badge.textContent = notifications.length > 9 ? '9+' : notifications.length; }
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    document.addEventListener('click', closeNotifOnOutsideClick, { once: true });
  }
}

function closeNotifOnOutsideClick(e) {
  const wrapper = document.getElementById('notif-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    const panel = document.getElementById('notif-panel');
    if (panel) panel.style.display = 'none';
  }
}

function clearNotifications() {
  notifications.length = 0;
  renderNotifications();
  const panel = document.getElementById('notif-panel');
  if (panel) panel.style.display = 'none';
}

async function checkHealth() {
  const services = [
    { id: "oms", url: GATEWAY + "/health/oms" },
    { id: "wms", url: GATEWAY + "/health/wms" },
    { id: "sls", url: GATEWAY + "/health/sls" },
    { id: "ctn", url: GATEWAY + "/health/ctn" },
  ];
  let ok = 0;
  for (const svc of services) {
    const dot = document.getElementById("dot-" + svc.id);
    const card = document.getElementById("svc-" + svc.id);
    try {
      const data = await apiFetch(svc.url);
      const alive = data.status === "AKTIF" || data.status === "UP";
      if (dot) dot.className = "service-dot " + (alive ? "online" : "offline");
      if (card) card.className = "service-card " + (alive ? "online" : "offline");
      if (alive) ok++;
    } catch {
      if (dot) dot.className = "service-dot offline";
      if (card) card.className = "service-card offline";
    }
  }
  const badge = document.getElementById("badge-health");
  const hDot = document.getElementById("header-dot");
  const hText = document.getElementById("header-status-text");
  if (ok === 4) {
    if (badge) { badge.className = "badge badge-green"; badge.textContent = "4/4 Operational"; }
    if (hDot) hDot.className = "status-pulse live";
    if (hText) hText.textContent = "All Systems Operational";
  } else if (ok > 0) {
    if (badge) { badge.className = "badge badge-amber"; badge.textContent = `${ok}/4 Operational`; }
    if (hDot) hDot.className = "status-pulse degraded";
    if (hText) hText.textContent = `${ok}/4 Active`;
  } else {
    if (badge) { badge.className = "badge badge-red"; badge.textContent = "Offline"; }
    if (hDot) hDot.className = "status-pulse down";
    if (hText) hText.textContent = "Systems Offline";
  }
}

async function loadKPIs() {
  try {
    const d = await apiFetch(GATEWAY + "/api/statistik");
    document.getElementById("kpi-orders").textContent = d.total_pesanan ?? "—";
    document.getElementById("kpi-orders-sub").textContent = (d.pesanan_hari_ini ?? 0) + " today";
    document.getElementById("kpi-revenue").textContent = d.total_pendapatan ? formatIDR(d.total_pendapatan) : "—";
    const sidebarOrdersCount = document.getElementById("sidebar-orders-count");
    if (sidebarOrdersCount) sidebarOrdersCount.textContent = d.total_pesanan ?? "—";
  } catch {
    document.getElementById("kpi-orders").textContent = "ERR";
  }

  try {
    const d = await apiFetch(GATEWAY + "/api/sls/statistik");
    document.getElementById("kpi-shipments").textContent = d.total_pengiriman ?? "—";
    document.getElementById("kpi-shipments-sub").textContent = (d.total_dimanifes ?? 0) + " manifested";
  } catch {
    document.getElementById("kpi-shipments").textContent = "ERR";
  }

  try {
    const d = await apiFetch(GATEWAY + "/api/pelacakan");
    document.getElementById("kpi-tracked").textContent = d.jumlah ?? "—";
  } catch {
    document.getElementById("kpi-tracked").textContent = "ERR";
  }
}

async function loadRecentOrders() {
  const tbody = document.getElementById("tbl-recent");
  try {
    const data = await apiFetch(GATEWAY + "/api/pesanan");
    const list = (data.daftar_pesanan || []).slice(0, 8);
    document.getElementById("recent-count").textContent = (data.jumlah ?? 0) + " total orders";
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div><div class="empty-title">No orders yet</div><div class="empty-desc">Create your first order to get started</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = list
      .map(
        (p) => `<tr>
        <td><span class="td-id">${p.id_pesanan}</span></td>
        <td><span style="font-weight:500">${p.nama_pelanggan}</span></td>
        <td style="font-weight:600">${formatIDR(p.total_harga)}</td>
        <td>${statusBadge(p.status)}</td>
        <td class="text-muted text-xs">${formatDate(p.dibuat_pada)}</td>
      </tr>`
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-title" style="color:var(--error-600)">Could not connect to OMS</div><div class="empty-desc">Ensure OMS is running on port 8001</div></div></td></tr>`;
  }
}

async function loadAll() {
  await checkHealth();
  await Promise.all([loadKPIs(), loadRecentOrders()]);
}

async function loadOrders() {
  const tbody = document.getElementById("tbl-orders");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="loading-text"><div class="spinner"></div>Loading…</div></td></tr>`;
  }
  try {
    const data = await apiFetch(GATEWAY + "/api/pesanan");
    const list = data.daftar_pesanan || [];
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-title">No orders</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = list
      .map((p) => {
        const items = Array.isArray(p.daftar_barang) ? p.daftar_barang : JSON.parse(p.daftar_barang || "[]");
        const totalQty = items.reduce((sum, i) => sum + (parseInt(i.qty) || 1), 0);
        const tooltipText = items.map(i => `${i.sku} ×${i.qty}`).join(', ');
        return `<tr>
        <td><span class="td-id">${p.id_pesanan}</span></td>
        <td style="font-weight:500">${p.nama_pelanggan}</td>
        <td class="text-muted text-xs">${p.email_pelanggan}</td>
        <td style="font-weight:600">${formatIDR(p.total_harga)}</td>
        <td class="text-sm" title="${tooltipText}" style="cursor:default">
          <span style="font-weight:600">${totalQty}</span>
          <span class="text-muted"> qty (${items.length} SKU)</span>
        </td>
        <td>${statusBadge(p.status)}</td>
        <td class="text-muted text-xs">${formatDate(p.dibuat_pada)}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="trackFromOrder('${p.id_pesanan}')">Track</button></td>
      </tr>`;
      })
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-title" style="color:var(--error-600)">${e.message}</div></div></td></tr>`;
  }
}

function trackFromOrder(id) {
  navigate("tracking");
  const input = document.getElementById("inp-track-id");
  if (input) input.value = id;
  setTimeout(searchTracking, 200);
}

const DESTINATIONS_BY_WAREHOUSE = {
  "WH-JAKARTA-01": [
    "Jl. Sudirman No. 45, Jakarta Pusat",
    "Jl. Gatot Subroto No. 12, Jakarta Selatan",
    "Jl. Raya Bekasi No. 78, Jakarta Timur",
    "Jl. Daan Mogot No. 33, Jakarta Barat",
  ],
  "WH-BANDUNG-01": [
    "Jl. Sukapura No. 20, Bandung",
    "Jl. Telekomunikasi No. 1, Bandung",
    "Jl. Asia Afrika No. 55, Bandung",
    "Jl. Kopo No. 100, Bandung",
    "Jl. Raya Cimahi No. 12, Cimahi",
  ],
  "WH-SURABAYA-01": [
    "Jl. Melati No. 8, Surabaya",
    "Jl. Pemuda No. 31, Surabaya",
    "Jl. Raya Darmo No. 60, Surabaya",
    "Jl. Ahmad Yani No. 15, Surabaya",
  ],
  "WH-YOGYAKARTA-01": [
    "Jl. Gajah Mada No. 102, Yogyakarta",
    "Jl. Malioboro No. 7, Yogyakarta",
    "Jl. Laksda Adisucipto No. 88, Yogyakarta",
    "Jl. Ring Road Utara No. 14, Sleman",
  ],
};

function updateDestinationOptions() {
  const pickupSelect = document.getElementById("inp-pickup-location");
  const destSelect = document.getElementById("inp-destination");
  if (!pickupSelect || !destSelect) return;

  const warehouseId = pickupSelect.value;
  const destinations = DESTINATIONS_BY_WAREHOUSE[warehouseId] || [];

  destSelect.innerHTML = "";

  if (!warehouseId) {
    destSelect.innerHTML = `<option value="">-- Pilih gudang dulu --</option>`;
    return;
  }

  if (destinations.length === 0) {
    destSelect.innerHTML = `<option value="">-- Tidak ada destinasi tersedia --</option>`;
    return;
  }

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "-- Pilih alamat tujuan --";
  destSelect.appendChild(placeholder);

  destinations.forEach(addr => {
    const opt = document.createElement("option");
    opt.value = addr;
    opt.textContent = addr;
    destSelect.appendChild(opt);
  });
}

async function createOrder() {
  const name = document.getElementById("inp-name")?.value.trim();
  const email = document.getElementById("inp-email")?.value.trim();
  const pickupLocation = document.getElementById("inp-pickup-location")?.value;
  const destination = document.getElementById("inp-destination")?.value;
  const btn = document.getElementById("btn-create-order");
  const rows = document.querySelectorAll("#item-list .item-row");
  const items = Array.from(rows).map((r) => {
    const skuSelect = r.querySelector(".inp-sku");
    const qty = parseInt(r.querySelector(".inp-qty").value) || 1;
    return {
      sku: skuSelect.value,
      qty,
      price: getSelectedSkuPrice(skuSelect),
    };
  });
  const totalPrice = updateTotalPrice();

  if (!name || !email || !pickupLocation || !destination || items.length === 0 || totalPrice <= 0) {
    showAlert("order-alert", "error", "Name, email, tempat pengambilan, alamat tujuan, dan minimal satu item wajib diisi.");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Processing…';
  }
  showAlert("order-alert", "info", "Submitting order to OMS…");

  try {
    const res = await fetch(GATEWAY + "/api/pesanan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pelanggan: { nama: name, email }, daftarBarang: items, totalHarga: totalPrice, lokasi_pengambilan: pickupLocation, alamat_tujuan: destination }),
    });
    const data = await res.json();
    if (res.ok) {
      showAlert(
        "order-alert",
        "success",
        `Order created: <strong style="font-family:var(--font-mono)">${data.id_pesanan}</strong> — Event published to RabbitMQ`
      );
      addNotification('success', 'Order Created', `${data.id_pesanan} published to RabbitMQ`);
      animateFlow();
      loadAll();
    } else {
      showAlert("order-alert", "error", "Failed: " + (data.error || JSON.stringify(data)));
    }
  } catch (e) {
    showAlert("order-alert", "error", "Could not connect to OMS: " + e.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 2 11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Submit Order & Publish Event';
    }
  }
}

async function searchTracking() {
  const id = document.getElementById("inp-track-id")?.value.trim();
  if (!id) {
    showAlert("track-alert", "error", "Enter an Order ID first.");
    return;
  }
  hideAlert("track-alert");
  const result = document.getElementById("track-result");
  if (result) result.style.display = "none";

  try {
    const data = await apiFetch(GATEWAY + "/api/pelacakan/" + id);
    const status = data.status_terkini || {};
    const timeline = data.timeline || [];

    document.getElementById("track-order-id").textContent = id;
    document.getElementById("track-status-badge").innerHTML = statusBadge(status.status);
    document.getElementById("track-event-count").textContent = timeline.length + " events";

    document.getElementById("track-details").innerHTML = `<div class="detail-kv"><table>
      <tr><td>Status</td><td>${statusBadge(status.status)}</td></tr>
      <tr><td>Source</td><td>${status.sumber || "—"}</td></tr>
      <tr><td>Updated</td><td>${formatDate(status.terakhir_diperbarui)}</td></tr>
      ${status.nomor_resi ? `<tr><td>Tracking No.</td><td><code style="font-family:var(--font-mono);font-size:12px;color:var(--success-700)">${status.nomor_resi}</code></td></tr>` : ""}
      ${status.id_pengiriman ? `<tr><td>Shipment ID</td><td><code style="font-family:var(--font-mono);font-size:11px;color:var(--brand-600)">${status.id_pengiriman}</code></td></tr>` : ""}
    </table></div>`;

    const icons = {
      PESANAN_DITEMPATKAN: "📋",
      PENGEMASAN_SELESAI: "📦",
      DIKIRIM: "🚚",
      TERKIRIM: "✅",
    };
    document.getElementById("track-timeline").innerHTML = timeline
      .map(
        (item) => `
      <div class="timeline-item">
        <div class="t-time">${formatDate(item.waktu)}</div>
        <div class="t-dot done">${icons[item.status] || "◉"}</div>
        <div class="t-content">
          <div class="t-title">${item.status}</div>
          <div class="t-meta">Source: ${item.sumber || "—"} · <code style="font-family:var(--font-mono);font-size:10px">${item.tipe_event || "—"}</code></div>
        </div>
        <div></div>
      </div>`
      )
      .join("");

    if (result) result.style.display = "block";
  } catch {
    showAlert("track-alert", "error", "Order not found or not yet processed.");
  }
}

async function loadAllTracking() {
  const tbody = document.getElementById("tbl-tracking");
  try {
    const data = await apiFetch(GATEWAY + "/api/pelacakan");
    const list = data.daftar_pesanan || [];
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-title">No tracking data</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = list
      .map(
        (p) => `<tr>
      <td><span class="td-id">${p.id_pesanan}</span></td>
      <td>${statusBadge(p.status)}</td>
      <td class="text-sm text-muted">${p.sumber || "—"}</td>
      <td class="text-xs text-muted">${formatDate(p.terakhir_diperbarui)}</td>
      <td><code style="font-family:var(--font-mono);font-size:11px;color:var(--success-700)">${p.nomor_resi || "—"}</code></td>
      <td><button class="btn btn-ghost btn-sm" onclick="trackFromOrder('${p.id_pesanan}')">Detail</button></td>
    </tr>`
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-title" style="color:var(--error-600)">${e.message}</div></div></td></tr>`;
  }
}

async function loadInventory() {
  const el = document.getElementById("inv-body");
  try {
    const data = await apiFetch(GATEWAY + "/api/gudang/inventaris");
    if (!data.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-title">Empty inventory</div></div>`;
      return;
    }
    el.innerHTML = `<table>
      <thead><tr><th>SKU</th><th>Product</th><th>Total</th><th>Allocated</th><th>Available</th><th>Stock Level</th></tr></thead>
      <tbody>${data
        .map((item) => {
          const avail = (item.jumlah_stok || 0) - (item.jumlah_dialokasikan || 0);
          const pct = item.jumlah_stok > 0 ? Math.max(0, (avail / item.jumlah_stok) * 100) : 0;
          const cls = pct < 20 ? "critical" : pct < 50 ? "low" : "";
          return `<tr>
          <td><span class="td-id">${item.kode_sku}</span></td>
          <td style="font-weight:500">${item.nama_produk}</td>
          <td class="text-mono">${item.jumlah_stok}</td>
          <td class="text-mono" style="color:var(--warning-600)">${item.jumlah_dialokasikan}</td>
          <td class="text-mono" style="font-weight:700;color:${cls === "critical" ? "var(--error-600)" : "var(--success-600)"}">${avail}</td>
          <td><div class="stock-bar"><div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct.toFixed(0)}%"></div></div><span class="bar-label">${pct.toFixed(0)}%</span></div></td>
        </tr>`;
        })
        .join("")}</tbody>
    </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-title" style="color:var(--error-600)">Failed: ${e.message}</div></div>`;
  }
}

async function loadRequests() {
  const tbody = document.getElementById("tbl-requests");
  try {
    const data = await apiFetch(GATEWAY + "/api/gudang/permintaan");
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-title">No requests</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = data
      .map(
        (p) => `<tr>
      <td class="text-mono text-xs">${p.id_permintaan}</td>
      <td><span class="td-id">${p.referensi_pesanan}</span></td>
      <td class="text-sm text-muted">${p.aksi}</td>
      <td>${statusBadge(p.status)}</td>
      <td class="text-xs text-muted">${formatDate(p.dibuat_pada)}</td>
    </tr>`
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-title" style="color:var(--error-600)">${e.message}</div></div></td></tr>`;
  }
}

async function loadWarehouse() {
  await Promise.all([loadInventory(), loadRequests()]);
}

let cachedShipments = [];

async function showShipmentDetail(id_pengiriman) {
  const shipment = cachedShipments.find(s => s.id_pengiriman === id_pengiriman);
  if (!shipment) return;

  let modal = document.getElementById("shipment-detail-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "shipment-detail-modal";
    modal.className = "modal-overlay";
    document.body.appendChild(modal);
  }
  modal.style.display = "flex";

  const orderId = shipment.detail_paket?.nomor_referensi || "";

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <div class="modal-title">Shipment Details</div>
          <div class="modal-subtitle">${shipment.id_pengiriman} · ${shipment.nomor_resi || "No Resi"}</div>
        </div>
        <button class="modal-close-btn" onclick="closeShipmentDetail()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="modal-grid">
          <div class="modal-info-group">
            <span class="modal-info-label">Order Reference</span>
            <span class="modal-info-value font-mono">${orderId || "—"}</span>
          </div>
          <div class="modal-info-group">
            <span class="modal-info-label">Status Terkini</span>
            <span class="modal-info-value">${statusBadge(shipment.status)}</span>
          </div>
          <div class="modal-info-group">
            <span class="modal-info-label">Asal Pengiriman</span>
            <span class="modal-info-value">${shipment.asal || "—"}</span>
          </div>
          <div class="modal-info-group">
            <span class="modal-info-label">Alamat Tujuan</span>
            <span class="modal-info-value">${shipment.alamat_tujuan || "Jl. Sukapura No. 20, Bandung"}</span>
          </div>
          <div class="modal-info-group">
            <span class="modal-info-label">Berat Paket</span>
            <span class="modal-info-value">${shipment.detail_paket?.berat_kg || 1.5} kg</span>
          </div>
          <div class="modal-info-group">
            <span class="modal-info-label">Jadwal Pickup</span>
            <span class="modal-info-value">${shipment.scheduled_pickup_date ? formatDate(shipment.scheduled_pickup_date) : "Belum dijadwalkan"}</span>
          </div>
          <div class="modal-info-group">
            <span class="modal-info-label">Terakhir Diperbarui</span>
            <span class="modal-info-value">${formatDate(shipment.diperbarui_pada || shipment.dibuat_pada)}</span>
          </div>
        </div>
        
        <div class="modal-sections-grid">
          <div class="modal-section-card">
            <div class="modal-section-title">Riwayat Status (SLS)</div>
            <div class="modal-list-wrapper">
              <div class="modal-timeline">
                ${(shipment.riwayat_status || []).map(r => `
                  <div class="modal-timeline-item">
                    <div class="mt-time">${formatDate(r.waktu)}</div>
                    <div class="mt-dot"></div>
                    <div class="mt-content">
                      <div class="mt-status">${r.status}</div>
                      <div class="mt-desc">Oleh: ${r.oleh} · ${r.keterangan || ""}</div>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
          
          <div class="modal-section-card">
            <div class="modal-section-title">Event Timeline Integrasi (CTN)</div>
            <div class="modal-list-wrapper" id="ctn-timeline-loading">
              <div class="loading-text" style="padding: 20px 0;"><div class="spinner"></div>Memuat timeline...</div>
            </div>
            <div class="modal-list-wrapper" id="ctn-timeline-container" style="display:none">
              <div class="modal-timeline" id="ctn-timeline-list">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  if (orderId) {
    try {
      const data = await apiFetch(GATEWAY + "/api/pelacakan/" + orderId);
      const list = data.timeline || [];
      const loadingEl = document.getElementById("ctn-timeline-loading");
      const containerEl = document.getElementById("ctn-timeline-container");
      const listEl = document.getElementById("ctn-timeline-list");
      
      if (loadingEl) loadingEl.style.display = "none";
      
      if (list.length === 0) {
        if (loadingEl) {
          loadingEl.style.display = "block";
          loadingEl.innerHTML = `<div style="text-align:center; color:var(--slate-400); font-size:12px; padding: 12px 0;">Belum ada event integrasi tercatat di CTN.</div>`;
        }
        return;
      }

      const icons = {
        PESANAN_DITEMPATKAN: "📋",
        PENGEMASAN_SELESAI: "📦",
        DIKIRIM: "🚚",
        TERKIRIM: "✅",
      };

      if (listEl) {
        listEl.innerHTML = list.map(item => `
          <div class="modal-timeline-item">
            <div class="mt-time">${formatDate(item.waktu)}</div>
            <div class="mt-dot done">${icons[item.status] || "◉"}</div>
            <div class="mt-content">
              <div class="mt-status">${item.status}</div>
              <div class="mt-desc">Sumber: ${item.sumber || "—"} · <code>${item.tipe_event || "—"}</code></div>
            </div>
          </div>
        `).join("");
      }
      if (containerEl) containerEl.style.display = "block";
    } catch (err) {
      const loadingEl = document.getElementById("ctn-timeline-loading");
      if (loadingEl) {
        loadingEl.innerHTML = `<div style="text-align:center; color:var(--error-600); font-size:12px; padding: 12px 0;">Gagal memuat timeline integrasi.</div>`;
      }
    }
  }
}

function closeShipmentDetail() {
  const modal = document.getElementById("shipment-detail-modal");
  if (modal) modal.style.display = "none";
}

async function loadShipping() {
  const tbody = document.getElementById("tbl-shipping");
  if (tbody)
    tbody.innerHTML = `<tr><td colspan="8"><div class="loading-text"><div class="spinner"></div>Loading…</div></td></tr>`;
  try {
    const data = await apiFetch(GATEWAY + "/api/pengiriman");
    const list = data.daftar_pengiriman || [];
    cachedShipments = list;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-title">No shipments</div></div></td></tr>`;
      return;
    }

    const STATUS_COLORS = {
      DIMANIFES:    "color:#93c5fd",
      PICKUP:       "color:#67e8f9",
      "IN TRANSIT": "color:#fde047",
      DELIVERED:    "color:#86efac",
      CANCELLED:    "color:#f87171",
    };
    const STATUS_BG = {
      DIMANIFES:    "background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2)",
      PICKUP:       "background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.2)",
      "IN TRANSIT": "background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.2)",
      DELIVERED:    "background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2)",
      CANCELLED:    "background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2)",
    };

    tbody.innerHTML = list
      .map((p) => {
        const isLocked = p.status === "DELIVERED" || p.status === "CANCELLED";
        const statusStyle = STATUS_COLORS[p.status] || "color:#a1a1aa";
        const bgStyle = STATUS_BG[p.status] || "background:rgba(113,113,122,0.1);border:1px solid rgba(113,113,122,0.2)";
        return `<tr>
      <td class="text-mono text-xs">${p.id_pengiriman}</td>
      <td><span class="td-id">${p.detail_paket?.nomor_referensi || "—"}</span></td>
      <td><code style="font-family:var(--font-mono);font-size:11px;color:var(--success-700)">${p.nomor_resi || "—"}</code></td>
      <td class="text-sm text-muted">${p.asal || "—"}</td>
      <td class="text-xs text-muted">${p.alamat_tujuan || "—"}</td>
      <td>
        ${isLocked
          ? `<span style="display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:2px 10px;font-size:10px;font-weight:600;${bgStyle};${statusStyle}">${p.status}</span>`
          : `<select onchange="updateShipmentStatus('${p.id_pengiriman}', this.value)" class="select-status-dropdown">
               <option value="" disabled>── Ubah ──</option>
               ${["DIMANIFES","PICKUP","IN TRANSIT","DELIVERED","CANCELLED"].map(s => `<option value="${s}" ${p.status===s?"selected":""}>${s}</option>`).join("")}
             </select>`
        }
      </td>
      <td class="text-xs text-muted">${formatDate(p.diperbarui_pada || p.dibuat_pada)}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="showShipmentDetail('${p.id_pengiriman}')">Detail</button></td>
    </tr>`;
      })
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-title" style="color:var(--error-600)">${e.message}</div></div></td></tr>`;
  }
}

async function updateShipmentStatus(id_pengiriman, newStatus) {
  try {
    const res = await fetch(GATEWAY + "/api/pengiriman/" + id_pengiriman + "/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, operator: "OPERATOR" })
    });
    const data = await res.json();
    if (res.ok) {
      showAlert("shipping-alert", "success", `Status ${id_pengiriman} → <strong>${newStatus}</strong> · Event dipublikasikan ke RabbitMQ`);
      addNotification('info', 'Shipment Updated', `${id_pengiriman} → ${newStatus}`);
      setTimeout(loadShipping, 800);
    } else {
      showAlert("shipping-alert", "error", data.error || "Gagal mengubah status");
    }
  } catch (e) {
    showAlert("shipping-alert", "error", "Gagal terhubung ke SLS: " + e.message);
  }
}

function animateFlow() {
  const steps = [
    { node: "fn-oms", line: "fl-2", delay: 500 },
    { node: "fn-mq", line: "fl-3", delay: 1200 },
    { node: "fn-wms", line: "fl-4", delay: 2000 },
    { node: "fn-sls", line: "fl-5", delay: 2800 },
    { node: "fn-ctn", delay: 3600 },
  ];
  steps.forEach((s) => {
    setTimeout(() => {
      document.getElementById(s.node)?.classList.add("active");
      if (s.line) document.getElementById(s.line)?.classList.add("active");
    }, s.delay);
  });
  setTimeout(() => {
    ["fn-oms", "fn-mq", "fn-wms", "fn-sls", "fn-ctn", "fl-2", "fl-3", "fl-4", "fl-5"].forEach((id) =>
      document.getElementById(id)?.classList.remove("active")
    );
  }, 6000);
}

function switchTab(el, tabId) {
  document.querySelectorAll(".tab-bar .tab").forEach((t) => t.classList.remove("active"));
  el.classList.add("active");
  ["wh-inventory", "wh-requests"].forEach((id) => {
    const elTab = document.getElementById(id);
    if (elTab) elTab.style.display = id === tabId ? "block" : "none";
  });
}

function navigate(page) {
  if (!isPageAllowed(page)) return;

  closeShipmentDetail();

  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  document.getElementById("page-" + page)?.classList.add("active");
  document.querySelectorAll(".nav-item").forEach((n) => {
    if (n.getAttribute("onclick")?.includes("'" + page + "'")) n.classList.add("active");
  });
  checkHealth();
  if (page === "overview") loadAll();
  else if (page === "orders") loadOrders();
  else if (page === "tracking") loadAllTracking();
  else if (page === "warehouse") loadWarehouse();
  else if (page === "shipping") loadShipping();
}

function initClock() {
  const el = document.getElementById("header-clock");
  function tick() {
    if (el) el.textContent = new Date().toLocaleTimeString("id-ID", { hour12: false });
  }
  tick();
  return setInterval(tick, 1000);
}

function renderAuthScreen(mode = "login") {
  const root = document.getElementById("auth-root");
  if (!root) return;

  if (mode === "login") {
    root.innerHTML = `
      <div class="auth-card">
        <div class="auth-logo">
          <div class="auth-brand-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div class="auth-brand-name">EDLIE</div>
            <div class="auth-brand-tagline">Logistics Platform</div>
          </div>
        </div>
        <div class="auth-title">Selamat Datang</div>
        <div class="auth-subtitle">Masuk untuk mengakses dashboard</div>
        <div id="auth-alert" class="auth-alert" style="display:none"></div>
        <div class="auth-form">
          <div class="auth-field">
            <label>Username</label>
            <input type="text" id="auth-username" placeholder="Masukkan username" autocomplete="username" />
          </div>
          <div class="auth-field">
            <label>Password</label>
            <input type="password" id="auth-password" placeholder="Masukkan password" autocomplete="current-password" />
          </div>
          <button class="auth-btn-primary" onclick="handleLogin()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Masuk
          </button>
        </div>
        <div class="auth-footer">
          Belum punya akun? <a href="#" onclick="renderAuthScreen('register')">Daftar sekarang</a>
        </div>
        <div class="auth-hint">
          <div class="auth-hint-title">Demo Akun</div>
          <div class="auth-hint-row"><span class="auth-hint-badge ops">Operasional</span><code>operator1 / ops123</code></div>
          <div class="auth-hint-row"><span class="auth-hint-badge infra">Infrastruktur</span><code>infra1 / infra123</code></div>
        </div>
      </div>
    `;
    setTimeout(() => {
      document.getElementById("auth-password")?.addEventListener("keydown", e => {
        if (e.key === "Enter") handleLogin();
      });
      document.getElementById("auth-username")?.addEventListener("keydown", e => {
        if (e.key === "Enter") document.getElementById("auth-password")?.focus();
      });
    }, 50);
  } else {
    root.innerHTML = `
      <div class="auth-card">
        <div class="auth-logo">
          <div class="auth-brand-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div class="auth-brand-name">EDLIE</div>
            <div class="auth-brand-tagline">Logistics Platform</div>
          </div>
        </div>
        <div class="auth-title">Buat Akun Baru</div>
        <div class="auth-subtitle">Daftarkan akun untuk mengakses platform</div>
        <div id="auth-alert" class="auth-alert" style="display:none"></div>
        <div class="auth-form">
          <div class="auth-field">
            <label>Nama Lengkap</label>
            <input type="text" id="reg-name" placeholder="Nama lengkap Anda" />
          </div>
          <div class="auth-field">
            <label>Username</label>
            <input type="text" id="reg-username" placeholder="Pilih username unik" autocomplete="username" />
          </div>
          <div class="auth-field">
            <label>Password</label>
            <input type="password" id="reg-password" placeholder="Buat password" autocomplete="new-password" />
          </div>
          <div class="auth-field">
            <label>Role</label>
            <select id="reg-role">
              <option value="operasional">Operasional — New Order, Orders, Tracking</option>
              <option value="infrastruktur">Infrastruktur — Warehouse, Shipping, Integration</option>
            </select>
          </div>
          <button class="auth-btn-primary" onclick="handleRegister()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            Daftar
          </button>
        </div>
        <div class="auth-footer">
          Sudah punya akun? <a href="#" onclick="renderAuthScreen('login')">Masuk di sini</a>
        </div>
      </div>
    `;
  }
}

function showAuthAlert(msg, type = "error") {
  const el = document.getElementById("auth-alert");
  if (!el) return;
  el.style.display = "flex";
  el.className = "auth-alert auth-alert-" + type;
  el.innerHTML = `<span>${type === "error" ? "⚠" : "✓"}</span> ${msg}`;
}

function handleLogin() {
  const username = document.getElementById("auth-username")?.value.trim();
  const password = document.getElementById("auth-password")?.value;
  if (!username || !password) {
    showAuthAlert("Username dan password harus diisi.");
    return;
  }
  if (loginUser(username, password)) {
    mountDashboard();
  } else {
    showAuthAlert("Username atau password salah.");
  }
}

function handleRegister() {
  const name = document.getElementById("reg-name")?.value.trim();
  const username = document.getElementById("reg-username")?.value.trim();
  const password = document.getElementById("reg-password")?.value;
  const role = document.getElementById("reg-role")?.value;
  if (!name || !username || !password) {
    showAuthAlert("Semua field harus diisi.");
    return;
  }
  if (password.length < 4) {
    showAuthAlert("Password minimal 4 karakter.");
    return;
  }
  if (registerUser(username, password, role, name)) {
    loginUser(username, password);
    mountDashboard();
  } else {
    showAuthAlert("Username sudah digunakan, pilih yang lain.");
  }
}

function handleLogout() {
  logoutUser();
  const appEl = document.getElementById("app-root");
  const authEl = document.getElementById("auth-root");
  
  if (appEl && appEl._cleanup) {
    try {
      appEl._cleanup();
    } catch (e) {
      console.error("Gagal melakukan cleanup dashboard:", e);
    }
    appEl._cleanup = null;
  }

  if (appEl) appEl.style.display = "none";
  if (authEl) { authEl.style.display = "flex"; renderAuthScreen("login"); }
}

function buildSidebarNav() {
  const role = currentUser?.role;

  const overviewItem = `
    <div class="sidebar-section">
      <div class="sidebar-label">Overview</div>
      <div class="nav-item active" onclick="navigate('overview')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        <span>Dashboard</span>
      </div>
    </div>`;

  const opsItems = `
    <div class="sidebar-section">
      <div class="sidebar-label">Operasional</div>
      <div class="nav-item" onclick="navigate('new-order')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span>New Order</span>
      </div>
      <div class="nav-item" onclick="navigate('orders')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
        <span>Orders</span>
        <span class="nav-badge" id="sidebar-orders-count">—</span>
      </div>
      <div class="nav-item" onclick="navigate('tracking')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
        </svg>
        <span>Tracking</span>
      </div>
    </div>`;

  const infraItems = `
    <div class="sidebar-section">
      <div class="sidebar-label">Infrastruktur</div>
      <div class="nav-item" onclick="navigate('warehouse')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Warehouse</span>
      </div>
      <div class="nav-item" onclick="navigate('shipping')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
        <span>Shipping</span>
      </div>
      <div class="nav-item" onclick="navigate('integration')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <span>Integration</span>
      </div>
    </div>`;

  const roleLabel = role === "operasional"
    ? `<span class="role-badge role-ops">Operasional</span>`
    : `<span class="role-badge role-infra">Infrastruktur</span>`;

  return `
    ${overviewItem}
    ${role === "operasional" ? opsItems : ""}
    ${role === "infrastruktur" ? infraItems : ""}
    <div class="sidebar-footer">
      <div class="sidebar-footer-label">Akses ${roleLabel}</div>
    </div>
  `;
}

function mountDashboard() {
  const appEl = document.getElementById("app-root");
  const authEl = document.getElementById("auth-root");
  if (authEl) authEl.style.display = "none";
  if (appEl) appEl.style.display = "block";

  appEl.innerHTML = buildDashboardHTML();

  window.navigate = navigate;
  window.switchTab = switchTab;
  window.loadAll = loadAll;
  window.loadOrders = loadOrders;
  window.loadAllTracking = loadAllTracking;
  window.loadWarehouse = loadWarehouse;
  window.loadShipping = loadShipping;
  window.createOrder = createOrder;
  window.updateDestinationOptions = updateDestinationOptions;
  window.searchTracking = searchTracking;
  window.addItem = addItem;
  window.removeItem = removeItem;
  window.trackFromOrder = trackFromOrder;
  window.updateShipmentStatus = updateShipmentStatus;
  window.toggleNotifPanel = toggleNotifPanel;
  window.clearNotifications = clearNotifications;
  window.handleLogout = handleLogout;
  window.renderAuthScreen = renderAuthScreen;
  window.showShipmentDetail = showShipmentDetail;
  window.closeShipmentDetail = closeShipmentDetail;

  const clockId = initClock();
  checkHealth();
  loadAll();
  const healthInterval = setInterval(checkHealth, 10000);

  const trackInput = document.getElementById("inp-track-id");
  const listener = (e) => {
    if (e.key === "Enter") searchTracking();
  };
  trackInput?.addEventListener("keydown", listener);

  appEl._cleanup = () => {
    clearInterval(clockId);
    clearInterval(healthInterval);
    trackInput?.removeEventListener("keydown", listener);
    closeShipmentDetail();
  };
}

function buildDashboardHTML() {
  const user = currentUser;
  return `
<header class="header">
  <div class="header-brand">
    <div class="brand-mark">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    </div>
    <div class="brand-text-group">
      <div class="brand-name">EDLIE</div>
      <div class="brand-tagline">Logistics Platform</div>
    </div>
  </div>

  <div class="header-content">
    <div class="header-search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input type="text" placeholder="Search orders, shipments, tracking…" />
      <span style="font-size:11px; color:var(--slate-300); font-family:var(--font-mono);">⌘K</span>
    </div>

    <div class="header-actions">
      <div id="header-status" class="system-status">
        <div class="status-pulse" id="header-dot"></div>
        <span id="header-status-text" style="font-size:12px; color:var(--slate-500);">Checking…</span>
      </div>

      <div class="header-divider"></div>

      <div style="font-size:12px; font-family:var(--font-mono); color:var(--slate-400); padding:0 4px;" id="header-clock">--:--:--</div>

      <div class="header-divider"></div>

      <div class="notif-wrapper" id="notif-wrapper">
        <button class="header-btn" id="notif-btn" title="Notifications" onclick="toggleNotifPanel()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <div class="notif-badge" id="notif-badge" style="display:none"></div>
        </button>
        <div class="notif-panel" id="notif-panel" style="display:none">
          <div class="notif-panel-header">
            <span class="notif-panel-title">Notifications</span>
            <button class="notif-clear" onclick="clearNotifications()">Clear all</button>
          </div>
          <div class="notif-panel-body" id="notif-list">
            <div class="notif-empty">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <div>No notifications yet</div>
            </div>
          </div>
        </div>
      </div>

      <div class="header-divider"></div>

      <div class="header-user">
        <div class="user-avatar">${user.initials}</div>
        <div class="user-info">
          <div class="user-name">${user.name}</div>
          <div class="user-role">${user.role === "operasional" ? "Operasional" : "Infrastruktur"}</div>
        </div>
        <button class="logout-btn" onclick="handleLogout()" title="Keluar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</header>

<div class="app-layout">
  <aside class="sidebar">
    ${buildSidebarNav()}
  </aside>

  <main>
    <div id="page-overview" class="page active">
      <div class="page-header">
        <div>
          <div class="page-title">Operations Dashboard</div>
          <div class="page-subtitle">Real-time logistics overview · Event-Driven Integration</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-default btn-sm" onclick="loadAll()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>
      </div>
      <div class="kpi-grid">
        <div class="kpi-card" style="--kpi-color:var(--brand-500);--kpi-bg:var(--brand-50)">
          <div class="kpi-header">
            <div class="kpi-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div class="kpi-trend trend-up">↑ Live</div>
          </div>
          <div class="kpi-value" id="kpi-orders">—</div>
          <div class="kpi-label">Total Orders</div>
          <div class="kpi-sub" id="kpi-orders-sub">Loading…</div>
        </div>
        <div class="kpi-card" style="--kpi-color:var(--success-500);--kpi-bg:var(--success-50)">
          <div class="kpi-header">
            <div class="kpi-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="kpi-trend trend-up">Revenue</div>
          </div>
          <div class="kpi-value" id="kpi-revenue">—</div>
          <div class="kpi-label">Total Revenue</div>
          <div class="kpi-sub">All order values</div>
        </div>
        <div class="kpi-card" style="--kpi-color:var(--warning-500);--kpi-bg:var(--warning-50)">
          <div class="kpi-header">
            <div class="kpi-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <div class="kpi-trend trend-up">SLS</div>
          </div>
          <div class="kpi-value" id="kpi-shipments">—</div>
          <div class="kpi-label">Shipments</div>
          <div class="kpi-sub" id="kpi-shipments-sub">Loading…</div>
        </div>
        <div class="kpi-card" style="--kpi-color:var(--info-500);--kpi-bg:var(--info-50)">
          <div class="kpi-header">
            <div class="kpi-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
            </div>
            <div class="kpi-trend trend-neutral">CTN</div>
          </div>
          <div class="kpi-value" id="kpi-tracked">—</div>
          <div class="kpi-label">Tracked Orders</div>
          <div class="kpi-sub">Active in CTN</div>
        </div>
      </div>
      <div class="grid-full">
        <div class="card mb-4">
          <div class="card-header">
            <div>
              <div class="card-title">Service Health</div>
              <div class="card-subtitle">Microservices status</div>
            </div>
            <div class="badge" id="badge-health">Checking</div>
          </div>
          <div class="card-body">
            <div class="service-grid">
              <div class="service-card checking" id="svc-oms">
                <div class="service-top">
                  <div class="service-name">OMS</div>
                  <div class="service-dot" id="dot-oms"></div>
                </div>
                <div class="service-tech">Node.js · PostgreSQL</div>
                <div class="service-port">Port 8001 · REST/JSON</div>
              </div>
              <div class="service-card checking" id="svc-wms">
                <div class="service-top">
                  <div class="service-name">WMS</div>
                  <div class="service-dot" id="dot-wms"></div>
                </div>
                <div class="service-tech">Python · MySQL</div>
                <div class="service-port">Port 8002 · XML API</div>
              </div>
              <div class="service-card checking" id="svc-sls">
                <div class="service-top">
                  <div class="service-name">SLS</div>
                  <div class="service-dot" id="dot-sls"></div>
                </div>
                <div class="service-tech">Node.js · MongoDB</div>
                <div class="service-port">Port 8003 · REST/JSON</div>
              </div>
              <div class="service-card checking" id="svc-ctn">
                <div class="service-top">
                  <div class="service-name">CTN</div>
                  <div class="service-dot" id="dot-ctn"></div>
                </div>
                <div class="service-tech">Python · Redis</div>
                <div class="service-port">Port 8004 · REST/JSON</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card grid-full">
        <div class="card-header">
          <div>
            <div class="card-title">Recent Orders</div>
            <div class="card-subtitle" id="recent-count">—</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="navigate('orders')">View all →</button>
        </div>
        <div class="card-body-flush table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody id="tbl-recent">
              <tr><td colspan="5"><div class="loading-text"><div class="spinner"></div>Loading orders…</div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="page-new-order" class="page">
      <div class="page-header">
        <div>
          <div class="page-title">New Order</div>
        </div>
      </div>
      <div style="max-width:720px">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Order Details</div>
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-row">
                <div class="form-group">
                  <label>Customer Name</label>
                  <input type="text" id="inp-name" placeholder="e.g. Budi Santoso"/>
                </div>
                <div class="form-group">
                  <label>Email Address</label>
                  <input type="email" id="inp-email" placeholder="e.g. budi@email.com"/>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Tempat Pengambilan (Gudang)</label>
                  <select id="inp-pickup-location" onchange="updateDestinationOptions()" style="width:100%">
                    <option value="">-- Pilih Gudang --</option>
                    <option value="WH-JAKARTA-01">WH-JAKARTA-01 · Gudang Jakarta Pusat</option>
                    <option value="WH-BANDUNG-01">WH-BANDUNG-01 · Gudang Bandung</option>
                    <option value="WH-SURABAYA-01">WH-SURABAYA-01 · Gudang Surabaya</option>
                    <option value="WH-YOGYAKARTA-01">WH-YOGYAKARTA-01 · Gudang Yogyakarta</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Alamat Tujuan</label>
                  <select id="inp-destination" style="width:100%">
                    <option value="">-- Pilih gudang dulu --</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Items</label>
                <div class="item-list" id="item-list">
                  <div class="item-row">
                    <select class="inp-sku" onchange="updateTotalPrice()">
                      <option value="SKU-NEON-01" data-price="175000">Widget Neon Alpha (SKU-NEON-01)</option>
                      <option value="SKU-NEON-02" data-price="145000">Widget Neon Beta (SKU-NEON-02)</option>
                      <option value="SKU-BOLT-01" data-price="85000">Konektor Bolt X (SKU-BOLT-01)</option>
                    </select>
                    <input type="number" class="inp-qty" placeholder="Qty" value="1" min="1" oninput="updateTotalPrice()" onchange="updateTotalPrice()"/>
                    <button class="btn-remove" onclick="removeItem(this)" title="Remove">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>
                <button class="btn-add-item" onclick="addItem()" style="margin-top:8px">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add item
                </button>
              </div>
              <div class="form-group">
                <label>Total Price (Rp)</label>
                <input type="number" id="inp-price" placeholder="Auto-calculated" min="0" readonly />
              </div>
              <button class="btn btn-primary" id="btn-create-order" onclick="createOrder()" style="width:100%;justify-content:center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 2 11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Submit Order & Publish Event
              </button>
              <div id="order-alert" class="alert"></div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div id="page-orders" class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Orders</div>
          <div class="page-subtitle">All orders managed by OMS</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-default btn-sm" onclick="loadOrders()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>
      </div>
      <div class="card">
        <div class="card-body-flush table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Amount</th>
                <th>Items</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="tbl-orders">
              <tr><td colspan="8"><div class="loading-text"><div class="spinner"></div>Loading…</div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="page-tracking" class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Order Tracking</div>
          <div class="page-subtitle">Track orders through the integration pipeline</div>
        </div>
      </div>
      <div class="search-row">
        <input type="text" id="inp-track-id" placeholder="Enter Order ID (e.g. PSN-20260606-XXXXX)" style="flex:1" />
        <button class="btn btn-primary" onclick="searchTracking()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          Track
        </button>
      </div>
      <div id="track-alert" class="alert"></div>
      <div id="track-result" style="display:none">
        <div class="grid-2" style="margin-top:20px">
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title" id="track-order-id">—</div>
                <div class="card-subtitle">Order details</div>
              </div>
              <div id="track-status-badge"></div>
            </div>
            <div class="card-body detail-kv" id="track-details"></div>
          </div>
          <div class="card">
            <div class="card-header">
              <div class="card-title">Event Timeline</div>
              <div class="badge badge-slate" id="track-event-count">0 events</div>
            </div>
            <div class="card-body">
              <div class="timeline" id="track-timeline"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:20px">
        <div class="card-header">
          <div class="card-title">All Tracked Orders</div>
          <button class="btn btn-ghost btn-sm" onclick="loadAllTracking()">Refresh</button>
        </div>
        <div class="card-body-flush table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Last Source</th>
                <th>Updated</th>
                <th>Tracking No.</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="tbl-tracking">
              <tr><td colspan="6"><div class="loading-text"><div class="spinner"></div>Loading…</div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="page-warehouse" class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Warehouse</div>
          <div class="page-subtitle">WMS inventory and fulfillment requests</div>
        </div>
        <button class="btn btn-default btn-sm" onclick="loadWarehouse()">Refresh</button>
      </div>
      <div class="tab-bar">
        <div class="tab active" onclick="switchTab(this, 'wh-inventory')">Inventory</div>
        <div class="tab" onclick="switchTab(this, 'wh-requests')">Requests</div>
      </div>
      <div id="wh-inventory">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Stock Levels</div>
            <div class="badge badge-slate">WMS · MySQL</div>
          </div>
          <div class="card-body-flush table-wrapper" id="inv-body">
            <div class="loading-text"><div class="spinner"></div>Loading inventory…</div>
          </div>
        </div>
      </div>
      <div id="wh-requests" style="display:none">
        <div class="card">
          <div class="card-header"><div class="card-title">Warehouse Requests</div></div>
          <div class="card-body-flush table-wrapper">
            <table>
              <thead>
                <tr><th>Request ID</th><th>Order Ref</th><th>Action</th><th>Status</th><th>Created</th></tr>
              </thead>
              <tbody id="tbl-requests">
                <tr><td colspan="5"><div class="loading-text"><div class="spinner"></div></div></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div id="page-shipping" class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Shipping</div>
          <div class="page-subtitle">Kontrol status pengiriman manual</div>
        </div>
        <button class="btn btn-default btn-sm" onclick="loadShipping()">Refresh</button>
      </div>
      <div id="shipping-alert" class="alert" style="margin-bottom:12px"></div>
      <div class="card">
        <div class="card-body-flush table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Shipment ID</th>
                <th>Order Ref</th>
                <th>Tracking No.</th>
                <th>Origin</th>
                <th>Tujuan</th>
                <th>Status (Dropdown)</th>
                <th>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="tbl-shipping">
              <tr><td colspan="8"><div class="loading-text"><div class="spinner"></div>Loading…</div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="page-integration" class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Integration Architecture</div>
          <div class="page-subtitle">Enterprise Integration Patterns (EIP) · Event-Driven Architecture</div>
        </div>
      </div>
      <div class="card grid-full">
        <div class="card-header">
          <div class="card-title">Event Pipeline</div>
          <div class="badge badge-blue">EDA · RabbitMQ</div>
        </div>
        <div class="flow-container" id="flow-diagram">
          <div class="flow-node">
            <div class="flow-box active" id="fn-client">
              <div class="flow-box-icon">👤</div>
              <div class="flow-box-name">CLIENT</div>
              <div class="flow-box-tech">HTTP</div>
            </div>
          </div>
          <div class="flow-connector">
            <div class="flow-line active" id="fl-1"></div>
            <div class="flow-label">POST /orders</div>
          </div>
          <div class="flow-node">
            <div class="flow-box" id="fn-oms">
              <div class="flow-box-icon">📋</div>
              <div class="flow-box-name">OMS</div>
              <div class="flow-box-tech">Node.js</div>
              <div class="flow-box-badge">PostgreSQL</div>
            </div>
          </div>
          <div class="flow-connector">
            <div class="flow-line" id="fl-2"></div>
            <div class="flow-label">order.created</div>
          </div>
          <div class="flow-node">
            <div class="flow-box" id="fn-mq">
              <div class="flow-box-icon">🐇</div>
              <div class="flow-box-name">RABBITMQ</div>
              <div class="flow-box-tech">Broker</div>
              <div class="flow-box-badge">Topic Exch.</div>
            </div>
          </div>
          <div class="flow-connector">
            <div class="flow-line" id="fl-3"></div>
            <div class="flow-label">XML POST</div>
          </div>
          <div class="flow-node">
            <div class="flow-box" id="fn-wms">
              <div class="flow-box-icon">🏭</div>
              <div class="flow-box-name">WMS</div>
              <div class="flow-box-tech">Python</div>
              <div class="flow-box-badge">MySQL · XML</div>
            </div>
          </div>
          <div class="flow-connector">
            <div class="flow-line" id="fl-4"></div>
            <div class="flow-label">packed</div>
          </div>
          <div class="flow-node">
            <div class="flow-box" id="fn-sls">
              <div class="flow-box-icon">🚚</div>
              <div class="flow-box-name">SLS</div>
              <div class="flow-box-tech">Node.js</div>
              <div class="flow-box-badge">MongoDB</div>
            </div>
          </div>
          <div class="flow-connector">
            <div class="flow-line" id="fl-5"></div>
            <div class="flow-label">manifested</div>
          </div>
          <div class="flow-node">
            <div class="flow-box" id="fn-ctn">
              <div class="flow-box-icon">📡</div>
              <div class="flow-box-name">CTN</div>
              <div class="flow-box-tech">Python</div>
              <div class="flow-box-badge">Redis</div>
            </div>
          </div>
        </div>
      </div>
      <div class="grid-3">
        <div class="pattern-card">
          <div class="pattern-label">Pattern 1</div>
          <div class="pattern-title">Publish-Subscribe</div>
          <div class="pattern-desc">RabbitMQ exchange <code>logistics.events</code> distributes events to independent consumers. OMS publishes once; WMS, SLS, and CTN each consume autonomously.</div>
        </div>
        <div class="pattern-card">
          <div class="pattern-label">Pattern 2</div>
          <div class="pattern-title">Message Translator</div>
          <div class="pattern-desc">Transformer converts <code>JSON → XML</code> before forwarding to WMS. WMS uses legacy XML (SOAP-style); all other services use JSON.</div>
        </div>
        <div class="pattern-card">
          <div class="pattern-label">Pattern 3</div>
          <div class="pattern-title">Canonical Data Model</div>
          <div class="pattern-desc">CTN normalizes all events from heterogeneous formats into a unified schema in Redis. Customers receive one consistent timeline representation.</div>
        </div>
        <div class="pattern-card">
          <div class="pattern-label">Pattern 4</div>
          <div class="pattern-title">Dead Letter Channel</div>
          <div class="pattern-desc">Messages failing after 3 retries are routed to <code>q.dlq.failed</code> via <code>logistics.dlx</code>. Monitorable via RabbitMQ Management UI.</div>
        </div>
        <div class="pattern-card">
          <div class="pattern-label">Pattern 5</div>
          <div class="pattern-title">Idempotent Receiver</div>
          <div class="pattern-desc">Each message carries a UUID <code>message_id</code>. Receiving services check for duplicates before processing, preventing double-processing.</div>
        </div>
        <div class="pattern-card">
          <div class="pattern-label">Pattern 6</div>
          <div class="pattern-title">API Gateway</div>
          <div class="pattern-desc">nginx on port 8080 as single entry point. Handles routing, rate limiting (30 req/min), and CORS for all microservices.</div>
        </div>
      </div>
    </div>
  </main>
</div>
`;
}

export default function App() {
  useEffect(() => {
    window.handleLogin = handleLogin;
    window.handleRegister = handleRegister;
    window.handleLogout = handleLogout;
    window.renderAuthScreen = renderAuthScreen;
    window.updateTotalPrice = updateTotalPrice;

    if (currentUser) {
      mountDashboard();
    } else {
      renderAuthScreen("login");
    }
  }, []);

  return (
    <div>
      <div id="auth-root" className="auth-overlay"></div>
      <div id="app-root" style={{ display: "none" }}></div>
    </div>
  );
}
