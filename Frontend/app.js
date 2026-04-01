"use strict";

/* ═══════════════════════════════════════════
   STATE  (in-memory, survives tab switching)
═══════════════════════════════════════════ */
const DB = {
  bookings: [],
  rooms: [],
  guests: [],
  staff: [],
  payments: [],
  services: []
};

let counters = { bookings:20251, rooms:1001, guests:10041, staff:1, payments:2041, services:1 };

/* ═══════════════════════════════════════════
   NAV
═══════════════════════════════════════════ */
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.section-panel');
const navUnderline = document.getElementById('navUnderline');

function activateTab(tabEl) {
  tabs.forEach(t => t.classList.remove('active'));
  panels.forEach(p => p.classList.remove('active'));
  tabEl.classList.add('active');
  const panel = document.getElementById('tab-' + tabEl.dataset.tab);
  if (panel) panel.classList.add('active');
  moveUnderline(tabEl);
  if (tabEl.dataset.tab === 'explorer') renderExplorer();
}

function moveUnderline(tabEl) {
  const navInner = document.querySelector('.nav-inner');
  const nr = navInner.getBoundingClientRect();
  const tr = tabEl.getBoundingClientRect();
  navUnderline.style.left  = (tr.left - nr.left + navInner.scrollLeft) + 'px';
  navUnderline.style.width = tr.width + 'px';
}

tabs.forEach(t => t.addEventListener('click', () => activateTab(t)));
window.addEventListener('load', () => { const a = document.querySelector('.tab.active'); if(a) moveUnderline(a); });
window.addEventListener('resize', () => { const a = document.querySelector('.tab.active'); if(a) moveUnderline(a); });

/* ═══════════════════════════════════════════
   CLOCK
═══════════════════════════════════════════ */
function updateClock() {
  const el = document.getElementById('headerTime');
  if (!el) return;
  el.textContent = new Date().toLocaleString('en-US', {
    weekday:'short', month:'short', day:'numeric',
    hour:'2-digit', minute:'2-digit', hour12:true
  });
}
updateClock(); setInterval(updateClock, 30000);

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
let toastTimer = null;
function showToast(title, msg, type='success') {
  const t = document.getElementById('toast');
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMsg').textContent = msg;
  document.getElementById('toastIcon').textContent = type==='error' ? '⚠' : '✦';
  t.classList.toggle('error', type==='error');
  t.classList.add('show');
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 4500);
}
document.getElementById('toastClose').addEventListener('click', () => document.getElementById('toast').classList.remove('show'));

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function toDate(d) { return d || '—'; }
function fmtNPR(n) { return n ? 'NPR ' + Number(n).toLocaleString('en-NP') : '—'; }
function badgeStatus(s) {
  const map = {
    'Available':'badge-green','Active':'badge-green','On Duty':'badge-green','Completed':'badge-green','Confirmed':'badge-green','Checked-In':'badge-blue',
    'Occupied':'badge-gold','On Leave':'badge-gold','Pending':'badge-gold','Limited':'badge-gold','Checked-Out':'badge-gold',
    'Under Maintenance':'badge-red','Maintenance':'badge-red','Cancelled':'badge-red','Inactive':'badge-red','Refunded':'badge-red'
  };
  const cls = map[s] || 'badge-gold';
  return `<span class="badge ${cls}">${s}</span>`;
}

function clearForm(formId, ...fieldIds) {
  fieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
}

function removeRow(tableKey, id, renderFn) {
  DB[tableKey] = DB[tableKey].filter(r => r.id !== id);
  renderFn();
  updateExplorerIfOpen();
}

function updateExplorerIfOpen() {
  if (document.getElementById('tab-explorer').classList.contains('active')) renderExplorer();
}

/* ═══════════════════════════════════════════
   TABLE SEARCH
═══════════════════════════════════════════ */
document.querySelectorAll('.table-search').forEach(inp => {
  inp.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    const tableId = this.dataset.table;
    const tbody = document.getElementById(tableId)?.querySelector('tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr:not(.empty-row)').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
});

