

// === Sound helpers (WebAudio) ===
let __audioCtx = null;
function ensureAudioCtx_() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!__audioCtx) __audioCtx = new AC();
  try {
    if (__audioCtx.state === "suspended") __audioCtx.resume().catch(() => { });
  } catch (e) { }
  return __audioCtx;
}
function beep_(freq = 880, durSec = 0.12, vol = 0.18, type = "sine") {
  const ctx = ensureAudioCtx_();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g);
  g.connect(ctx.destination);
  const t = ctx.currentTime;
  o.start(t);
  try {
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durSec);
  } catch (e) { }
  o.stop(t + durSec);
}
const __okAudio = new Audio("data:audio/wav;base64,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");
const __errAudio = new Audio("data:audio/wav;base64,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");

function soundOk_() {
  beep_(880, 0.10, 0.22, "sine");
  setTimeout(() => beep_(1175, 0.08, 0.18, "sine"), 120);
  try { navigator.vibrate && navigator.vibrate(40); } catch (e) { }
  try { __okAudio.currentTime = 0; __okAudio.play().catch(() => { }); } catch (e) { }
}

function soundErr_() {
  beep_(220, 0.14, 0.20, "square");
  try { navigator.vibrate && navigator.vibrate([30, 30, 30]); } catch (e) { }
  try { __errAudio.currentTime = 0; __errAudio.play().catch(() => { }); } catch (e) { }
}

// Prime audio context on first user interaction (important on mobile)
document.addEventListener("pointerdown", () => { ensureAudioCtx_(); }, { once: true });

// Sound hint (mobile browsers require a user gesture)
let __soundEnabled = false;
function markSoundEnabled_() {
  __soundEnabled = true;
  const el = document.getElementById("soundHint");
  if (el) el.remove();
}
document.addEventListener("pointerdown", () => {
  ensureAudioCtx_();
  markSoundEnabled_();
}, { once: true });
window.addEventListener("load", () => {
  if (!document.getElementById("soundHint")) {
    setTimeout(() => { const el = document.getElementById('soundHint'); if (el) el.style.opacity = '0.9'; }, 20);
  }
});

// Scan QR page (Admin & Super Admin)
requireAdmin();



// Son de confirmation (scan -> pointage OK)
function playSuccessBeep() { soundOk_(); }

const toastEl = document.getElementById('toast');
const logoutBtn = document.getElementById('logoutBtn');
const scanStatusEl = document.getElementById('scanStatus');
const lastScanEl = document.getElementById('lastScan');
const toggleScanBtn = document.getElementById('toggleScanBtn');
const switchCamBtn = document.getElementById('switchCamBtn');
const manualCodeEl = document.getElementById('manualCode');
const manualSubmitBtn = document.getElementById('manualSubmit');


// Assign QR -> Volunteer modal
const assignModalEl = document.getElementById('assignQrModal');
const assignQrCodeEl = document.getElementById('assignQrCode');
const assignSearchEl = document.getElementById('assignSearch');
const assignListEl = document.getElementById('assignList');
const assignInfoEl = document.getElementById('assignInfo');
const copyQrBtn = document.getElementById('copyQrBtn');

let assignModal = null;
let pendingAssignCode = '';
let assignIndex = [];
let holdScan = false; // when modal is open, keep scanner paused

function normSearch(s) {
  let x = String(s || '').toLowerCase().trim();
  try { x = x.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { }
  return x;
}

async function copyToClipboard(text) {
  const t = String(text || '');
  if (!t) return false;
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch (e) {
    // fallback: hidden textarea
    try {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e2) {
      return false;
    }
  }
}

function ensureAssignModal() {
  if (!assignModalEl || !window.bootstrap) return null;
  if (!assignModal) assignModal = new bootstrap.Modal(assignModalEl, { backdrop: 'static' });
  return assignModal;
}

function buildAssignIndex() {
  assignIndex = (volunteers || []).map(v => {
    const key = normSearch(`${v.fullName || ''} ${v.badgeCode || ''}`);
    return { v, key };
  });
}

function renderAssignResults(query = '') {
  if (!assignListEl) return;
  const q = normSearch(query);
  let items = assignIndex;
  if (q) {
    items = assignIndex.filter(it => it.key.includes(q));
  }
  const total = items.length;
  items = items.slice(0, 80);

  if (assignInfoEl) {
    assignInfoEl.className = 'small text-muted2';
    assignInfoEl.textContent = total ? `${Math.min(80, total)} résultat(s) affiché(s) sur ${total}.` : 'Aucun résultat.';
  }

  assignListEl.innerHTML = items.map(({ v }) => {
    const name = escapeHtml(v.fullName || '—');
    const badge = escapeHtml(v.badgeCode || '');
    const id = escapeHtml(v.id || '');
    return `
      <div class="list-group-item bg-transparent text-white border border-light border-opacity-10 rounded-3 mb-2">
        <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
          <div>
            <div class="fw-semibold">${name}</div>
            <div class="small text-muted2">Badge: <code>${badge || '—'}</code></div>
          </div>
          <button class="btn btn-sm btn-primary" data-assign-id="${id}">Associer</button>
        </div>
      </div>`;
  }).join('');

  // bind events
  assignListEl.querySelectorAll('[data-assign-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-assign-id');
      if (!id) return;
      await assignQrToVolunteer(id);
    });
  });
}

async function punchVolunteerAfterAssign(v, rawCode) {
  const today = isoDate(new Date());
  setLast(`<span class="fw-semibold">${escapeHtml(v.fullName || '')}</span> <span class="opacity-75">—</span> <code>${escapeHtml(rawCode)}</code>`);
  setStatus(`⏳ Pointage en cours : <b>${escapeHtml(v.fullName || '')}</b>…`, 'ok');

  // Important: even when online, if a punch exists in the local sync queue (not yet synced),
  // we must treat it as "Déjà pointé".
  const alreadyLocal = await isAlreadyQueuedOrCachedPunch_(v.id, today);
  if (alreadyLocal) {
    soundErr_();
    setStatus(`⚠️ <b>${escapeHtml(v.fullName || '')}</b> est déjà pointé aujourd’hui (en attente de synchronisation).`, 'danger');
    toast('Déjà pointé');
    __showScanSuccessOverlay_('Déjà pointé');
    return;
  }

  try {
    let res = null;
    try {
      res = await apiPunch(v.id, today);
    } catch (e) {
      if (OfflineStore?.isLikelyOffline?.(e)) {
        const already = await isAlreadyQueuedOrCachedPunch_(v.id, today);
        if (already) {
          soundErr_();
          setStatus(`⚠️ <b>${escapeHtml(v.fullName || '')}</b> est déjà pointé aujourd’hui (hors-ligne).`, 'danger');
          toast('Déjà pointé');
          __showScanSuccessOverlay_('Déjà pointé');
          return;
        }
        try { await OfflineStore.enqueuePunch(v.id, today, 'scan'); } catch (_e) { }
        playSuccessBeep();
        __showScanSuccessOverlay_('Enregistré hors-ligne');
        return;
      }
      throw e;
    }
    if (res?.ok) {
      playSuccessBeep();
      __showScanSuccessOverlay_('');
      return;
    }
    if (res?.error === 'ALREADY_PUNCHED') {
      const t = res?.punchedAt ? formatTimeLocal(res.punchedAt) : '';
      const at = t ? ` à <b>${escapeHtml(t)}</b>` : '';
      // Same feedback as offline "déjà pointé"
      soundErr_();
      setStatus(`⚠️ <b>${escapeHtml(v.fullName || '')}</b> est déjà pointé aujourd’hui${at}.`, 'danger');
      toast('Déjà pointé');
      __showScanSuccessOverlay_('Déjà pointé');
      return;
    }
    if (res?.error === 'NOT_AUTHENTICATED') {
      logout();
      return;
    }
    setStatus(`❌ Erreur: ${escapeHtml(res?.error || 'UNKNOWN')}`, 'danger');
    toast('Erreur');
  } catch (e) {
    const offline = (!navigator.onLine) || (OfflineStore?.isLikelyOffline?.(e));
    if (offline) {
      const already = await isAlreadyQueuedOrCachedPunch_(v.id, today);
      if (already) {
        soundErr_();
        setStatus(`⚠️ <b>${escapeHtml(v.fullName || '')}</b> est déjà pointé aujourd’hui (hors-ligne).`, 'danger');
        toast('Déjà pointé');
        __showScanSuccessOverlay_('Déjà pointé');
        return;
      }
      try { await OfflineStore.enqueuePunch(v.id, today, 'scan'); } catch (_e) { }
      playSuccessBeep();
      __showScanSuccessOverlay_('Enregistré hors-ligne');
      return;
    }
    setStatus('❌ Erreur API (Apps Script).', 'danger');
    toast('Erreur API');
  }
}

async function assignQrToVolunteer(volunteerId) {
  const code = String(pendingAssignCode || '').trim();
  if (!code) { toast('Code manquant'); return; }

  // find volunteer from current list
  const v = (volunteers || []).find(x => String(x.id) === String(volunteerId));
  if (!v) {
    toast('Bénévole introuvable');
    return;
  }

  // disable buttons while updating
  assignListEl?.querySelectorAll('button').forEach(b => b.disabled = true);
  if (assignInfoEl) {
    assignInfoEl.className = 'small';
    assignInfoEl.innerHTML = '⏳ Association en cours…';
  }

  try {
    const res = await apiAssignQrCode(v.id, code);
    if (res?.ok) {
      // update local model + cache
      v.qrCode = code;
      writeLocal(volunteers);
      try { OfflineStore?.cacheVolunteersWrite?.(volunteers); } catch (e) { }
      buildIndex();
      buildAssignIndex();

      if (assignInfoEl) {
        assignInfoEl.className = 'small text-success';
        assignInfoEl.textContent = '✅ Code QR associé. Pointage en cours…';
      }

      // close modal then punch
      try {
        const m = ensureAssignModal();
        m?.hide();
      } catch (e) { }

      holdScan = false;
      // allow scanning again
      try { html5QrCode?.resume(); } catch (e) { }

      // avoid anti-bounce blocking the same code
      lastCode = '';
      lastAt = 0;

      await punchVolunteerAfterAssign(v, code);
      return;
    }
    if (res?.error === 'QR_ALREADY_EXISTS') {
      if (assignInfoEl) {
        assignInfoEl.className = 'small text-danger';
        assignInfoEl.textContent = '❌ Ce code QR est déjà utilisé par un autre bénévole.';
      }
      toast('Code QR déjà utilisé');
      soundErr_();
    } else if (res?.error === 'NOT_AUTHENTICATED') {
      logout();
      return;
    } else {
      if (assignInfoEl) {
        assignInfoEl.className = 'small text-danger';
        assignInfoEl.textContent = `❌ Erreur: ${res?.error || 'UNKNOWN'}`;
      }
      toast('Erreur');
    }
  } catch (e) {
    if (assignInfoEl) {
      assignInfoEl.className = 'small text-danger';
      assignInfoEl.textContent = '❌ Erreur API (Apps Script).';
    }
    toast('Erreur API');
  } finally {
    // re-enable buttons
    assignListEl?.querySelectorAll('button').forEach(b => b.disabled = false);
  }
}

function openAssignModal(rawCode) {
  pendingAssignCode = String(rawCode || '').trim();
  if (assignQrCodeEl) assignQrCodeEl.textContent = pendingAssignCode || '—';

  // copy automatically
  copyToClipboard(pendingAssignCode).then(ok => {
    if (ok) toast('Code copié');
  });

  buildAssignIndex();
  if (assignSearchEl) assignSearchEl.value = '';
  renderAssignResults('');

  holdScan = true;
  try { html5QrCode?.pause(true); } catch (e) { }

  const m = ensureAssignModal();
  m?.show();
  setTimeout(() => assignSearchEl?.focus(), 150);
}

assignSearchEl?.addEventListener('input', (e) => {
  renderAssignResults(e.target.value || '');
});

copyQrBtn?.addEventListener('click', async () => {
  const ok = await copyToClipboard(pendingAssignCode);
  toast(ok ? 'Copié' : 'Copie impossible');
});

assignModalEl?.addEventListener('hidden.bs.modal', () => {
  holdScan = false;
  // resume scan if running
  try { html5QrCode?.resume(); } catch (e) { }
});

function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.opacity = '1';
  setTimeout(() => (toastEl.style.opacity = '0'), 2200);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
}


