// ═══════════════════════════════════════════════════════════════════
// COLOMBO COURT MARKETING HUB — GOOGLE APPS SCRIPT BACKEND
// Deploy this as a Web App (see SETUP_GUIDE for instructions)
// ═══════════════════════════════════════════════════════════════════

const SPREADSHEET_ID = '1aMXgqFvREDqRbgHdtK3tv94pkT2WymxczxQ_a79uHSI'; // ← Replace after creating the sheet

// Sheet names — must match exactly
const SHEETS = {
  USERS:           'Users',
  LINE_ITEMS:      'LineItems',
  MONTHLY_BUDGETS: 'MonthlyBudgets',
  SPENDS:          'Spends',
  SOCIAL_SPENDS:   'SocialSpends',
  PAGE_METRICS:    'PageMetrics',
  INFLUENCERS:     'Influencers',
  ENGAGEMENTS:     'Engagements',
  SUPPLIERS:       'Suppliers',
  PRINT_ORDERS:    'PrintOrders',
  SIDEBAR_FIELDS:  'SidebarFields',
  SESSIONS:        'Sessions',
  EMAIL_CAMPAIGNS: 'EmailCampaigns',
  CONTENT_LOG:     'ContentLog',
  EVENTS:           'Events',
  FUNC_INQUIRIES:   'FuncInquiries',
  FUNC_BUDGETS:      'FuncBudgets',
  VOUCHERS:          'Vouchers',
  INF_PERF:          'InfluencerPerf',
  KISS_FM_VOUCHERS:  'KissFMVouchers',
};

// ── CORS helper ───────────────────────────────────────────────────
function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GET handler ───────────────────────────────────────────────────
function doGet(e) {
  try {
    const action = e.parameter.action;
    const token  = e.parameter.token;
    
    // Login doesn't need a token
    if (action !== 'login' && !validateToken(token)) {
      return respond({ ok: false, error: 'Unauthorized' });
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    switch (action) {
      case 'login':         return doLogin(e, ss);
      case 'getAll':        return doGetAll(e, ss, token);
      case 'getSheet':      return doGetSheet(e, ss);
      default:              return respond({ ok: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return respond({ ok: false, error: err.toString() });
  }
}

// ── POST handler ──────────────────────────────────────────────────
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const token  = body.token;
    
    if (!validateToken(token)) {
      return respond({ ok: false, error: 'Unauthorized' });
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    switch (action) {
      case 'addRow':    return doAddRow(body, ss);
      case 'updateRow': return doUpdateRow(body, ss);
      case 'deleteRow': return doDeleteRow(body, ss);
      case 'upsertBudget': return doUpsertBudget(body, ss);
      case 'logout':    return doLogout(body, ss);
      default:          return respond({ ok: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return respond({ ok: false, error: err.toString() });
  }
}

// ── LOGIN ─────────────────────────────────────────────────────────
function doLogin(e, ss) {
  const username = (e.parameter.username || '').trim().toLowerCase();
  const password = e.parameter.password || '';
  
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const data  = sheet.getDataRange().getValues();
  
  // Row 1 is header: Username | Password | Role | Active
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0].toString().toLowerCase() === username &&
        row[1].toString() === password &&
        row[3].toString().toLowerCase() === 'yes') {
      
      // Generate session token
      const token = Utilities.getUuid();
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 8); // 8-hour session
      
      const sessionSheet = ss.getSheetByName(SHEETS.SESSIONS);
      sessionSheet.appendRow([token, username, row[2], expiry.toISOString()]);
      
      return respond({
        ok: true,
        token,
        user: { username, role: row[2].toString() }
      });
    }
  }
  return respond({ ok: false, error: 'Invalid username or password' });
}

// ── TOKEN VALIDATION ──────────────────────────────────────────────
function validateToken(token) {
  if (!token) return false;
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.SESSIONS);
    const data  = sheet.getDataRange().getValues();
    const now   = new Date();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === token) {
        const expiry = new Date(data[i][3]);
        return expiry > now;
      }
    }
  } catch(e) {}
  return false;
}

function doLogout(body, ss) {
  const sheet = ss.getSheetByName(SHEETS.SESSIONS);
  const data  = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === body.token) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return respond({ ok: true });
}

