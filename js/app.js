// ═══════════════════════════════════════════════════════════
// CONFIGURATION — replace with your deployed Apps Script URL
// ═══════════════════════════════════════════════════════════
const API_URL = 'https://script.google.com/macros/s/AKfycbzgMr9ZDA4Ey2edmO-EdJuhaCsLZjkQGxStnknLMsfayduucx5H8g8agbqHOghuIFQ0mQ/exec';

// ── FY CONFIGURATION ──────────────────────────────────────
// Supported FY years — add future years here as needed
const FY_OPTIONS = [2025, 2026, 2027, 2028, 2029];
const FY_MONTHS  = ['April','May','June','July','August','September','October','November','December','January','February','March'];
const FY_SHORT   = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];

// Active FY — reads from localStorage so it persists across pages
function getActiveFY() {
  const stored = parseInt(localStorage.getItem('cc_active_fy'));
  return FY_OPTIONS.includes(stored) ? stored : 2025;
}
function setActiveFY(yr) {
  localStorage.setItem('cc_active_fy', yr);
  location.reload();
}
const FY = getActiveFY();

// FY helpers
function fyIdx(dateStr) {
  if(!dateStr) return fyIdxNow();
  // Handle ISO strings like "2026-04-28T18:30:00.000Z" — just use date part
  const d = new Date(typeof dateStr === 'string' && dateStr.includes('T')
    ? dateStr.split('T')[0] : dateStr);
  const m = d.getMonth();
  return m >= 3 ? m - 3 : m + 9;
}
function fyIdxNow()  { return fyIdx(new Date().toISOString()); }
function fyLabel(idx) {
  const calM = idx < 9 ? idx + 3 : idx - 9;
  const yr   = calM >= 3 ? FY : FY + 1;
  return `${FY_MONTHS[idx]} ${yr}`;
}

// ── DATE FORMAT HELPER ────────────────────────────────────
// Converts any date value to YYYY-MM-DD string, strips time
function fmtDate(val) {
  if(!val) return '';
  const s = String(val);
  // Already clean
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // ISO with time: "2026-04-28T18:30:00.000Z"
  if(s.includes('T')) return s.split('T')[0];
  // Google Sheets serial number (number)
  if(/^\d+$/.test(s)) {
    const d = new Date((parseInt(s) - 25569) * 86400000);
    return d.toISOString().split('T')[0];
  }
  // Try parsing
  try {
    const d = new Date(s);
    if(!isNaN(d)) return d.toISOString().split('T')[0];
  } catch(e) {}
  return s;
}

// Format LKR amount
function fmt(n)  { return 'LKR ' + Number(n||0).toLocaleString('en-LK',{maximumFractionDigits:0}); }
function fmtK(n) { if(n>=1e6)return(n/1e6).toFixed(1)+'M'; if(n>=1000)return(n/1000).toFixed(0)+'K'; return String(Math.round(n||0)); }

// Growth percentage helper
function growthPct(old, nw) {
  if(!old || old === 0) return nw > 0 ? 100 : 0;
  return ((nw - old) / Math.abs(old) * 100).toFixed(1);
}

// ── SESSION & AUTH ────────────────────────────────────────
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSession() {
  try { return JSON.parse(localStorage.getItem('cc_session')); } catch(e){ return null; }
}
function saveSession(s) {
  s.created_at = Date.now();
  localStorage.setItem('cc_session', JSON.stringify(s));
}
function clearSession() {
  localStorage.removeItem('cc_session');
}

function requireAuth() {
  const s = getSession();
  if (!s || !s.token) { window.location.href = '../index.html'; return null; }
  // 24-hour expiry — only enforce if created_at exists
  if (s.created_at) {
    const elapsed = Date.now() - s.created_at;
    if (elapsed > SESSION_DURATION_MS) {
      clearSession();
      window.location.href = '../index.html?expired=1';
      return null;
    }
    // Watchdog: auto-logout when timer fires
    setTimeout(() => {
      clearSession();
      alert('Your session has expired. Please log in again.');
      window.location.href = '../index.html?expired=1';
    }, SESSION_DURATION_MS - elapsed);
  } else {
    // Stamp missing created_at so 24hr starts now
    s.created_at = Date.now();
    localStorage.setItem('cc_session', JSON.stringify(s));
  }
  return s;
}

function isAdmin()  { const s=getSession(); return s && s.role === 'admin'; }
function isEditor() { const s=getSession(); return s && (s.role==='admin'||s.role==='editor'); }