function renderUserPill() {
  const el = document.getElementById("userPill");
  if (!el) return;

  // Ensure netDot exists inside the pill (left)
  let dot = el.querySelector("#netDot");
  if (!dot) {
    dot = document.createElement("span");
    dot.id = "netDot";
    dot.className = "net-dot net-unknown";
    dot.title = "Connexion";
    el.prepend(dot);
  }

  const u = localStorage.getItem("username") || "—";
  const r = (localStorage.getItem("role") || "—").toUpperCase();
  const roleClass = r === "SUPER_ADMIN" ? "badge-role-super" : (r === "ADMIN" ? "badge-role-admin" : "badge-role-unknown");

  // Remove everything except dot
  Array.from(el.childNodes).forEach(n => {
    if (n !== dot) el.removeChild(n);
  });

  const nameSpan = document.createElement("span");
  nameSpan.className = "me-2 user-name";
  nameSpan.textContent = String(u);

  const roleSpan = document.createElement("span");
  roleSpan.className = `badge ${roleClass}`;
  roleSpan.textContent = String(r);

  el.appendChild(nameSpan);
  el.appendChild(roleSpan);

}

// Net dot (online/offline) --------------------------------------------------
const __netDotEl = document.getElementById("netDot");
function __setNetDot(state) {
  if (!__netDotEl) return;
  __netDotEl.classList.remove("net-online", "net-offline", "net-unknown");
  if (state === "online") __netDotEl.classList.add("net-online");
  else if (state === "offline") __netDotEl.classList.add("net-offline");
  else __netDotEl.classList.add("net-unknown");
}
async function __checkNetworkStatus() {
  try {
    if (!navigator.onLine) { __setNetDot("offline"); return; }
    // ping API (authenticated pages)
    if (typeof apiMe === "function") {
      await apiMe();
    }
    __setNetDot("online");
  } catch (e) {
    __setNetDot("offline");
  }
}
// --------------------------------------------------------------------------



renderUserPill();
logoutBtn?.addEventListener('click', logout);

// Volunteers cache (shared key with admin page)
const LS_KEY = 'pointage_volunteers_cache_v1';
const LS_TS_KEY = 'pointage_volunteers_cache_ts_v1';

let volunteers = [];
let byCode = new Map();

function normalizeCode(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, '');
}


function formatTimeLocal(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return String(iso).slice(11, 16);
  }
}


function buildIndex() {
  byCode = new Map();
  (volunteers || []).forEach(v => {
    const code = normalizeCode(v.qrCode || '');
    if (code) byCode.set(code, v);
  });
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function writeLocal(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    localStorage.setItem(LS_TS_KEY, String(Date.now()));
  } catch (e) { }
}

async function loadVolunteers() {
  // fast path: local cache
  const cached = readLocal();
  if (cached?.length) {
    volunteers = cached;
    buildIndex();
  }

  // always refresh once in background to avoid stale list
  try {
    const res = await apiListVolunteers('');
    if (res?.ok) {
      volunteers = res.volunteers || [];
      writeLocal(volunteers);
      try { OfflineStore?.cacheVolunteersWrite?.(volunteers); } catch (e) { }
      buildIndex();
    } else if (res?.error === 'NOT_AUTHENTICATED') {
      logout();
    }
  } catch (e) {
    // offline / error -> keep cached
  }
}


// Success overlay (image) ---------------------------------------------------
let __scanSuccessOverlayEl = null;
let __scanSuccessHideTimer = null;

// Inline SVG icons (work fully offline, no HTTP/cache needed)
function __svgDataUri_(svg) {
  try {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(String(svg || '').trim());
  } catch (e) {
    return '';
  }
}