// ── GET ALL DATA (single call loads everything) ───────────────────
function doGetAll(e, ss, token) {
  const fy = parseInt(e.parameter.fy) || 2026;
  
  // Get user info from token
  const sessSheet = ss.getSheetByName(SHEETS.SESSIONS);
  const sessData  = sessSheet.getDataRange().getValues();
  let userInfo = { username: '', role: '' };
  for (let i = 1; i < sessData.length; i++) {
    if (sessData[i][0] === token) {
      userInfo = { username: sessData[i][1], role: sessData[i][2] };
    }
  }
  
  return respond({
    ok: true,
    user: userInfo,
    lineItems:      sheetToObjects(ss, SHEETS.LINE_ITEMS),
    monthlyBudgets: sheetToObjects(ss, SHEETS.MONTHLY_BUDGETS).filter(r => r.fy == fy),
    spends:         sheetToObjects(ss, SHEETS.SPENDS).filter(r => r.fy == fy),
    socialSpends:   sheetToObjects(ss, SHEETS.SOCIAL_SPENDS).filter(r => r.fy == fy),
    pageMetrics:    sheetToObjects(ss, SHEETS.PAGE_METRICS).filter(r => r.fy == fy),
    influencers:    sheetToObjects(ss, SHEETS.INFLUENCERS),
    engagements:    sheetToObjects(ss, SHEETS.ENGAGEMENTS).filter(r => r.fy == fy),
    suppliers:      sheetToObjects(ss, SHEETS.SUPPLIERS),
    printOrders:    sheetToObjects(ss, SHEETS.PRINT_ORDERS).filter(r => r.fy == fy),
    sidebarFields:  sheetToObjects(ss, SHEETS.SIDEBAR_FIELDS),
  });
}

function doGetSheet(e, ss) {
  const sheetName = SHEETS[e.parameter.sheet] || e.parameter.sheet;
  return respond({ ok: true, data: sheetToObjects(ss, sheetName) });
}

// ── ADD ROW ───────────────────────────────────────────────────────
function doAddRow(body, ss) {
  const sheet   = ss.getSheetByName(SHEETS[body.sheet] || body.sheet);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const id      = Utilities.getUuid();
  const now     = new Date().toISOString();
  
  const row = headers.map(h => {
    if (h === 'id')         return id;
    if (h === 'created_at') return now;
    if (h === 'updated_at') return now;
    const val = body.data[h];
    return val !== undefined ? val : '';
  });
  
  sheet.appendRow(row);
  return respond({ ok: true, id });
}

// ── UPDATE ROW ────────────────────────────────────────────────────
function doUpdateRow(body, ss) {
  const sheet   = ss.getSheetByName(SHEETS[body.sheet] || body.sheet);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idCol   = headers.indexOf('id') + 1;
  const data    = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol - 1] == body.id) {
      // Update each field
      headers.forEach((h, j) => {
        if (h === 'updated_at') {
          sheet.getRange(i + 1, j + 1).setValue(new Date().toISOString());
        } else if (body.data[h] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(body.data[h]);
        }
      });
      return respond({ ok: true });
    }
  }
  return respond({ ok: false, error: 'Row not found: ' + body.id });
}

// ── DELETE ROW ────────────────────────────────────────────────────
function doDeleteRow(body, ss) {
  const sheet   = ss.getSheetByName(SHEETS[body.sheet] || body.sheet);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idCol   = headers.indexOf('id') + 1;
  const data    = sheet.getDataRange().getValues();
  
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][idCol - 1] == body.id) {
      sheet.deleteRow(i + 1);
      return respond({ ok: true });
    }
  }
  return respond({ ok: false, error: 'Row not found' });
}

