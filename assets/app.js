

// === Sound helpers (WebAudio) ===
let __audioCtx = null;
function ensureAudioCtx_(){
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return null;
  if(!__audioCtx) __audioCtx = new AC();
  try{ if(__audioCtx.state === "suspended") __audioCtx.resume().catch(()=>{}); }catch(e){}
  return __audioCtx;
}
function beep_(freq=880, durSec=0.12, vol=0.18, type="sine"){
  const ctx = ensureAudioCtx_();
  if(!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g); g.connect(ctx.destination);
  const t = ctx.currentTime;
  o.start(t);
  try{
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durSec);
  }catch(e){}
  o.stop(t + durSec);
}
function soundOk_(){
  beep_(880, 0.10, 0.20, "sine");
  setTimeout(()=>beep_(1175, 0.08, 0.16, "sine"), 120);
  try{ navigator.vibrate && navigator.vibrate(40); }catch(e){}
}
// Prime audio context on first user interaction
document.addEventListener("pointerdown", ()=>{ ensureAudioCtx_(); }, { once:true });

const listEl = document.getElementById("list");
const searchEl = document.getElementById("search");
const groupFilterEl = document.getElementById("groupFilter");
const refreshBtn = document.getElementById("refreshBtn");
const syncBtn = document.getElementById("syncBtn");
const syncCountEl = document.getElementById("syncCount");
const offlineStatusEl = document.getElementById("offlineStatus");
const scanBtn = document.getElementById("scanBtn");
const groupPunchBtn = document.getElementById("groupPunchBtn");
const autoPunchRolesBtn = document.getElementById("autoPunchRolesBtn");
const autoPunchRolesDone = document.getElementById("autoPunchRolesDone");
const autoPunchRolesStatus = document.getElementById("autoPunchRolesStatus");
const countPill = document.getElementById("countPill");
const todayEl = document.getElementById("today");
const toastEl = document.getElementById("toast");
function isSuper(){ return (localStorage.getItem('role')||'') === 'SUPER_ADMIN'; }
function isAdminOrSuper(){ const r=(localStorage.getItem('role')||''); return r==='SUPER_ADMIN' || r==='ADMIN'; }


// --- Planning groupes (alternance) ---
// Référence: 2025-12-27 => Groupe B actif, Groupe A OFF. Ensuite alternance quotidienne.
const PLANNING_BASE_DATE = "2025-12-27";
const PLANNING_BASE_GROUP = "B";
function plannedGroupForDate(dateISO){
  if(!dateISO) return PLANNING_BASE_GROUP;
  const d0 = new Date(PLANNING_BASE_DATE + "T00:00:00");
  const d1 = new Date(String(dateISO) + "T00:00:00");
  const diffDays = Math.floor((d1.getTime() - d0.getTime()) / 86400000);
  if(diffDays % 2 === 0) return PLANNING_BASE_GROUP;
  return (PLANNING_BASE_GROUP === "A") ? "B" : "A";
}

function renderUserPill(){
  const el = document.getElementById("userPill");
  if(!el) return;

  const u = localStorage.getItem("username") || "—";
  const r = (localStorage.getItem("role") || "—").toUpperCase();
  const roleClass = r === "SUPER_ADMIN" ? "badge-role-super" : (r === "ADMIN" ? "badge-role-admin" : "badge-role-unknown");

  el.innerHTML = `<span class="me-2 user-name">${escapeHtml(String(u))}</span><span class="badge ${roleClass}">${escapeHtml(String(r))}</span>`;

  // Always keep pill on the left of the first visible action button (Rapports/Déconnexion).
  const actions = document.getElementById("navActions") || el.parentElement;
  if(!actions) return;

  const candidates = Array.from(actions.querySelectorAll("a,button"))
    .filter(x => x.id !== "userPill" && x.offsetParent !== null);

  const first = candidates[0];
  try{
    if(first){
      actions.insertBefore(el, first);
    }
  }catch(e){}
}


const pageLoaderEl = document.getElementById("pageLoader");
const loaderTextEl = document.getElementById("loaderText");
const logoutBtn = document.getElementById("logoutBtn");
const focusSearchBtn = document.getElementById("focusSearchBtn");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const openAddBtn = document.getElementById("openAddBtn");

// Modal
const addModalEl = document.getElementById("addModal");
let addModal;
if (addModalEl && window.bootstrap?.Modal) {
  addModal = new bootstrap.Modal(addModalEl);
}
const addForm = document.getElementById("addForm");

// History (SUPER ADMIN)
const historyModalEl = document.getElementById('historyModal');
const histFromEl = document.getElementById('histFrom');
const histToEl = document.getElementById('histTo');
const histLoadBtn = document.getElementById('histLoadBtn');
const histTbody = document.getElementById('histTbody');
const histMsg = document.getElementById('histMsg');
const histSubtitle = document.getElementById('histSubtitle');
let historyModal = null;
let currentHistVolunteer = null;

// Group punch (SUPER ADMIN)
const groupPunchModalEl = document.getElementById('groupPunchModal');
const groupPunchRadiosEl = document.getElementById('groupPunchRadios');
const groupPunchHintEl = document.getElementById('groupPunchHint');
const groupPunchMsgEl = document.getElementById('groupPunchMsg');
const groupPunchDoBtn = document.getElementById('groupPunchDoBtn');
let groupPunchModal = null;
let lastGroupPunchSelection = "";