const __ICON_OK_URI_ = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAACXBIWXMAAA7EAAAOxAGVKw4bAAAFyGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDUgNzkuMTY0NTkwLCAyMDIwLzEyLzA5LTExOjU3OjQ0ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjIuMSAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDI1LTEyLTMwVDExOjEwOjUwKzAxOjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNS0xMi0zMFQxMToxODozMiswMTowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyNS0xMi0zMFQxMToxODozMiswMTowMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MjA3ZTY5ZmQtNDMyOC0yMTRiLTg2YTAtYTc2YjI2MTg2ZDZiIiB4bXBNTTpEb2N1bWVudElEPSJhZG9iZTpkb2NpZDpwaG90b3Nob3A6MTlkYzliYjQtMjE5NC1lNjQ3LThmYmQtYzg0OTZkMTNiYTM2IiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6MTY0ZWRjMTgtODIxZi02OTRiLWEzOGUtMzk2NGI0MjZhOTA4Ij4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDoxNjRlZGMxOC04MjFmLTY5NGItYTM4ZS0zOTY0YjQyNmE5MDgiIHN0RXZ0OndoZW49IjIwMjUtMTItMzBUMTE6MTA6NTArMDE6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMi4xIChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6MjA3ZTY5ZmQtNDMyOC0yMTRiLTg2YTAtYTc2YjI2MTg2ZDZiIiBzdEV2dDp3aGVuPSIyMDI1LTEyLTMwVDExOjE4OjMyKzAxOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjIuMSAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+V+kmgQAAW2VJREFUeJzt3XlgHOV9P/73MzN7aHWtDluXJR/YBh+AzeGDw0BuCFh2Ckl6pE3T/sg3aa62SQ2EhnzTNmAMuZpv07TJN0mv5BsSG9tJILdNCBgbsME32PKh+7BuaVe7M/P8/ljJyEayrpmd2X3eL+KEyNIzn9HuzvOemed5Rqz72T0YhxzvL8hxYry/eOaOJ9JZBxGRYy7RvwDsY9JpzD7GGONrfFHSb+R3Pm4QICLKEuxj0m/MPkYb55vIG/z9E1E24zHOWxf8/rXx/oI8w9eBiLIRj23+cP510C7+AvkCXw8iyiY8pvmLBN58C4B84pnbf8jXhogy3jO3/5Bjm3xKA5OZL6176r2W1zUQEc3Uuqfea3tdA41J8iyTiIhIQQwA/sarM0SUyXgM8zEGACIiIgUxABARESmIAYCIiEhBDABEREQKYgAgIiJSEAOAv3EBDSLKZDyG+RgDABERkYIYAHyKSwETUTbgscy/+ML41Lqn3ssFNIgo4/FY5l8MAP7E+2ZElE14TPMhBgD/4QeFiLIRj20+wwDgL/yAEFE24zHORwyvCyAA/FAQkTpGjnccG+AxNwMAOzUiIhoP+4jJcyUs8RYAERGRghgAiIiIFMQAQEREpCAGACIiIgUxABARESmIAYCIiEhBDABEREQKYgAgIiJSEAMAERGRghgAiIiIFMQAQEREpCAGACIiIgUxABARESmIAYCIiEhBDABEREQKYgAgIiJSEAMAERGRghgAiIiIFMQAQEREpCAGACIiIgUxABARESmIAYCIiEhBDABEREQKYgAgIiJSEAMAERGRghgAiIiIFMQAQEREpCAGACIiIgUxABARESmIAYCIiEhBDABEREQKYgAgIiJSEAMAERGRghgAiIiIFMQAQEREpCAGACIiIgUxABARESmIAYCIiEhBhtcFeOWZO56QXtdARJTNnrnjCa9LmLR1P7tHeF1DuikbAABAyjdngO7ubuzYsQPbt2/H0aNH0dTUhJ6eHg+qo3QrLCxEZWUllixZgvXr16O2thbRaNTrshzT3d2N7du3Y/v27Th27BiampoA4Pw+19bWYv369Vm1z11dXec/zyP7zM+zGqLR6Js+z4WFhWN+rxDK9f0AALHuZ/e4dSbs69/oM3c8IUcHgHg8jq9+9at45JFH0N3d7V1h5BvRaBT33XcfPvnJTyIcDntdzrTFYjF89atfxebNmyd8b2fTPn/lK1/B5s2b2eETAKCoqAj3338/PvGJTyAUCl3wd0IIv18BcKWfZgAA0NzcjA0bNmDv3r0eV0V+tHLlSjz55JOoqanxupQpa2pqwoYNG7Bv374p/dzKlSuxfft2VFdXu1SZe6a7z6SGNWvWYOvWraioqDj/NVUDgPKDAJuamrBmzRp2/jSu/fv346abbjp/yTxTNDY2YvXq1dPqCPfv348bb7xRqX0mNezZswdr165FS0uL16V4TukAEI/HsXHjRpw9e9brUsjn6uvrsWHDBsTjca9LmZRYLIYNGzagoaFh2m3U19dj48aNGbXPtbW1M9pnUsOZM2ewceNGDA0NeV2Kp5QOAF/5yld45k+Ttm/fPnzlK1/xuoxJ+dKXvoQXX3xxxu3s3bsXX/3qVx2oyH2PP/44XnrpJa/LoAyxZ88e/PM//7PXZXhK6TEA0WiUA/5oSqLRKOrq6lBUVOR1KePq6urC/PnzHRv8Fo1GcerUKV/PDujs7MSCBQs44I+mpLi4GHV1dYhGoxwDoBp2/jRVI1Pp/Gzbtm2OdoQq7jOpobOzEzt37vS6DM8oHQCIpmPHjh1el3BJbhzQVNxnUoPf39tuYgAgmqLDhw97XcIluVGfivtMalD5vcMAQDRFfp8a19zc7HibjY2NjrfpJDf2mdTg98+zmxgAiKaov79/zGWk/aK/vz8j2nSKlBIDAwNel0EZqq+vz+sSPMMAQEREpCAGACIiIgUxABARESmIAYCIiEhBDABEREQKYgAgIiJSEAMAERGRghgAiIiIFMQAQEREpCAGACIiIgUZXheQbUzThK7rXpdBwzRN8/WyveRfQgjYtu11GTTMsiwYBrssJ/EKABERkYIYAIiIiBTEAEBERKQgBgAiIiIFMQAQEREpiAGAiIhIQQwARERECmIAICIiUhADABERkYIYAIiIiBTEAEBERKQgBgAiIiIFaQCEC+260SYREZGKXOmneQWAiIhIQSMBwMl0wbN/IiIiZzneT2sXf8GJRomIiMhxjvbTF98CmEnj7PyJiIjc5Vg/PdYYAPHM7T+c9NiA4e9l509ERJQek+6nB2f93T3j9dNi3c/umejn5XgFTGbjfvXMHU+Mt18zYpomdF13o2maBk3TIKXzL7Vt2xDCnx8Bt+py4/foBCklNM358cxCCNi27Xi7ND2WZcEwDMfb1XUdlmVh3c/u8ecHenKm1U9n8g7PFAOAAhgAnMMAQF5yOwBAwf6Q0wCJiIgUxABARESkIAYAIiIiBTEAEBERKYgBgIiISEEMAERERApiACAiIlIQAwAREZGCGACIiIgUxABARESkIAYAIiIiBTEAEBERKYgBgIiISEEMAERERApiACAiIlIQAwAREZGCGACIiIgUZHhdAPmDbdt46aWXcOrUKTQ3NwMAKioqsGDBAlxzzTXQNGZFIqJswgCguMbGRjz88MP40Y9+hNbW1jG/p7y8HHfffTfuv/9+VFZWprlCIpqKs2fP4sc//jF++tOf4vjx42hra4OmaaioqMDy5ctx11134T3veQ9KSkq8LpXIM9KNP6Zpykxg27b8p3/6J5mTkzPpfYtEInLz5s3Stm2vy580IYQrr7Offwduvbf9yrZtV/ZXCOH1rk1Je3u7/PjHPy6DweCE+1ZQUCD/8R//UQ4ODnpd9qSZpunK66zr+si/K0d4XYCHXHnBTdOErutuNO2YoaEhfOADH8ATTzwxrZ9///vfj+9973sIBoMOV+Y8TdMgpfMvtW3bEMKfHx+36nLj9+gEKaUrt6iEELBt2/F23fDqq6+itrYWp0+fntLPrVixAtu3b0dNTY07hTnIsiwYhvMXrXVdh2VZgIL9IW/sKuhjH/vYtDt/APjBD36Ae++918GKiGi6XnrpJdx4441T7vwB4MCBA7jxxhvR1NTkfGHkewwAivnmN7+Jb33rWzNu53vf+x6+/e1vO1AREU1XS0sLNmzYgP7+/mm30dDQgI0bN2JoaMjByigTMAAopL+/Hw899JBj7T3wwAPo6+tzrD0impr77rsPDQ0NM25n7969+NrXvuZARZRJGAAU8u///u/jjvSfjra2NnznO99xrD0imrwjR47gv/7rvxxr7+GHH0ZPT49j7ZH/MQAoZOvWrY63uW3bNsfbJKKJ/fd///fI4DVHdHV1YefOnY61R/7HAKCIWCyG559/3vF2n332Wd47JPKAG501A4BaGAAU0dzc7OjZwgjTNM+vHEhE6SGlxLFjxxxv9+jRo463Sf7FAKCIc+fOudZ2R0eHa20T0Zt1dHQgmUw63m5jY6PjbZJ/MQAoori42LW2uaQoUXq5tdiT3xcxI2cxACiioqLCldXSRtYYJ6L0KSkpQSgUcrxdPutDLQwAiohEIrj++usdb3ft2rUIh8OOt0tE4xNCYMmSJY63u3TpUsfbJP9iAFDIhg0bHG+ztrbW8TaJaGJufPb4eVaLcg8/GEW5hwF1dXVh4cKF6OzsdKS9oqIinDhxwtXxBTPFhwE5hw8D8pfXX38dS5cuhWmajrRXWlqKuro65OfnO9Ke0/gwIOfxCoBCioqK8NnPftax9j7/+c/7uvMnymaLFi3CX/zFXzjW3t///d/7tvMndyiXeEZR7goAkDpbev/7348f/vCHM2rnPe95D370ox/59ix4BK8AOIdXAPzn3LlzWLVqFerq6mbUzs0334xf//rXCAQCDlXmPF4BcB6vAChGCIFvf/vbeMc73jHtNt71rnfhP/7jP3zbARKpoqSkBNu3b0c0Gp12GwsWLMCPf/xjX3f+5A4GAAXl5eXhpz/9KT796U9PKVEHAgFs2rQJP/nJT5Cbm+tihUQ0WcuXL8e+ffumNSvgxhtvxHPPPYdZs2a5UBn5ncqncEreArjYsWPH8IUvfAE7duzAwMDAmN+Tl5eH2tpafO5zn8PixYvTXOHM+O0WgCVtnOlvQF3fWZzqb0DDQDM6h7rRb8dgWxZ0oSFi5KAkVIQ5ueWYl1eNy/JrMC+vGtokt+f1LQBLWjjZdxZ1vWdwur8BDYPNODfUjZgVh5Sp+iJ6GKXhIlTnlqMiuABXFFdiQX41NDH1cxKVbwGM1tvbi82bN+MrX/kKBgcHL/m9paWlePDBB/HRj340Y878eQvAecrt8CgMAKPE43E888wzOHnyJFpaWgAA5eXlWLhwIW6++eaMnevvlwBwsOs4ftfyIl5ofxXN8UYMWYlJ/2xYD6EqUo7Vs1ZgXdlqLIkuvOT3exUAXjn3GnY1vYT9PXvRMNCGpD25pWo1TcJAEHMiFVgz+2rcOHsVlhddPqW6GADe0NbWhu3bt2Pnzp04ceIEGhsbEQgEUFFRgeXLl6O2thbvfve7M27AHwOA85Tb4VEYABTgZQCwpcTvWvdi65mn8WrXUdjShhASUk7/Y6cLHdeULEdtzdtxc9mqMb8n3QHg920v4kenf4ZXug7DlvaM9g8ANKFhRcky1Na8C7eUXQcxwWGKAUANDADOU26HR2EAUIBXAeCFtkP47utbcbTv4Iw7xPFcW3Il/nzRPbiy6IoLvp6uAHCg8zC+8/qPcKDzsCvbE1JgSfll+PP592BV0cpL1sUAkP0YAJyn3A6PwgCggHQHgH5zAN9+7f9he/3TsOXMzvYnI6AZ+IN5t+MDC96DvEBqYKbbAaAvOYD/OPlj/Pj0U7Ck84+YHk1IASE11M5/G+5d/EeIGDlj1sUAkP0YAJyn3A6PwgCggHQGgOO9J/HowW/gRO9Zx7c3kZpIBT606H24pWItdBc6QwCwbBu/bf49vvv6Ezg72OzKNsYlgMvz5+PvrvwIFhbMu+CvGADUwADgPOV2eBQGAAWkKwDsaX8Z//jKP6MvOfZMinRZWbIM//3xb+Hc/kbIpDP7LYICpddU4Q+/8peuXe6frMJgPj571cexetaK819jAFADA4DzlNvhURgAFJCOAPBM6wv4hwNfQ2KSo97dJqRAV30rOn/TjO69beg/3T2NRoC8+VFEV5Wh+LYKFM2ZDSn8sRJgWA/hcys+iRtnXweAAUAVDADOU26HR2EAUIDbAWDfuVfx2ZcendK0vnQQUkACsBMmelvOYfDVHgyc7EWstR+J7jis/iTsROr+vQjqMPICCBaFES7LQ95lRYgsnoWCeRHogdQB1y+d/4gcPYzN123C1cXLGAAUwQDgPOV2eBQGAAW4GQAaB5rw0b2fR89Qj+PtO0lIcUEHbsVN2Akb0rIBAQhNgx7SoYXeeN/OdLpiOpRF8rF5xSOYV1DKAKAABgDncSlgomkYshN4+OA3fN/5A28+e9fDBgIFQQSLwghGwwgUBC/o/AH4vvMHgNbBPjx6+P/45tYLUaZhACCahu+ffhKHul/zugzlHe05jB+c2uF1GUQZiQGAaIqMqlL8sG6712UQAAmBH7z2UxiXZ8Z69kR+wgBANEWL/vIKDCZ52dkvBsUgFt89/kqBRDQ2BgCiKYguKkbJqnLApdX2aDokZt9QjcDcMq8LIcooDABEUzD7zssm/VheSh9baFjwB3O8LoMoozAAEE1SsDiE0jWVXpdB4yheNQfB4pDXZRBlDAYAokkqWVMFIz/odRk0jkBBECUMaESTxgBANAlCEyh763yvy6AJlL91PoTGWzREk8EAQDQJRSvLkL+k2OsyaAL5S0oQXTHb6zKIMgIDANEEhBCovucK9dYJzVDV772CszSIJoEBgGgCs26tQeFVs7wugyYpetVslN1a43UZRL7HAEB0CaHiMOZ/cLnXZdAUzfvgcgSLc7wug8jXGACILuGyD1+N0KyI12XQFIVmRbDgw1cr+Hw3osljACAaR8XGpZh9S7XXZdA0zVpXjXl3X+F1GUS+xQBANIbSW+dj4V8sg23zFDJTCQnUfPBKlL9lrtelEPkSAwDRRWbfUo2lf7MSgp+OzCeAyz5xLWbfxkGBRBczvC6AyE+qbr8MCz6yAjDY+2cLPajj8r9ZBTsYRsfPX/O6HCLfUPn6pnSjUdM0oeu6G03TNGiaBiknfqm1oI4Ff34lKmoXKf2hyGaaJtG44yROfvtV2EPWhN8vhIBt22mojCbDsiwYhvPnrLquw7IsQMH+ULkdHoUBQAGTCQCFy0ux4ENXI/8KrvSngr7jnaj79qvoOdR+ye9jAPAXBgDnKbfDozAAKOBSASBUkYc5Gxah4p3zoQX5mqnETlho/vlpNGw7jqGWgTG/hwHAXxgAnKfcDo/CAKCAsQJA7vxCzH7HfJS/ZS4CeUG1PwWKS/Yl0frrM2j79Wn0n+y64O8YAPyFAcB5yu3wKAwACtA0DcIQyJ1biMLlpSheVYmCpSU846cLSNNGz+EOnNvThJ5DHRg82wNpSgYAH2EAcB5nAVBGM6WF3kQ/OuLn0J3oQ8yKY9CKoT85gPZ4F5b+/Y2IzM1HqDQCLcCR/TQ2YWiIXj0b0atnw07aGOoYxODpXvzLsf/ErHAx8gO5yNFzkKOHURjKx6xQCQqCeTAEgyRlLuUSzyi8ApChmmNt2N9+EIe6X8PR3jq0xNqRsIZgyolHdhPNlCF0BPUQKnNm4YqCBVhWtBgrSpajMlLmdWlZjVcAnKfcDo/CAJBBhqwEft/2En7V/Cxe7jiIQSuu9JuX/EMCCOtBrChZhturbsWNs69DUAt4XVbWYQBwnnI7PAoDQAawpIVfNP4OPzr9U5zoO+N1OUQTWlgwD3fPuwNvr7yZtwgcxADgPOV2eBQGAJ873P0avnn8f/BK5xGvSyGasquLl+B/Xf4nWBpd5HUpWYEBwHnK7fAoDAA+ZUuJH5zage+d+BHi1pDX5RBNW1gP4YOL7sH7598FofThduYYAJyn3A6PwgDgQwPmIB479G/4TfNzXpdC5Ji3V9yIv15+L3KNHK9LyVgMAM5TbodHYQDwma5EDx7a/yW80nnU61KIHCUBrCxahi9c8zcoDOZ7XU5GYgBwnnI7PIorAYCmx8gPYvnnb0LBkhKvSyFyTc+hDhz+38/CHEh6XQoNUzkAcGUU8pwW0HDF365m509Zr3B5KRb/zSoInYde8h7fheS5+X+2HMWryr0ugygtStdWYu4Hl3tdBhEDAHmr+KZqzNm42OsyiNKq+g8ux6zrKrwugxTHAECeCRQEsfBDV0IK5W69keIEgHkfXQEjP+h1KaQwBgDyTNV7lyJcFvG6DGXI4X/scf4Z+XtKj9zKCMruWuZ1GaQwPg2QPBGqykfVu+YBPPt3jBz9j0w9z/6NfwBDGDCgQ4OW+trw717KN4KBBQumtCAvak8AuLA1minb1jDvPTVofroOdmeP1+WQghgAyBNV774MeoQPTJmJkU5bAtChQYeOsAgiRwsjLELDf4IIieD5jl8T2pu68dGdvS1TLZowMWQnEEcCcTmEuBxCzI4jLhOwYMGCDQFAgwYwEkybkRvAnDvn4ex/vOJ1KaQgBgBKu0BBCLPXVXtdRsZ5o5OW0IWGkAgiX4sgT+SiQMtDRIQRFAHo0KELHZDyfOf+RguXlrookOrOhT7csQsBW1owYSGJJAbsOHrtfvTJAfTbgxiSCZjShiZ4hWCqpBSofFsVmrYdhdmX8LocUgwDAKVd8fXlCBaHvS4jY9iwYUsJQ+go0HIR1QoQ1QpQoOUigAB0oUFKQA5fDZCQMKU5rW3JUf990RehQ4cBHREtgtl6MSxpIwkTfXIAXVYPuu1e9MsYkrY5HAY0RoFJCJbmouiaCrTv5tMuKb0YACjtitZWQoBLMV7KyOV9AQ35Wi5KtSKU6FHkiwh0YQAS5wfumdJKW02p18w6/+IFYKBUFKHUKIIFCwNyEO1WFzrsLvTbgzBhQx8ec0BjE1Ki5KYqBgBKOwYASqtAQQiFl5ew8x+HPdz1B0UQJVohZuulKNYKYMDAyDm+laYOfzIkJCyk6hEQyBd5KDDyMRdV6LZ70Wp1oMPuRkImIIaHH9KFpBAoWBiFkReA2c8lgtOtoKAAXV1dXpfhCQYASqtwVS5CJXwi2sVGOv6IyEG5UYpyrRS5Iuf83410sn42ehqhBoFSLYpSLYoBxNFmdaDZ7MCAjI0aPEgjwrPzkFMVQd9xzgZIt8rKSmUDAD+FlFZ5C4q8LsFXRjr3XBHG5YEFuC60HAuNGkREGBZsWMPRINOkrgyk6o8ghAV6Na4LLcPlgXnIFTmwzs9fIACAkMidW+x1FUpaunSp1yV4hgGA0ipSxUehAsMD9WAhRwSxODAP14aWYa5RgQAMmNJKb+coZWotgCn+gZxcjfbwvhowMNeoxLWh5VgcmIewCMKElZEBxw05c/jZ8ML69eu9LsEzSt8CiEaj6O7u9roMpYRn8fK/BQuGMDBHL8dcvRI5Inx+AR43yVEd9sgiQEIICEOHpg0vDCQEhDYyZG/0/frhKYW2fCMw2Kk/tm2P2z4uasGUFgzomKdXokwrxlmrBY1mK0yY0KE7v9OZQgqEZ3FdjHQrKirCXXfd5XUZnlE6ANx333247777vC5DKVpY3YPcyGK7JXoRLjOqUSjyh68ETG/K3kRGOmQhUp27HtCh6Tp0Q4Om69B07Y1OP7XU36RH66euAAzf9x8OAbZlwzZt2KYFy7JSAWGkhlTjqZ8dviIQEkEsNuahTC/BKasB7WYXlJ08KCT0HIbjdPvsZz+LwsJCr8vwjNIB4JOf/CS2bt2KvXv3el2KOhR9x1nDHd58Yw6q9NnQoLsysE/K4WV7NQ1GwIAeMKAHNOiGDqFpF5yZy1QPPuqHJ7NU0CjDgUEY4oKz95FbBLZpwzJNWEkLVtKEPRwIRsJA6jaHhUKRj6sCl6NJa8MpswFxe0jNqwEG78im05o1a/Cxj33M6zI8pejhOCUcDmPbtm1Ys2YN6uvrvS5HDbbXBaSXHJ66V6oXYZExD/kiMjw4zrnOf+QsW9M1BIIBBIIB6IELO/yR75GTvG8/tQLeHByEEDCCBoygcT4QWEkTZiL1x7bsVBgQAhYsCClQrZWjKFiA15Nn0G51nn9mgSqEG68NjammpgZbt25FKBTyuhRPKR85KysrsWfPHqxatcrrUpQgkxZUGfOVWshHYKFRg6sDlyNX5Dg36E2+cbYfDAcRKcxFXlE+cgoiCISDEHrqo31+wJ4HRm9bCIFAKIic/Ahyi/KQG81FKCcETROpqwXShgkLEeTgqsDlWBSYByE02KokRilgJ7kUcDpcc801ePbZZ1FRUeF1KZ5TPgAAqRCwe/duPPLII4hGo16Xk9US3UNQ4aTOgoWwCOGq4OWYb8wBIJzpzIY7Vc3QEM4LI7coDzkFEQTDQQhNnA8GfgxZI4EgdXUggJyCVBjIyY/ACKYuRqYWOZKYr1fh6sBi5GihjFgDYcaERLKLAcBN0WgUmzdvxnPPPYfqaj6LBFDiUDwuOdaZUVdXF7Zv347t27fj2LFjqK+vx8DAgAflZaea9y3BvD9b7nUZrjJhoUSLYklgASIix5EObORsXw8YCOYEYYQC0DQt1c9n+KVjIVJXAcxEEolYEmYiCSklDGEghjiOJuvQYXXByPJxAaf+70HU/+iY12VkjdzcXFRXV2PJkiWora1FbW3tuCd4YvRTsBSi3A6PMmYAIHf9vnUfHnh5i9dluEICsGGhQp+NKwLzYUCHNdOz/lQPn+r4IyEEQoHzHWa2EUKkZggkLCQGh2AmktCkBktYOJ48hSarDRr0rD1obb7ufqyZtdLrMpSkagBQehAgpd/cvDkI6yHErSGvS3HUyGC/ecYcXGakLi/OtPOXUkLTNYRzc1L39Yc7/mzs/IE3BigGhgcPmkNJDA3GoSUElgQuQ0gL4nSyEcjCRw7n6GHMzavyugxSDMcAUFqVR2Zjbm523X8bWQN/oVGDRcbc81+bdnvDU+XCuWHkFecjmBM6/3UVjKwyGAgFkBvNQyg/B0LTcJleg4WBmvOPPM4m8/PmYHa4xOsySDEMAJRWhtCxtOgyr8twzMjjbxYH5mF+YA7smYzyHx7AFwgFECnKRTgvB0LLzsv9kzGy36FICLlFuTDCAczT52BxYN4FDx7KBlcVLYEusnuMA/kPAwCl3Yri7BgEONIJLQ7MxVy9Epa0pt0lSSkhNIGcgggihbnQA7pvR/Onm5QSQhcIF4QRLgxjfmgOFhvZFQKunpUdnwnKLBwDQGk3N68SIT2IIStzpz2NXIa+LFCDGr1yRvf7pZQwggZy8iPQDXb8Yxr+fRihALSAgYUDc2H12ziZPIvJL2DsTzl6GNWRcq/LIAXxCgCl3axwMUrDUa/LmBEbFuYaVZhvzBl+sO00euzhEf6h3DByo3nQRjp/GldqHQEgmB/G0qJFmB+YM7x2QOYqDRdhVoiPAqb0YwCgtMszchEWhRAiMzs7EyYqjdlYGKiGLafX+Z+/5J8fQU5ezsgXHa40e0kpYeQEcGXpElSHy2FKdx6o5D6BaCAXYV3tJWnJGwwA5IlcrSAjL9taw4v8XG7Mn/rDc4ZJKaEbOiLRPARzQjzrnybbtqEHdFwzazlmh0tdf5yyOyQKguo+jY68xQBAnohGNNgysyKABRs5IowlgcugQx9+mt3UjNzvz43mvTHQj6bNljYCWhDXFC9HrhHJyNsBIZ79k0cYAMgTWoYt6yohoUM7v7zvdNb1l1IiEA4itzAv9bAedv6OsKSF/GAeVhYvhS4yL1Rl9hBGymQMAOSJTFsJ0IKN+YE5KNWKprW2v5QSoZwQIgWR1IKjGdZJ+Z1pm6iMlOHywssy7ipAzMzc2TCU2RgAyBN9VszrEibNgoVZenFqrv80z/xDOSGE83NcqI5GmLaFxQXzUZ4zO2MGBWqajY4BBgDyBgMApV3cGkLfUK/XZUyKhERYBLHImAsBMeVBf1JKBHOCCOdHFHzUSHpJSOhCx1XFVyCsh2FnwFUW29aQ0M4haSe9LoUUxABAadeZ6EFnosfrMiYl9YCfauSLyJTv+0spEQwHkZMfAQQX90kHS1ooDBZgSeHCaY3T8ELnUDc6h7q9LoMUxABAadcQb0N/ot/rMiZkwUKpFkWVPnvKl/5To/0DyCmIDH/BhQIziISELeX5dRPcXMLXsi3Mz5uD8vCsjLgV0GP2o2Wg1esySEEMAJR2RzqOAMLf18MlJAwYuCxQDW2Kl/6llNAD+hsD/hQlIZG0k0jaJgQEQnoAOXoYOjTYUiJhJ2BJ58/SR24FLIkuQkAL+P55AUICB7qPe10GKYjPAqC0kpB4ufOw12VMyIKNaqMcBSJ/SqP+pZTQNA2R/Ag0Xcu4KWlOSdpJGJqBy/LnYWHBXFRGypBrRCCEgGkn0R7vwtmBRrzWU4euRA8MEYDmYCg0pYXScBHm5c3B6z2nYGg+PtQJ4KX2V/GnC9/DKYGUVj7+VFA2OtPfhOM9dV6XcUk2bEREGDVG5bTOHsP5OdADhrKdf8JOoia3EuvKVqEmr2rM74kGC7GoYB7WzFqJfR2v4sWOV2FJy9FH4trSxqL8+WgabEXMjEMTPr3gKYHjfXWoH2xCTWTs3xeRG3z6iaBstbvled+vASAhUW2UIwfhKQ0kkzL1YJ9gOKh057+yeBneN//OcTv/0XKNCG4tX4MNNe9Ajh52dA6/LW3kBSJYkDcXtgu3GpwUt4awq3mP12WQYhgAKG0GzRiebtztdRmXZMNGroigQp895Uv/RtBAOBL2/T1ntyTsBK4qWoJ3Vd2CgBaY0s8uLJiH9TVvR0AEHJ2+Z9kW5uVXIT+Q5/sQ8HTDbsTMuNdlkEIYAChtftX8LJoG/T3aWUJijlGOEKY2eEzTtNRT/TQoOeJ/yEpiYf58vKtqHcQ07+XPy5uDG8uvg+XgyH0bEjl6GAvya6b17IZ0ahxswa+af+91GaQQBgBKi77kAL5/crvXZVySDYmIyEGZXjKlaX8jl/71gKFk55+wk5gTKcOd1W+Z8WC7a0uuREXE2ZX8LGmhOrcCeUbE91cBvn/qSfQnB7wugxTBAEBp8d8nnkRTvM3rMi7Jho0KYxbCCE767F9KiUAwgGCOmvf9k7aJ4mAh7qp5GyLGzJc6NoSOK4uugG0797u0pUSOnoPq3Okt5ZxOjYOt+O8T/g7KlD0YAMh1h7qP4Udnfurrs2MJiRCCKNdKpnSpWGgC4bzwtC97ZzJTWgjrIdxV8zYUh6KOtTs3twoRw9mlfG3YqMmtRI4W8vcYDQk8cfaneLXrmNeVkAIYAMhV3YlebH71X5H0+YpsNmyU6tEpPep35CE/Kk75s6UNTWh4d/VbUBUpd7TtolAhcgMRSAfP1m1pIz+Qh7KcWbBsfz8tMGkn8ejBb6An0ed1KZTlGADINaZt4uFX/wVnB5q8LuWSJAANGsr0Ukx26T4pJXRDRzDi8zNKF0hIWNLG2ytuwuKC+Y63rwsdOXrY8VAlhMCc3Irh9QD8/ZrVDzTji698nQ8JIlcxAJArbCnx2KFvYk/7y16XMiEJG3laBFFtaqv+hSIhaJrm977EcUkriRtnX4eVJctc24Ybv1LLNlEaKkJhMN+VJYidtqdjPx479K2MeKohZSYGAHJc0jbxyMF/wVM+n/M/woZEqVaEwCQXxpRSwggYCCi44M+QncDVJUtxc/n1rm3DlBZiVtzxcRUSQFAPoixnVsZ0qk83/hYPH/w/vBJArmAAIEedS3Tj71/agp9nSOcvIRGAjhItOunBfwJAMCek3MC/ISuBRQXz8c7Kda6uWd811IOB5CCEC4cnKSXKw7MQ0IyMuXXzi8Zn8MBLj6JjqMvrUijLMACQYw53v4ZP7v0Cnu/Y73UpkyYhkatFkKdFJtUhpJ70ZyAQDih19p+0k6iKlOPOOTOf6z+RMwMNiFlxRx8ONMKWNqKhAhQE8jLmKgAA7O14BZ/a9w843P2a16VQFmEAIEf8vu1FfGbfF1Hf1+B1KVNiQ6JIK4AhJn9GGMgJKnX2n7RNRIOFWO/QXP9LMaWJg53HoLl0hUFCIiAMlIaLfb8o0MXq+xrwdy8+jN+3veh1KZQlGABoxp5t3Yf/feArGDAHvS5lynRoiGoFkx51phs6AiF1zv5NaSFHD2F9tbNz/cfzUsdBNMfaXb7KIFAaKobu16cDXkJ/cgCf3/9lPNO61+tSKAtk3ieAfOXlc4fwD698DUNWwutSpsweXvynQMud1Nx/KSUC4UBq5L8CLpjrn+vsXP+xnOlvwLNtL8Jw8JHAY7FhoyhUiLAednStgXRJ2En80yv/jAOdh70uhTKcGkcyckXzYBv+8ZV/9v3jfccjIZGnRxCc5IN/hCYQCE3tKXeZSkLCljbeVnEjFrkw1/9iHfFO/KT+N0ja5vA8ffdIaSOkB1EYzIOVoVdy4tYQvnDga2iO+Xt5bfI3BgCaFlOa2Hzw33Aug0cmS0jka7nQJvExGJn6pxlqrPqXsJJYO/taXFOy3PVt9ScHsL3+l+hJ9rl+9g+k7vYYwkBhsCCjX8tzQ1145NC/+n5lQ/IvBgCalh+d+Qn2d77qdRkzokNDgcid/OC/cNDFyW/+MWQlsKJ4KdaVr3J9Wwk7iZ31v0ZrrB1BLX1XV6S0URQshK5pGTIZcGwHOg5h2+mnvC6DMhQDAE1ZU6wN/3Vih9dlzIiEhC50RLSciQOABDRdg6HAmv8JK4lFBfPwzip35/oDqdUin27chbq+swhqQVe39aZtQ6IgkAdDGMj0pRy/W7cVzbF2r8ugDMQAQFP2PyefRF+y3+syZkRCIowQAghMePiXSF3+F3p2n/8n7SQqI7Px7uq3uj7XHwB2tTyPg13HEdLT2/kDqdc0qAddeeZAuvUl+/H9uie9LoMyEAPARbq6uvCd73wHGzduxBVXXIG8vDwIITz5YxgGKisrcf3112PTpk14/vnnvf71oHGwBb9qetbrMmZMQiIiQjCgT+oWgBEKuH5G7CXTNhENFuCumrch1+W5/gCwr+MVvNC+P62X/S8ggYAIINfImdLjn/3ql03PonGwxesy8Nxzz+Hv/u7vcN1116GyshKGYXh2/MzLy8OSJUuwceNGfPe730VXV+aOV3JL9h7RJiZHJ/9YLIYvf/nLePTRR9HT0+NhWZd2yy23YMuWLbj+evfWYr+Ubx7/Pv6nbpsn23aSKS3MDVTiisB8mPLSg6iEEMgtzoOmZ+eDfyxpIaQFcc/8dzv+aN+xHO0+gR31v4IAXB/xfykBzcDL5w7h9d7TCKThioerJPCBRRvxl4v+0JPNv/DCC/jMZz6D3/3ud55sfzKi0Sg2bdqET33qUwiHwxf83fDCXsr1h7wCAKCpqQm33HILPvvZz/q68weA3bt3Y+3atdi8eXPatx0z49jV8lzat+sGIQTCIjhhhz7y2N9sfeqfLW0IoeGO6rekpfM/09+Ipxp3AZCedv4jcvQcV5YcTjsB/LZ5jydTcv/t3/4NN910k687fwDo7u7G/fffjxtuuAFnz571uhxf8P4T6LHGxkasXr0a+/bt87qUSbMsC/fddx8eeuihtG73aPcJNA22pnWbbtEAhEVoUpf/9aCR1qV/pZRI2iaGrATi1tD5/03YCZjScuwhNhISlrTx9oobsTgdc/2HOrGz/ldI2AnoaZjuNxEpJSJGOGtu7TQMNONI14m0bvPBBx/Ehz/8YZimmdbtzsT+/ftx0003oampyetSPJfh171mJh6PY8OGDWhoyKz160f8wz/8A5YuXYr3ve99adney+2vQApAZMGZsIA2vADQBN8nUsv/poNEquMP6UHMzSlHVaQchcF86EJDwkri3FA3Ggab0R7vhC2tGV+2TlpJ3FR2PVamYa5/X3IA28/8En3JfgS8uu9/EQkgbGTPUx11zcbuhmO4pnRZWrb3P//zP/jiF7+Ylm05rb6+Hu95z3uwe/duhEIhr8vxjNIB4Etf+hJefDFzH6whpcRHPvIRvOMd70BRUZGr2+pO9OJQ34ms6PxHBMTEb38hNOiG7vpIcUtaEBBYUbwU15QsR3nOrHG/73RfA/Z2vIJT/fUIiOldnRiyE1hZsgw3p2Gu/5CdwM76X6E13uHdoL8xSQRFEAICEpl/A9iyNZxNHEZP4h0oDOa7uq3u7m58/OMfz+gZFC+88AK+9rWv4TOf+YzXpXhG6VsAW7Zs8bqEGevq6sLjjz/u+nYaBlpxqj8zr5RcTELCEPrwCoDjH8CklNAMHUJzt2swbQsRIwe1Ne/AHXNuG7fzBwBd6LisYC7eO/9O3Fq++vySvVORsBNYVDAf70jTXP+fN+7Gqf56n3X+qVde17SsWAtgxJn+BjTHm13fzqOPPorOzk7Xt+O2hx9+2PfjvtykdADo7u72ugRHfPe733U9ibfE2tGb6HV1G+kiARjQoYmJV4HTdM3VS8SWtJAbyMF75t6OywsXTPrndKHhhtnX4e2VN0MCk362fWqufznunPOWtCy7+9uRuf5pXuhnsnShwdB0ZPCJ7AW6Ej1oGexwdRtSSvznf/6nq9tIl66uLuzYkdmLms2E0gEgWzQ2NuLAgQOubqMt3j7pTiYTCGiTOvvVDfc+IhISAgLvrLoFVZGyabWxsmQZ3lJxA2xYE74+pkzN9V9f/TZE0jDXf2+7x3P9J5T6/admI2THe9uWEs0uB4CXX345Y8dNjYUBgDLe4cPuPhq0J0vO/lNSB/6JAoAQApru3lly0k5iWXTxjEfgX196FW4pXw1TmuPOELCkhbAewvrqt6M4FJ3R9ibjSPfr+G3LczCE7ttR9qn7/hO/DzJNT6LP1fbdPtak25EjR7wuwTMMAFnC7SktQ3bC1fbTTROTO+xrmnDl3FBCIqgFcW3plY60t3bWtbhx9nVI2sk31WtLG5rQcMect6AqNz1z/Z9u2A3A24V+JiRTIU/3c43T4PZntbnZ/TEG6aTydMDseucrzP2pTNl1ljQZQggIXYMbN4gt20JFZDbKckoda/OW8tW4vnQFEqM6gJG5/m9VdK6/mty9nZEt0yZHZNv+TAUDQJaorKx0tf2wll1zZe2JltORMjUA0KXgY0kbFTmzHW//rRU3YEXxMgxZCUhIJKwkbph9La5J81z/dDxMaMZEakCbNcVZFH4X1t39rFZUVLjafrq5fez0MwaALLF06VJX2y8I5rnafnoJSCkvGQEkkJr+59LJgSYECgLO/041oeGdVeuwrGgx+pODWFmyFOvSNNf/J8Nz/f2y0M9EBFJXSJxaWdEvCgLurgHg9rEm3bJtf6aCASAL1NTUYMWKFa5uY3a4NDvWTB8mJ74GkLo06Noui+H5584zhI53Vd2Ct1fdhLdW3JSWuf5PN+xGnQ/n+l+aGLWOQna8tzUhUJY729VtXHPNNaiurnZ1G+lUW1vrdQmeUToARKNRr0twxJ/+6Z+6fh+rPGc2CoOFrm4jXQRSTwO0pX3pw75wb4S4hETcdu/BLWE9hJtmX4+Q7v78+10tz+NQt3/n+l+KJW2Y0kK2ZNtoqBDlEXcDgBACH/jAB1zdRroUFxfjzjvv9LoMzygdAO677z6vS5ix0tJSfPrTn3Z9O3NyyzA3t8r17aSDgIAJa/g58OMf+d0MVVJKdA1l/gpkezv8Ptd/fAKp6ZGmbSJbrgDMy52DqtD4K0k65TOf+QxKSkpc347bHnjgARQWZseJzXQoHQA++clPYtUq9++PukUIgW984xtpeQNHgwVYUjwXkNlxoASAJC79BDM3zwoNTUfjYMtw55OZjvacwK7m56H7eK7/pQkk7OTwgkyZTwpgef5lrj8HAEhdPf3617+e0SPo165di4997GNel+EppQNAOBzGtm3bMvZ+1kMPPYS77747bdtbXXxddjwKEKkxAAk74dmBXxc6Ooa6UNefmc8lP9PfiKfqfwsJ6e+5/pcgAMTNoYx+oM1oQgLXzF6Rtu29//3vx4MPPpi27Tlp7ty52Lp1q9JPAgQUDwBAagrICy+8gNWrV3tdyqQZhoFHHnkEDz30UFq3e0XhQlROc8lav7EBxDE0wZmru/FASok97QdgSsvV7TitIz4y1z+Z0XP9hRAYNONZMwtgTm4FlkQXpnWbX/jCF/DNb34TgUDm3AJas2YNnn/+eZSXu78olt8pHwCA1LzWXbt2YfPmzb4fGHjbbbdhz5492LRpU9q3nWOEcWv5DWnfrhuklIjLxATX+d3tGAKagYaBZjzbus/V7TipLzmAJ8/+Er2ZMtd/AjErljXPuLilbLXrawCM5d5778Vzzz2HW2+9Ne3bnoqioiI8+uij2LVrV9atZTBdmXsDZ+bkWJf+uru7sX37dmzfvh1Hjx5FQ0MD+vv7PSgP0HUdZWVlmDNnDm677TZs3LjR8ysVDQPN+Mvfb0LMintax0xZsDBbL8GVgcVjngFKKRHODSOcl+PqJeLUSn0W3l55M64tcWZZYLckrAR+fOZp1PXXI5SBg/5GG7nys6f9ZTTF2tLyZEQ35ehhfOumzZgT8bZj27NnD5588kn85je/QWNjI1pbW2FZ3lzhysvLQ3V1NZYsWYLa2lqsX79+3BO84bEMyvWHyu3wKGMGAJrYlkPfxE/qf+11GTNiw0aeiOCa0DIY0N8UAqSUCOWGkeNyAABSa/VLSNwx5zZcWXSFq9uaLlva+En9b3Cw+1hGTve7mBACSdvEMy0voC/Zn7HjGEbcVf02fHr5vV6XkbFUDQCZ/a4nT/zRgg3INzJ7ZUABgbhMIAlz3E+9tNMTEDWRWnL46YbdON5Tl5ZtTtWulj1Z0/kDqdc/YSUQs+IZPZIdAAqMCP54wQavy6AMxABAU1YVKcOfLFzvdRkzIiBgwcKAjF1iIGD6rhBpQoMNiZ/W/xon+86kbbuTkZrrfyAj5/qPR4NAb7Ifpsz8NQD+aPHdqHB58R/KTgwANC13z7sTK4rdf8CMmyzY6LX6xg0A0pZpnSKmCw1JaWJn/a9xdsAfjyg90j0y19+9ByN5QQgN3YkeWPYEq0H63LVFy3BPze1el0EZigGApsUQBjZd+WGUhKNelzJtAkC/HISNsZ8Gl65bAKPpQkfcimP72V+iJdae9u2PdnagEU837oIEMv4e+WippaBNdCf6Mvryf3Eois9c9ZGMH8BI3smeTzWlXWWkDA9e/QlPph45QUBDvz2IBJJvOrsVQkDatieLxBjCQH9yANvO/hznhrrSvn0A6Ih3YefZXyNhJaBnUecPpF73ISuBnkQv9AwNAGE9hAev/gQv/dOMZNcnm9LumuLl+OzVH8+YR8COpkFgSCbQaw9AG+OjYNsydRXAgz4ioBnoGurB1jNPozvRm9Zt9ycH8OTZX6An2ZcVc/0vpmkauoZ6ELeGIDLwEBjQArj/qr/CtSWZfQuOvJd5737ynXVlq/DQik8h18jxupQps2Cj2x6/g7Vt27N730EtgPZ4J7ad+Tn6kgNp2WbCTmJn/a/RFu/IqkF/F5ASHUOdsOTYt378LNfIwUMrPolby9d4XQplAQYAcsTNZddj83X3oTo3s5bX1CDQZffChPmmjl5KCdvytpMIagE0xdqw/ewvEDPdXXzJlhI/b9yNur6zWdv5C6Tm/7fHOzNuXEN1bjk2X38/bi7L3AeYkb9k1ieAfO3KoiX48qqHsKp0hdelTJqAQL89iH45OOaZvm16f5YY0gI4M9CIHcPr77tld8vzONh1DCE9O+b6j0UTGroTvcOL/2TO/f9rS6/Cl1Z9DldG/blQFGUmBgBy1KxwCb547WfwjqqbvS5lUgQETFg4Z3WNEwAsXzwtLqQFcbL3NHae/RWSLjxCeG/HK9jTvj8jx3JMhYBAS6wdSfvNV3z86h2V67D52k2YHS71uhTKMgwA5LiAFsD9V/4V3lm1zutSJkWDQIfdDRMXdqwCArblzUyAsQT1II71nMRTDbscvX99tPsEftv8PHShZ0ynOB0CQMJOoCXenjFn/++qugX3X/XRrA9m5A0GAHKFJjR8Zvn/wg1F18PvK62NTAfstvugQx/9F7BtO3UbwCcdRkgP4mDXMfyy6XeOtHe2vwlPN+4CkF1z/ceiawY64l3oTfRlxNTG1bNW4m+X35v1rwt5h+8sck1AM/C3138IFfmlENIfHehYBFIPB2q1OnDx8r9SSljJ8Z8X4IWgHsBL5w7it83Pz6id9ngndtb/CkNZONd/LFJKNAw2w5Y2/B5K5+RW4IGr/iprB2OSP2T/p548VaqX4L7l/r+EqUHDObsbAzL+pjUBrKQ3jzMdj4BAUAvg+faX8bvWfdNqoyvRgyfP/jxr5/pfTBMa+pL9aI21Q9f8vXJeQDNw35UfQTRY4HUplOUYAMh1K6LLsHHeO319zjXydMAWux3aqEqFEDBN0/PpgBcTEAgIA8+27sUvm343pdkB9QPNeOLUT9Ee71TmDFODhrMDTYhZQ/4e5yCAP6h5t28fC03ZhQGA0uIDl21Eec4sr8u4JA0aWswODCFxQSchbQnLNH23brwQAoZmYF/Hq/ifk0/iSPfrGLIT435/51A3ftP8HH54+ifoHOpWp/MXAoNWDGcHmnx/q6MyUoYPLNzgdRmkiOy/9ke+kB/Iwx9etgFfOvTvXpcyLg0CgzKGZqsD8/RKmEhd+pdSwkyYCIT8Nz9+5HZAS6wDO+p/hZJQFFU5ZZiVU4ocIwxLWuhN9KF5sA1NsTYMmjEEhKHEZf8RutBRP9CMAXPQ9w/O+aP565EXyPW6DFKEOkcB8tzbK27CD+p2oGmw1etSxiUg0Gi1okIvhQEDEjL19LiEmVoW2GdXAUYYw/e1O4e60RHvhOySkHJk8oKAgIAudGXO+kdoEIhZcZzqO3vBrR0/qoyU4W2VmbF+BmUHf18Po6wSMXLwzqpbvC7jkjRoGLAH0Wy1vzElUKTWA7BMy7cBYIQudAS0AIJaECE9iKAWRFALIKAZGTP33Um6puN0X8Pwyn/+PtzdPuc25Ohhr8sghfj7E0FZ59bytb5/fLCAQL3ZgtioGQFSSiTj7i3DS85LjfwfQF3fWd93/mE9hFvLV3tdBinG358Kyjpz8yqxqGC+ry/GatAQk3GctZrOnzULIWAOJWFZlt+nkNMwTQi83nsa/eagrwOAALCoYAGqcyu9LoUU499PBWUlAYFrSq/0uowJadDQaLYNrw6Y+pjYtg1zKHPWkFeZIXR0xLtwpr/h/PgIP7uu9Eq+ryjtGAAo7a4pXALb58c6AYEkTNSZ9bAhzx+ck/GEb54NQGMTEDClhSPdryMpk77vWG0BrORT/sgDDACUduW5s1Fg+H+qkwEdHVY3muw26NBStwGSJsyE/9YEoDfomo5T/fVojXfAEP6f6FRo5KE8UuZ1GaQgBgBKu6JQFEXBqNdlTIoGgbpkPfrk4PkBgYnYkMdV0Xh0oaNnqBfHek6+aUlnvyoKFaI4HPW6DFJQZnxCKKuE9CAKwxFkwmg6AYEhmcDr5mlISGhCg5kwkUwkeRXAZwQELGnhla6jiFvxjJj2KAVQbBT4/lkZlJ0YAMgT+UYBLn7ynl/p0NFudeGM1QQdGqSUSAwmAI4F8BVD0/FaTx1aYu0ZcekfAIQEcoN5XpdBimIAIE/4fS2Ai+nQcCrZgA7ZBUMYMIcSSHIsgG8YmoGmwVYc663z/XK/FwsZ/ltimtTAAECeyLSR9AICFmwcTdRhUMagQcPQYDzj9iMb6UJDX6If+zsPw5b+X63xYnwPkVcYAMgTcTPzBtLpwwsEHTXrYAkbdsJGIpbIuA4nm2jQkLRNvNx5CANmDHqGnf0DQNzKvM8CZQcGAPJET6LX6xKmRYeOc1Y3jpt1gACSg0OwLdvrspSkQQACONB5ZHjKX+Z1/gDQY/Z7XQIpigGA0i5mxdFrDnhdxrQZ0NFktuOkdRawgKHBIV4FSDMBAU3TcKjrOM70NyCQIYP+xtI71MurAOQJBgBKu/Z4J87Fu7wuY0Y06DiTbMIpuxFWLInkEKcFpouAgK7pONp9Aq/11kHPgKV+L+Xc8COcidKNAYDSrnGwFTEr7nUZMyKQ6ohOJs/ijNkMcyAJactMWNogowkIGCI13e9w9+vQhOb7pX4nMmjG0TjY6HUZpCAGAEq7A+cOeV2CI8TwP6+bZ1AXP4tkfyLjOyM/ExDQhYbjvSdxsOsYNCGy5Pctsb/zmNdFkIIYACitLGnh1e7sOdiNdEGvmWdwrP8krLjp60fPZqqRzv9ozwkc7DoGkTWdf8orXUdhScvrMkgxPFJRWrXGO3Cqt97rMhwlIKBB4KRZj4Ndx2AlGQKcNHKZ/9Wuozjc/RpEFlz2v9jpvga0xc55XQYphkcpSqsz/Q0Zf/9/LKkQoKEu0YAXOw8iaZsZOSfdb3Shw7RNvHjuFRzvqcuKe/5jGTRjODPAcQCUXpk7d8YlnZ2dePLJJ7Fjxw4cPXoUjY2NGBjI3ClrflP93isw/4NXel2GKwQAQ+hoiDVjqD2Ba4uvRH4wD6Ztel1aRjI0A32JfrzceQhtsQ4YWnYfrk71ncWaWStn3M65c+ewbds27NixA8eOHUNjYyOEEKiqqsKSJUuwfv16bNy4EUVFRQ5U7Q+X2uelS5firrvuyrp9dkL2RenJk6OX4IzFYvjSl76ERx99FL29mblITSZY/MlrUf7OBV6X4TpTWsg1crCiaCmqcsth2hZkhjz8yGsCAoamo2mwFfs7D2PAjGXsIj9Tsb7mrfjbZR+e9s8PDg7i8ccfx5YtW9DX13fJ7y0sLMSmTZvw13/91wiHw9PeptcGBwfx2GOP4bHHHpvRPg9P4VWuP1Ruh0c5HwCampqwYcMG7Nu3z+OSst+Vn1uL6JpqCAU6Q1va0KDh8uhlWFwwH7rQOdBrArrQYUsLx3tP4XjPydTvUIXxFFJgXcU1+IeVm6b1442NjdiwYQNefPHFKf3cihUrsH37dtTU1Exru15qbGxEbW0tXnrppSn93Fj7rGoAUOCTdWmNjY1YvXo1O/80kcGAEp0/kBq8JoXE4a7jeK7tJfQm+2BoRlbew56p1Fm/gd5kH55rexmHuo9DSqlG5w8AQmLInN6S0mfPnsX1118/5c4fAA4cOIAbb7wRTU1N09q2V0b2eaqdP5Da55tuuinj9tkNiny6xhaLxVBbW4uGhgavS1GGaovljXRsrbEOPNO6F6/3noKEVOKS9mSN/C5O9J7G71r3oiXWhoAwlFtZ0cLUA8Dg4CBqa2vR3Nw87e02NDRgw4YNiMczY3DuwMAA1q9fP6N9rq+vx8aNGzNmn92idAD48pe/PK0ESTMwzbOcTGdoOhJWAgc6j+D3bS+hY6gLhtDVOcMdgyY0GMJAx1AXnmt7Efs7D2PISmT9YL/xBKYRCrds2YIDBw7MeNv79u3DV7/61Rm3kw5btmzBK6+8MuN29u7di6997WsOVJS51IrYF5KFhYXo6enxug6lLNu0CsW3zFPmNsBYTNtCQDMwN7cKiwsXIC8QgSVt2FKNcKQJDbrQ0J8cxOt9p3C6rwFJ24SR4Wv6z4gUePuc1Xjwqr+Z9I+cO3cO8+fPn3Dw22RFo1GcOnUK0WjUkfbc0NHRgQULFji2z0VFRairqxuZHaBcf6ju6QfAzt8DsXNDSnf+QOpqgA0bJ/pOY3frHhzpPnH+zFfL4svemkjdDhmyEjjacxK7W/fg9Z5TsGGr3fkDgJAoDZVN6Ue2bt3qWEcIAN3d3di+fbtj7bnB6X3u6urCjh07HGsv0ygdACj9Yg3OfXgz2cjYgJgZx6GuY9jdsgev9dQhfj4IZM9HUxPa+Y7/eM9J7G7Zg4OdxxAz4xwUOUp1pHxK379z507Ha3CjTSepuM9uUvNmG3mmt64HQgKSx3wAqc5RExoGzEG80nUUJ/rOoCa3AjW5VcgP5EEAsKSdcWsIjKzdLwH0JftRP9CM+oFG9JmD0Ibn+dMbhBSYH50/pZ85fPiw43UcOXLE8TadpOI+u4kBgNJqqLkP8Y5BhGZFvC7FVzShQQMQM2M42n0Cp/rqMTunFHMiFZgVLkZQD0JKCdvHYUBApJbqFUDSMtEW70D9QDNaY+2IW0PDg/7Y8Y+lLFKKmpypXQFoaWlxvA6/T41TcZ/dxABAaWX2JdB/vAPBWXOVHwswlpErAknbxNn+RtQPNKMwmI/y8CyU5ZSiKFSIgBYAANjSgpTwLBAICAgBaEh16kmZROdQN1pi7WiNtaMn0Q9bWtA1XdmR/ZMhpMQVJVcgz5h8KLZtG4ODg47X4uT9dadZloVYLOZ4u37eZ7fxU0lp1/FcC0puyryVx9JJCAFDpD6evYk+dA314PW+UygM5KM0XIySUBGKQ1GEtCACmpG6OgCZCgMuhAIBgdR/Uk8+FELAtC3ErQS6Ez1oj3eiI96J3mQ/krZ5PsiM7AONTwqBW2Zd73UZpCB+OintOl9uwdC5GEIlOV6XkhFGOlMJia5EL84NdUMXGsJ6GIXBPBQGC1AULERBIA9BPYiAMBAYPuOWciQKjI4Ew/8+8gUxMv/pwv8WOL9EKkzbQtI2kbAS6E32ozvRg+5EL3oS/YhbcVjDS/ZqQpzfNk3O7JxiXF+anQ/IIn/jJ5XSLtk7hI7fnkXV3Zd7XUpGSQ2sSw2uA4C4NYTBWAxNg23QhQ5D05Gjh5FrRBAxwsjRc1L/a4QQEAHomg5daMPn8G907tJOBQIJG5a0YdkWkjKJmDmEQTOOmBXDoBnHgDmImBWHaVuwpAUhUo9AFkJDIItmLaSTEBK3ld2CfCPX61JIQQwA5ImWn55E2e0LYOQGvC4lY2lCpO6/D8+osKSFvmQ/epJ9kFIOd9Cpy/UCqVsKhpZafTA1YC/1g7ZM3TqwpQ3TtmBKM3UzYeS2wkVtaUJA46V9R+QFcnFn1bu8LoMUxU8xeWKgdQCtPzmJyvddwVngDhEjHXTq/1xAIjVIL2EmgXHHBwiMPBTtUm2RMzTNxu1ld6CmgM+oJ2/wuh155szW4xhqGfC6DCUI4PxZ/8iYgjf/Ge74vS5WERXhCvzJ4ju8LoMUxgBAnjH7Ejj57y8BNrscUouQwEeXfwiFwTyvSyGFMQCQp84934qGbce9LoMord634C7cVLLS6zJIcQwA5LnT3zuIzn3Tf7Y3USa5YfY1+P8W/6HXZRAxAJD3bNPGscf2oudwh9elELnqqugVeOCqj3NlRPIFvgsdZpomdJ3rnU9HV6IHn9//ZRzoVPfhHJS9ri5egi+s/FvkBzjnn/yBVwDIN4qChfjitX+H2yrWel0KkaPeVrYWD1+7CdFggdelEJ2n8vBrV56gwisAM2dLie+f2o7/fH0rYnbc63KIpi2sh/DBhXfj/QvWOzrB0rZtV44zmqbBsizH23WCZVkwDOcvWuu6PrLPyvWHyu3wKAwAPrd/4CC+e3AbDnQd8roUoim7svhyfPTyD2BpdLHjbTMAOIcBQE0MABnAkhaebtiNH595Cif7znhdDtGEFubPxR/Mux1vr1zn2oORGACcwwCgJgaADDJkJfBs2178uvE5vNR1EHFzyOuSiM4L6UGsKF6Kd1bdgptmX4+QHnR1ewwAzmEAUBMDQIZqGmzFi52HcLj7NRzvPoG22DnErSFY0p8HLsouutAR1kMoC5dicdFlWBZdjOuKl6MyUpa2GhgAnMMAoCYGgCyQtE30JvvQHu9Ed6IXMTOOQSuGQTOG9ngnvvGDf0NkbgFCpTkQBie90MSkaWOoI4aBMz346Ps/jFnhYkSMHET0HESMHBQG8zE7XIL8QJ5rl/gnwgDgHAYANTEAKEDTNIiAhsjcAkSXzULx6goULCmBFuRrRG+Qpo2eIx04t6cJvYc7MHCmFzJpw7Ztr0sbEwOAcxgA1MQAoABN0yDlhS917vxClL1zPspunYtAflDtT4Hikn1JtP76DNp+cxr9J7ou+DshBAOAjzAAOE+5HR6FAUABYwWAEeGKPFRtWISKd87nFQHF2AkLzT8/jYZt4z+SmgHAXxgAnKfcDo/CAKCASwWAEYXLSzH/L65CweUlaaqKvNR3vBN1334VPYfaL/l9DAD+wgDgPOV2eBQGAAVMJgAAgBbSseBDV6PirsuU/lBkM02TqH/yJE7931dhJybu5BgA/IUBwHnK7fAoDAAKmGwAGFF95yLMu/cqzhjIMtKSOPq1g+j45fFJ/wwDgL8wADiPRzmiUep/8jpe2/IiRFwAwpWMSOlmmnjtSy9MqfMnUgEDANFFWn93Bvu/81uIRMDrUmiGpA0cefwAWn9b73UpRL7DAEA0ht6d7Tj+f49C0/x5CZgmpmkSJ797BB27T3ldCpEvMQAQjaNl+wG0/67R6zJomtp216PpR4e9LoPItxgAiC7h9X85gKH2Qa/LoCkaah/EiX99xesyiHyNAYDoEhJdcZz+3iGvy6ApOvXdg0h0xb0ug8jXGACIJtC26yy6D3V4XQZNUverbWjbxUF/RBNhACCagLQl6v/fUa/LoEmq/+ExYAprPxCpigGAaBK697ei73in12XQBPqOdqD7QJvXZRBlBAYAokmQtkTLb854XQZNoOU3ZyFtnv0TTQYDANEkdTzXiGTPkNdl0DjM3gQ69jR7XQZRxmAAIJqk5LkYOvc2eV0GjaN9bzOS5zhlk2iyGACIpqBu61kInz4gRmW2LdG+84TXZRBlFAYAoilInmlD57NNkMo9N8zHpETHC83ofp2DNImmggGAaIqObnsRETvidRk0LIJcnHhin9dlEGUcBgCiKTKPJ/FHi+7k44J94r2X3QHzWMLrMogyDgMA0TS8b8F6LM2/wusylHdl0eX4w8tqvS6DKCMxABBNQ1AL4NPLPo5ZOQVelzIhcdGVCnvIQrI3gUR3HInuOJK9CdhDlkfVTV80HMV9yz+CkB70uhSijKTyUCZXrt+apgld191omqZB0zRIF5aFtW0bQgjs7zyI+158FHHLX+sDCCEBKWAlbfSeHsDg8Xb0n+xCvLUfya4hmP0J2GZqNoMW0GDkBhEsDiNUlov8xUUouKIIkTmFEIYGISSkz0Y9hvUQHr52E64pWQ4pJTTN+XMZIQRsn874sG3bleOMpmmwLH+GQcuyYBiG4+3quj6yz/56k6eBcjs8CgOAAtwOAADwu9a9+MKBryJhJx3fznQIAXS/1o9zvz+Dnpea0FfXPeV3u9AEchdEUXRdBYpvmIfoolzfLK8f0oP4+6s/gZvLVgEAA4CDGADUotwOj8IAoIB0BAAA2NO+H//0ytfRm+xzfFtTcVXREvy/z3wbHS+0QCadOZCLoIHS1eV476N/joNdxxxpc7ryA/n4+6s/htWzVp7/GgOAcxgA1KLcDo/CAKCAdAUAAHi9tw5bXv0mjvedcnx7E6nMK8eHFr4Xby2/AbrmzvvPtE38uuU5fOfEE2jqb3FlG5dyRcF8fPrKj2BRwbwLvs4A4BwGALUot8OjMAAoIJ0BAAAGzEF86/UfYMepX8GCBenyVEFD6HjP3HfiAwvvRkEgDwDGrMsJI7/HnmQf/vPEj7H1zM9hSXc7CyEFhNRQe9k7cO/C9yNi5IxZFwOAMxgA1KLcDo/CAKCAdAeAEXu79+M7dU/gaEsdpHCnE7m25Er82cK7cXXxkgu+7nYAGPHyuUP47okn8ErnUVe2J6SGZeUL8Gfz78GqopXjfh8DgHMYANSi3A6PwgCgAK8CAABISPy+7UVsPf0UDnQehSUtCClmdFVAFzquKVmO9TVvx7rhQXAXS1cAAFL7+LvWfdh65im82nUYtpz+jIGR2Qaa0LCyeAlqa96JdeWrISY4TDEAOIcBQC3K7fAoDACjDAwMYPfu3airq0NbWxsikQgqKyuxYsUKXHXVVV6XN21eBoDRDvecwDNt+/DCuRfQ3HtuzGmD4023C+shzImUY/Xsa3Dz7OuwJLrokttKZwAY7UDHa9jVvA8Hel5Ew0AbklOYFRHWQygPVWBN2dW4uex6LC9aPKW6GACcwQCgFuV2eBQGAACvvPIKvvCFL+Cpp55CLBYb83sWLFiAe++9F5/4xCeQk/Pme7B+5pcAcP7nYONMXyPq+utxur8ejQMt6BjqxKAZx1ASCBg28gIRFIeiqI5UYl7eHCwoqMHc3DnQJrk9rwLACEtaqOs7i7q+szjVX4/GgVacG+rCgBmHhIQuBHKNHJSEilGdV455udVYkF+DuXlzoIupd+QMAM5hAFCLcjs8itIBIJFI4FOf+hS++c1vTvogN2fOHHzve9/DW97yFperc47fAkA6eB0A0o0BwDkMAGrhUsAK6urqwlvf+lZ84xvfmNIBrqGhAe9617vwrW99y8XqiIgoHRgAFGNZFv74j/8Yzz777LR+PplM4sMf/jB27tzpcGVERJRODACKGbnfPxO2beNP/uRP0NTU5FBVRESUbgwACmlqasJjjz3mSFu9vb34/Oc/70hbRESUfgwACvn617+OwcFBx9r7zne+g7a2NsfaIyKi9GEAUMi2bdscbc80TY4FICLKUAwAimhtbcWxY84/yW337t2Ot0lERO5jAFBEY2OjK+02NDS40i4REbmLAUARXV1drrR77tw5V9olmiwhBPLy8hxvt6CgwPE2naJpmnL7TM5jAFBEaWmpK+3Onj3blXaJpqKiosLxNisrKx1v00nl5eWOt+n3fSZnMQAooqqqypV258yZ40q7RFOxdOnSjGjTSSruMzmLAUARpaWluPrqqx1v921ve5vjbRJN1fr16x1vs7a21vE2naTiPpOzGAAUsnHjRkfbCwaDuP322x1tk2g6NmzYgMLCQsfaKyoqwl133eVYe27YuHGjo/fsi4uLfb/P5CwGAIV84hOfQFFRkWPt/dVf/RWKi4sda49ouoqLi7Fp0ybH2nvggQcQjUYda88NbuyzkyGKyM+kG39M05R+tmXLFkf2c9asWbKjo8Pr3ZmQEMKV19m2ba93bVxuvbf9LhaLyeuuu27G+7lmzRoZj8e93p1JGRwcdGSf165d6/t9Nk3Tlfe1rusj/04KceXN5PcAYNu2fN/73jejfQwEAvI3v/mN17syKQwA6gQAKaVsaGiQc+bMmfY+1tTUyKamJq93Y0pmus9z586Vzc3NXu/GhBgAnMdbAIoRQuDb3/427rzzzmn9fCQSwfe//33cdtttDldGNHNVVVV44YUXsGrVqin/7Jo1a7Bnzx5XphS6aSb7vHbtWuzZs8eVKYVEfuZKmvT7FYARlmXJz33uczIUCk1635YtWyZffvllr0ufEl4BUOsKwIhYLCYfeeQRGY1GJ9yvoqIiuWXLFt9fAp/IVPa5uLhYPvbYYxm1z7wC4DzhdQEecuUFN00Tuq670bQrzpw5gy9+8YvYunUrOjo63vT3Qghcd911+PCHP4wPfvCDGbVvQGrFNCmdf6lt24YQ/vz4uFWXG79Ht3V3d2PHjh3Yvn07jh49isbGRgghUFVVhSVLlqC2thbr16/PqsFv3d3d2L59O3bs2PGmfV66dCnWr1+fkftsWRYMw3C8XV3XYVkWoGB/qNwOj8IAMIplWXjxxRdx6tQptLS0IDc3FxUVFVi5cqVriwilAwOAczIxAFD2YABwnnI7PAoDgAIYAJzDAEBeYgBwHgcBEhERKYgBgIiISEEMAERERApiACAiIlIQAwAREZGCGACIiIgUxABARESkIAYAIiIiBTEAEBERKYgBgIiISEEMAERERApiACAiIlIQAwAREZGCGACIiIgUxABARESkIAYAIiIiBTEAEBERKchY97N7JvoeOc7XhcO1pNUzdzzhdQlEROQTk+gL/Wxa/fSYVwCeuf2H2nCD4zU6skH5zO0/zOggQERElGmc6KfFGKnnUo1dSkYFgWfueGK6+3lJpmlC13U3mqZp0DQNUjr/Utu2DSH8+ZZ3qy43fo9Ek2VZFgzDcLxdXddhWRbW/ewef36gx+ZIP33xFYCZfMJ5dCAiInKXY/20Nt5fONE4EREROcbRflq7+AtONk5ERESOcLyf5jRAIiIiBY2MInQarwIQERE5w5V+mlcAiIiIFMQAQEREpCAGACIiIgUxABARESmIAYCIiEhBDABEREQKYgAgIiJSEAMAERGRghgAiIiIFMQAQEREpCAGACIiIgUxABARESnI8LqAbGMY/JUS+UVHRwe2bduGHTt24OjRo2hqakIsFvO6LCJfYG9FRFlncHAQW7ZswWOPPYb+/n6vyyHyJQYAIsoqjY2NqK2txUsvveR1KUS+xgBARFnj7NmzWLNmDZqbm70uhcj3OAiQiLLC4OAgamtr2fkTTRIDABFlhS1btuDAgQNel0GUMRgAiCjjnTt3Do8//rjXZRBlFAYAIsp4W7duRV9fn9dlEGUUBgAiyng7d+70ugSijMMAQEQZ78iRI16XQJRxGACIKOO1tLR4XQJRxmEAIJqi/Px8CCG8LmNc+fn5jrdZUFDgeJtO8vPrQf7m9/e2mxgAiKaoqqrK6xIuqaKiwvE2VdxnUoPf39tuYgAgmqKlS5d6XcIlLVu2zPE2VdxnUoPf39tuYgAgmqLa2lqvS7ik9evXO96mivtMavD7e9tNSgeAoqIir0ugDBONRn3f2dTW1iIajTrWXlFREe666y7H2nPDhg0bUFhY6HUZlGGKi4tx5513el2GZ5QOAPfff7/XJVCGeeCBBxztXN1QVFSETZs2OdaeivtManjwwQeVHgQo1v3sHulW2y6164hn7nhCxuNx3HrrrdizZ4/X5VAGWLNmDXbt2oVQKOR1KROKx+O45ZZbsHfv3hm1k2n7vG7dOuzbt8/rUigD3HDDDfjtb3+LYDAIIQTW/eweP/dZrvTTSl8BCIVC2Lp1K+bOnet1KeRzNTU12Lp1a0Z0hAAQDoexbds2VFdXT7uNTNznJ598ckb7TGqYN28etm7dimAw6HUpnlI6AACp6UP79u3DunXrvC6FfGrNmjXYs2dPxk01q6ysxAsvvIDVq1dP+WczeZ/37NkzrX0mNaxduxbPP/88ysrKvC7Fc8oHAACYNWsWfvGLX+Cxxx5DcXGx1+WQTxQVFWHLli3YtWtXxnWEIyoqKrB79248+uijkxr0WlxcjMceeyyj97myshK7du3C5s2bOdCXzisuLsbjjz+OXbt2oby83OtyfEHpMQBSvnnXe3p6sHPnTmzfvh1HjhxBU1MTuru7018gpV00GkVlZSWWLl2K9evXY/369Vk1srynpwc7duzAjh07zr+3AZzf59raWtx1111Ztc/d3d3nP89Hjx7l51khI5/nZcuWnX9vjzfgT9UxAEoHAK9rICIif1AxABhuNJoJfP5in/fMHU94XQIR0bSs+9k9XpdAl8AxAERERApiACAiIlIQAwAREZGCGACIiIgUxABARESkIAYAIiIiBTEAEBERKYgBgIiISEEMAERERApiACAiIlIQAwAREZGCGACIiIgUxABARESkIAYAIiIiBTEAEBERKYgBgIiISEEMAERERApiACAiIlIQAwAREZGCGACIiIgUxABARESkIAYAIiIiBTEAEBERKYgBgIiISEEMAERERApiACAiIlIQAwAREZGCGACIiIgUxABARESkIAYAIiIiBTEAEBERKYgBgIiISEEMAERERApiACAiIlIQAwAREZGCGACIiIgUxABARESkIAYAIiIiBRkuti1dbDvbCK8LICJKM/YRHnMzANDkjXwQGASIKNux4/cJ3gLwF34wiCib8RjnIwwA/sMPCBFlIx7bfIYBwJ/4QSGibMJjmg8xAPjUM7f/kK8NEWW8Z27/Icc2+RQ7GZ9a99R7La9rICKaqXVPvdf2ugYaGwMAERGRghgA/I33zYgok/EY5mMMAERERApiACAiIlIQAwAREZGCGACIiIgUxABARESu6K56MM/rGmh8DAD+xgU0iChjRRv/ccDrGmh8DABEREQK0sCzTF/iUsBElA14LPMtoQGAlvPRHK8roQute+q9XECDiDIej2X+pQGAHfuXuNeF0AV4VYaIsgmPaf4igAvHAPAF8ge+DkSUjXhs84fzr8PF92b4AnmLv38iymY8xnmkadEXw7jo92+M8X0j38D7NunDDwURqYJ9TPqJytcfeNMX/39Y2CBnUaw9MwAAAABJRU5ErkJggg==';

