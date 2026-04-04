"use strict";

/* ═══════════════════════════════════════════
   API BASE URL  ← change port if needed
═══════════════════════════════════════════ */
const API_BASE = 'http://localhost:5000';

/* ═══════════════════════════════════════════
   STATE  (mirrors DB, kept in sync via API)
═══════════════════════════════════════════ */
const DB = {
  bookings: [],
  rooms:    [],
  guests:   [],
  staff:    [],
  payments: [],
  services: [],
  roles:    [],       
  departments: []    
};

/* ID counters — seeded from highest DB id after first load */
let counters = {
  bookings: 20251,
  rooms:    1001,
  guests:   10041,
  staff:    1,
  payments: 2041,
  services: 1
};

/* ═══════════════════════════════════════════
   GENERIC API HELPER
═══════════════════════════════════════════ */
async function api(method, path, body) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(API_BASE + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (err) {
    showToast('API Error', err.message, 'error');
    throw err;
  }
}

/* ═══════════════════════════════════════════
   NAV
═══════════════════════════════════════════ */
const tabs        = document.querySelectorAll('.tab');
const panels      = document.querySelectorAll('.section-panel');
const navUnderline = document.getElementById('navUnderline');

function activateTab(tabEl) {
  tabs.forEach(t   => t.classList.remove('active'));
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
window.addEventListener('load',   () => { const a = document.querySelector('.tab.active'); if (a) moveUnderline(a); });
window.addEventListener('resize', () => { const a = document.querySelector('.tab.active'); if (a) moveUnderline(a); });

/* ═══════════════════════════════════════════
   CLOCK
═══════════════════════════════════════════ */
function updateClock() {
  const el = document.getElementById('headerTime');
  if (!el) return;
  el.textContent = new Date().toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}
updateClock();
setInterval(updateClock, 30000);

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
let toastTimer = null;
function showToast(title, msg, type = 'success') {
  const t = document.getElementById('toast');
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMsg').textContent   = msg;
  document.getElementById('toastIcon').textContent  = type === 'error' ? '⚠' : '✦';
  t.classList.toggle('error', type === 'error');
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 4500);
}
document.getElementById('toastClose').addEventListener('click', () =>
  document.getElementById('toast').classList.remove('show')
);

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function fmtNPR(n) { return n ? 'NPR ' + Number(n).toLocaleString('en-NP') : '—'; }

function badgeStatus(s) {
  const map = {
    'Available':        'badge-green', 'Active':    'badge-green', 'On Duty':   'badge-green',
    'Completed':        'badge-green', 'Confirmed': 'badge-green', 'Checked-In':'badge-blue',
    'Occupied':         'badge-gold',  'On Leave':  'badge-gold',  'Pending':   'badge-gold',
    'Limited':          'badge-gold',  'Checked-Out':'badge-gold',
    'Under Maintenance':'badge-red',   'Maintenance':'badge-red',  'Cancelled': 'badge-red',
    'Inactive':         'badge-red',   'Refunded':  'badge-red'
  };
  return `<span class="badge ${map[s] || 'badge-gold'}">${s}</span>`;
}

function toDateStr(d) { return d.toISOString().split('T')[0]; }
const today    = toDateStr(new Date());
const tomorrow = toDateStr(new Date(Date.now() + 86400000));

