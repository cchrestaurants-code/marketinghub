function getSidebarHTML(activePage) {
  const mktg = [
    { id:'dashboard',   href:'dashboard.html',   label:'Dashboard',         icon:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>' },
    { id:'budget',      href:'budget.html',      label:'Budget Tracker',    icon:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
    { id:'social',      href:'social.html',      label:'Social Media Ads',  icon:'<path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>' },
    { id:'content',     href:'content.html',     label:'Content Log',       icon:'<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>' },
    { id:'influencers', href:'influencers.html', label:'Influencers',        icon:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
    { id:'email',       href:'email.html',       label:'Email Campaigns',   icon:'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>' },
    { id:'events',      href:'events.html',      label:'Events & Promos',   icon:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
    { id:'suppliers',   href:'suppliers.html',   label:'Suppliers & Print', icon:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h0a4 4 0 0 1 4 4H4a4 4 0 0 1 4-4h0"/>' },
  ];
  const fnc = [
    { id:'functions',   href:'functions.html',   label:'Functions & Events',icon:'<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>' },
    { id:'vouchers',    href:'vouchers.html',     label:'Voucher Tracker',   icon:'<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>' },
    { id:'compare',     href:'compare.html',      label:'Year Comparison',   icon:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
  ];
  const cfg = [
    { id:'settings',    href:'settings.html',    label:'Settings',          icon:'<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/>' },
    { id:'export',      href:'export.html',      label:'Export Data',       icon:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' },
  ];

  const mkItem = p => `<a class="sb-item ${activePage===p.id?'active':''}" href="${p.href}">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">${p.icon}</svg>${p.label}</a>`;

  return `
    <div class="sb-brand">
      <div class="sb-logo">
        <div class="sb-logo-mark">CC</div>
        <div>
          <div class="sb-hotel">Colombo Court<br>Hotel &amp; Spa</div>
          <div class="sb-dept">Marketing Hub</div>
        </div>
      </div>
      <div class="sb-fy" id="sb-fy-wrap"><span style="font-size:9.5px;color:var(--red-light)">FY Loading…</span></div>
    </div>
    <nav class="sb-nav">
      <div class="sb-sec">Marketing</div>
      ${mktg.map(mkItem).join('')}
      <div class="sb-sec">Functions, Events &amp; Vouchers</div>
      ${fnc.map(mkItem).join('')}
      <div class="sb-sec">Quick Links</div>
      <div id="sb-extra" class="sb-extra"></div>
      <div class="sb-sec">Config</div>
      ${cfg.map(mkItem).join('')}
    </nav>
    <div class="sb-foot">
      <div class="sb-foot-user">
        <div>
          <div class="sb-uname" id="sb-uname">—</div>
          <div class="sb-role" id="sb-role">—</div>
        </div>
        <button class="btn-logout" onclick="logout()">Sign out</button>
      </div>
      <div class="sb-credit">Created by <span>Shazwan Yoonus</span></div>
    </div>`;
}