const __ICON_ALREADY_URI_ = __svgDataUri_(`
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <filter id="ds" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-opacity="0.45"/>
    </filter>
  </defs>
  <path d="M128 40 L226 210 H30 Z" fill="#f59e0b" filter="url(#ds)"/>
  <path d="M128 92 v62" stroke="#ffffff" stroke-width="18" stroke-linecap="round"/>
  <circle cx="128" cy="176" r="10" fill="#ffffff"/>
</svg>
`);

function __ensureScanSuccessOverlay_() {
  if (__scanSuccessOverlayEl) return __scanSuccessOverlayEl;
  const ov = document.createElement('div');
  ov.id = 'scanSuccessOverlay';
  ov.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);z-index:9999;';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;';
  const img = document.createElement('img');
  img.id = 'scanSuccessOverlayImg';
  // Works fully offline (inline SVG). Fallback to local assets if needed.
  img.src = __ICON_OK_URI_ || './assets/qr-code-succes.png';
  img.onerror = () => {
    try {
      img.onerror = null;
      img.src = './assets/sucess.png';
    } catch (e) { }
  };
  img.alt = 'Succès';
  img.style.cssText = 'max-width:220px;width:60vw;height:auto;filter:drop-shadow(0 12px 28px rgba(0,0,0,.55));';
  const cap = document.createElement('div');
  cap.id = 'scanSuccessOverlayCaption';
  cap.style.cssText = 'margin-top:10px;font-size:.95rem;color:#fff;opacity:.92;text-shadow:0 2px 10px rgba(0,0,0,.55);display:none;';
  wrap.appendChild(img);
  wrap.appendChild(cap);
  ov.appendChild(wrap);
  document.body.appendChild(ov);
  __scanSuccessOverlayEl = ov;
  return ov;
}