['bk_checkin', 'py_date', 'sf_hiredate'].forEach(id => {
  const el = document.getElementById(id); if (el) el.value = today;
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

/* ═══════════════════════════════════════════
   TABLE SEARCH
═══════════════════════════════════════════ */
document.querySelectorAll('.table-search').forEach(inp => {
  inp.addEventListener('input', function () {
    const q     = this.value.toLowerCase();
    const tbody = document.getElementById(this.dataset.table)?.querySelector('tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr:not(.empty-row)').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
});

function updateExplorerIfOpen() {
  if (document.getElementById('tab-explorer').classList.contains('active')) renderExplorer();
}

/* ═══════════════════════════════════════════
   so Staff form can send integer IDs
═══════════════════════════════════════════ */
async function loadRoles() {
  try {
    const data = await api('GET', '/roles');
    DB.roles = data; // [{ RoleID, Role_Name, Base_Salary }, ...]
    populateRoleSelect();
  } catch (_) {}
}

async function loadDepartments() {
  try {
    const data = await api('GET', '/departments');
    DB.departments = data; // [{ DeptID, Dept_Name, ... }, ...]
    populateDeptSelect();
  } catch (_) {}
}

function populateRoleSelect() {
  const sel = document.getElementById('sf_role');
  if (!sel) return;
  const current = sel.value;
  // Keep the disabled placeholder option
  sel.innerHTML = '<option value="" disabled selected>Select role</option>';
  DB.roles.forEach(r => {
    const opt = document.createElement('option');
    opt.value       = r.RoleID;       // ← integer FK value
    opt.textContent = r.Role_Name;    // ← human-readable label
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

function populateDeptSelect() {
  const sel = document.getElementById('sf_dept');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="" disabled selected>Select dept.</option>';
  DB.departments.forEach(d => {
    const opt = document.createElement('option');
    opt.value       = d.DeptID;      // ← integer FK value
    opt.textContent = d.Dept_Name;   // ← human-readable label
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

/* ═══════════════════════════════════════════
   instead of using hardcoded HTML options
═══════════════════════════════════════════ */
function populateBookingRoomSelect() {
  const sel = document.getElementById('bk_room');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="" disabled selected>Select room</option>';
  // Only show available rooms
  const available = DB.rooms.filter(r => r.status === 'Available');
  available.forEach(r => {
    const opt = document.createElement('option');
    opt.value       = r.dbId;                               // ← integer RoomID (what the form now sends)
    opt.textContent = `${r.number} — ${r.type} (${fmtNPR(r.price)}/night)`;
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

/* ══════════════════════════════════════════════════════════════
   BOOKINGS
══════════════════════════════════════════════════════════════ */
document.getElementById('bookingForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const name    = document.getElementById('bk_guestName').value.trim();
  const roomDbId = parseInt(document.getElementById('bk_room').value);
  const cin      = document.getElementById('bk_checkin').value;
  const cout     = document.getElementById('bk_checkout').value;

  if (!name)            { showToast('Validation Error', 'Please enter the guest name.', 'error'); return; }
  if (!roomDbId)        { showToast('Validation Error', 'Please select a room.', 'error'); return; }
  if (!cin || !cout)    { showToast('Validation Error', 'Please set check-in and check-out dates.', 'error'); return; }
  if (cout <= cin)      { showToast('Validation Error', 'Check-out must be after check-in.', 'error'); return; }

  const nights = Math.round((new Date(cout) - new Date(cin)) / 86400000);
  const rate   = parseFloat(document.getElementById('bk_rate').value) || 0;
  const total  = rate > 0 ? rate * nights : 0;

  const matchedGuest = DB.guests.find(g =>
    g.name.toLowerCase() === name.toLowerCase()
  );
  if (!matchedGuest) {
    showToast('Guest Not Found', `Please register "${name}" in the Guests tab first.`, 'error');
    return;
  }

  const matchedRoom = DB.rooms.find(r => r.dbId === roomDbId);
  if (!matchedRoom) {
    showToast('Room Not Found', 'Selected room no longer exists. Please refresh.', 'error');
    return;
  }

  const bookingID = counters.bookings++;
  refreshAutoId();

  try {
    // 1. Create booking
    await api('POST', '/bookings', {
      BookingID:       bookingID,
      Booking_Date:    cin,
      Number_of_Guest: parseInt(document.getElementById('bk_numguests').value) || 1,
      Total_Amount:    total,
      Booking_Status:  document.getElementById('bk_status').value,
      GuestID:         matchedGuest.dbId
    });

    // 2. Assign room to booking
    await api('POST', '/booking-rooms', {
      BookingID:      bookingID,
      RoomID:         matchedRoom.dbId,
      Check_in_Date:  cin,
      Check_out_Date: cout,
      Room_Price:     rate
    });

    showToast('Booking Confirmed ✦', `${name} · Room ${matchedRoom.number} · ${nights} night${nights !== 1 ? 's' : ''}`);
    this.reset();
    document.getElementById('bk_checkin').value  = today;
    document.getElementById('bk_checkout').value = tomorrow;
    await loadBookings();
    populateBookingRoomSelect();
  } catch (_) { /* error already shown by api() */ }
});

document.getElementById('clearBookingBtn').addEventListener('click', () => {
  document.getElementById('bookingForm').reset();
  document.getElementById('bk_checkin').value  = today;
  document.getElementById('bk_checkout').value = tomorrow;
});

async function loadBookings() {
  try {
    const data = await api('GET', '/bookings');
    DB.bookings = data.map(b => ({
      id:        'BK-' + b.BookingID,
      dbId:      b.BookingID,
      guest:     (b.First_Name || '') + ' ' + (b.Last_Name || ''),
      room:      b.RoomID     ? String(b.RoomID) : '—',
      checkin:   b.Check_in_Date  || b.Booking_Date || '—',
      checkout:  b.Check_out_Date || '—',
      nights:    b.Check_in_Date && b.Check_out_Date
                   ? Math.round((new Date(b.Check_out_Date) - new Date(b.Check_in_Date)) / 86400000)
                   : '—',
      total:     b.Total_Amount   || 0,
      status:    b.Booking_Status || '—',
      payMethod: b.Payment_Method || '—',
      payStatus: b.Payment_Status || '—'
    }));
    // Seed counter above current max
    if (DB.bookings.length) {
      const maxId = Math.max(...DB.bookings.map(b => b.dbId));
      if (maxId >= counters.bookings) counters.bookings = maxId + 1;
      refreshAutoId();
    }
    renderBookings();
  } catch (_) {}
}

async function removeBooking(dbId) {
  try {
    await api('DELETE', `/bookings/${dbId}`);
    await loadBookings();
    updateExplorerIfOpen();
    showToast('Booking Removed', `Booking #${dbId} deleted.`);
  } catch (_) {}
}

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
        <td><button class="action-btn danger" onclick="removeBooking(${r.dbId})">✕ Remove</button></td>
      </tr>`).join('');
  }

  const stats      = document.getElementById('bookingStats');
  const confirmed  = DB.bookings.filter(b => b.status === 'Confirmed' || b.status === 'Checked-In').length;
  const checkedIn  = DB.bookings.filter(b => b.status === 'Checked-In').length;
  const totalRev   = DB.bookings.reduce((s, b) => s + (b.total || 0), 0);
  stats.innerHTML  = `
    <div class="stat-card"><div class="stat-icon">🛎</div><div class="stat-label">Total Bookings</div><div class="stat-value">${DB.bookings.length}</div><div class="stat-sub">all time</div></div>
    <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-label">Confirmed</div><div class="stat-value" style="color:var(--success)">${confirmed}</div><div class="stat-sub">active reservations</div></div>
    <div class="stat-card"><div class="stat-icon">🔑</div><div class="stat-label">Checked-In</div><div class="stat-value" style="color:#7ab4e2">${checkedIn}</div><div class="stat-sub">guests in-house</div></div>
    <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-label">Total Revenue</div><div class="stat-value">${totalRev > 0 ? 'NPR ' + totalRev.toLocaleString('en-NP') : '—'}</div><div class="stat-sub">from bookings</div></div>`;
}

/* ══════════════════════════════════════════════
   ROOMS
══════════════════════════════════════════════ */
document.getElementById('roomForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const num   = document.getElementById('rm_number').value.trim();
  const type  = document.getElementById('rm_type').value;
  const price = document.getElementById('rm_price').value;

  if (!num)  { showToast('Validation Error', 'Please enter a room number.', 'error'); return; }
  if (!type) { showToast('Validation Error', 'Please select a room type.', 'error'); return; }

  const roomID = parseInt(num);
  if (isNaN(roomID)) { showToast('Validation Error', 'Room number must be numeric.', 'error'); return; }

  try {
    await api('POST', '/rooms', {
      RoomID:      roomID,
      Room_Type:   type,
      Floor:       document.getElementById('rm_floor').value || '1',
      Base_Price:  price ? Number(price) : 0,
      Room_Status: document.getElementById('rm_status').value
    });
    showToast('Room Added ✦', `Room ${num} — ${type} added to inventory.`);
    this.reset();
    await loadRooms();
  } catch (_) {}
});

document.getElementById('clearRoomBtn').addEventListener('click', () => document.getElementById('roomForm').reset());

async function loadRooms() {
  try {
    const data = await api('GET', '/rooms');
    DB.rooms = data.map(r => ({
      id:     'RM-' + r.RoomID,
      dbId:   r.RoomID,
      number: String(r.RoomID),
      type:   r.Room_Type  || '—',
      floor:  r.Floor      || '—',
      price:  r.Base_Price || 0,
      status: r.Room_Status || '—'
    }));
    renderRooms();
    populateBookingRoomSelect();
  } catch (_) {}
}

async function removeRoom(dbId) {
  try {
    await api('DELETE', `/rooms/${dbId}`);
    await loadRooms();
    updateExplorerIfOpen();
    showToast('Room Removed', `Room #${dbId} deleted.`);
  } catch (_) {}
}

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
        <td><button class="action-btn danger" onclick="removeRoom(${r.dbId})">✕ Remove</button></td>
      </tr>`).join('');
  }

  const stats = document.getElementById('roomStats');
  const avail = DB.rooms.filter(r => r.status === 'Available').length;
  const occ   = DB.rooms.filter(r => r.status === 'Occupied').length;
  const maint = DB.rooms.filter(r => r.status === 'Under Maintenance').length;
  stats.innerHTML = `
    <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-label">Available</div><div class="stat-value" style="color:var(--success)">${avail}</div><div class="stat-sub">ready for guests</div></div>
    <div class="stat-card"><div class="stat-icon">🔑</div><div class="stat-label">Occupied</div><div class="stat-value" style="color:var(--gold)">${occ}</div><div class="stat-sub">currently in-use</div></div>
    <div class="stat-card"><div class="stat-icon">🔧</div><div class="stat-label">Maintenance</div><div class="stat-value" style="color:var(--error)">${maint}</div><div class="stat-sub">under service</div></div>`;
}

/* ══════════════════════════════════════════════
   GUESTS
══════════════════════════════════════════════ */
document.getElementById('guestForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const fname = document.getElementById('gs_fname').value.trim();
  const lname = document.getElementById('gs_lname').value.trim();
  const email = document.getElementById('gs_email').value.trim();

  if (!fname || !lname) { showToast('Validation Error', 'Please enter full name.', 'error'); return; }
  if (!email)           { showToast('Validation Error', 'Email is required.', 'error'); return; }

  const guestID = counters.guests++;
  try {
    await api('POST', '/guests', {
      GuestID:       guestID,
      First_Name:    fname,
      Last_Name:     lname,
      Email:         email,
      Phone:         document.getElementById('gs_phone').value || null,
      Date_of_Birth: document.getElementById('gs_dob').value   || null
    });
    showToast('Guest Registered ✦', `${fname} ${lname} added to the directory.`);
    this.reset();
    await loadGuests();
  } catch (_) {}
});

document.getElementById('clearGuestBtn').addEventListener('click', () => document.getElementById('guestForm').reset());

async function loadGuests() {
  try {
    const data = await api('GET', '/guests');
    DB.guests = data.map(g => ({
      id:          'G-' + g.GuestID,
      dbId:        g.GuestID,
      name:        (g.First_Name || '') + ' ' + (g.Last_Name || ''),
      fname:       g.First_Name   || '',
      lname:       g.Last_Name    || '',
      email:       g.Email        || '—',
      phone:       g.Phone        || '—',
      nationality: g.Nationality  || '—',
      dob:         g.Date_of_Birth|| '—',
      passport:    g.Passport_No  || '—'
    }));
    // Seed counter
    if (DB.guests.length) {
      const maxId = Math.max(...DB.guests.map(g => g.dbId));
      if (maxId >= counters.guests) counters.guests = maxId + 1;
    }
    renderGuests();
  } catch (_) {}
}

async function removeGuest(dbId) {
  try {
    await api('DELETE', `/guests/${dbId}`);
    await loadGuests();
    updateExplorerIfOpen();
    showToast('Guest Removed', `Guest #${dbId} deleted.`);
  } catch (_) {}
}

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
        <td>${r.phone}</td>
        <td>${r.nationality}</td>
        <td>${r.dob}</td>
        <td><button class="action-btn danger" onclick="removeGuest(${r.dbId})">✕ Remove</button></td>
      </tr>`).join('');
  }
}

/* ══════════════════════════════════════════════
   STAFF
   loaded from /roles and /departments endpoints
══════════════════════════════════════════════ */
document.getElementById('staffForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const fname  = document.getElementById('sf_fname').value.trim();
  const lname  = document.getElementById('sf_lname').value.trim();
  const roleId = parseInt(document.getElementById('sf_role').value);
  const deptId = parseInt(document.getElementById('sf_dept').value);

  if (!fname || !lname) { showToast('Validation Error', 'Please enter full name.', 'error'); return; }
  if (!roleId)          { showToast('Validation Error', 'Please select a role.', 'error'); return; }
  if (!deptId)          { showToast('Validation Error', 'Please select a department.', 'error'); return; }

  const staffID = counters.staff++;
  try {
    await api('POST', '/staff', {
      StaffID:    staffID,
      First_Name: fname,
      Last_Name:  lname,
      Email:      document.getElementById('sf_email').value  || '',
      Phone:      document.getElementById('sf_phone').value  || null,
      Hire_Date:  document.getElementById('sf_hiredate').value || today,
      Salary:     document.getElementById('sf_salary').value
                    ? Number(document.getElementById('sf_salary').value) : 0,
      DeptID:     deptId,   // ← integer FK from select
      RoleId:     roleId    // ← integer FK from select
    });
    showToast('Staff Added ✦', `${fname} ${lname} — registered.`);
    this.reset();
    document.getElementById('sf_hiredate').value = today;
    await loadStaff();
  } catch (_) {}
});

document.getElementById('clearStaffBtn').addEventListener('click', () => {
  document.getElementById('staffForm').reset();
});

async function loadStaff() {
  try {
    const data = await api('GET', '/staff');
    DB.staff = data.map(s => ({
      id:       'S-' + String(s.StaffID).padStart(3, '0'),
      dbId:     s.StaffID,
      name:     (s.First_Name || '') + ' ' + (s.Last_Name || ''),
      role:     s.Role_Name  || s.RoleId || '—',
      dept:     s.Dept_Name  || '—',
      email:    s.Email      || '—',
      hireDate: s.Hire_Date  || '—',
      salary:   s.Salary     || 0
    }));
    // Seed counter
    if (DB.staff.length) {
      const maxId = Math.max(...DB.staff.map(s => s.dbId));
      if (maxId >= counters.staff) counters.staff = maxId + 1;
    }
    renderStaff();
  } catch (_) {}
}

async function removeStaff(dbId) {
  try {
    await api('DELETE', `/staff/${dbId}`);
    await loadStaff();
    updateExplorerIfOpen();
    showToast('Staff Removed', `Staff #${dbId} deleted.`);
  } catch (_) {}
}

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
        <td style="color:var(--text-muted)">${r.email}</td>
        <td>${r.salary > 0 ? fmtNPR(r.salary) : '—'}</td>
        <td><button class="action-btn danger" onclick="removeStaff(${r.dbId})">✕ Remove</button></td>
      </tr>`).join('');
  }
}

/* ══════════════════════════════════════════════
   PAYMENTS
══════════════════════════════════════════════ */
document.getElementById('paymentForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const guest  = document.getElementById('py_guest').value.trim();
  const amount = document.getElementById('py_amount').value;
  const bkRef  = document.getElementById('py_booking').value.trim();

  if (!guest)  { showToast('Validation Error', 'Please enter guest name.', 'error'); return; }
  if (!amount) { showToast('Validation Error', 'Please enter an amount.', 'error'); return; }
  if (!bkRef)  { showToast('Validation Error', 'Please enter a Booking ID.', 'error'); return; }

  const bookingIDNum = parseInt(bkRef.replace(/[^0-9]/g, ''));
  if (isNaN(bookingIDNum)) {
    showToast('Validation Error', 'Booking ID must be numeric or in BK-##### format.', 'error');
    return;
  }

  const paymentID = counters.payments++;
  try {
    await api('POST', '/payments', {
      PaymentID:      paymentID,
      Amount:         Number(amount),
      Payment_Date:   document.getElementById('py_date').value || today,
      Payment_Status: document.getElementById('py_status').value,
      Payment_Method: document.getElementById('py_method').value,
      BookingID:      bookingIDNum
    });
    showToast('Payment Recorded ✦', `${fmtNPR(Number(amount))} — ${document.getElementById('py_method').value}`);
    this.reset();
    document.getElementById('py_date').value = today;
    await loadPayments();
  } catch (_) {}
});

document.getElementById('clearPaymentBtn').addEventListener('click', () => {
  document.getElementById('paymentForm').reset();
  document.getElementById('py_date').value = today;
});

async function loadPayments() {
  try {
    const data = await api('GET', '/payments');
    DB.payments = data.map(p => ({
      id:         '#INV-' + p.PaymentID,
      dbId:       p.PaymentID,
      guest:      p.GuestID ? 'Guest #' + p.GuestID : '—',
      bookingRef: 'BK-' + p.BookingID,
      room:       '—',
      amount:     p.Amount         || 0,
      method:     p.Payment_Method || '—',
      date:       p.Payment_Date   || '—',
      status:     p.Payment_Status || '—'
    }));
    if (DB.payments.length) {
      const maxId = Math.max(...DB.payments.map(p => p.dbId));
      if (maxId >= counters.payments) counters.payments = maxId + 1;
    }
    renderPayments();
  } catch (_) {}
}

async function removePayment(dbId) {
  try {
    await api('DELETE', `/payments/${dbId}`);
    await loadPayments();
    updateExplorerIfOpen();
    showToast('Payment Removed', `Invoice #${dbId} deleted.`);
  } catch (_) {}
}

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
        <td><button class="action-btn danger" onclick="removePayment(${r.dbId})">✕ Remove</button></td>
      </tr>`).join('');
  }

  const stats     = document.getElementById('paymentStats');
  const completed = DB.payments.filter(p => p.status === 'Completed').reduce((s, p) => s + p.amount, 0);
  const pending   = DB.payments.filter(p => p.status === 'Pending').length;
  stats.innerHTML = `
    <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-label">Total Received</div><div class="stat-value">${completed > 0 ? 'NPR ' + completed.toLocaleString('en-NP') : '—'}</div><div class="stat-sub">completed payments</div></div>
    <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-label">Pending</div><div class="stat-value" style="color:var(--error)">${pending}</div><div class="stat-sub">invoices outstanding</div></div>
    <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-label">Total Records</div><div class="stat-value">${DB.payments.length}</div><div class="stat-sub">all transactions</div></div>`;
}

/* ══════════════════════════════════════════════
   SERVICES
══════════════════════════════════════════════ */
document.getElementById('serviceForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const name = document.getElementById('sv_name').value.trim();
  const type = document.getElementById('sv_type').value;

  if (!name) { showToast('Validation Error', 'Please enter a service name.', 'error'); return; }
  if (!type) { showToast('Validation Error', 'Please select a category.', 'error'); return; }

  const serviceID = counters.services++;
  try {
    await api('POST', '/services', {
      ServiceID:    serviceID,
      Service_Name: name,
      Service_Type: type,
      Base_Charge:  document.getElementById('sv_charge').value || 0,
      Description:  document.getElementById('sv_desc').value   || null
    });
    showToast('Service Added ✦', `${name} — ${type} registered.`);
    this.reset();
    await loadServices();
  } catch (_) {}
});

document.getElementById('clearServiceBtn').addEventListener('click', () => document.getElementById('serviceForm').reset());

async function loadServices() {
  try {
    const data = await api('GET', '/services');
    DB.services = data.map(s => ({
      id:     'SV-' + String(s.ServiceID).padStart(2, '0'),
      dbId:   s.ServiceID,
      name:   s.Service_Name || '—',
      type:   s.Service_Type || '—',
      charge: s.Base_Charge  || '—',
      status: s.Status       || 'Active',
      desc:   s.Description  || '—'
    }));
    renderServices();
  } catch (_) {}
}

async function removeService(dbId) {
  try {
    await api('DELETE', `/services/${dbId}`);
    await loadServices();
    updateExplorerIfOpen();
    showToast('Service Removed', `Service #${dbId} deleted.`);
  } catch (_) {}
}

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
        <td><button class="action-btn danger" onclick="removeService(${r.dbId})">✕ Remove</button></td>
      </tr>`).join('');
  }
}

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
    cols:['Guest ID','Name','Email','Phone','Nationality','DOB'],
    fields:['id','name','email','phone','nationality','dob'] },
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
  const pillsEl   = document.getElementById('explorerPills');
  const contentEl = document.getElementById('explorerContent');

  pillsEl.innerHTML = TABLES.map(t =>
    `<button class="table-pill ${activeExplorerTable === t.key ? 'active' : ''}" onclick="switchExplorerTable('${t.key}')">${t.icon} ${t.label}</button>`
  ).join('');

  const t    = TABLES.find(x => x.key === activeExplorerTable);
  const rows = DB[t.key];

  if (!rows.length) {
    contentEl.innerHTML = `<div class="table-card"><div class="empty-state" style="padding:4rem"><div class="empty-icon">${t.icon}</div><p>No ${t.label.toLowerCase()} records yet.</p></div></div>`;
    return;
  }

  const theadCols = t.cols.map(c => `<th>${c}</th>`).join('') + '<th>Action</th>';
  const tbodyRows = rows.map((row) => {
    const cells = t.fields.map(f => {
      let val = row[f] != null ? row[f] : '—';
      if ((f==='total'||f==='salary'||f==='amount'||f==='price') && Number(val) > 0)
        val = Number(val).toLocaleString('en-NP');
      if (f==='status' || f==='payStatus') return `<td>${badgeStatus(val)}</td>`;
      return `<td>${val}</td>`;
    }).join('');
    return `<tr>${cells}<td><button class="action-btn danger" onclick="explorerDelete('${t.key}',${row.dbId || 0})">✕</button></td></tr>`;
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

  document.getElementById('explorerSearch').addEventListener('input', function () {
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

async function explorerDelete(tableKey, dbId) {
  const endpointMap = {
    bookings: 'bookings', rooms: 'rooms',
    guests:   'guests',   staff: 'staff',
    payments: 'payments', services: 'services'
  };
  const loaderMap = {
    bookings: loadBookings, rooms: loadRooms,
    guests:   loadGuests,   staff: loadStaff,
    payments: loadPayments, services: loadServices
  };
  try {
    await api('DELETE', `/${endpointMap[tableKey]}/${dbId}`);
    await loaderMap[tableKey]();
    renderExplorer();
    showToast('Record Deleted', `Record removed from ${tableKey}.`);
  } catch (_) {}
}

/* ══════════════════════════════════════════════
   INITIAL DATA LOAD  (on page ready)
   selects are populated before user interaction
══════════════════════════════════════════════ */
(async function initLoad() {
  // Load reference data first (roles + depts needed by Staff form)
  await Promise.all([loadRoles(), loadDepartments()]);

  // Then load all entity data in parallel
  await Promise.all([
    loadRooms(),      // also populates booking room dropdown
    loadGuests(),
    loadStaff(),
    loadBookings(),
    loadPayments(),
    loadServices()
  ]);
})();