/* ═══════════════════════════════════════════
   DEFAULT DATES
═══════════════════════════════════════════ */
function toDateStr(d) { return d.toISOString().split('T')[0]; }
const today = toDateStr(new Date());
const tomorrow = toDateStr(new Date(Date.now()+86400000));
['bk_checkin','py_date','sf_hiredate'].forEach(id => {
  const el = document.getElementById(id); if(el) el.value = today;
});
const cko = document.getElementById('bk_checkout');
if (cko) cko.value = tomorrow;

/* ═══════════════════════════════════════════
   AUTO ID BADGE
═══════════════════════════════════════════ */
function refreshAutoId() {
  const el = document.getElementById('autoId');
  if (el) el.textContent = counters.bookings;
}
refreshAutoId();

/* ══════════════════════════════════════════════
   BOOKINGS
══════════════════════════════════════════════ */
document.getElementById('bookingForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const name = document.getElementById('bk_guestName').value.trim();
  const room = document.getElementById('bk_room').value;
  const cin  = document.getElementById('bk_checkin').value;
  const cout = document.getElementById('bk_checkout').value;
  if (!name) { showToast('Validation Error','Please enter the guest name.','error'); return; }
  if (!room)  { showToast('Validation Error','Please select a room.','error'); return; }
  if (!cin || !cout) { showToast('Validation Error','Please set check-in and check-out dates.','error'); return; }
  if (cout <= cin) { showToast('Validation Error','Check-out must be after check-in.','error'); return; }

  const nights = Math.round((new Date(cout)-new Date(cin))/86400000);
  const rate = parseFloat(document.getElementById('bk_rate').value)||0;
  const total = rate > 0 ? rate*nights : 0;

  const rec = {
    id: 'BK-'+counters.bookings++,
    guest: name,
    phone: document.getElementById('bk_phone').value,
    email: document.getElementById('bk_email').value,
    room,
    guests: document.getElementById('bk_numguests').value,
    checkin: cin, checkout: cout,
    nights, rate, total,
    status: document.getElementById('bk_status').value,
    payMethod: document.getElementById('bk_paymethod').value,
    payStatus: document.getElementById('bk_paystatus').value
  };
  DB.bookings.unshift(rec);
  renderBookings();
  this.reset();
  document.getElementById('bk_checkin').value = today;
  document.getElementById('bk_checkout').value = tomorrow;
  refreshAutoId();
  showToast('Booking Confirmed ✦', `${name} · ${room} · ${nights} night${nights!==1?'s':''}`);
  updateExplorerIfOpen();
});

document.getElementById('clearBookingBtn').addEventListener('click', () => {
  document.getElementById('bookingForm').reset();
  document.getElementById('bk_checkin').value = today;
  document.getElementById('bk_checkout').value = tomorrow;
});