// Edit modal
const editModalEl = document.getElementById("editModal");
let editModal;
if (editModalEl && window.bootstrap?.Modal) {
  editModal = new bootstrap.Modal(editModalEl);
  if(historyModalEl) historyModal = new bootstrap.Modal(historyModalEl);
  if(groupPunchModalEl) groupPunchModal = new bootstrap.Modal(groupPunchModalEl);

  // default history dates (last 7 days)
  if(histFromEl && histToEl){
    const today = isoDate(new Date());
    const d = new Date(); d.setDate(d.getDate()-7);
    histFromEl.value = isoDate(d);
    histToEl.value = today;
  }

  histLoadBtn?.addEventListener('click', async ()=>{
    if(!currentHistVolunteer){ return; }
    const from = histFromEl.value;
    const to = histToEl.value;
    histMsg.textContent = '';
    histMsg.className = 'small mt-3';
    histTbody.innerHTML = '<tr><td colspan="2" class="text-muted2 small">Chargement…</td></tr>';
    setBtnLoading(histLoadBtn, true, "Chargement...");

    try{
      const res = await apiVolunteerHistory(currentHistVolunteer.id, from, to);
      if(!res.ok){
        if(res.error === 'NOT_AUTHENTICATED') { logout(); return; }
        histMsg.textContent = 'Erreur: ' + (res.error||'UNKNOWN');
        histMsg.className = 'small mt-3 text-danger';
        histTbody.innerHTML = '<tr><td colspan="2" class="text-muted2 small">—</td></tr>';
        return;
      }
      const rows = res.rows || [];
      // Trier: plus récent en premier
      rows.sort((a,b)=>{
        const da = String(a.punch_date||"") + " " + String(a.punched_at||"");
        const db = String(b.punch_date||"") + " " + String(b.punched_at||"");
        return db.localeCompare(da);
      });
      if(!rows.length){
        histTbody.innerHTML = '<tr><td colspan="2" class="text-muted2 small">Aucun pointage sur la période.</td></tr>';
        return;
      }
      histTbody.innerHTML = rows.map(r=>{
        const time = r.punched_at ? new Date(r.punched_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '';
        return `<tr>`+
          `<td>${escapeHtml(r.punch_date||'')}</td>`+
          `<td>${escapeHtml(time)}</td>`+
        `</tr>`;
      }).join('');
    }catch(e){
      console.error(e);
      histMsg.textContent = 'Erreur API.';
      histMsg.className = 'small mt-3 text-danger';
    }
    finally{ setBtnLoading(histLoadBtn, false); }

  });
}

function getAllGroups(){
  // Static groups (no need to manage them in Sheets/DB)
  return ["A","B"];
}

function renderGroupPunchRadios(selected){
  if(!groupPunchRadiosEl) return;
  const groups = getAllGroups();
  if(!groups.length){
    groupPunchRadiosEl.innerHTML = '<div class="text-muted2 small">Aucun groupe trouvé.</div>';
    return;
  }
  const sel = normGroup(selected) || (normGroup(groupFilterEl?.value || "") || groups[0]);
  lastGroupPunchSelection = sel;
  groupPunchRadiosEl.innerHTML = groups.map(g => {
    const id = `gp_${g}`;
    return `
      <label class="form-check text-white me-2">
        <input class="form-check-input" type="radio" name="groupPunch" id="${escapeHtml(id)}" value="${escapeHtml(g)}" ${g===sel?'checked':''}>
        <span class="form-check-label">Groupe ${escapeHtml(g)}</span>
      </label>
    `;
  }).join('');

  // hint + reset message
  try{
    const inGroup = (volunteersCache||[]).filter(v => normGroup(v.group||v.groupe) === normGroup(sel)).length;
    if(groupPunchHintEl) groupPunchHintEl.textContent = `Volontaires dans le groupe « ${sel} » : ${inGroup}. Date : ${todayISO}`;
  }catch(e){
    if(groupPunchHintEl) groupPunchHintEl.textContent = `Date : ${todayISO}`;
  }
  if(groupPunchMsgEl){
    groupPunchMsgEl.textContent = "";
    groupPunchMsgEl.className = "small mt-2";
  }
}
const editForm = document.getElementById("editForm");

const editMsg = document.getElementById("editMsg");
const editIdEl = document.getElementById("editId");
const editFullNameEl = document.getElementById("editFullName");
const editBadgeCodeEl = document.getElementById("editBadgeCode");
const editQrCodeEl = document.getElementById("editQrCode");
const editPhoneEl = document.getElementById("editPhone");
const addMsg = document.getElementById("addMsg");
const addSpinnerEl = document.getElementById("addSpinner");
const editSpinnerEl = document.getElementById("editSpinner");
const fullNameEl = document.getElementById("fullName");
const badgeCodeEl = document.getElementById("badgeCode");
const qrCodeEl = document.getElementById("qrCode");
const phoneEl = document.getElementById("phone");
const groupEl = document.getElementById("group");
const editGroupEl = document.getElementById("editGroup");
const groupDatalistEl = document.getElementById("groupDatalist");

let punchedMap = new Map();

let todayISO = (typeof isoDate === "function") ? isoDate(new Date()) : new Date().toISOString().slice(0,10);
     // volunteer_id -> punched_at
let volunteersCache = [];       // cached volunteers
let lastLoadedAt = 0;

const LS_KEY = "pointage_volunteers_cache_v1";
const LS_TS_KEY = "pointage_volunteers_cache_ts_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.style.opacity = "1";
  setTimeout(() => (toastEl.style.opacity = "0"), 2200);
}

