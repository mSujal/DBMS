/* ═══════════════════════════════════════════════
   Grand Horizon HMS — Application Logic
   ═══════════════════════════════════════════════ */

"use strict";

/* ─── NAV TABS ─── */
const tabs        = document.querySelectorAll('.tab');
const panels      = document.querySelectorAll('.section-panel');
const navUnderline = document.getElementById('navUnderline');

function activateTab(tabEl) {
  tabs.forEach(t => t.classList.remove('active'));
  panels.forEach(p => p.classList.remove('active'));

  tabEl.classList.add('active');

  const target = tabEl.dataset.tab;
  const panel  = document.getElementById('tab-' + target);
  if (panel) panel.classList.add('active');

  moveUnderline(tabEl);
}

function moveUnderline(tabEl) {
  const navInner = document.querySelector('.nav-inner');
  const navRect  = navInner.getBoundingClientRect();
  const tabRect  = tabEl.getBoundingClientRect();

  navUnderline.style.left  = (tabRect.left - navRect.left + navInner.scrollLeft) + 'px';
  navUnderline.style.width = tabRect.width + 'px';
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => activateTab(tab));
});

// Init underline on first active tab
window.addEventListener('load', () => {
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) moveUnderline(activeTab);
});

window.addEventListener('resize', () => {
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) moveUnderline(activeTab);
});


/* ─── LIVE CLOCK ─── */
function updateClock() {
  const el = document.getElementById('headerTime');
  if (!el) return;
  const now = new Date();
  const opts = { weekday: 'short', month: 'short', day: 'numeric',
                 hour: '2-digit', minute: '2-digit', hour12: true };
  el.textContent = now.toLocaleString('en-US', opts);
}

updateClock();
setInterval(updateClock, 30000);


/* ─── AUTO BOOKING ID ─── */
const autoIdEl = document.getElementById('autoId');
if (autoIdEl) {
  const base = 20250 + Math.floor(Math.random() * 99);
  autoIdEl.textContent = base;
}


/* ─── DEFAULT DATES ─── */
const checkInEl  = document.getElementById('checkIn');
const checkOutEl = document.getElementById('checkOut');

if (checkInEl && checkOutEl) {
  const todayStr    = toInputDate(new Date());
  const tomorrowStr = toInputDate(new Date(Date.now() + 86400000));

  checkInEl.value  = todayStr;
  checkOutEl.value = tomorrowStr;
}

function toInputDate(d) {
  return d.toISOString().split('T')[0];
}


/* ─── NIGHTS BADGE + TOTAL ─── */
function updateNightsAndTotal() {
  const inVal   = checkInEl  ? checkInEl.value  : '';
  const outVal  = checkOutEl ? checkOutEl.value : '';
  const badge   = document.getElementById('nightsBadge');
  const total   = document.getElementById('totalDisplay');
  const rateEl  = document.getElementById('ratePerNight');

  if (!inVal || !outVal || !badge) return;

  const inDate  = new Date(inVal);
  const outDate = new Date(outVal);
  const diffMs  = outDate - inDate;
  const nights  = Math.max(0, Math.round(diffMs / 86400000));

  badge.textContent = nights === 1 ? '1 night' : `${nights} nights`;

  if (total && rateEl && rateEl.value) {
    const rate = parseFloat(rateEl.value);
    if (!isNaN(rate) && nights > 0) {
      total.textContent = 'NPR ' + (rate * nights).toLocaleString('en-NP');
    } else {
      total.textContent = '—';
    }
  } else if (total) {
    total.textContent = '—';
  }
}

if (checkInEl)  checkInEl.addEventListener('change', updateNightsAndTotal);
if (checkOutEl) checkOutEl.addEventListener('change', updateNightsAndTotal);

const rateEl = document.getElementById('ratePerNight');
if (rateEl) rateEl.addEventListener('input', updateNightsAndTotal);

updateNightsAndTotal();


/* ─── COUNTER BUTTONS ─── */
document.querySelectorAll('.counter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const op       = btn.dataset.op;
    const input    = document.getElementById(targetId);
    if (!input) return;

    let val = parseInt(input.value) || 0;
    const min = parseInt(input.min) ?? 0;
    const max = parseInt(input.max) ?? 99;

    if (op === '+') val = Math.min(val + 1, max);
    if (op === '-') val = Math.max(val - 1, min);

    input.value = val;
  });
});


/* ─── BOOKING FORM ─── */
const bookingForm = document.getElementById('bookingForm');
const clearBtn    = document.getElementById('clearBtn');