function __showScanSuccessOverlay_(caption) {
  const ov = __ensureScanSuccessOverlay_();
  const cap = ov.querySelector('#scanSuccessOverlayCaption');
  const img = ov.querySelector('#scanSuccessOverlayImg');
  try {
    const txt = caption ? String(caption) : '';

    // Switch image for "Déjà pointé" (offline/online)
    if (img) {
      const isAlready = /d[ée]j[aà]\s+point[ée]/i.test(txt);
      const wanted = isAlready ? (__ICON_ALREADY_URI_ || './assets/sucess.png') : (__ICON_OK_URI_ || './assets/qr-code-succes.png');
      if (img.getAttribute('src') !== wanted) img.setAttribute('src', wanted);
      img.alt = isAlready ? 'Déjà pointé' : 'Succès';
    }

    if (cap) {
      cap.textContent = txt;
      cap.style.display = txt ? 'block' : 'none';
    }
  } catch (e) { }
  ov.style.display = 'flex';
  if (__scanSuccessHideTimer) clearTimeout(__scanSuccessHideTimer);
  __scanSuccessHideTimer = setTimeout(() => {
    try { ov.style.display = 'none'; } catch (e) { }
  }, 1800);
}
// --------------------------------------------------------------------------
function setStatus(html, kind) {
  if (!scanStatusEl) return;
  // Requested UX: only two colors (green/red)
  const cls = (kind === 'success' || kind === 'ok' || kind === 'info' || kind === '')
    ? 'text-success'
    : 'text-danger';
  scanStatusEl.className = `mt-3 small ${cls}`;
  scanStatusEl.innerHTML = html;
}