function showLoader(text="Chargement..."){
  if(!pageLoaderEl) return;
  if(loaderTextEl) loaderTextEl.textContent = text;
  pageLoaderEl.style.display = "flex";
}
function hideLoader(){
  if(!pageLoaderEl) return;
  pageLoaderEl.style.display = "none";
}

function resetBtn(btn, label){
  if(!btn) return;
  btn.disabled = false;
  btn.innerHTML = label || btn.textContent || "OK";
  if(btn.dataset && btn.dataset._oldHtml) delete btn.dataset._oldHtml;
}

function setBtnLoading(btn, loading, label){
  if(!btn) return;
  if(loading){
    if(!btn.dataset._oldHtml) btn.dataset._oldHtml = btn.innerHTML;
    btn.disabled = true;
    const txt = label || "Chargement...";
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${txt}`;
  }else{
    btn.disabled = false;
    if(btn.dataset._oldHtml){
      btn.innerHTML = btn.dataset._oldHtml;
      delete btn.dataset._oldHtml;
    }
  }
}



function setInlineSpinner(el, show){
  if(!el) return;
  el.classList.toggle("d-none", !show);
}


function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[s]));
}

// Local time display (avoid 1h shift when API returns ISO in UTC)
function formatTimeLocal(iso){
  if(!iso) return "";
  try{
    return new Date(iso).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
  }catch(e){
    return String(iso).slice(11,16);
  }
}

// Normalize for search (fix "parfois filtre makayfiltrich")
function normalizeText(s){
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normGroup(g){
  return String(g ?? "").trim().toUpperCase();
}
function getSelectedGroupAdd(){
  return normGroup(document.querySelector('input[name="groupAdd"]:checked')?.value || "A");
}
function getSelectedGroupEdit(){
  return normGroup(document.querySelector('input[name="groupEdit"]:checked')?.value || "A");
}
function setGroupRadios(prefix, group){
  const g = normGroup(group) || "A";
  const a = document.getElementById(prefix + "A");
  const b = document.getElementById(prefix + "B");
  const c = document.getElementById(prefix + "C");
  if(a) a.checked = (g === "A");
  if(b) b.checked = (g === "B");
  if(c) c.checked = (g === "C");
  // keep hidden inputs (for backward compatibility)
  if(prefix === "groupAdd") { if(groupEl) groupEl.value = g; }
  if(prefix === "groupEdit") { if(editGroupEl) editGroupEl.value = g; }
}

function normalizeBadge(s){
  return normalizeText(s).replace(/\s+/g, ""); // remove spaces
}

function readLocalCache(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    const ts = Number(localStorage.getItem(LS_TS_KEY) || 0);
    if(!raw) return null;
    const data = JSON.parse(raw);
    if(!Array.isArray(data)) return null;
    return { data, ts };
  }catch(e){
    return null;
  }finally{
    hideLoader();
  }
}
function writeLocalCache(data){
  try{
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    localStorage.setItem(LS_TS_KEY, String(Date.now()));
  }catch(e){}
}

function refreshGroupDatalist(){
  if(!groupDatalistEl) return;
  const groups = Array.from(new Set((volunteersCache||[])
    .map(v => (v.group||"").trim())
    .filter(g => g)))
    .sort((a,b)=>a.localeCompare(b, "fr"));
  groupDatalistEl.innerHTML = groups.map(g => `<option value="${escapeHtml(g)}"></option>`).join("");
}




async function refreshTodayPunches(){
  const today = isoDate(new Date());
  const r = await apiReportPunches(today, today);
  if (!r.ok) throw new Error(r.error || "REPORT_ERROR");
  punchedMap = new Map(((r.rows || r.punches || [])).map(p => [String(p.volunteer_id), p.punched_at]));
  return today;
}


function computeRolePunchStatus_(){
  const roleVols = (volunteersCache || []).filter(v => String(v.role || "").trim() !== "");
  const punchedIds = new Set(Array.from((punchedMap || new Map()).keys()).map(k => String(k)));
  const pending = roleVols.filter(v => !punchedIds.has(String(v.id)));
  return { totalRole: roleVols.length, pendingCount: pending.length };
}


function refreshAutoPunchRolesBtn_(){
  if(!autoPunchRolesBtn) return;

  const role = (localStorage.getItem('role')||'');
  const canSee = (role === 'SUPER_ADMIN' || role === 'ADMIN');

  if(!canSee){
    autoPunchRolesBtn.classList.add("d-none");
    if(typeof autoPunchRolesDone !== 'undefined' && autoPunchRolesDone) autoPunchRolesDone.classList.add("d-none");
    return;
  }

  const st = computeRolePunchStatus_();

  // no role volunteers -> hide all
  if(st.totalRole === 0){
    autoPunchRolesBtn.classList.add("d-none");
    if(typeof autoPunchRolesDone !== 'undefined' && autoPunchRolesDone) autoPunchRolesDone.classList.add("d-none");
    return;
  }

  // all pointed -> show green confirmation
  if(st.pendingCount === 0){
    autoPunchRolesBtn.classList.add("d-none");
    if(typeof autoPunchRolesDone !== 'undefined' && autoPunchRolesDone) autoPunchRolesDone.classList.remove("d-none");
    return;
  }

  // pending -> show warning button
  if(typeof autoPunchRolesDone !== 'undefined' && autoPunchRolesDone) autoPunchRolesDone.classList.add("d-none");
  autoPunchRolesBtn.classList.remove("d-none");
  autoPunchRolesBtn.textContent = `👑 Pointer responsables (${st.pendingCount})`;
}



function getVolunteerById(id){
  const sid = String(id);
  return volunteersCache.find(v => String(v.id) === sid) || null;
}

function filterLocal(search){
  const s = normalizeText(search);
  const g = normGroup(groupFilterEl?.value || "");

  let base = volunteersCache;

  if(g){
    base = base.filter(v => normGroup(v.group || v.groupe) === g);
  }

  if (!s) return base;

  const sNoSpace = s.replace(/\s+/g, "");
  return base.filter(v => {
    const name = normalizeText(v.fullName || "");
    const badge = normalizeBadge(v.badgeCode || "");
    return name.includes(s) || badge.includes(sNoSpace);
  });
}

function render(volunteers, todayISO) {
  countPill.textContent = volunteers.length;

  if (volunteers.length === 0) {
    listEl.innerHTML = `<div class="text-muted2 small">Aucun volontaire ne correspond à votre recherche.</div>`;
    return;
  }

  listEl.innerHTML = volunteers.map(v => {
    const vid = String(v.id);
    const punchedAt = punchedMap.get(vid);
    const punchedToday = !!punchedAt;

    const status = punchedToday
      ? `<span class="badge text-bg-success">✓ Pointé</span>`
      : `<span class="badge text-bg-secondary">• Non pointé</span>`;

    const btnPunch = punchedToday
      ? ``
      : `<button class="btn btn-primary btn-sm" data-action="punch" data-id="${escapeHtml(vid)}">Pointage</button>`;

    const btnEdit = isSuper()
      ? `<button class="btn btn-outline-light btn-sm" data-action="edit" data-id="${escapeHtml(vid)}" title="Modifier">✏️</button>`
      : ``;

    const btnDelete = isSuper()
      ? `<button class="btn btn-outline-danger btn-sm" data-action="delete" data-id="${escapeHtml(vid)}" title="Supprimer le bénévole">🗑️</button>`
      : ``;


    const btnHist = `<button class="btn btn-outline-light btn-sm" data-action="history" data-id="${escapeHtml(vid)}" title="Historique">🕘</button>`;

    const btnUndo = punchedToday
      ? `<button class="btn btn-warning btn-sm text-dark" data-action="undo" data-id="${escapeHtml(vid)}" title="Annuler le pointage">Annuler</button>`
      : ``;

    const timeBadge = punchedToday
      ? `<span class="badge badge-soft text-white">⏱ ${formatTimeLocal(punchedAt)}</span>`
      : "";

    const grp = normGroup(v.group || v.groupe || "");

    const vRole = String(v.role || v.volunteerRole || "").trim();
    const chefIcon = vRole ? `<span class="ms-2 chef-icon" title="Rôle: ${escapeHtml(vRole)}">⭐</span>` : ``;
    const roleBadge = vRole ? `<span class="badge badge-soft text-white">🎖 ${escapeHtml(vRole)}</span>` : ``;

    const missingQr = !String(v.qrCode || "").trim();
    const qrWarn = missingQr
      ? `<span class="ms-1 text-warning qr-missing-icon" title="Ce bénévole n'a pas de QR/Code badge. Ajoutez un code pour pouvoir le scanner.">⚠️</span>`
      : ``;

    return `
      <div class="list-card p-3 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2">
        <div class="w-100">
          <div class="fw-bold text-truncate text-white">${escapeHtml(v.fullName || "")}${chefIcon}</div>
          <div class="d-flex flex-wrap gap-2 mt-2">
            ${v.badgeCode ? `<span class="badge badge-soft text-white">🏷 ${escapeHtml(v.badgeCode)}</span>` : `<span class="badge badge-soft text-white">🏷 (Sans badge)</span>`}${qrWarn}
            ${v.phone ? `<span class="badge badge-soft text-white">📞 +212 ${escapeHtml(v.phone)}</span>` : `<span class="badge badge-soft text-white">📞 (Sans téléphone)</span>`}
            ${roleBadge}
            ${grp ? `<span class="badge badge-soft text-white">👥 Groupe ${escapeHtml(grp)}</span>` : `<span class="badge badge-soft text-white">👥 Groupe (Non défini)</span>`}
            ${timeBadge}
            ${status}
          </div>
        </div>
        <div class="d-flex align-items-center gap-2 flex-wrap">
          ${btnEdit}${btnDelete}${btnHist}
          ${btnUndo}
          ${btnPunch}
        </div>
      </div>
    `;
  }).join("");
}

function setLoading(msg="Chargement..."){
  listEl.innerHTML = `
    <div class="text-muted2 small d-flex align-items-center gap-2">
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      <span>${escapeHtml(msg)}</span>
    </div>
  `;
}


function renderFromCache(){
  const q = (searchEl?.value || "").trim();
  const filtered = filterLocal(q);
  render(filtered, todayISO);
}

// === Offline (IndexedDB) - PUNCH uniquement ===
function setOfflineFlag_(on){
  try{
    if(offlineStatusEl){
      offlineStatusEl.classList.toggle("d-none", !on);
    }
  }catch(e){}
}

async function refreshSyncUi_(){
  try{
    if(!window.OfflineStore) return;
    const n = await OfflineStore.queueCount();
    if(syncCountEl) syncCountEl.textContent = String(n);
    if(syncBtn){
      syncBtn.classList.toggle("d-none", n <= 0);
      syncBtn.disabled = n <= 0;
    }
  }catch(e){}
}

async function syncOfflineQueue_(){
  if(!syncBtn || !window.OfflineStore) return;
  syncBtn.disabled = true;
  try{
    const ops = await OfflineStore.queueList();
    if(!ops || ops.length === 0){
      await refreshSyncUi_();
      return;
    }
    let sent = 0;
    let already = 0;
    const done = [];
    for(const op of ops){
      if(op.type !== "PUNCH") continue;
      try{
        const res = await apiPunch(op.volunteerId, op.dateISO);
        if(res && res.ok){
          sent++;
          done.push(op.id);
        }else if(res && res.error === "ALREADY_PUNCHED"){
          already++;
          done.push(op.id);
        }else{
          // keep in queue
        }
      }catch(e){
        setOfflineFlag_(true);
        break; // still offline
      }
    }
    if(done.length){
      await OfflineStore.queueDeleteByIds(done);
      toast(`Synchronisation: ${sent} envoyés, ${already} déjà pointés.`);
    }
  }finally{
    syncBtn.disabled = false;
    await refreshSyncUi_();
  }
}


async function load(forceReloadVolunteers = false, showOverlay = false) {
  const q = (searchEl.value || "").trim();

  const isFirst = volunteersCache.length === 0;
  const shouldOverlay = showOverlay || forceReloadVolunteers || isFirst;

  if (shouldOverlay) {
    showLoader(isFirst ? "Chargement des volontaires..." : "Actualisation...");
    // Let the browser paint the overlay before heavy work / network
    await new Promise(r => setTimeout(r, 0));
  }

  try{
    // Always refresh today's punches (light)
    todayISO = await refreshTodayPunches();
    todayEl.textContent = `Aujourd'hui : ${todayISO}`;

    // Fast cache render (optional) to reduce first-load perceived latency
    if (isFirst) {
      const cached = readLocalCache();
      if (cached?.data?.length) {
        volunteersCache = cached.data;
      }
    }

    const now = Date.now();
    const needReload =
      forceReloadVolunteers ||
      volunteersCache.length === 0 ||
      (now - lastLoadedAt) > 5*60*1000;

    if (needReload) {
      const res = await apiListVolunteers(""); // load all once
      if (!res.ok) throw new Error(res.error || "LIST_ERROR");
      volunteersCache = res.volunteers || [];
      refreshGroupDatalist();
      lastLoadedAt = now;
      writeLocalCache(volunteersCache);
      try{ OfflineStore?.cacheVolunteersWrite?.(volunteersCache); }catch(e){}
    }

    const filtered = filterLocal(q);
    render(filtered, todayISO);
    refreshAutoPunchRolesBtn_();

  }catch(e){
    console.error(e);
    toast("Impossible de charger les données: " + (e?.message || "UNKNOWN") + ".");
    listEl.innerHTML = `<div class="text-muted2 small">Erreur: ${escapeHtml(e?.message || "UNKNOWN")}</div>`;
  }finally{
    if (shouldOverlay) hideLoader();
  }
}