function renderBookings() {
  const tbody = document.getElementById('bookingsTbody');
  document.getElementById('bkCount').textContent = DB.bookings.length;

  if (!DB.bookings.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9"><div class="empty-state"><div class="empty-icon">🛎</div><p>No bookings yet. Create your first reservation.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = DB.bookings.map(r => `
      <tr>
        <td style="font-family:'Cormorant Garamond',serif;color:var(--gold)">${r.id}</td>
        <td>${r.guest}</td>
        <td>${r.room}</td>
        <td>${r.checkin}</td>
        <td>${r.checkout}</td>
        <td style="font-weight:500">${r.total > 0 ? fmtNPR(r.total) : '—'}</td>
        <td>${badgeStatus(r.status)}</td>
        <td>${badgeStatus(r.payStatus)}</td>
        <td><button class="action-btn danger" onclick="removeRow('bookings','${r.id}',renderBookings)">✕ Remove</button></td>
      </tr>`).join('');
  }

  // Stats
  const stats = document.getElementById('bookingStats');
  const confirmed = DB.bookings.filter(b=>b.status==='Confirmed'||b.status==='Checked-In').length;
  const checkedIn = DB.bookings.filter(b=>b.status==='Checked-In').length;
  const totalRev  = DB.bookings.reduce((s,b)=>s+(b.total||0),0);
  stats.innerHTML = `
    <div class="stat-card"><div class="stat-icon">🛎</div><div class="stat-label">Total Bookings</div><div class="stat-value">${DB.bookings.length}</div><div class="stat-sub">all time</div></div>
    <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-label">Confirmed</div><div class="stat-value" style="color:var(--success)">${confirmed}</div><div class="stat-sub">active reservations</div></div>
    <div class="stat-card"><div class="stat-icon">🔑</div><div class="stat-label">Checked-In</div><div class="stat-value" style="color:#7ab4e2">${checkedIn}</div><div class="stat-sub">guests in-house</div></div>
    <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-label">Total Revenue</div><div class="stat-value">${totalRev>0?'NPR '+totalRev.toLocaleString('en-NP'):'—'}</div><div class="stat-sub">from bookings</div></div>`;
}
renderBookings();

/* ══════════════════════════════════════════════
   ROOMS
══════════════════════════════════════════════ */
document.getElementById('roomForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const num  = document.getElementById('rm_number').value.trim();
  const type = document.getElementById('rm_type').value;
  const price = document.getElementById('rm_price').value;
  if (!num)  { showToast('Validation Error','Please enter a room number.','error'); return; }
  if (!type) { showToast('Validation Error','Please select a room type.','error'); return; }

  const rec = {
    id: 'RM-' + counters.rooms++,
    number: num,
    type,
    floor: document.getElementById('rm_floor').value || '—',
    price: price ? Number(price) : 0,
    status: document.getElementById('rm_status').value,
    desc: document.getElementById('rm_desc').value
  };
  DB.rooms.unshift(rec);
  renderRooms();
  this.reset();
  showToast('Room Added ✦', `Room ${num} — ${type} added to inventory.`);
  updateExplorerIfOpen();
});

document.getElementById('clearRoomBtn').addEventListener('click', () => document.getElementById('roomForm').reset());