// ── UPSERT MONTHLY BUDGET ─────────────────────────────────────────
function doUpsertBudget(body, ss) {
  const sheet   = ss.getSheetByName(SHEETS.MONTHLY_BUDGETS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data    = sheet.getDataRange().getValues();
  
  const liCol    = headers.indexOf('line_item_id') + 1;
  const fyCol    = headers.indexOf('fy') + 1;
  const monthCol = headers.indexOf('month') + 1;
  const amtCol   = headers.indexOf('amount') + 1;
  
  // Find existing row
  for (let i = 1; i < data.length; i++) {
    if (data[i][liCol-1] == body.line_item_id &&
        data[i][fyCol-1] == body.fy &&
        data[i][monthCol-1] == body.month) {
      sheet.getRange(i + 1, amtCol).setValue(body.amount);
      sheet.getRange(i + 1, headers.indexOf('updated_at') + 1).setValue(new Date().toISOString());
      return respond({ ok: true, action: 'updated' });
    }
  }
  
  // Insert new row
  const id  = Utilities.getUuid();
  const now = new Date().toISOString();
  const row = headers.map(h => {
    if (h === 'id')           return id;
    if (h === 'line_item_id') return body.line_item_id;
    if (h === 'fy')           return body.fy;
    if (h === 'month')        return body.month;
    if (h === 'amount')       return body.amount;
    if (h === 'created_at')   return now;
    if (h === 'updated_at')   return now;
    return '';
  });
  sheet.appendRow(row);
  return respond({ ok: true, action: 'inserted', id });
}

// ── UTILITY: Sheet → Array of Objects ────────────────────────────
function sheetToObjects(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  return data.slice(1)
    .filter(row => row.some(cell => cell !== ''))  // skip empty rows
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
}

// ── SETUP: Create all sheets with headers ─────────────────────────
// Run this function ONCE manually to set up your spreadsheet
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const schema = {
    Users:           ['username','password','role','active','created_at'],
    Sessions:        ['id','username','role','expires_at'],
    LineItems:       ['id','name','category','linked_module','notes','sort_order','created_at','updated_at'],
    MonthlyBudgets:  ['id','line_item_id','fy','month','amount','created_at','updated_at'],
    Spends:          ['id','line_item_id','fy','fy_month','date','description','amount','reference','notes','created_at','updated_at'],
    SocialSpends:    ['id','fy','fy_month','date','platform','type','objective','name','amount','impressions','reach','engagements','leads','revenue','new_followers','new_page_likes','ctr','notes','created_at','updated_at'],
    PageMetrics:     ['id','fy','fy_month','platform','followers_start','followers_end','page_likes','engagement_rate','notes','created_at','updated_at'],
    Influencers:     ['id','name','handle','platform','niche','followers','engagement_rate','profile_link','typical_fee','tier','notes','created_at','updated_at'],
    Engagements:     ['id','influencer_id','fy','fy_month','content_type','fee','campaign','status','notes','created_at','updated_at'],
    Suppliers:       ['id','name','category','contact_person','phone','notes','created_at','updated_at'],
    PrintOrders:     ['id','supplier_id','fy','fy_month','date','description','qty','unit_price','notes','created_at','updated_at'],
    SidebarFields:   ['id','label','value','type','sort_order','created_at','updated_at'],
  };
  
  Object.entries(schema).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    // Write headers in row 1
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    // Style header row
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1a1a2e')
      .setFontColor('#b8956a')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
  
  // Seed default users
  const userSheet = ss.getSheetByName('Users');
  if (userSheet.getLastRow() < 2) {
    userSheet.appendRow(['admin',   'CCMarketing2026!', 'admin',  'yes', new Date().toISOString()]);
    userSheet.appendRow(['manager', 'Marketing2026',    'editor', 'yes', new Date().toISOString()]);
    userSheet.appendRow(['viewer',  'ViewOnly2026',     'viewer', 'yes', new Date().toISOString()]);
  }
  
  // Seed line items
  const liSheet = ss.getSheetByName('LineItems');
  if (liSheet.getLastRow() < 2) {
    const now = new Date().toISOString();
    const items = [
      [Utilities.getUuid(), 'Digital Advertising',   'Digital',           '',           'Google Ads, Meta Ads, OTA campaigns', 1, now, now],
      [Utilities.getUuid(), 'Social Media',          'Social Media',      'social',     'Content, management, paid social',    2, now, now],
      [Utilities.getUuid(), 'Influencer Marketing',  'Influencer',        'influencer', 'Fees, gifting, hosted stays',         3, now, now],
      [Utilities.getUuid(), 'Printing & Collateral', 'Print & Production','print',      'Brochures, menus, flyers, signage',   4, now, now],
      [Utilities.getUuid(), 'Events & Promotions',   'Events',            '',           'In-house events, activations',        5, now, now],
      [Utilities.getUuid(), 'PR & Media',            'PR & Media',        '',           'Press releases, media buys',          6, now, now],
      [Utilities.getUuid(), 'Entertainment',         'Entertainment',     '',           'Client entertainment, gifting',       7, now, now],
    ];
    items.forEach(row => liSheet.appendRow(row));
  }
  
  // Seed sample suppliers
  const supSheet = ss.getSheetByName('Suppliers');
  if (supSheet.getLastRow() < 2) {
    const now = new Date().toISOString();
    supSheet.appendRow([Utilities.getUuid(), 'PrintMaster Lanka',  'Printing', 'Nimal R.', '011-2345678', 'Preferred print partner', now, now]);
    supSheet.appendRow([Utilities.getUuid(), 'ColorZone Printers', 'Printing', 'Saman K.', '011-8765432', '', now, now]);
  }
  
  Logger.log('✅ Setup complete! All sheets created and seeded.');
  return 'Setup complete!';
}