function setLast(html) {
  if (!lastScanEl) return;
  lastScanEl.innerHTML = html || '—';
}

let html5QrCode = null;
let cameras = [];
let camIndex = 0;
let scanning = false;
let processing = false;
let lastCode = '';
let lastAt = 0;
let usingDeviceId = false;
let currentFacingMode = 'environment'; // fallback when camera list is not available (iOS/Safari)

function pickRearCameraIndex(list) {
  if (!Array.isArray(list) || !list.length) return 0;
  // labels are available after permission is granted
  const labelRegex = /back|rear|environment|arrière|arri[èe]re/i;
  const idxByLabel = list.findIndex(c => labelRegex.test(c.label || ''));
  if (idxByLabel >= 0) return idxByLabel;
  // common: last camera is the rear one
  if (list.length >= 2) return list.length - 1;
  return 0;
}

async function ensureCameras() {
  if (!window.Html5Qrcode) {
    setStatus('Bibliothèque QR non chargée. Vérifiez le <script> html5-qrcode.min.js.', 'danger');
    return [];
  }
  try {
    cameras = await Html5Qrcode.getCameras();
  } catch (e) {
    cameras = [];
  }
  // Sur certains navigateurs, la liste des caméras est vide tant que la permission n'est pas accordée.
  if (!cameras.length && navigator.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      cameras = await Html5Qrcode.getCameras();
    } catch (e) {
      // ignore
    }
  }
  return cameras;
}