function bindUI(){
  renderUserPill();
  // Hide SUPER_ADMIN-only UI for ADMIN
  try{
    const openAddBtn = document.getElementById("openAddBtn");
    if(openAddBtn) openAddBtn.classList.toggle("d-none", !isSuper());
  }catch(e){}

  // restore group filter
  try{
    const g = localStorage.getItem("pointage_group_filter") || "";
    if(groupFilterEl) groupFilterEl.value = g;
  }catch(e){}
}

scanBtn?.addEventListener("click", ()=>{
  // Admin + Super admin
  location.href = "./scan.html";
});

groupPunchBtn?.addEventListener("click", async ()=>{
  if(!isSuper()) return;
  // ensure we have volunteers loaded at least once
  if(!volunteersCache.length){
    try{ await load(true, true); }catch(e){}
  }
  renderGroupPunchRadios(lastGroupPunchSelection);
  groupPunchModal?.show();
});

autoPunchRolesBtn?.addEventListener("click", async ()=>{
  const role = (localStorage.getItem('role')||'');
  if(!(role === 'SUPER_ADMIN' || role === 'ADMIN')) return;

  const st = computeRolePunchStatus_();
  if(st.pendingCount <= 0){
    refreshAutoPunchRolesBtn_();
    return;
  }

  if(!confirm(`Pointer ${st.pendingCount} responsable(s) (role renseigné) ?\n\nLes bénévoles déjà pointés aujourd'hui seront ignorés.`)){
    return;
  }

  const prevText = autoPunchRolesBtn.textContent;
  autoPunchRolesBtn.disabled = true;
  autoPunchRolesBtn.textContent = "⏳ Pointage en cours...";

  try{
    const today = isoDate(new Date());
    const res = await apiRunAutoPunchRoles(today);

    if(!res){
      toast("Erreur: aucune réponse du serveur (SERVER_ERROR).");
      return;
    }
    if(!res.ok){
      if(res.error === "NOT_AUTHENTICATED"){ logout(); return; }
      toast("Erreur: " + (res.error || "UNKNOWN_ACTION"));
      return;
    }

    toast(`✅ Terminé: ${res.punchedNew || 0} ajouté(s), ${res.alreadyPunched || 0} déjà pointé(s).`);
    
      soundOk_();
await load(true, true);
  }catch(e){
    console.error(e);
    toast("Erreur: " + (e?.message || "JSONP error"));
  }finally{
    autoPunchRolesBtn.disabled = false;
    autoPunchRolesBtn.textContent = prevText;
    refreshAutoPunchRolesBtn_();
  }
});