async function logout() {
  const s = getSession();
  if (s?.token) {
    try { await api('POST', { action:'logout', token:s.token }); } catch(e) {}
  }
  clearSession();
  window.location.href = '../index.html';
}

// ── API LAYER ─────────────────────────────────────────────
async function api(method, payload) {
  if (method === 'GET') {
    const params = new URLSearchParams(payload).toString();
    const res = await fetch(`${API_URL}?${params}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'API error');
    return data;
  } else {
    const res = await fetch(API_URL, { method:'POST', body:JSON.stringify(payload) });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'API error');
    return data;
  }
}

const DB = {
  getToken() { return getSession()?.token || ''; },
  async getAll() { return api('GET', { action:'getAll', token:this.getToken(), fy:FY }); },
  async add(sheet, data)        { return api('POST', { action:'addRow',    token:this.getToken(), sheet, data }); },
  async update(sheet, id, data) { return api('POST', { action:'updateRow', token:this.getToken(), sheet, id, data }); },
  async remove(sheet, id)       { return api('POST', { action:'deleteRow', token:this.getToken(), sheet, id }); },
  async upsertBudget(line_item_id, month, amount) {
    return api('POST', { action:'upsertBudget', token:this.getToken(), line_item_id, month, fy:FY, amount });
  },
};

// ── UI HELPERS ────────────────────────────────────────────
function showLoader(msg='Loading...') {
  document.getElementById('loader').style.display = 'flex';
  document.getElementById('loader-msg').textContent = msg;
}
function hideLoader() { document.getElementById('loader').style.display = 'none'; }

function toast(msg, type='s') {
  const el = document.createElement('div');
  el.className = `toast t${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=>el.classList.add('show'), 10);
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),280); }, 3400);
}

// Modal helpers
function openM(id)  { document.getElementById(id).classList.add('open'); }
function closeM(id) { document.getElementById(id).classList.remove('open'); }

// Close modals on overlay click
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target===o) o.classList.remove('open'); })
  );
  // Mobile sidebar toggle
  initMobileSidebar();
  // Render FY selector in sidebar
  renderFYSelector();
});

// Status pill and progress bar
function statusPill(p) {
  if(p>=100) return '<span class="pill pgr">Over Budget</span>';
  if(p>=80)  return '<span class="pill pa">Warning</span>';
  if(p>=40)  return '<span class="pill pb">On Track</span>';
  return '<span class="pill pg">Good</span>';
}
function progBar(p) {
  const c = p>=100?'over':p>=80?'warn':'';
  return `<div class="prog"><div class="prog-f ${c}" style="width:${Math.min(p,100)}%"></div></div><span style="font-size:9.5px;color:var(--text-2)">${Number(p).toFixed(1)}%</span>`;
}

// Render sidebar user info + quick-links
function renderSidebar(user, sidebarFields=[]) {
  const un = document.getElementById('sb-uname');
  const ur = document.getElementById('sb-role');
  if(un) un.textContent = user?.username || '—';
  if(ur) ur.textContent = user?.role || '—';

  const sl = document.getElementById('sb-settings-link');
  if(sl && user?.role !== 'admin') sl.style.display = 'none';

  const container = document.getElementById('sb-extra');
  if(!container || !sidebarFields.length) return;
  container.innerHTML = sidebarFields.map(f => {
    if(f.type === 'link') return `<div class="sb-extra-item">🔗 <a href="${f.value}" target="_blank">${f.label}</a></div>`;
    return `<div class="sb-extra-item">📌 <span>${f.label}: ${f.value}</span></div>`;
  }).join('');
}

// FY selector in sidebar
function renderFYSelector() {
  const chip = document.querySelector('.sb-fy');
  if(!chip) return;
  const fyStart = FY, fyEnd = FY + 1;
  chip.innerHTML = `<select onchange="setActiveFY(parseInt(this.value))" title="Change financial year">
    ${FY_OPTIONS.map(y=>`<option value="${y}" ${y===FY?'selected':''}>FY ${y}–${String(y+1).slice(-2)}</option>`).join('')}
  </select>`;
}

// Mobile sidebar
function initMobileSidebar() {
  // Inject hamburger button
  const toggle = document.createElement('button');
  toggle.className = 'sb-toggle';
  toggle.setAttribute('aria-label','Open menu');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  document.body.appendChild(toggle);

  // Inject overlay
  const overlay = document.createElement('div');
  overlay.className = 'sb-overlay';
  document.body.appendChild(overlay);

  const sidebar = document.querySelector('.sidebar');
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}