function pickCameraRequest() {
  // Preferred: explicit deviceId (rear by default)
  if (cameras?.length) {
    usingDeviceId = true;
    const cam = cameras[camIndex % cameras.length];
    return { deviceId: { exact: cam.id } };
  }
  // Fallback: facingMode (some browsers don't expose camera list)
  usingDeviceId = false;
  return { facingMode: currentFacingMode || 'environment' };
}

async function startScan() {
  ensureAudioCtx_(); soundOk_(); // test son au démarrage

  ensureAudioCtx_(); // prime audio for beep/vibration

  if (scanning) return;
  await loadVolunteers();

  const cams = await ensureCameras();
  // Default to rear camera when a list is available
  if (cams?.length) {
    camIndex = pickRearCameraIndex(cams);
  }
  if (!cams.length && location.protocol !== 'https:' && location.hostname !== 'localhost') {
    setStatus('La caméra nécessite HTTPS (ou localhost) et une autorisation.', 'danger');
  }

  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode('qrReader');
  }

  const camera = pickCameraRequest();
  setStatus('📷 Préparation de la caméra...', '');
  toggleScanBtn.textContent = '⏸️ Pause';

  try {
    await html5QrCode.start(
      camera,
      {
        fps: 10,
        qrbox: { width: 260, height: 260 },
        rememberLastUsedCamera: true,
        aspectRatio: 1.0
      },
      onScanSuccess,
      () => { }
    );
    scanning = true;
    setStatus('✅ Caméra arrière prête… présentez le code QR devant la caméra.', 'success');
  } catch (e) {
    scanning = false;
    toggleScanBtn.textContent = '▶️ Démarrer';
    setStatus('Impossible de démarrer la caméra. Autorisez l’accès à la caméra, puis réessayez (ou utilisez le fallback manuel).', 'danger');
  }
}