groupPunchRadiosEl?.addEventListener('change', ()=>{
  const selected = normGroup(document.querySelector('input[name="groupPunch"]:checked')?.value || "");
  if(!selected) return;
  lastGroupPunchSelection = selected;
  try{
    const inGroup = (volunteersCache||[]).filter(v => normGroup(v.group||v.groupe) === selected).length;
    if(groupPunchHintEl) groupPunchHintEl.textContent = `Volontaires dans le groupe « ${selected} » : ${inGroup}. Date : ${todayISO}`;
  }catch(e){}
});

groupPunchDoBtn?.addEventListener('click', async ()=>{
  if(!isSuper()) return;
  const selected = normGroup(document.querySelector('input[name="groupPunch"]:checked')?.value || "");
  if(!selected){
    if(groupPunchMsgEl){ groupPunchMsgEl.textContent = "Veuillez choisir un groupe."; groupPunchMsgEl.className = "small mt-2 text-danger"; }
    return;
  }
  lastGroupPunchSelection = selected;
  if(groupPunchMsgEl){ groupPunchMsgEl.textContent = ""; groupPunchMsgEl.className = "small mt-2"; }

  setBtnLoading(groupPunchDoBtn, true, "Pointage...");
  try{
    const res = await apiPunchGroup(selected, todayISO);
    if(!res.ok){
      if(res.error === "NOT_AUTHENTICATED"){ logout(); return; }
      if(groupPunchMsgEl){
        const msg = res.error === "EMPTY_GROUP" ? "Aucun volontaire dans ce groupe." : ("Erreur: " + (res.error||"UNKNOWN"));
        groupPunchMsgEl.textContent = msg;
        groupPunchMsgEl.className = "small mt-2 text-danger";
      }
      return;
    }

    const punchedNew = Number(res.punchedNew || 0);
    const already = Number(res.alreadyPunched || 0);
    const total = Number(res.totalInGroup || 0);
    if(groupPunchMsgEl){
      groupPunchMsgEl.textContent = `✅ Terminé. Nouveaux pointages: ${punchedNew} • Déjà pointés: ${already} • Total groupe: ${total}`;
      groupPunchMsgEl.className = "small mt-2 text-success";
    }
    toast(`Groupe ${selected}: +${punchedNew} pointage(s) ✅`);

    // Refresh list status
    todayISO = await refreshTodayPunches();
    todayEl.textContent = `Aujourd'hui : ${todayISO}`;
    renderFromCache();
  }catch(e){
    console.error(e);
    if(groupPunchMsgEl){ groupPunchMsgEl.textContent = "Erreur réseau."; groupPunchMsgEl.className = "small mt-2 text-danger"; }
  }finally{
    setBtnLoading(groupPunchDoBtn, false);
  }
});