if (bookingForm) {
  bookingForm.addEventListener('submit', handleBookingSubmit);
}

if (clearBtn) {
  clearBtn.addEventListener('click', clearBookingForm);
}

function handleBookingSubmit(e) {
  e.preventDefault();

  const guestName  = document.getElementById('guestName')?.value.trim();
  const roomNumber = document.getElementById('roomNumber')?.value;

  if (!guestName) {
    showToast('Validation Error', 'Please enter the guest\'s full name.', 'error');
    document.getElementById('guestName')?.focus();
    return;
  }

  if (!roomNumber) {
    showToast('Validation Error', 'Please select a room number.', 'error');
    return;
  }

  const nights = getNightsCount();
  const rate   = parseFloat(rateEl?.value) || 0;
  const total  = nights > 0 && rate > 0
    ? `NPR ${(rate * nights).toLocaleString('en-NP')} — `
    : '';

  showToast(
    'Booking Confirmed ✦',
    `${guestName} · Room ${roomNumber} · ${total}${nights} night${nights !== 1 ? 's' : ''}`
  );

  setTimeout(() => {
    bookingForm.reset();
    resetDefaultDates();
    updateNightsAndTotal();
    refreshAutoId();
  }, 500);
}

function clearBookingForm() {
  bookingForm.reset();
  resetDefaultDates();
  updateNightsAndTotal();

  const total = document.getElementById('totalDisplay');
  if (total) total.textContent = '—';
}

function resetDefaultDates() {
  if (checkInEl)  checkInEl.value  = toInputDate(new Date());
  if (checkOutEl) checkOutEl.value = toInputDate(new Date(Date.now() + 86400000));
}

function getNightsCount() {
  if (!checkInEl || !checkOutEl) return 0;
  const inDate  = new Date(checkInEl.value);
  const outDate = new Date(checkOutEl.value);
  return Math.max(0, Math.round((outDate - inDate) / 86400000));
}

function refreshAutoId() {
  const el = document.getElementById('autoId');
  if (el) el.textContent = 20250 + Math.floor(Math.random() * 99);
}


/* ─── TOAST ─── */
let toastTimer = null;

function showToast(title, message, type = 'success') {
  const toast     = document.getElementById('toast');
  const titleEl   = document.getElementById('toastTitle');
  const msgEl     = document.getElementById('toastMsg');
  const iconEl    = document.getElementById('toastIcon');
  const closeBtn  = document.getElementById('toastClose');

  if (!toast) return;

  titleEl.textContent = title;
  msgEl.textContent   = message;
  iconEl.textContent  = type === 'error' ? '⚠' : '✦';

  toast.classList.toggle('error', type === 'error');
  toast.style.borderColor = type === 'error'
    ? 'var(--error)'
    : 'var(--success)';

  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 4500);

  closeBtn?.addEventListener('click', hideToast, { once: true });
}

function hideToast() {
  document.getElementById('toast')?.classList.remove('show');
}


/* ─── TABLE SEARCH ─── */
document.querySelectorAll('.table-search').forEach(searchInput => {
  searchInput.addEventListener('input', function () {
    const query  = this.value.toLowerCase().trim();
    const table  = this.closest('.table-card').querySelector('tbody');
    if (!table) return;

    table.querySelectorAll('tr').forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });
});


/* ─── ACTION BUTTONS (Book shortcut) ─── */
document.addEventListener('click', e => {
  const btn = e.target.closest('.action-btn');
  if (!btn) return;

  if (btn.textContent.trim() === 'Book') {
    const row     = btn.closest('tr');
    const cells   = row?.querySelectorAll('td');
    if (!cells || cells.length < 1) return;

    const roomNo  = cells[0]?.textContent.trim();
    const roomType = cells[1]?.textContent.trim();

    // Switch to bookings tab
    const bookingsTab = document.querySelector('[data-tab="bookings"]');
    if (bookingsTab) activateTab(bookingsTab);

    // Pre-fill room fields
    setTimeout(() => {
      const roomSel = document.getElementById('roomNumber');
      if (roomSel) {
        for (const opt of roomSel.options) {
          if (opt.value === roomNo) {
            roomSel.value = roomNo;
            break;
          }
        }
      }
      const typeSel = document.getElementById('roomType');
      if (typeSel) {
        for (const opt of typeSel.options) {
          if (opt.text === roomType) {
            typeSel.value = opt.value;
            break;
          }
        }
      }
      showToast('Room Pre-selected', `Room ${roomNo} loaded into the booking form.`);
    }, 350);
  }
});
