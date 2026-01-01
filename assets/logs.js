// Logs page (SUPER_ADMIN)
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}


function renderUserPill(){
  const el = document.getElementById("userPill");
  if(!el) return;

  // Ensure netDot exists inside the pill (left)
  let dot = el.querySelector("#netDot");
  if(!dot){
    dot = document.createElement("span");
    dot.id = "netDot";
    dot.className = "net-dot net-unknown";
    dot.title = "Connexion";
    el.prepend(dot);
  }

  const u = (localStorage.getItem("nomComplet") || localStorage.getItem("username")) || "—";
  const r = (localStorage.getItem("role") || "—").toUpperCase();
  const roleClass = r === "SUPER_ADMIN" ? "badge-role-super" : (r === "ADMIN" ? "badge-role-admin" : "badge-role-unknown");

  // Remove everything except dot
  Array.from(el.childNodes).forEach(n => {
    if(n !== dot) el.removeChild(n);
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
function __setNetDot(state){
  if(!__netDotEl) return;
  __netDotEl.classList.remove("net-online","net-offline","net-unknown");
  if(state === "online") __netDotEl.classList.add("net-online");
  else if(state === "offline") __netDotEl.classList.add("net-offline");
  else __netDotEl.classList.add("net-unknown");
}
async function __checkNetworkStatus(){
  try{
    if(!navigator.onLine){ __setNetDot("offline"); return; }
    // ping API (authenticated pages)
    if(typeof apiMe === "function"){
      await apiMe();
    }
    __setNetDot("online");
  }catch(e){
    __setNetDot("offline");
  }
}
// --------------------------------------------------------------------------



function ensureAuthOrRedirect(){
  const token = localStorage.getItem("sessionToken");
  if(!token){
    window.location.href = "index.html";
    return false;
  }
  return true;
}

let allLogs = [];

function buildTarget(log){
  const parts = [];
  if(log.volunteerName) parts.push(log.volunteerName);
  if(log.badgeCode) parts.push(`Badge: ${log.badgeCode}`);
  if(log.volunteerId) parts.push(`#${log.volunteerId}`);
  if(log.group) parts.push(`Groupe: ${log.group}`);
  return parts.join(" · ") || "—";
}


function parseDetails(raw){
  if(raw === null || raw === undefined) return null;
  if(typeof raw === "object") return raw;
  const s = String(raw).trim();
  if(!s) return null;
  try{
    return JSON.parse(s);
  }catch(e){
    return null;
  }
}

function fmtChangeRow(ch){
  const field = escapeHtml(ch.field || "—");
  const oldV = escapeHtml(String(ch.old ?? "—"));
  const newV = escapeHtml(String(ch.new ?? "—"));
  return `<div class="d-flex flex-wrap gap-2 align-items-center">
    <span class="badge text-bg-secondary">${field}</span>
    <span class="text-danger">${oldV || "—"}</span>
    <span class="text-muted2">→</span>
    <span class="text-success">${newV || "—"}</span>
  </div>`;
}

function formatDetailsShort(log){
  const obj = parseDetails(log.details);
  const act = String(log.action||"").toUpperCase();
  if(obj){
    if(act === "UPDATE_VOLUNTEER" && Array.isArray(obj.changes)){
      return `${obj.changes.length} champ(s) modifié(s)`;
    }
    if(act === "ASSIGN_QR" && Array.isArray(obj.changes)){
      const c = obj.changes[0];
      return c ? `QR: ${String(c.old||"")} → ${String(c.new||"")}` : "Association QR";
    }
    if(act === "PUNCH" && obj.date){
      return `Date: ${obj.date}`;
    }
    if(act === "PUNCH_GROUP" && obj.group){
      return `Groupe ${obj.group} (${obj.punchedNew||0} nouveaux, ${obj.already||0} déjà)`;
    }
    if(act === "DELETE_PUNCH" && obj.date){
      return `Supprimé: ${obj.date}`;
    }
    if(act === "ADD_VOLUNTEER"){
      return "Nouveau bénévole";
    }
  }
  return String(log.details || "").trim() || "—";
}

function buildDetailHtml(log){
  const obj = parseDetails(log.details);
  const ts = escapeHtml(log.ts || "—");
  const actor = `${escapeHtml(log.actorUsername||"—")} (${escapeHtml(log.actorRole||"—")})`;
  const action = escapeHtml(log.action||"—");
  const target = escapeHtml(buildTarget(log));
  const result = badgeResult(log.result);

  let html = `<div class="mb-2"><div class="text-muted2">Date</div><div class="fw-semibold">${ts} (GMT+1)</div></div>
  <div class="row g-2 mb-2">
    <div class="col-12 col-md-6"><div class="text-muted2">Utilisateur</div><div class="fw-semibold">${actor}</div></div>
    <div class="col-12 col-md-6"><div class="text-muted2">Action</div><div class="fw-semibold">${action}</div></div>
    <div class="col-12"><div class="text-muted2">Cible</div><div class="fw-semibold">${target}</div></div>
    <div class="col-12"><div class="text-muted2">Résultat</div><div>${result}</div></div>
  </div>`;

  if(obj && typeof obj === "object"){
    const act = String(log.action||"").toUpperCase();
    if((act === "UPDATE_VOLUNTEER" || act === "ASSIGN_QR") && Array.isArray(obj.changes)){
      html += `<div class="text-muted2 mb-1">Changements</div>`;
      html += obj.changes.map(fmtChangeRow).join("");
    } else {
      html += `<div class="text-muted2 mb-1">Détails</div><pre class="bg-black p-2 rounded border border-secondary small mb-0">${escapeHtml(JSON.stringify(obj, null, 2))}</pre>`;
    }
  } else {
    html += `<div class="text-muted2 mb-1">Détails</div><div>${escapeHtml(String(log.details||"—"))}</div>`;
  }
  return html;
}

function openDetailModal(log){
  const body = document.getElementById("logDetailBody");
  if(body) body.innerHTML = buildDetailHtml(log);
  const el = document.getElementById("logDetailModal");
  if(!el) return;
  try{
    const modal = bootstrap.Modal.getOrCreateInstance(el);
    modal.show();
  }catch(e){
    // fallback
    el.classList.add("show");
  }
}

function badgeResult(result){
  const r = String(result || "").toUpperCase();
  if(r === "OK") return '<span class="badge text-bg-success">OK</span>';
  if(r === "ALREADY") return '<span class="badge text-bg-warning">ALREADY</span>';
  if(r === "ERROR") return '<span class="badge text-bg-danger">ERROR</span>';
  return `<span class="badge text-bg-secondary">${escapeHtml(r || "—")}</span>`;
}

function applyFilters(){
  const userQ = (document.getElementById("filterUser")?.value || "").trim().toLowerCase();
  const act = (document.getElementById("filterAction")?.value || "").trim().toUpperCase();
  const res = (document.getElementById("filterResult")?.value || "").trim().toUpperCase();

  let rows = allLogs.slice();
  if(userQ){
    rows = rows.filter(l => String(l.actorUsername||"").toLowerCase().includes(userQ));
  }
  if(act){
    rows = rows.filter(l => String(l.action||"").toUpperCase() === act);
  }
  if(res){
    rows = rows.filter(l => String(l.result||"").toUpperCase() === res);
  }

  renderTable(rows);
}


function renderTable(logs){
  const tbody = document.getElementById("logsTbody");
  const meta = document.getElementById("metaInfo");
  if(meta) meta.textContent = logs.length ? `${logs.length} log(s)` : "0 log";

  if(!tbody) return;
  if(!logs.length){
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted2">Aucun log.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map((l, idx) => {
    const actor = `${escapeHtml(l.actorUsername || "—")} <span class="text-muted2">(${escapeHtml(l.actorRole || "—")})</span>`;
    const detailsShort = escapeHtml(formatDetailsShort(l));
    return `<tr data-log-idx="${idx}">
      <td class="text-nowrap">${escapeHtml(l.ts || "—")} <span class="text-muted2">(GMT+1)</span></td>
      <td>${actor}</td>
      <td><span class="badge text-bg-info">${escapeHtml(String(l.action||"—"))}</span></td>
      <td>${escapeHtml(buildTarget(l))}</td>
      <td>${badgeResult(l.result)}</td>
      <td class="small text-muted2">${detailsShort}</td>
      <td class="text-end"><button class="btn btn-outline-light btn-sm" data-view-idx="${idx}">Voir</button></td>
    </tr>`;
  }).join("");

  // bind view buttons
  tbody.querySelectorAll("[data-view-idx]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const i = parseInt(btn.getAttribute("data-view-idx"), 10);
      if(Number.isNaN(i)) return;
      openDetailModal(logs[i]);
    });
  });
}