refreshBtn?.addEventListener("click", () => load(true, true));

syncBtn?.addEventListener("click", () => syncOfflineQueue_());

  focusSearchBtn?.addEventListener('click', ()=>{ searchEl.focus(); searchEl.select(); });
  // mobile: focus on first tap anywhere
  let firstTapFocused=false;
  document.addEventListener('pointerdown', ()=>{ if(!firstTapFocused){ firstTapFocused=true; setTimeout(()=>{ try{ searchEl.focus(); }catch(e){} }, 0); } }, { once:true });

  
  // Actions (event delegation)
  listEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    e.preventDefault();
    if(!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action || btn.dataset.act;
    if(!action || !id) return;

    // history opens instantly (no loader on button)
    if(action === "history"){
      const v = getVolunteerById(id);
      if(!v){ toast("Volontaire introuvable."); return; }
      currentHistVolunteer = v;
      if(histSubtitle) histSubtitle.textContent = `${v.fullName || ""} • ${v.badgeCode || ""}`;
      if(historyModal) historyModal.show();
      // auto load
      setTimeout(()=> histLoadBtn?.click(), 50);
      return;
    }

    const old = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>';

    try{
      if(action === "punch"){
        let res = null;
        try{
          res = await apiPunch(id, todayISO);
        }catch(e){
          if(OfflineStore?.isLikelyOffline?.(e)){
            setOfflineFlag_(true);
            try{
              await OfflineStore.enqueuePunch(id, todayISO, "button");
              toast("Enregistré hors-ligne");
              await refreshSyncUi_();
              // refresh UI from local cache (optimistic)
              try{ if(todayPunchesCache){ todayPunchesCache.set(String(id), new Date().toISOString()); } }catch(e){}
              try{ renderFromCache(); }catch(e){}
              return;
            }catch(_e){
              // fallthrough
            }
          }
          throw e;
        }
        if(!res.ok){
          if(res.error === "ALREADY_PUNCHED"){ toast("Déjà pointé aujourd’hui."); }
          else if(res.error === "NOT_AUTHENTICATED"){ logout(); return; }
          else toast("Erreur: " + (res.error || "UNKNOWN"));
        }else{
          try{ soundOk_(); }catch(e){}
          toast("✅ Pointage enregistré");
        }
        todayISO = await refreshTodayPunches();
        todayEl.textContent = `Aujourd'hui : ${todayISO}`;
        renderFromCache();
        // ensure UI interaction remains responsive after re-render
        await new Promise(r=>setTimeout(r,0));
      }

      if(action === "undo"){
        const res = await apiDeletePunch(id, todayISO);
        if(!res.ok){
          if(res.error === "NOT_AUTHENTICATED"){ logout(); return; }
          toast("Erreur: " + (res.error || "UNKNOWN"));
        }else{
          toast("✅ Pointage annulé");
        }
        todayISO = await refreshTodayPunches();
        todayEl.textContent = `Aujourd'hui : ${todayISO}`;
        renderFromCache();
      }

      if(action === "delete"){
        if(!isSuper()) return;
        const v = getVolunteerById(id);
        const label = v ? `${v.fullName || ""} (${v.badgeCode || ""})` : id;
        if(!confirm(`Supprimer ce bénévole ?\n\n${label}\n\n⚠️ Les pointages (historique) ne seront pas supprimés.`)) return;
        const res = await apiDeleteVolunteer(id);
        if(!res.ok){
          if(res.error === "NOT_AUTHENTICATED"){ logout(); return; }
          toast("Erreur: " + (res.error || "UNKNOWN"));
        }else{
          toast("✅ Bénévole supprimé");
          // Reload volunteers from backend then refresh UI
          await load(true, true);
        }
      }

      if(action === "edit"){
        const v = getVolunteerById(id);
        if(!v){ toast("Volontaire introuvable."); return; }
        editMsg.textContent = "";
        editMsg.className = "small";
        editIdEl.value = String(v.id);
        editFullNameEl.value = v.fullName || "";
        editBadgeCodeEl.value = v.badgeCode || "";
        if(editQrCodeEl) editQrCodeEl.value = v.qrCode || "";
        editPhoneEl.value = v.phone || "";
        setGroupRadios("groupEdit", v.group || "A");
        editModal?.show();
      }
    }catch(err){
      console.error(err);
      toast("Erreur inattendue.");
    }finally{
      try{ btn.blur && btn.blur(); }catch(e){}
      if(btn && btn.isConnected){
        btn.disabled = false;
        btn.innerHTML = old;
      }
    }
  });