function renderRooms() {
  const tbody = document.getElementById('roomsTbody');
  document.getElementById('rmCount').textContent = DB.rooms.length;

  if (!DB.rooms.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6"><div class="empty-state"><div class="empty-icon">🛏</div><p>No rooms added yet.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = DB.rooms.map(r => `
      <tr>
        <td style="font-family:'Cormorant Garamond',serif;color:var(--gold)">${r.number}</td>
        <td>${r.type}</td>
        <td>${r.floor}</td>
        <td>${r.price > 0 ? fmtNPR(r.price) : '—'}</td>
        <td>${badgeStatus(r.status)}</td>
        <td><button class="action-btn danger" onclick="removeRow('rooms','${r.id}',renderRooms)">✕ Remove</button></td>
      </tr>`).join('');
  }

  const stats = document.getElementById('roomStats');
  const avail = DB.rooms.filter(r=>r.status==='Available').length;
  const occ   = DB.rooms.filter(r=>r.status==='Occupied').length;
  const maint = DB.rooms.filter(r=>r.status==='Under Maintenance').length;
  stats.innerHTML = `
    <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-label">Available</div><div class="stat-value" style="color:var(--success)">${avail}</div><div class="stat-sub">ready for guests</div></div>
    <div class="stat-card"><div class="stat-icon">🔑</div><div class="stat-label">Occupied</div><div class="stat-value" style="color:var(--gold)">${occ}</div><div class="stat-sub">currently in-use</div></div>
    <div class="stat-card"><div class="stat-icon">🔧</div><div class="stat-label">Maintenance</div><div class="stat-value" style="color:var(--error)">${maint}</div><div class="stat-sub">under service</div></div>`;
}
renderRooms();

/* ══════════════════════════════════════════════
   GUESTS
══════════════════════════════════════════════ */
document.getElementById('guestForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const fname = document.getElementById('gs_fname').value.trim();
  const lname = document.getElementById('gs_lname').value.trim();
  const email = document.getElementById('gs_email').value.trim();
  if (!fname || !lname) { showToast('Validation Error','Please enter full name.','error'); return; }
  if (!email) { showToast('Validation Error','Email is required.','error'); return; }

  const rec = {
    id: 'G-'+counters.guests++,
    fname, lname, name: fname+' '+lname,
    email,
    phone: document.getElementById('gs_phone').value,
    dob: document.getElementById('gs_dob').value,
    nationality: document.getElementById('gs_nationality').value,
    passport: document.getElementById('gs_passport').value
  };
  DB.guests.unshift(rec);
  renderGuests();
  this.reset();
  showToast('Guest Registered ✦', `${rec.name} added to the directory.`);
  updateExplorerIfOpen();
});

document.getElementById('clearGuestBtn').addEventListener('click', () => document.getElementById('guestForm').reset());

function renderGuests() {
  const tbody = document.getElementById('guestsTbody');
  document.getElementById('gsCount').textContent = DB.guests.length;
  if (!DB.guests.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7"><div class="empty-state"><div class="empty-icon">👤</div><p>No guests registered yet.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = DB.guests.map(r => `
      <tr>
        <td style="font-family:'Cormorant Garamond',serif;color:var(--gold)">${r.id}</td>
        <td>${r.name}</td>
        <td style="color:var(--text-muted)">${r.email}</td>
        <td>${r.phone||'—'}</td>
        <td>${r.nationality||'—'}</td>
        <td>${r.dob||'—'}</td>
        <td><button class="action-btn danger" onclick="removeRow('guests','${r.id}',renderGuests)">✕ Remove</button></td>
      </tr>`).join('');
  }
}
renderGuests();

/* ══════════════════════════════════════════════
   STAFF
══════════════════════════════════════════════ */
document.getElementById('staffForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const fname = document.getElementById('sf_fname').value.trim();
  const lname = document.getElementById('sf_lname').value.trim();
  const role  = document.getElementById('sf_role').value;
  if (!fname || !lname) { showToast('Validation Error','Please enter full name.','error'); return; }
  if (!role) { showToast('Validation Error','Please select a role.','error'); return; }

  const rec = {
    id: 'S-'+String(counters.staff++).padStart(3,'0'),
    name: fname+' '+lname,
    fname, lname,
    email: document.getElementById('sf_email').value,
    phone: document.getElementById('sf_phone').value,
    role,
    dept: document.getElementById('sf_dept').value || '—',
    salary: document.getElementById('sf_salary').value ? Number(document.getElementById('sf_salary').value) : 0,
    hireDate: document.getElementById('sf_hiredate').value
  };
  DB.staff.unshift(rec);
  renderStaff();
  this.reset();
  document.getElementById('sf_hiredate').value = today;
  showToast('Staff Added ✦', `${rec.name} — ${role} registered.`);
  updateExplorerIfOpen();
});

document.getElementById('clearStaffBtn').addEventListener('click', () => document.getElementById('staffForm').reset());

function renderStaff() {
  const tbody = document.getElementById('staffTbody');
  document.getElementById('sfCount').textContent = DB.staff.length;
  if (!DB.staff.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7"><div class="empty-state"><div class="empty-icon">👔</div><p>No staff added yet.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = DB.staff.map(r => `
      <tr>
        <td style="font-family:'Cormorant Garamond',serif;color:var(--gold)">${r.id}</td>
        <td>${r.name}</td>
        <td>${r.role}</td>
        <td>${r.dept}</td>
        <td style="color:var(--text-muted)">${r.email||'—'}</td>
        <td>${r.salary > 0 ? fmtNPR(r.salary) : '—'}</td>
        <td><button class="action-btn danger" onclick="removeRow('staff','${r.id}',renderStaff)">✕ Remove</button></td>
      </tr>`).join('');
  }
}
renderStaff();

/* ══════════════════════════════════════════════
   PAYMENTS
══════════════════════════════════════════════ */
document.getElementById('paymentForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const guest  = document.getElementById('py_guest').value.trim();
  const amount = document.getElementById('py_amount').value;
  if (!guest)  { showToast('Validation Error','Please enter guest name.','error'); return; }
  if (!amount) { showToast('Validation Error','Please enter an amount.','error'); return; }

  const rec = {
    id: '#INV-'+counters.payments++,
    guest,
    bookingRef: document.getElementById('py_booking').value || '—',
    room: document.getElementById('py_room').value || '—',
    amount: Number(amount),
    date: document.getElementById('py_date').value || today,
    method: document.getElementById('py_method').value,
    status: document.getElementById('py_status').value
  };
  DB.payments.unshift(rec);
  renderPayments();
  this.reset();
  document.getElementById('py_date').value = today;
  showToast('Payment Recorded ✦', `${fmtNPR(rec.amount)} — ${rec.method} — ${rec.status}`);
  updateExplorerIfOpen();
});

document.getElementById('clearPaymentBtn').addEventListener('click', () => {
  document.getElementById('paymentForm').reset();
  document.getElementById('py_date').value = today;
});

function renderPayments() {
  const tbody = document.getElementById('paymentsTbody');
  document.getElementById('pyCount').textContent = DB.payments.length;

  if (!DB.payments.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9"><div class="empty-state"><div class="empty-icon">💳</div><p>No payments recorded yet.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = DB.payments.map(r => `
      <tr>
        <td style="font-family:'Cormorant Garamond',serif;color:var(--gold)">${r.id}</td>
        <td>${r.guest}</td>
        <td style="color:var(--text-muted)">${r.bookingRef}</td>
        <td>${r.room}</td>
        <td style="font-weight:500">${fmtNPR(r.amount)}</td>
        <td>${r.method}</td>
        <td>${r.date}</td>
        <td>${badgeStatus(r.status)}</td>
        <td><button class="action-btn danger" onclick="removeRow('payments','${r.id}',renderPayments)">✕ Remove</button></td>
      </tr>`).join('');
  }

  const stats = document.getElementById('paymentStats');
  const completed = DB.payments.filter(p=>p.status==='Completed').reduce((s,p)=>s+p.amount,0);
  const pending   = DB.payments.filter(p=>p.status==='Pending').length;
  stats.innerHTML = `
    <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-label">Total Received</div><div class="stat-value">${completed>0?'NPR '+completed.toLocaleString('en-NP'):'—'}</div><div class="stat-sub">completed payments</div></div>
    <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-label">Pending</div><div class="stat-value" style="color:var(--error)">${pending}</div><div class="stat-sub">invoices outstanding</div></div>
    <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-label">Total Records</div><div class="stat-value">${DB.payments.length}</div><div class="stat-sub">all transactions</div></div>`;
}
renderPayments();

/* ══════════════════════════════════════════════
   SERVICES
══════════════════════════════════════════════ */
document.getElementById('serviceForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const name = document.getElementById('sv_name').value.trim();
  const type = document.getElementById('sv_type').value;
  if (!name) { showToast('Validation Error','Please enter a service name.','error'); return; }
  if (!type) { showToast('Validation Error','Please select a category.','error'); return; }

  const rec = {
    id: 'SV-'+String(counters.services++).padStart(2,'0'),
    name,
    type,
    charge: document.getElementById('sv_charge').value || '—',
    status: document.getElementById('sv_status').value,
    desc: document.getElementById('sv_desc').value || '—'
  };
  DB.services.unshift(rec);
  renderServices();
  this.reset();
  showToast('Service Added ✦', `${name} — ${type} registered.`);
  updateExplorerIfOpen();
});