// ── ADD NEW SHEETS FUNCTION (run this once to add the 4 new sheets) ──
function addNewSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const newSchema = {
    EmailCampaigns: ['id','fy','fy_month','date','name','provider','segment','sent','delivered','opened','clicked','unsubscribed','bounced','open_rate','click_rate','unsub_rate','cost','revenue','notes','created_at','updated_at'],
    ContentLog:     ['id','fy','fy_month','date','platform','content_type','title','reach','impressions','views','likes','comments','shares','saves','link_clicks','engagement_rate','post_link','created_at','updated_at'],
    Events:         ['id','fy','fy_month','date','name','type','status','pax_target','pax_actual','pax_pct','revenue_target','revenue_actual','rev_pct','ad_spend','other_cost','total_cost','cost_per_pax','roi','keywords','notes','created_at','updated_at'],
  };
  
  Object.entries(newSchema).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      Logger.log('Created sheet: ' + name);
    } else {
      Logger.log('Sheet already exists: ' + name);
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1a1a2e')
      .setFontColor('#b8956a')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
  
  Logger.log('✅ New sheets added: EmailCampaigns, ContentLog, Events');
  return 'New sheets added!';
}

// ── ADD FUNCTIONS SHEETS (run once after uploading this file) ─────
// Run this from Apps Script editor: select addFunctionsSheets, press ▶
function addFunctionsSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const schema = {
    FuncInquiries: [
      'id','fy','fy_month','inquiry_date','guest_name','phone','email',
      'source','event_type','event_date','pax','venue','menu_type',
      'food_revenue','bev_revenue','total_revenue',
      'status','followup_date','lost_reason','remarks','repeat_of',
      'created_at','updated_at'
    ],
    FuncBudgets: [
      'id','fy','fy_month','budget_type','amount','created_at','updated_at'
    ],
  };
  
  Object.entries(schema).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      Logger.log('✅ Created: ' + name);
    } else {
      Logger.log('ℹ Already exists: ' + name);
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1a1a2e').setFontColor('#b8956a').setFontWeight('bold');
    sheet.setFrozenRows(1);
  });

  // Also register the sheet keys in SHEETS constant (for reference)
  Logger.log('✅ FuncInquiries and FuncBudgets sheets ready.');
  Logger.log('You can now use the Functions & Events page.');
  return 'Functions sheets created!';
}

// ── ADD v4 SHEETS (Vouchers, KissFM) — run once ──────────────────
function addV4Sheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const schema = {
    Vouchers: ['id','fy','fy_month','voucher_code','voucher_type','sub_type','issued_to','requested_by','issue_date','valid_from','expiry_date','redeem_date','status','notes','created_at','updated_at'],
    KissFMVouchers: ['id','fy','fy_month','voucher_code','voucher_type','issued_to','issue_date','valid_from','expiry_date','redeem_date','status','notes','source','created_at','updated_at'],
    InfluencerPerf: ['id','fy','fy_month','influencer_id','post_date','campaign','content_type','reach','impressions','likes','comments','shares','saves','engagement_rate','post_url','notes','created_at','updated_at'],
  };
  Object.entries(schema).forEach(([name,headers])=>{
    let s=ss.getSheetByName(name);
    if(!s){s=ss.insertSheet(name);Logger.log('Created: '+name);}
    s.getRange(1,1,1,headers.length).setValues([headers])
     .setBackground('#1a1a2e').setFontColor('#C8102E').setFontWeight('bold');
    s.setFrozenRows(1);
  });
  Logger.log('v4 sheets done');
  return 'Vouchers + KissFMVouchers created!';
}

// ── getSheet handler (add to doGet switch if not present) ─────────
// Make sure your doGet switch includes:
//   case 'getSheet': return doGetSheet(e, ss);
// And doGetSheet filters by fy if provided