clearSearchBtn?.addEventListener("click", ()=>{ searchEl.value=""; renderFromCache(); });

let debounce;
  searchEl?.addEventListener("input", ()=>{
    clearTimeout(debounce);
    debounce = setTimeout(()=>{
      renderFromCache();
    }, 120);
  });
  groupFilterEl?.addEventListener("change", ()=>{
    try{ localStorage.setItem("pointage_group_filter", groupFilterEl.value||""); }catch(e){}
    renderFromCache();
  });
logoutBtn?.addEventListener("click", logout);

  openAddBtn?.addEventListener("click", ()=>{
    addMsg.textContent = "";
    addMsg.className = "small";
    setGroupRadios("groupAdd", "A");
    if(qrCodeEl) qrCodeEl.value = "";
    // Default: ne pas pointer immédiatement
    try{
      const r = document.querySelector('input[name="punchNowAdd"][value="no"]');
      if(r) r.checked = true;
    }catch(e){}
    addModal?.show();
  });

  addForm?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    addMsg.textContent = "";
    addMsg.className = "small";
    const submitBtn = addForm.querySelector('button[type="submit"]');
    resetBtn(submitBtn, "Enregistrer");
    setInlineSpinner(addSpinnerEl, false);

    const fullName = (fullNameEl.value || "").trim();
    const badgeCode = (badgeCodeEl.value || "").trim();
    const qrCode = (qrCodeEl ? (qrCodeEl.value || "") : "").trim();
    const phone = (phoneEl.value || "").trim();
    const group = getSelectedGroupAdd();
    const punchNow = (document.querySelector('input[name="punchNowAdd"]:checked')?.value === "yes");
    if(groupEl) groupEl.value = group;
    if(!fullName){
      setInlineSpinner(addSpinnerEl, false);
      setBtnLoading(submitBtn, false);
      addMsg.textContent = "Le nom complet est obligatoire.";
      addMsg.className = "small text-danger";
      return;
    }

    setBtnLoading(submitBtn, true, "Enregistrement...");
    setInlineSpinner(addSpinnerEl, true);

    try{
      const res = await apiAddVolunteer(fullName, badgeCode, qrCode, phone, group);
      if(!res.ok){
        addMsg.textContent = res.error === "BADGE_ALREADY_EXISTS"
          ? "Ce code badge existe déjà."
          : (res.error === "QR_ALREADY_EXISTS"
            ? "Ce code QR existe déjà."
            : ("Erreur: " + (res.error || "UNKNOWN")));
        setInlineSpinner(addSpinnerEl, false);
        addMsg.className = "small text-danger";
        return;
      }

      volunteersCache.unshift({
        id: res.id,
        fullName,
        badgeCode,
        qrCode,
        phone,
        group
      });
      writeLocalCache(volunteersCache);
      try{ OfflineStore?.cacheVolunteersWrite?.(volunteersCache); }catch(e){}

      // Optional: punch immediately after adding
      let punchMsg = "";
      if(punchNow){
        try{
          let punchRes = null;
          const dateISO_ = (todayISO || isoDate(new Date()));
          try{
            punchRes = await apiPunch(res.id, dateISO_);
          }catch(e){
            if(OfflineStore?.isLikelyOffline?.(e)){
              setOfflineFlag_(true);
              try{ await OfflineStore.enqueuePunch(res.id, dateISO_, "button-add"); await refreshSyncUi_(); punchMsg = " (enregistré hors-ligne)"; }
              catch(_e){}
              punchRes = { ok: true, offline: true };
            }else{ throw e; }
          }
          if(!punchRes.ok){
            if(punchRes.error === "ALREADY_PUNCHED"){
              // include time if provided
              const t = punchRes.punchedAt ? formatTimeLocal(punchRes.punchedAt) : "";
              punchMsg = t ? ` (déjà pointé à ${t})` : " (déjà pointé)";
            }else{
              punchMsg = ` (pointage non enregistré: ${punchRes.error || "UNKNOWN"})`;
            }
          }else{
            punchMsg = " (pointé aujourd’hui ✅)";
          }
        }catch(e){
          punchMsg = " (pointage non enregistré: erreur réseau)";
        }
      }

      addMsg.textContent = "✅ Volontaire ajouté" + punchMsg;
      addMsg.className = punchNow ? "small text-success" : "small text-success";
      setInlineSpinner(addSpinnerEl, false);
      fullNameEl.value = "";
      badgeCodeEl.value = "";
      if(qrCodeEl) qrCodeEl.value = "";
      phoneEl.value = "";

      // Refresh punches so the list shows the correct status
      try{
        todayISO = await refreshTodayPunches();
        todayEl.textContent = `Aujourd'hui : ${todayISO}`;
      }catch(e){}

      setTimeout(()=> addModal?.hide(), 600);
      renderFromCache();

    }catch(err){
      console.error(err);
      setInlineSpinner(addSpinnerEl, false);
      addMsg.textContent = "Erreur API (Apps Script).";
      addMsg.className = "small text-danger";
    }finally{
      setInlineSpinner(addSpinnerEl, false);
      setBtnLoading(submitBtn, false);
    }
  });
  // Edit volunteer submit
  editForm?.addEventListener("submit", async (e)=>{
    e.preventDefault();

    editMsg.textContent = "";
    editMsg.className = "small";

    const id = (editIdEl.value || "").trim();
    const fullName = (editFullNameEl.value || "").trim();
    const badgeCode = (editBadgeCodeEl.value || "").trim();
    const qrCode = (editQrCodeEl ? (editQrCodeEl.value || "") : "").trim();
    const phone = (editPhoneEl.value || "").trim();
    const group = getSelectedGroupEdit();
    if(editGroupEl) editGroupEl.value = group;

    const submitBtn = editForm.querySelector('button[type="submit"]');
    // Safety reset (in case previous submit got interrupted)
    resetBtn(submitBtn, "Mettre à jour");

    if(!id || !fullName){
      editMsg.textContent = "Le nom complet est obligatoire.";
      editMsg.className = "small text-danger";
      return;
    }

    setBtnLoading(submitBtn, true, "Mise à jour...");

    setInlineSpinner(editSpinnerEl, true);

    try{
      const res = await apiUpdateVolunteer(id, fullName, badgeCode, qrCode, phone, group);
      if(!res.ok){
        editMsg.textContent = res.error === "BADGE_ALREADY_EXISTS"
          ? "Ce code badge existe déjà."
          : (res.error === "QR_ALREADY_EXISTS"
            ? "Ce code QR existe déjà."
            : ("Erreur: " + (res.error || "UNKNOWN")));
        setInlineSpinner(editSpinnerEl, false);
        editMsg.className = "small text-danger";
        return;
      }

      // update cache locally
      const v = volunteersCache.find(x => String(x.id) === String(id));
      if(v){
        v.fullName = fullName;
        v.badgeCode = badgeCode;
        v.qrCode = qrCode;
        v.phone = phone;
          v.group = group;
      }
      writeLocalCache(volunteersCache);
      try{ OfflineStore?.cacheVolunteersWrite?.(volunteersCache); }catch(e){}

      editMsg.textContent = "✅ Mise à jour effectuée";
      editMsg.className = "small text-success";
      setInlineSpinner(editSpinnerEl, false);

      // re-render after refresh punches (to ensure status ok)
      renderFromCache();

      // hide after small delay
      setTimeout(()=> editModal?.hide(), 450);

    }catch(err){
      console.error(err);
      setInlineSpinner(editSpinnerEl, false);
      editMsg.textContent = "Erreur API (Apps Script).";
      editMsg.className = "small text-danger";
    }finally{
      setInlineSpinner(editSpinnerEl, false);
      // Always restore button state
      setBtnLoading(submitBtn, false);
    }
  });
function applyRoleUI(){
  const superOnly = document.querySelectorAll('[data-super-only]');
  superOnly.forEach(el => { el.style.display = isSuper() ? '' : 'none'; });

  const adminOnly = document.querySelectorAll('[data-admin-only]');
  adminOnly.forEach(el => { el.style.display = isAdminOrSuper() ? '' : 'none'; });
}

function applyPlanningUI(){
  try{
    const todayISO = (typeof isoDate === "function") ? isoDate(new Date()) : new Date().toISOString().slice(0,10);
    const workG = plannedGroupForDate(todayISO);

    // default group filter = groupe actif du jour (si pas déjà choisi)
    if(groupFilterEl && !groupFilterEl.value){
      groupFilterEl.value = workG;
    }

    // title
    const titleEl = document.getElementById("pageTitle");
    if(titleEl){
      titleEl.textContent = `Volontaires Groupe ${workG} : 15h - 19h`;
    }
  }catch(e){
    console.warn("applyPlanningUI", e);
  }
}



requireAdmin();
bindUI();
applyRoleUI();
applyPlanningUI();
load(true, true);