async function loadLogs(){
  const role = (localStorage.getItem("role") || "").toUpperCase();
  if(role !== "SUPER_ADMIN"){
    document.getElementById("logsTbody").innerHTML = `<tr><td colspan="6" class="text-danger">Accès réservé au Super Admin.</td></tr>`;
    return;
  }

  document.getElementById("logsTbody").innerHTML = `<tr><td colspan="6" class="text-muted2">Chargement…</td></tr>`;
  const res = await apiListLogs(1000);
  if(!res?.ok){
    document.getElementById("logsTbody").innerHTML = `<tr><td colspan="6" class="text-danger">Erreur: ${escapeHtml(res?.error || "UNKNOWN")}</td></tr>`;
    return;
  }

  allLogs = res.logs || [];
  applyFilters();
}

document.getElementById("refreshBtn")?.addEventListener("click", loadLogs);
document.getElementById("clearBtn")?.addEventListener("click", () => {
  const u = document.getElementById("filterUser"); if(u) u.value = "";
  const a = document.getElementById("filterAction"); if(a) a.value = "";
  const r = document.getElementById("filterResult"); if(r) r.value = "";
  applyFilters();
});

["filterUser","filterAction","filterResult"].forEach(id => {
  document.getElementById(id)?.addEventListener("input", applyFilters);
  document.getElementById(id)?.addEventListener("change", applyFilters);
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("sessionToken");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
  window.location.href = "index.html";
});

if(ensureAuthOrRedirect()){
  renderUserPill();
  
const clearBtn = document.getElementById("clearFiltersBtn");
clearBtn?.addEventListener("click", () => {
  const fu = document.getElementById("filterUser");
  const fa = document.getElementById("filterAction");
  const fr = document.getElementById("filterResult");
  if(fu) fu.value = "";
  if(fa) fa.value = "";
  if(fr) fr.value = "";
  renderTable(allLogs);
});

loadLogs();
}

try{ __checkNetworkStatus(); }catch(e){}
try{ setInterval(()=>{ try{ __checkNetworkStatus(); }catch(e){} }, 8000); }catch(e){}
window.addEventListener('online', ()=> __setNetDot('online'));
window.addEventListener('offline', ()=> __setNetDot('offline'));