document.getElementById('clearServiceBtn').addEventListener('click', () => document.getElementById('serviceForm').reset());

function renderServices() {
  const tbody = document.getElementById('servicesTbody');
  document.getElementById('svCount').textContent = DB.services.length;
  if (!DB.services.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7"><div class="empty-state"><div class="empty-icon">✨</div><p>No services added yet.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = DB.services.map(r => `
      <tr>
        <td style="font-family:'Cormorant Garamond',serif;color:var(--gold)">${r.id}</td>
        <td>${r.name}</td>
        <td><span class="category-tag">${r.type}</span></td>
        <td>${r.charge}</td>
        <td>${badgeStatus(r.status)}</td>
        <td style="color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.desc}</td>
        <td><button class="action-btn danger" onclick="removeRow('services','${r.id}',renderServices)">✕ Remove</button></td>
      </tr>`).join('');
  }
}
renderServices();

/* ══════════════════════════════════════════════
   DATA EXPLORER
══════════════════════════════════════════════ */
const TABLES = [
  { key:'bookings', label:'Bookings', icon:'🛎',
    cols:['Booking ID','Guest','Room','Check-In','Check-Out','Nights','Total (NPR)','Status','Pay Method','Pay Status'],
    fields:['id','guest','room','checkin','checkout','nights','total','status','payMethod','payStatus'] },
  { key:'rooms', label:'Rooms', icon:'🛏',
    cols:['Room No.','Type','Floor','Price/Night','Status'],
    fields:['number','type','floor','price','status'] },
  { key:'guests', label:'Guests', icon:'👤',
    cols:['Guest ID','Name','Email','Phone','Nationality','DOB','Passport'],
    fields:['id','name','email','phone','nationality','dob','passport'] },
  { key:'staff', label:'Staff', icon:'👔',
    cols:['Staff ID','Name','Role','Department','Email','Hire Date','Salary'],
    fields:['id','name','role','dept','email','hireDate','salary'] },
  { key:'payments', label:'Payments', icon:'💳',
    cols:['Invoice ID','Guest','Booking Ref.','Room','Amount','Method','Date','Status'],
    fields:['id','guest','bookingRef','room','amount','method','date','status'] },
  { key:'services', label:'Services', icon:'✨',
    cols:['Service ID','Name','Category','Charge','Status','Description'],
    fields:['id','name','type','charge','status','desc'] }
];

let activeExplorerTable = 'bookings';

function renderExplorer() {
  const pillsEl = document.getElementById('explorerPills');
  const contentEl = document.getElementById('explorerContent');

  pillsEl.innerHTML = TABLES.map(t =>
    `<button class="table-pill ${activeExplorerTable===t.key?'active':''}" onclick="switchExplorerTable('${t.key}')">${t.icon} ${t.label}</button>`
  ).join('');

  const t = TABLES.find(x => x.key === activeExplorerTable);
  const rows = DB[t.key];

  if (!rows.length) {
    contentEl.innerHTML = `<div class="table-card"><div class="empty-state" style="padding:4rem"><div class="empty-icon">${t.icon}</div><p>No ${t.label.toLowerCase()} records yet.</p></div></div>`;
    return;
  }

  const theadCols = t.cols.map(c => `<th>${c}</th>`).join('') + '<th>Action</th>';
  const tbodyRows = rows.map((row, ri) => {
    const cells = t.fields.map((f,fi) => {
      let val = row[f] != null ? row[f] : '—';
      if ((f==='total'||f==='salary'||f==='amount'||f==='price') && Number(val)>0) val = Number(val).toLocaleString('en-NP');
      if (f==='status'||f==='payStatus') return `<td>${badgeStatus(val)}</td>`;
      return `<td contenteditable="true" onblur="editCell('${t.key}',${ri},'${f}',this)">${val}</td>`;
    }).join('');
    return `<tr>${cells}<td><button class="action-btn danger" onclick="explorerDelete('${t.key}','${row.id||row.number}')">✕</button></td></tr>`;
  }).join('');

  contentEl.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <div>
          <div class="table-title">${t.icon} ${t.label} <span class="table-count">${rows.length}</span></div>
        </div>
        <div class="table-actions">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" placeholder="Filter..." class="table-search" id="explorerSearch">
          </div>
        </div>
      </div>
      <div class="table-wrap">
        <table id="explorerTable">
          <thead><tr>${theadCols}</tr></thead>
          <tbody>${tbodyRows}</tbody>
        </table>
      </div>
    </div>`;

  document.getElementById('explorerSearch').addEventListener('input', function() {
    const q = this.value.toLowerCase();
    document.querySelectorAll('#explorerTable tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

function switchExplorerTable(key) {
  activeExplorerTable = key;
  renderExplorer();
}

function editCell(tableKey, rowIndex, field, el) {
  const val = el.textContent.trim();
  if (DB[tableKey][rowIndex]) {
    DB[tableKey][rowIndex][field] = val;
    showToast('Cell Updated', `${field} → "${val}"`);
  }
}

function explorerDelete(tableKey, rowId) {
  DB[tableKey] = DB[tableKey].filter(r => (r.id||r.number) !== rowId);
  const renderMap = {bookings:renderBookings,rooms:renderRooms,guests:renderGuests,staff:renderStaff,payments:renderPayments,services:renderServices};
  if (renderMap[tableKey]) renderMap[tableKey]();
  renderExplorer();
  showToast('Record Deleted', `Record removed from ${tableKey}.`);
}
