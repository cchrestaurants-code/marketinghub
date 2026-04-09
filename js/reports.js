// ═══════════════════════════════════════════════════════════
// CC MARKETING HUB — REPORTS UTILITY
// In-browser PDF (print) + Excel (SheetJS) generation
// No server needed — all runs in the browser
// ═══════════════════════════════════════════════════════════

// ── BRAND COLOURS ─────────────────────────────────────────
const RPT = {
  red:     '#C8102E',
  redLight:'#e8304a',
  redBg:   'rgba(200,16,46,0.08)',
  dark:    '#080810',
  dark2:   '#14141f',
  dark3:   '#1a1a28',
  text:    '#f0ede8',
  text2:   '#8a8682',
  green:   '#3db870',
  blue:    '#4a88d8',
  amber:   '#d4800a',
  white:   '#ffffff',
  border:  'rgba(255,255,255,0.1)',
};

// ── FORMAT HELPERS ─────────────────────────────────────────
function rFmt(n)   { return 'LKR ' + Number(n||0).toLocaleString('en-LK',{maximumFractionDigits:0}); }
function rFmtK(n)  { if(n>=1e6) return (n/1e6).toFixed(1)+'M'; if(n>=1000) return (n/1000).toFixed(0)+'K'; return String(Math.round(n||0)); }
function rPct(n)   { return Number(n||0).toFixed(1)+'%'; }
function rDate()   { return new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }

// ── PRINT-TO-PDF ENGINE ────────────────────────────────────
// Opens a clean print window with the report HTML, triggers browser print dialog
// User saves as PDF — no footers/headers because we use @page CSS
function printReport(html, title) {
  const win = window.open('','_blank','width=900,height=700');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"><\/script>
<style>
  @page { margin: 0; size: A4; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#1a1a1a; font-size:11px; }
  .rpt-page { width:210mm; min-height:297mm; padding:14mm 14mm 12mm; background:#fff; page-break-after:always; }
  .rpt-page:last-child { page-break-after:avoid; }

  /* Header */
  .rpt-hdr { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid ${RPT.red}; padding-bottom:10px; margin-bottom:14px; }
  .rpt-logo { display:flex; align-items:center; gap:10px; }
  .rpt-logo-mark { width:38px; height:38px; background:${RPT.red}; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:14px; flex-shrink:0; }
  .rpt-hotel { font-size:11px; font-weight:700; color:#1a1a1a; line-height:1.3; }
  .rpt-dept  { font-size:7.5px; color:${RPT.red}; letter-spacing:2px; text-transform:uppercase; margin-top:2px; }
  .rpt-title-block { text-align:right; }
  .rpt-title { font-size:16px; font-weight:700; color:#1a1a1a; }
  .rpt-period { font-size:10px; color:#666; margin-top:2px; }
  .rpt-generated { font-size:8.5px; color:#999; margin-top:3px; }

  /* KPI row */
  .kpi-row { display:grid; gap:8px; margin-bottom:14px; }
  .k2 { grid-template-columns:1fr 1fr; }
  .k3 { grid-template-columns:1fr 1fr 1fr; }
  .k4 { grid-template-columns:1fr 1fr 1fr 1fr; }
  .kpi { border:1px solid #e0e0e0; border-radius:7px; padding:10px 12px; position:relative; overflow:hidden; }
  .kpi::before { content:''; position:absolute; top:0; left:0; right:0; height:2.5px; }
  .kpi.red::before   { background:${RPT.red}; }
  .kpi.green::before { background:${RPT.green}; }
  .kpi.blue::before  { background:${RPT.blue}; }
  .kpi.amber::before { background:${RPT.amber}; }
  .kpi-lbl  { font-size:8px; font-weight:600; color:#888; text-transform:uppercase; letter-spacing:.8px; }
  .kpi-val  { font-size:18px; font-weight:700; color:#1a1a1a; margin:4px 0 1px; line-height:1; }
  .kpi-sub  { font-size:9px; color:#888; }
  .kpi-badge{ display:inline-block; margin-top:4px; font-size:9px; font-weight:600; padding:1px 7px; border-radius:10px; }
  .bgr  { background:#e8f8f0; color:#2e7d52; }
  .bgrd { background:#fde8ec; color:#c0102e; }
  .bga  { background:#fff4e5; color:#92570a; }
  .bgb  { background:#e8f0fc; color:#1a5db8; }

  /* Charts */
  .ch-row { display:grid; gap:10px; margin-bottom:14px; }
  .ch-2 { grid-template-columns:1fr 1fr; }
  .ch-1 { grid-template-columns:1fr; }
  .ch-card { border:1px solid #e8e8e8; border-radius:7px; padding:10px 12px; }
  .ch-title { font-size:10px; font-weight:700; color:#333; margin-bottom:1px; }
  .ch-sub { font-size:8.5px; color:#999; margin-bottom:8px; }
  canvas { max-height:160px !important; }

  /* Tables */
  .tbl-wrap { border:1px solid #e8e8e8; border-radius:7px; overflow:hidden; margin-bottom:14px; }
  .tbl-head { padding:8px 12px; border-bottom:1px solid #e8e8e8; display:flex; justify-content:space-between; align-items:center; background:#fafafa; }
  .tbl-title { font-size:10px; font-weight:700; color:#333; }
  table { width:100%; border-collapse:collapse; font-size:9.5px; }
  thead th { background:#f5f5f5; padding:6px 9px; text-align:left; font-size:8px; text-transform:uppercase; letter-spacing:.8px; color:#888; font-weight:600; border-bottom:1px solid #e8e8e8; }
  tbody td { padding:6px 9px; border-bottom:1px solid #f0f0f0; vertical-align:middle; }
  tbody tr:last-child td { border:none; }
  tbody tr:nth-child(even) { background:#fafafa; }
  .mono { font-family: monospace; font-size:10px; }
  .pill { display:inline-block; padding:1px 6px; border-radius:9px; font-size:8.5px; font-weight:600; }
  .pill-r { background:#fde8ec; color:#c0102e; }
  .pill-g { background:#e8f8f0; color:#2e7d52; }
  .pill-b { background:#e8f0fc; color:#1a5db8; }
  .pill-a { background:#fff4e5; color:#92570a; }

  /* Section divider */
  .rpt-sec { font-size:11px; font-weight:700; color:#333; margin:14px 0 8px; padding-bottom:4px; border-bottom:1px solid #eee; }
  .rpt-sec span { color:${RPT.red}; }

  /* Footer */
  .rpt-footer { margin-top:12px; padding-top:8px; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:8px; color:#bbb; }

  @media print {
    @page { margin:0; }
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .no-print { display:none !important; }
  }
</style>
</head>
<body>
${html}
<script>
  // Auto-trigger print after charts render
  window.addEventListener('load', () => setTimeout(() => window.print(), 800));
<\/script>
</body>
</html>`);
  win.document.close();
}

// ── EXCEL ENGINE (SheetJS CDN) ─────────────────────────────
async function downloadExcel(sheets, filename) {
  // Load SheetJS if not already loaded
  if(!window.XLSX) {
    await new Promise((res,rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const wb = XLSX.utils.book_new();
  sheets.forEach(({name, data, colWidths}) => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    if(colWidths) ws['!cols'] = colWidths.map(w => ({wch: w}));
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0,31));
  });
  XLSX.writeFile(wb, filename);
}

// ── CHART RENDERER (for print window) ─────────────────────
// Returns <canvas> + <script> tags that render a chart in the print window
function chartScript(id, config) {
  return `<canvas id="${id}" style="max-height:160px"></canvas>
<script>
(function(){
  const ctx = document.getElementById('${id}');
  if(!ctx) return;
  function tryRender(){
    if(typeof Chart === 'undefined'){ setTimeout(tryRender, 100); return; }
    new Chart(ctx, ${JSON.stringify(config)});
  }
  tryRender();
})();
<\/script>`;
}

// ── BUDGET MONTHLY REPORT ─────────────────────────────────
function buildBudgetReport(data, month, fy) {
  const { lineItems=[], spends=[], monthlyBudgets=[], socialSpends=[], engagements=[] } = data;
  const mLabel = FY_MONTHS[month] + ' ' + (month < 9 ? fy+1 : fy);
  const fyLabel2 = `FY ${fy}–${String(fy+1).slice(-2)}`;

  // Get budget for each line item this month
  const items = lineItems.map(li => {
    const budget = (monthlyBudgets.find(b => b.line_item_id==li.id && b.month==month && b.fy==fy)||{}).amount || 0;
    let actual = 0;
    if(li.linked_module === 'social')      actual = socialSpends.filter(s=>s.fy_month==month).reduce((a,s)=>a+Number(s.amount||0),0);
    else if(li.linked_module === 'influencer') actual = engagements.filter(e=>e.fy_month==month).reduce((a,e)=>a+Number(e.fee||0),0);
    else actual = spends.filter(s=>s.line_item_id==li.id&&s.fy_month==month).reduce((a,s)=>a+Number(s.amount||0),0);
    const pct = budget > 0 ? (actual/budget*100) : 0;
    return { name: li.name, category: li.category, budget, actual, pct, variance: budget - actual };
  }).filter(i => i.budget > 0 || i.actual > 0);

  const totBudget = items.reduce((a,i)=>a+i.budget,0);
  const totActual = items.reduce((a,i)=>a+i.actual,0);
  const totVariance = totBudget - totActual;
  const overBudget = items.filter(i=>i.pct>100).length;

  const barConfig = {
    type:'bar',
    data:{
      labels: items.map(i=>i.name.length>16?i.name.slice(0,15)+'…':i.name),
      datasets:[
        {label:'Budget',data:items.map(i=>i.budget),backgroundColor:'rgba(200,16,46,0.15)',borderColor:'#C8102E',borderWidth:1.5,borderRadius:3},
        {label:'Actual',data:items.map(i=>i.actual),backgroundColor:'rgba(200,16,46,0.55)',borderColor:'#C8102E',borderWidth:1.5,borderRadius:3},
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:9}}}},scales:{y:{ticks:{callback:v=>'LKR '+rFmtK(v),font:{size:8}},grid:{color:'#f0f0f0'}},x:{ticks:{font:{size:8}},grid:{display:false}}}}
  };
  const pieConfig = {
    type:'doughnut',
    data:{
      labels:items.map(i=>i.name.length>16?i.name.slice(0,15)+'…':i.name),
      datasets:[{data:items.map(i=>i.actual),backgroundColor:['#C8102E','#3db870','#4a88d8','#d4800a','#9b7ac8','#4db8a0','#e04444','#f4a433'],borderWidth:2,borderColor:'#fff'}]
    },
    options:{responsive:true,maintainAspectRatio:false,cutout:'50%',plugins:{legend:{position:'right',labels:{font:{size:8},boxWidth:10}}}}
  };

  const tblRows = items.map(i=>{
    const pctBar = `<div style="display:flex;align-items:center;gap:5px"><div style="width:60px;height:5px;background:#eee;border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.min(i.pct,100)}%;background:${i.pct>100?'#e04444':i.pct>80?'#d4800a':'#C8102E'};border-radius:3px"></div></div><span style="font-size:8px;color:#666">${i.pct.toFixed(0)}%</span></div>`;
    return `<tr>
      <td><strong>${i.name}</strong></td>
      <td><span class="pill pill-b">${i.category}</span></td>
      <td class="mono">${rFmt(i.budget)}</td>
      <td class="mono">${rFmt(i.actual)}</td>
      <td>${pctBar}</td>
      <td class="mono" style="color:${i.variance>=0?'#2e7d52':'#c0102e'};font-weight:600">${i.variance>=0?'+':''}${rFmt(i.variance)}</td>
    </tr>`;
  }).join('');

  const html = `<div class="rpt-page">
    <div class="rpt-hdr">
      <div class="rpt-logo">
        <div class="rpt-logo-mark">CC</div>
        <div><div class="rpt-hotel">Colombo Court Hotel &amp; Spa</div><div class="rpt-dept">Marketing Hub</div></div>
      </div>
      <div class="rpt-title-block">
        <div class="rpt-title">Monthly Budget Report</div>
        <div class="rpt-period">${mLabel} · ${fyLabel2}</div>
        <div class="rpt-generated">Generated ${rDate()}</div>
      </div>
    </div>

    <div class="kpi-row k4">
      <div class="kpi red"><div class="kpi-lbl">Total Budget</div><div class="kpi-val">${rFmtK(totBudget)}</div><div class="kpi-sub">LKR ${Number(totBudget).toLocaleString()}</div></div>
      <div class="kpi ${totActual>totBudget?'red':'green'}"><div class="kpi-lbl">Total Spend</div><div class="kpi-val">${rFmtK(totActual)}</div><span class="kpi-badge ${totActual>totBudget?'bgrd':'bgr'}">${(totActual/Math.max(totBudget,1)*100).toFixed(0)}% used</span></div>
      <div class="kpi ${totVariance<0?'red':'green'}"><div class="kpi-lbl">Variance</div><div class="kpi-val">${rFmtK(Math.abs(totVariance))}</div><div class="kpi-sub">${totVariance>=0?'Under budget':'Over budget'}</div></div>
      <div class="kpi ${overBudget>0?'amber':'green'}"><div class="kpi-lbl">Over Budget Items</div><div class="kpi-val">${overBudget}</div><div class="kpi-sub">of ${items.length} line items</div></div>
    </div>

    <div class="ch-row ch-2">
      <div class="ch-card"><div class="ch-title">Budget vs Actual by Line Item</div><div class="ch-sub">Comparison for ${mLabel}</div>${chartScript('ch-bar-'+month, barConfig)}</div>
      <div class="ch-card"><div class="ch-title">Spend Distribution</div><div class="ch-sub">Share of total spend per category</div>${chartScript('ch-pie-'+month, pieConfig)}</div>
    </div>

    <div class="tbl-wrap">
      <div class="tbl-head"><div class="tbl-title">Line Item Breakdown — ${mLabel}</div><div style="font-size:8.5px;color:#999">${items.length} line items</div></div>
      <table><thead><tr><th>Line Item</th><th>Category</th><th>Budget</th><th>Actual Spend</th><th>Progress</th><th>Variance</th></tr></thead>
      <tbody>${tblRows}</tbody></table>
    </div>

    <div class="rpt-footer"><span>Colombo Court Hotel &amp; Spa — Marketing Hub</span><span>Budget Report · ${mLabel}</span><span>Confidential</span></div>
  </div>`;

  return { html, items, totBudget, totActual, totVariance, mLabel };
}

// ── FUNCTIONS MONTHLY REPORT ──────────────────────────────
function buildFunctionsReport(inquiries, month, fy) {
  const mLabel = FY_MONTHS[month] + ' ' + (month < 9 ? fy+1 : fy);
  const fyLabel2 = `FY ${fy}–${String(fy+1).slice(-2)}`;
  const all      = inquiries.filter(x => x.fy_month==month);
  const confirmed= all.filter(x=>x.status==='Confirmed');
  const pending  = all.filter(x=>['Pending','Details Shared'].includes(x.status));
  const lost     = all.filter(x=>['Cancelled','Not Interested'].includes(x.status));
  const convRate = all.length>0?(confirmed.length/all.length*100).toFixed(1):0;
  const totRev   = confirmed.reduce((a,x)=>a+Number(x.food_revenue||0)+Number(x.bev_revenue||0),0);
  const totFood  = confirmed.reduce((a,x)=>a+Number(x.food_revenue||0),0);
  const totBev   = confirmed.reduce((a,x)=>a+Number(x.bev_revenue||0),0);

  const ETYPES  = ['Wedding','Birthday','High Tea','Proposal','Engagement','Corporate Event','Get Together','Party','Other'];
  const SOURCES = ['Social Media','Website','Direct Walk-in','Recommendation','Wedding Show / Event','Email','Radio','Other'];
  const VENUES  = ['Amber Poolside','Cloud Cafe','Scarlet','The Loft'];
  const PAL     = ['#C8102E','#3db870','#4a88d8','#d4800a','#9b7ac8','#4db8a0','#e04444','#f4a433','#aaaaaa'];

  const typeData    = ETYPES.map(t=>all.filter(x=>x.event_type===t).length);
  const sourceData  = SOURCES.map(s=>all.filter(x=>x.source===s).length);
  const venueData   = VENUES.map(v=>confirmed.filter(x=>x.venue===v).length);

  const statusPieConfig = {
    type:'doughnut',
    data:{labels:['Confirmed','Pending/Details','Cancelled/Lost','Other'],
      datasets:[{data:[confirmed.length,pending.length,lost.length,all.length-confirmed.length-pending.length-lost.length],
        backgroundColor:['#3db870','#d4800a','#C8102E','#aaaaaa'],borderWidth:2,borderColor:'#fff'}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'50%',plugins:{legend:{position:'right',labels:{font:{size:8},boxWidth:10}}}}
  };
  const typeBarConfig = {
    type:'bar',
    data:{labels:ETYPES.map(t=>t.length>10?t.slice(0,9)+'…':t),
      datasets:[{label:'Inquiries',data:typeData,backgroundColor:PAL,borderWidth:0,borderRadius:3}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{font:{size:8}},grid:{color:'#f0f0f0'}},x:{ticks:{font:{size:7}},grid:{display:false}}}}
  };
  const sourceBarConfig = {
    type:'bar',
    data:{labels:SOURCES.map(s=>s.length>14?s.slice(0,13)+'…':s),
      datasets:[{label:'Inquiries',data:sourceData,backgroundColor:'rgba(200,16,46,0.6)',borderColor:'#C8102E',borderWidth:1,borderRadius:3}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{y:{ticks:{font:{size:8}}},x:{ticks:{font:{size:8}},grid:{color:'#f0f0f0'}}}}
  };

  const confRows = confirmed.map(x=>{
    const tot=Number(x.food_revenue||0)+Number(x.bev_revenue||0);
    return `<tr><td>${fmtDate(x.event_date)||'TBD'}</td><td><strong>${x.guest_name||'—'}</strong></td><td><span class="pill pill-r">${x.event_type||'—'}</span></td><td>${x.venue||'—'}</td><td class="mono">${x.pax||'—'}</td><td class="mono" style="font-weight:600;color:#2e7d52">${rFmt(tot)}</td></tr>`;
  }).join('');

  const html = `<div class="rpt-page">
    <div class="rpt-hdr">
      <div class="rpt-logo"><div class="rpt-logo-mark">CC</div><div><div class="rpt-hotel">Colombo Court Hotel &amp; Spa</div><div class="rpt-dept">Marketing Hub</div></div></div>
      <div class="rpt-title-block"><div class="rpt-title">Functions &amp; Events Report</div><div class="rpt-period">${mLabel} · ${fyLabel2}</div><div class="rpt-generated">Generated ${rDate()}</div></div>
    </div>

    <div class="kpi-row k4">
      <div class="kpi red"><div class="kpi-lbl">Total Inquiries</div><div class="kpi-val">${all.length}</div><div class="kpi-sub">${mLabel}</div></div>
      <div class="kpi green"><div class="kpi-lbl">Confirmed Events</div><div class="kpi-val">${confirmed.length}</div><span class="kpi-badge bgr">${convRate}% rate</span></div>
      <div class="kpi blue"><div class="kpi-lbl">Total Revenue</div><div class="kpi-val">${rFmtK(totRev)}</div><div class="kpi-sub">confirmed events</div></div>
      <div class="kpi amber"><div class="kpi-lbl">Lost / Pending</div><div class="kpi-val">${lost.length} / ${pending.length}</div></div>
    </div>

    <div class="ch-row ch-2">
      <div class="ch-card"><div class="ch-title">Inquiry Status Breakdown</div><div class="ch-sub">All ${all.length} inquiries for ${mLabel}</div>${chartScript('ch-status', statusPieConfig)}</div>
      <div class="ch-card"><div class="ch-title">Inquiries by Event Type</div><div class="ch-sub">Which events drove the most inquiries</div>${chartScript('ch-types', typeBarConfig)}</div>
    </div>
    <div class="ch-row ch-2">
      <div class="ch-card"><div class="ch-title">Inquiries by Source</div><div class="ch-sub">How guests found Colombo Court</div>${chartScript('ch-sources', sourceBarConfig)}</div>
      <div class="ch-card">
        <div class="ch-title">Revenue Summary</div>
        <div class="ch-sub">Confirmed events only</div>
        <div style="margin-top:12px">
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0"><span style="font-size:10px;color:#666">Food Revenue</span><span style="font-weight:700;color:#C8102E">${rFmt(totFood)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0"><span style="font-size:10px;color:#666">Beverage Revenue</span><span style="font-weight:700;color:#4a88d8">${rFmt(totBev)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:10px 0"><span style="font-size:11px;font-weight:700">Total Revenue</span><span style="font-size:14px;font-weight:700;color:#2e7d52">${rFmt(totRev)}</span></div>
          <div style="margin-top:8px;font-size:9px;color:#888">Avg per event: ${confirmed.length>0?rFmt(totRev/confirmed.length):'—'}</div>
        </div>
      </div>
    </div>

    ${confirmed.length>0?`<div class="tbl-wrap">
      <div class="tbl-head"><div class="tbl-title">Confirmed Events — ${mLabel}</div><span class="pill pill-g">${confirmed.length} events</span></div>
      <table><thead><tr><th>Event Date</th><th>Guest</th><th>Type</th><th>Venue</th><th>Pax</th><th>Revenue</th></tr></thead>
      <tbody>${confRows}</tbody></table>
    </div>`:''}

    <div class="rpt-footer"><span>Colombo Court Hotel &amp; Spa — Marketing Hub</span><span>Functions Report · ${mLabel}</span><span>Confidential</span></div>
  </div>`;

  return { html, all, confirmed, lost, pending, totRev, totFood, totBev, convRate, mLabel };
}

// ── SINGLE EVENT PERFORMANCE REPORT ───────────────────────
function buildEventReport(event, linkedSpends, fy) {
  const mLabel = event.fy_month!=null ? (FY_MONTHS[event.fy_month]||'') + ' ' + (event.fy_month<9?fy+1:fy) : '';
  const adSpend   = linkedSpends.reduce((a,s)=>a+Number(s.amount||0),0);
  const otherCost = Number(event.other_cost||0);
  const totCost   = adSpend + otherCost;
  const revA      = Number(event.revenue_actual||0);
  const roi       = totCost>0?((revA-totCost)/totCost*100).toFixed(1):null;
  const cpp       = Number(event.pax_actual||0)>0?(totCost/event.pax_actual).toFixed(0):null;

  const costPieConfig = {
    type:'doughnut',
    data:{labels:['Ad Spend','Other Costs'],datasets:[{data:[adSpend,otherCost],backgroundColor:['#C8102E','#4a88d8'],borderWidth:2,borderColor:'#fff'}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'50%',plugins:{legend:{position:'right',labels:{font:{size:9},boxWidth:10}}}}
  };
  const perfBarConfig = {
    type:'bar',
    data:{labels:['Revenue Target','Revenue Actual','Total Cost'],
      datasets:[{data:[Number(event.revenue_target||0),revA,totCost],
        backgroundColor:['rgba(200,16,46,0.2)','#3db870','rgba(200,16,46,0.6)'],borderColor:['#C8102E','#3db870','#C8102E'],borderWidth:1.5,borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>'LKR '+rFmtK(v),font:{size:8}},grid:{color:'#f0f0f0'}},x:{ticks:{font:{size:9}},grid:{display:false}}}}
  };

  const adRows = linkedSpends.map(s=>`<tr><td>${fmtDate(s.date)||'—'}</td><td>${s.name||'—'}</td><td>${s.platform||'—'}</td><td>${s.objective||'—'}</td><td class="mono">${rFmt(s.amount)}</td><td class="mono">${s.impressions?Number(s.impressions).toLocaleString():'—'}</td><td class="mono">${s.reach?Number(s.reach).toLocaleString():'—'}</td></tr>`).join('');

  const durLabel = event.duration_type ? ` · ${event.duration_type}` : '';

  const html = `<div class="rpt-page">
    <div class="rpt-hdr">
      <div class="rpt-logo"><div class="rpt-logo-mark">CC</div><div><div class="rpt-hotel">Colombo Court Hotel &amp; Spa</div><div class="rpt-dept">Marketing Hub</div></div></div>
      <div class="rpt-title-block"><div class="rpt-title">Event Performance Report</div><div class="rpt-period">${event.name||'Event'} · ${mLabel}${durLabel}</div><div class="rpt-generated">Generated ${rDate()}</div></div>
    </div>

    <div class="kpi-row k4">
      <div class="kpi ${revA>=Number(event.revenue_target||0)?'green':'red'}"><div class="kpi-lbl">Revenue Actual</div><div class="kpi-val">${rFmtK(revA)}</div><div class="kpi-sub">Target: ${rFmtK(event.revenue_target||0)}</div></div>
      <div class="kpi blue"><div class="kpi-lbl">Total Cost</div><div class="kpi-val">${rFmtK(totCost)}</div><div class="kpi-sub">Ad: ${rFmtK(adSpend)} · Other: ${rFmtK(otherCost)}</div></div>
      <div class="kpi ${roi&&Number(roi)>0?'green':'red'}"><div class="kpi-lbl">ROI</div><div class="kpi-val">${roi?roi+'%':'—'}</div><div class="kpi-sub">${roi&&Number(roi)>0?'Profitable':'Below target'}</div></div>
      <div class="kpi amber"><div class="kpi-lbl">Pax Actual / Target</div><div class="kpi-val">${event.pax_actual||0}</div><div class="kpi-sub">Target: ${event.pax_target||0} · CPP: ${cpp?'LKR '+Number(cpp).toLocaleString():'—'}</div></div>
    </div>

    <div class="ch-row ch-2">
      <div class="ch-card"><div class="ch-title">Revenue vs Target vs Cost</div><div class="ch-sub">Performance overview</div>${chartScript('ch-perf', perfBarConfig)}</div>
      <div class="ch-card"><div class="ch-title">Cost Breakdown</div><div class="ch-sub">Ad spend vs other costs</div>${chartScript('ch-cost', costPieConfig)}</div>
    </div>

    ${linkedSpends.length>0?`<div class="tbl-wrap">
      <div class="tbl-head"><div class="tbl-title">Linked Social Media Campaigns</div><span style="font-size:8.5px;color:#999">${linkedSpends.length} campaigns · Total: ${rFmt(adSpend)}</span></div>
      <table><thead><tr><th>Date</th><th>Campaign</th><th>Platform</th><th>Objective</th><th>Spend</th><th>Impressions</th><th>Reach</th></tr></thead>
      <tbody>${adRows}</tbody></table>
    </div>`:''}

    <div class="rpt-footer"><span>Colombo Court Hotel &amp; Spa — Marketing Hub</span><span>Event Report · ${event.name||'Event'}</span><span>Confidential</span></div>
  </div>`;

  return { html };
}

// ── MONTH COMPARISON REPORT ────────────────────────────────
function buildMonthCompareReport(dataA, dataB, monthA, monthB, fy) {
  const fyLabel2 = `FY ${fy}–${String(fy+1).slice(-2)}`;
  const lblA = FY_MONTHS[monthA] + ' ' + (monthA<9?fy+1:fy);
  const lblB = FY_MONTHS[monthB] + ' ' + (monthB<9?fy+1:fy);

  const metrics = [
    { lbl:'Total Inquiries',      a:dataA.inq.length,          b:dataB.inq.length,           fmt:n=>n },
    { lbl:'Confirmed Events',     a:dataA.conf.length,         b:dataB.conf.length,          fmt:n=>n },
    { lbl:'Conversion Rate',      a:dataA.conv,                b:dataB.conv,                 fmt:n=>n+'%' },
    { lbl:'Function Revenue',     a:dataA.rev,                 b:dataB.rev,                  fmt:rFmt },
    { lbl:'Social Ad Spend',      a:dataA.adSpend,             b:dataB.adSpend,              fmt:rFmt },
    { lbl:'Vouchers Issued',      a:dataA.vouchers,            b:dataB.vouchers,             fmt:n=>n },
  ];

  const barConfig = {
    type:'bar',
    data:{
      labels:metrics.map(m=>m.lbl.length>18?m.lbl.slice(0,17)+'…':m.lbl),
      datasets:[
        {label:lblA,data:metrics.map(m=>m.a),backgroundColor:'rgba(200,16,46,0.55)',borderColor:'#C8102E',borderWidth:1.5,borderRadius:3},
        {label:lblB,data:metrics.map(m=>m.b),backgroundColor:'rgba(74,136,216,0.5)',borderColor:'#4a88d8',borderWidth:1.5,borderRadius:3},
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:9}}}},scales:{y:{ticks:{font:{size:8}},grid:{color:'#f0f0f0'}},x:{ticks:{font:{size:8}},grid:{display:false}}}}
  };

  const rows = metrics.map(m=>{
    const diff = typeof m.a==='number' ? m.a - m.b : 0;
    const pct  = m.b>0 ? ((m.a-m.b)/m.b*100).toFixed(1) : '—';
    return `<tr>
      <td><strong>${m.lbl}</strong></td>
      <td class="mono" style="color:#C8102E;font-weight:600">${m.fmt(m.a)}</td>
      <td class="mono" style="color:#4a88d8;font-weight:600">${m.fmt(m.b)}</td>
      <td class="mono" style="color:${diff>0?'#2e7d52':diff<0?'#c0102e':'#888'};font-weight:600">${diff>0?'+':''}${m.fmt(diff)}</td>
      <td><span class="pill ${diff>0?'pill-g':diff<0?'pill-r':'pill-b'}">${diff>0?'↑ ':'↓ '}${Math.abs(pct)}%</span></td>
    </tr>`;
  }).join('');

  const html = `<div class="rpt-page">
    <div class="rpt-hdr">
      <div class="rpt-logo"><div class="rpt-logo-mark">CC</div><div><div class="rpt-hotel">Colombo Court Hotel &amp; Spa</div><div class="rpt-dept">Marketing Hub</div></div></div>
      <div class="rpt-title-block"><div class="rpt-title">Month vs Month Comparison</div><div class="rpt-period"><span style="color:#C8102E">${lblA}</span> vs <span style="color:#4a88d8">${lblB}</span> · ${fyLabel2}</div><div class="rpt-generated">Generated ${rDate()}</div></div>
    </div>

    <div class="ch-row ch-1">
      <div class="ch-card"><div class="ch-title">${lblA} vs ${lblB} — Key Metrics</div><div class="ch-sub">Side by side comparison</div>${chartScript('ch-compare', barConfig)}</div>
    </div>

    <div class="tbl-wrap">
      <div class="tbl-head"><div class="tbl-title">Detailed Comparison</div></div>
      <table><thead><tr><th>Metric</th><th style="color:#C8102E">${lblA}</th><th style="color:#4a88d8">${lblB}</th><th>Difference</th><th>Change</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>

    <div class="rpt-footer"><span>Colombo Court Hotel &amp; Spa — Marketing Hub</span><span>Month Comparison · ${lblA} vs ${lblB}</span><span>Confidential</span></div>
  </div>`;

  return { html };
}
