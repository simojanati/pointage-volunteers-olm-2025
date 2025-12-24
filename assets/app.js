const listEl = document.getElementById("list");
const searchEl = document.getElementById("search");
const refreshBtn = document.getElementById("refreshBtn");
const countPill = document.getElementById("countPill");
const todayEl = document.getElementById("today");
const toastEl = document.getElementById("toast");
const logoutBtn = document.getElementById("logoutBtn");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const openAddBtn = document.getElementById("openAddBtn");

// Modal
const addModalEl = document.getElementById("addModal");
let addModal;
if (addModalEl && window.bootstrap?.Modal) {
  addModal = new bootstrap.Modal(addModalEl);
}
const addForm = document.getElementById("addForm");
const addMsg = document.getElementById("addMsg");
const fullNameEl = document.getElementById("fullName");
const badgeCodeEl = document.getElementById("badgeCode");
const phoneEl = document.getElementById("phone");

let punchedMap = new Map();     // volunteer_id -> punched_at
let volunteersCache = [];       // cached volunteers
let lastLoadedAt = 0;

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.style.opacity = "1";
  setTimeout(() => (toastEl.style.opacity = "0"), 2200);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[s]));
}

async function refreshTodayPunches(){
  const today = isoDate(new Date());
  const r = await apiReportPunches(today, today);
  if (!r.ok) throw new Error(r.error || "REPORT_ERROR");
  punchedMap = new Map((r.punches || []).map(p => [String(p.volunteer_id), p.punched_at]));
  return today;
}

function filterLocal(search){
  const s = (search || "").toLowerCase().trim();
  if (!s) return volunteersCache;
  return volunteersCache.filter(v => {
    const name = String(v.fullName || "").toLowerCase();
    const badge = String(v.badgeCode || "").toLowerCase();
    return name.includes(s) || badge.includes(s);
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
      ? `<button class="btn btn-outline-light btn-sm" disabled>Pointé</button>`
      : `<button class="btn btn-primary btn-sm" data-action="punch" data-id="${escapeHtml(vid)}">Pointage</button>`;

    const btnUndo = punchedToday
      ? `<button class="btn btn-outline-warning btn-sm" data-action="undo" data-id="${escapeHtml(vid)}" title="Annuler le pointage">Annuler</button>`
      : ``;

    const timeBadge = punchedToday
      ? `<span class="badge badge-soft text-white">⏱ ${(punchedAt || "").slice(11,16)}</span>`
      : "";

    return `
      <div class="list-card p-3 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2">
        <div class="w-100">
          <div class="fw-bold text-truncate text-white">${escapeHtml(v.fullName || "")}</div>
          <div class="d-flex flex-wrap gap-2 mt-2">
            ${v.badgeCode ? `<span class="badge badge-soft text-white">🏷 ${escapeHtml(v.badgeCode)}</span>` : `<span class="badge badge-soft text-white">🏷 (Sans badge)</span>`}
            ${v.phone ? `<span class="badge badge-soft text-white">📞 ${escapeHtml(v.phone)}</span>` : `<span class="badge badge-soft text-white">📞 (Sans téléphone)</span>`}
            ${timeBadge}
            ${status}
          </div>
        </div>
        <div class="d-flex align-items-center gap-2">
          ${btnUndo}
          ${btnPunch}
        </div>
      </div>
    `;
  }).join("");

  listEl.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      btn.disabled = true;
      btn.textContent = "...";

      try{
        if (action === "punch"){
          const res = await apiPunch(id, todayISO);
          if (!res.ok){
            if (res.error === "ALREADY_PUNCHED_TODAY") toast("Ce volontaire est déjà pointé aujourd'hui.");
            else toast("Erreur lors du pointage.");
          }else{
            toast("✅ Pointage enregistré");
          }
        }else if (action === "undo"){
          const ok = confirm("Annuler le pointage de ce volontaire pour aujourd'hui ?");
          if(!ok) return;
          const res = await apiDeletePunch(id, todayISO);
          if (!res.ok){
            toast("Erreur lors de l'annulation.");
          }else{
            toast("↩️ Pointage annulé");
          }
        }
      }catch(e){
        console.error(e);
        toast("Erreur API (Apps Script).");
      }finally{
        await load(false);
      }
    });
  });
}

async function load(forceReloadVolunteers = false) {
  const q = (searchEl.value || "").trim();

  try{
    const todayISO = await refreshTodayPunches();
    todayEl.textContent = `Aujourd'hui : ${todayISO}`;

    const now = Date.now();
    if (forceReloadVolunteers || volunteersCache.length === 0 || (now - lastLoadedAt) > 5*60*1000){
      const res = await apiListVolunteers(""); // load all once
      if (!res.ok) throw new Error(res.error || "LIST_ERROR");
      volunteersCache = res.volunteers || [];
      lastLoadedAt = now;
    }

    const filtered = filterLocal(q);
    render(filtered, todayISO);

  }catch(e){
    console.error(e);
    toast("Impossible de charger les données. Vérifiez la configuration API_URL/TOKEN.");
    listEl.innerHTML = `<div class="text-muted2 small">Configuration manquante ou API indisponible.</div>`;
  }
}

function bindUI(){
  refreshBtn?.addEventListener("click", () => load(true));
  clearSearchBtn?.addEventListener("click", ()=>{ searchEl.value=""; load(false); });

  let debounce;
  searchEl?.addEventListener("input", ()=>{
    clearTimeout(debounce);
    debounce = setTimeout(()=> load(false), 160);
  });

  logoutBtn?.addEventListener("click", logout);

  openAddBtn?.addEventListener("click", ()=>{
    addMsg.textContent = "";
    addMsg.className = "small";
    addModal?.show();
  });

  addForm?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    addMsg.textContent = "";
    addMsg.className = "small";

    const fullName = (fullNameEl.value || "").trim();
    const badgeCode = (badgeCodeEl.value || "").trim();
    const phone = (phoneEl.value || "").trim();
    if(!fullName){
      addMsg.textContent = "Le nom complet est obligatoire.";
      addMsg.className = "small text-danger";
      return;
    }

    try{
      const res = await apiAddVolunteer(fullName, badgeCode, phone);
      if(!res.ok){
        addMsg.textContent = res.error === "BADGE_ALREADY_EXISTS"
          ? "Ce code badge existe déjà."
          : "Erreur lors de l'ajout.";
        addMsg.className = "small text-danger";
        return;
      }

      volunteersCache.unshift({
        id: res.id,
        fullName,
        badgeCode,
        phone
      });

      addMsg.textContent = "✅ Volontaire ajouté";
      addMsg.className = "small text-success";
      fullNameEl.value = "";
      badgeCodeEl.value = "";
      phoneEl.value = "";

      setTimeout(()=> addModal?.hide(), 500);
      await load(false);

    }catch(err){
      console.error(err);
      addMsg.textContent = "Erreur API (Apps Script).";
      addMsg.className = "small text-danger";
    }
  });
}

requireAuth();
bindUI();
load(true);