async function stopScan() {
  if (!html5QrCode) return;
  try {
    if (scanning) {
      await html5QrCode.stop();
    }
  } catch (e) { }
  scanning = false;
  toggleScanBtn.textContent = '▶️ Démarrer';
  setStatus('⏸️ Pause.', '');
}

async function switchCamera() {
  const cams = await ensureCameras();

  // If the browser doesn't expose device list (common on iOS), toggle facingMode
  if (!cams.length) {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    toast(currentFacingMode === 'environment' ? 'Caméra arrière.' : 'Caméra frontale.');
    if (scanning) {
      await stopScan();
      await startScan();
    }
    return;
  }

  if (cams.length === 1) {
    toast('Une seule caméra détectée.');
    return;
  }

  camIndex = (camIndex + 1) % cams.length;
  toast('Caméra changée.');
  if (scanning) {
    await stopScan();
    await startScan();
  }
}

async function isAlreadyQueuedOrCachedPunch_(volunteerId, dateISO) {
  try {
    if (!window.OfflineStore) return false;
    const vid = String(volunteerId);
    const d = String(dateISO || "");

    // 1) check cached punches
    const cached = await OfflineStore.cachePunchesRead?.(d);
    if (cached && Array.isArray(cached.data)) {
      const map = new Map(cached.data);
      if (map.get(vid)) return true;
    }

    // 2) check queue list
    const ops = await OfflineStore.queueList?.();
    if (Array.isArray(ops)) {
      const dedup = `PUNCH|${vid}|${d}`;
      if (ops.some(op => op && op.dedupKey === dedup)) return true;
    }
  } catch (e) { }
  return false;
}

async function processCode(rawCode, source = 'scan') {
  const code = normalizeCode(rawCode);
  if (!code) return;

  // small anti-bounce: same code within 1.2s
  const now = Date.now();
  if (code === lastCode && (now - lastAt) < 1200) return;
  lastCode = code;
  lastAt = now;

  await loadVolunteers();
  const v = byCode.get(code);

  if (!v) {
    setLast(`<span class="fw-semibold">Code :</span> <code>${escapeHtml(rawCode)}</code>`);
    setStatus(`❌ Le code <code>${escapeHtml(rawCode)}</code> est introuvable. Vous pouvez l’associer à un bénévole.`, 'danger');
    toast('Code introuvable');
    openAssignModal(rawCode);
    return;
  }

  setLast(`<span class="fw-semibold">${escapeHtml(v.fullName || '')}</span> <span class="opacity-75">—</span> <code>${escapeHtml(rawCode)}</code>`);

  const today = isoDate(new Date());
  setStatus(`⏳ Pointage en cours : <b>${escapeHtml(v.fullName || '')}</b>…`, '');

  // If the badge has a punch pending in the local sync queue (not yet synced),
  // we must treat it as already punched even if the network is back.
  const alreadyLocal = await isAlreadyQueuedOrCachedPunch_(v.id, today);
  if (alreadyLocal) {
    soundErr_();
    setStatus(`⚠️ <b>${escapeHtml(v.fullName || '')}</b> est déjà pointé aujourd’hui (en attente de synchronisation).`, 'danger');
    toast('Déjà pointé');
    __showScanSuccessOverlay_('Déjà pointé');
    return;
  }

  try {
    const res = await apiPunch(v.id, today);
    if (res?.ok) {
      playSuccessBeep();
      __showScanSuccessOverlay_('');
      return;
    }
    if (res?.error === 'ALREADY_PUNCHED') {
      const t = res?.punchedAt ? formatTimeLocal(res.punchedAt) : '';
      const at = t ? ` à <b>${escapeHtml(t)}</b>` : '';
      soundErr_();
      setStatus(`⚠️ <b>${escapeHtml(v.fullName || '')}</b> est déjà pointé aujourd’hui${at}.`, 'danger');
      toast('Déjà pointé');
      __showScanSuccessOverlay_('Déjà pointé');
      return;
    }
    if (res?.error === 'NOT_AUTHENTICATED') {
      logout();
      return;
    }
    setStatus(`❌ Erreur: ${escapeHtml(res?.error || 'UNKNOWN')}`, 'danger');
    toast('Erreur');
  } catch (e) {
    const offline = (!navigator.onLine) || (window.OfflineStore?.isLikelyOffline?.(e));
    if (offline && window.OfflineStore) {
      const already = await isAlreadyQueuedOrCachedPunch_(v.id, today);

      if (already) {
        // déjà pointé (offline)
        soundErr_();
        setStatus(`⚠️ <b>${escapeHtml(v.fullName || '')}</b> est déjà pointé aujourd’hui (hors-ligne).`, 'danger');
        toast('Déjà pointé');
        __showScanSuccessOverlay_('Déjà pointé');
        return;
      }

      // nouveau punch hors-ligne
      await OfflineStore.enqueuePunch(v.id, today, "scan");
      playSuccessBeep();
      setStatus(`✅ Pointage enregistré (hors-ligne) : <b>${escapeHtml(v.fullName || '')}</b>.`, 'ok');
      __showScanSuccessOverlay_('Enregistré hors-ligne');
      return;
    }

    setStatus('❌ Erreur API (Apps Script).', 'danger');
    toast('Erreur API');
    throw e;
  }
}


function onScanSuccess(decodedText) {
  if (processing) return;
  processing = true;

  // Pause to avoid multiple reads of the same QR while processing
  try { html5QrCode?.pause(true); } catch (e) { }

  processCode(decodedText, 'scan')
    .finally(() => {
      setTimeout(() => {
        processing = false;
        if (!holdScan) {
          try { html5QrCode?.resume(); } catch (e) { }
        }
      }, 650);
    });
}

toggleScanBtn?.addEventListener('click', async () => {

  ensureAudioCtx_();
  if (scanning) await stopScan();
  else await startScan();
});

ensureAudioCtx_();
switchCamBtn?.addEventListener('click', switchCamera);

manualSubmitBtn?.addEventListener('click', async () => {

  ensureAudioCtx_();
  const code = (manualCodeEl.value || '').trim();
  if (!code) { toast('Veuillez saisir un code.'); return; }
  await processCode(code, 'manual');
  manualCodeEl.select();
});

manualCodeEl?.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    manualSubmitBtn?.click();
  }
});

// Démarrage manuel (nécessaire pour activer le son / vibration sur mobile)
setStatus('', 'ok');

// AUTO_START_SCAN: tentative de démarrage automatique (si le navigateur l'autorise)
try {
  setTimeout(() => {
    try {
      if (!scanning) { startScan(); }
    } catch (e) { }
  }, 350);
} catch (e) { }

try { __checkNetworkStatus(); } catch (e) { }
try { setInterval(() => { try { __checkNetworkStatus(); } catch (e) { } }, 8000); } catch (e) { }
window.addEventListener('online', () => __setNetDot('online'));
window.addEventListener('offline', () => __setNetDot('offline'));
