
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





function isSuperAdmin(){
  return String(localStorage.getItem("role") || "").toUpperCase() === "SUPER_ADMIN";
}

function normGroup(g){
  return String(g ?? "").trim().toUpperCase();
}

function rowGroup(r){
  return normGroup(r?.group || r?.groupe || "");
}


function activeOffGroupForDate(rows, dateISO){
  let a = 0, b = 0;
  for(const r of (rows||[])){
    if(String(r.punch_date||"") !== String(dateISO||"")) continue;
    const g = rowGroup(r);
    if(g === "A") a++;
    else if(g === "B") b++;
  }
  const active = (a >= b) ? "A" : "B";
  const off = (active === "A") ? "B" : "A";
  return { active, off, countA: a, countB: b };
}

function volGroup(v){
  return normGroup(v?.group || v?.groupe || "");
}

function applyGroupFilter(){
  const g = getSelectedGroup(); // "" / "A" / "B"
  filteredVolunteers = g
    ? (rawVolunteers || []).filter(v => volGroup(v) === g)
    : (rawVolunteers || []).slice();

  filteredRows = g
    ? (rawRows || []).filter(r => rowGroup(r) === g)
    : (rawRows || []).slice();

  // Keep backward-compatible vars
  lastVolunteersFiltered = filteredVolunteers;
  lastRows = filteredRows;

  // RAW references (unfiltered by group)
  if(!Array.isArray(lastRowsRaw) || !lastRowsRaw.length) lastRowsRaw = (rawRows || []).slice();
  if(!Array.isArray(lastVolunteersRaw) || !lastVolunteersRaw.length) lastVolunteersRaw = (rawVolunteers || []).slice();
}

function formatPhoneForUi_(raw){
  const v = String(raw||"").trim();
  if(!v) return "";
  if(v.startsWith('+')) return v;
  const digits = v.replace(/[^0-9]/g,'');
  if(!digits) return v;
  if(digits.startsWith('212')) return '+' + digits;
  if(digits.startsWith('0')) return '+212' + digits.substring(1);
  return '+212' + digits;
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}


function formatPhoneForPdf(phone){
  const p = String(phone || "").trim();
  if(!p) return "";
  const cleaned = p.replace(/\s+/g, "");
  if(cleaned.startsWith("+")) return cleaned;
  if(cleaned.startsWith("0")) return "+212" + cleaned.slice(1);
  if(cleaned.startsWith("212")) return "+212" + cleaned.slice(3);
  return "+212" + cleaned;
}



// --- PDF helpers (shared) ---
async function loadAssetDataUrl(path){
  // Returns a data: URL (image/png) for a local asset path.
  // Works on https/http. For file://, falls back to <img> + canvas.
  const toPngDataUrl = (img)=>{
    try{
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || img.width;
      c.height = img.naturalHeight || img.height;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0,0,c.width,c.height);
      ctx.drawImage(img,0,0);
      return c.toDataURL("image/png");
    }catch(e){
      return null;
    }
  };

  // file:// can't fetch reliably (CORS)
  if(location.protocol === "file:"){
    return new Promise((resolve)=>{
      const img = new Image();
      img.onload = ()=> resolve(toPngDataUrl(img));
      img.onerror = ()=> resolve(null);
      img.src = path;
    });
  }

  try{
    const res = await fetch(path, { cache: "no-store" });
    if(!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve)=>{
      const fr = new FileReader();
      fr.onload = ()=> resolve(String(fr.result || ""));
      fr.onerror = ()=> resolve(null);
      fr.readAsDataURL(blob);
    });
  }catch(e){
    return null;
  }
}


const fromEl = document.getElementById("fromDate");
const toEl = document.getElementById("toDate");
const singleDateEl = document.getElementById("singleDate");
const groupEl = document.getElementById("groupSelect");
const loadBtn = document.getElementById("loadBtn");
const exportBtn = document.getElementById("exportBtn");
const pdfBtn = document.getElementById("pdfBtn");
const pdfGroupedBtn = document.getElementById("pdfGroupedBtn");

const totalEl = document.getElementById("totalVolunteers");
const rateEl = document.getElementById("ratePct");
const totalGroupAEl = document.getElementById("totalGroupA");
const totalGroupBEl = document.getElementById("totalGroupB");
const presenceGroupAEl = document.getElementById("presenceGroupA");
const presenceGroupBEl = document.getElementById("presenceGroupB");
const daysBody = document.getElementById("daysBody");
const absencesMainTbody = document.getElementById("absencesMainTbody");
const absencesMainSubEl = document.getElementById("absencesMainSub");
const absencesMainCountEl = document.getElementById("absencesMainCount");
const daysCount = document.getElementById("daysCount");
const emptyMsg = document.getElementById("emptyMsg");
const absencesModalEl = document.getElementById('absencesModal');
const absencesCloseEl = document.getElementById('absencesClose');
const absencesCloseEl2 = document.getElementById('absencesClose2');
const absencesSubEl = document.getElementById('absencesSub');
const absencesCountEl = document.getElementById('absencesCount');
const absencesSearchEl = document.getElementById('absencesSearch');
const absencesTbodyEl = document.getElementById('absencesTbody');

const kpiRateEl = document.getElementById('kpiRate');
const kpiAbsentsEl = document.getElementById('kpiAbsents');
const kpiCountsEl = document.getElementById('kpiCounts');
const kpiFirstEl = document.getElementById('kpiFirst');
const kpiFirstTimeEl = document.getElementById('kpiFirstTime');
const kpiLastEl = document.getElementById('kpiLast');
const kpiLastTimeEl = document.getElementById('kpiLastTime');
const graphSubEl = document.getElementById('graphSub');
const dashChartCanvas = document.getElementById('dashChart');


let lastRows = [];
let lastRowsRaw = [];
let lastVolunteersRaw = [];
let allVolunteers = [];
// RAW caches (unfiltered by group)
let rawRows = [];
let rawVolunteers = [];
// Filtered caches (by selected group)
let filteredRows = [];
let filteredVolunteers = [];


const toastEl = document.getElementById("toast");
let dashChart = null;
const pageLoaderEl = document.getElementById("pageLoader");
const loaderTextEl = document.getElementById("loaderText");
const logoutBtn = document.getElementById("logoutBtn");

function toast(msg){
  toastEl.textContent = msg;
  toastEl.style.opacity = "1";
  setTimeout(()=> toastEl.style.opacity = "0", 2200);
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


function setDefaultDates(){
  const today = isoDate(new Date());
  if(singleDateEl) singleDateEl.value = today;
  if(fromEl) fromEl.value = today;
  if(toEl) toEl.value = today;
}





function buildDaysFromRows(rows){
  const map = {};
  (rows||[]).forEach(r=>{
    const d = r.punch_date || "";
    if(!d) return;
    map[d] = (map[d]||0)+1;
  });
  return Object.keys(map).sort().map(d=>({ date:d, count:map[d] }));
}

function renderSummary(data){
  lastSummary = data;

  // KPI (date unique) — basé sur le planning (groupe actif du jour)
  const volsAll = Array.isArray(lastVolunteersRaw) ? lastVolunteersRaw : (rawVolunteers || []);
  const rowsAllAll = Array.isArray(lastRowsRaw) ? lastRowsRaw : (rawRows || []);
  const maps = buildVolunteerMaps_(volsAll);

  const chosenDate = (singleDateEl && singleDateEl.value) ? singleDateEl.value : (fromEl?.value || "");
  // sync hidden from/to for exports
  if(fromEl) fromEl.value = chosenDate;
  if(toEl) toEl.value = chosenDate;

  // période info (1 jour)
  try{  }catch(e){}

  const workG = plannedGroupForDate(chosenDate);
  const offG  = offGroupForDate(chosenDate);

  // totaux bénévoles
  const totalA = (volsAll||[]).filter(v => volGroup(v)==="A" && String(v.id||"").trim()).length;
  const totalB = (volsAll||[]).filter(v => volGroup(v)==="B" && String(v.id||"").trim()).length;
  const totalAll = totalA + totalB;

  if(totalEl) totalEl.textContent = totalAll;
  if(totalGroupAEl) totalGroupAEl.textContent = totalA;
  if(totalGroupBEl) totalGroupBEl.textContent = totalB;

  // rows du jour
  const rowsForDay = (rowsAllAll||[]).filter(r => String(r.punch_date||"") === String(chosenDate));

  // présents uniques par groupe (selon Volunteers)
  const presentA = new Set();
  const presentB = new Set();
  for(const row of rowsForDay){
    const rid = resolveVolunteerId_(row, maps);
    if(!rid) continue;
    const v = maps.byId.get(rid);
    if(!v) continue;
    const g = volGroup(v);
    if(g==="A") presentA.add(rid);
    else if(g==="B") presentB.add(rid);
  }
  const presentCountA = presentA.size;
  const presentCountB = presentB.size;

  const workTotal = (workG==="A") ? totalA : totalB;
  const offTotal  = (offG==="A") ? totalA : totalB;
  const workPresent = (workG==="A") ? presentCountA : presentCountB;
  const offPresent  = (offG==="A") ? presentCountA : presentCountB;

  const workAbsent = Math.max(0, workTotal - workPresent);


  // Présence: afficher ratio "présents/total" du groupe actif
  const kpiRateEl = document.getElementById("kpiRate");
  const presenceTotal = presentCountA + presentCountB;
  if(kpiRateEl) kpiRateEl.textContent = `${presenceTotal}/${workTotal}`;

  if(presenceGroupAEl) presenceGroupAEl.textContent = `${presentCountA}/${totalA}`;
  if(presenceGroupBEl) presenceGroupBEl.textContent = `${presentCountB}/${totalB}`;

  // Absences list (affichée directement)
  const volsWork = (volsAll||[]).filter(v => volGroup(v)===workG && String(v.id||"").trim());
  const absentList = volsWork.filter(v => !((workG==="A") ? presentA.has(String(v.id).trim()) : presentB.has(String(v.id).trim())))
                             .sort((a,b)=> (a.fullName||a.full_name||"").localeCompare(b.fullName||b.full_name||"", "fr"));

  if(absencesMainSubEl) absencesMainSubEl.textContent = `Date : ${chosenDate} — Groupe actif : ${workG} (OFF : ${offG}) — Pointés OFF : ${offPresent}/${offTotal}`;
  if(absencesMainCountEl) absencesMainCountEl.textContent = String(absentList.length);
  renderAbsencesInto_(absentList, absencesMainTbody);

}



function bindDaysAbsences(){
  if(!daysBody) return;
  if(daysBody) daysBody.addEventListener("click", async (e)=>{
    const btn = e.target.closest(".abs-day-btn");
    if(!btn) return;
    const dateISO = btn.getAttribute("data-date");
    if(!dateISO) return;

    try{
      showLoader("Chargement des absences...");
      // Calcul basé sur le planning (indépendant du filtre)
      const volsAll = (Array.isArray(lastVolunteersRaw) && lastVolunteersRaw.length) ? lastVolunteersRaw : await ensureVolunteers();
      const rowsAll = (Array.isArray(lastRowsRaw) && lastRowsRaw.length) ? lastRowsRaw : (rawRows || []);
      const rowsForDay = (rowsAll || []).filter(x => String(x.punch_date||"") === dateISO);

      const workG = plannedGroupForDate(dateISO);
      const offG  = offGroupForDate(dateISO);

      const maps = buildVolunteerMaps_(volsAll);

      const presentWork = new Set();
      for(const row of (rowsForDay||[])){
        const rid = resolveVolunteerId_(row, maps);
        if(!rid) continue;
        const v = maps.byId.get(rid);
        if(volGroup(v) === workG) presentWork.add(rid);
      }

      const volsWork = (volsAll || []).filter(v => volGroup(v) === workG && String(v.id||"").trim());

      const list = volsWork
        .filter(v => !presentWork.has(String(v.id).trim()))
        .sort((a,b)=> (a.fullName||"").localeCompare(b.fullName||"", "fr"));

      if(absencesSubEl) absencesSubEl.textContent = `Absences (Groupe actif: ${workG} — OFF: ${offG})`;
      renderAbsencesList(list);
      if(absencesCountEl) absencesCountEl.textContent = String(list.length);

      // search
      if(absencesSearchEl) absencesSearchEl.value = "";
      absencesSearchEl?.addEventListener("input", ()=>{
        const q = (absencesSearchEl.value || "").toLowerCase().trim();
        const filtered = !q ? list : list.filter(v =>
          (v.fullName||"").toLowerCase().includes(q) ||
          (v.badgeCode||"").toLowerCase().includes(q) ||
          (v.phone||"").toLowerCase().includes(q)
        );
        if(absencesCountEl) absencesCountEl.textContent = String(filtered.length);
        renderAbsencesList(filtered);
      });

      openAbsencesModal(dateISO);
    }catch(err){
      console.error(err);
      toast("Impossible de charger les absences.");
    }finally{
      hideLoader();
    }
  });
}

async function load(){
  bindAbsencesModal();
  bindDaysAbsences();
  renderUserPill();
  showLoader("Chargement des rapports...");
  if(loadBtn) setBtnLoading(loadBtn, true, "Chargement...");

const logsBtn = document.getElementById("logsBtn");
if(logsBtn){
  const role = (localStorage.getItem("role") || "").toUpperCase();
  if(role !== "SUPER_ADMIN"){
    logsBtn.style.display = "none";
  }else{
    logsBtn.addEventListener("click", () => window.location.href = "logs.html");
  }
}

  if(pdfGroupedBtn && !isSuperAdmin()) pdfGroupedBtn.style.display = "none";
  const chosen = (singleDateEl && singleDateEl.value) ? singleDateEl.value : ((fromEl && fromEl.value) ? fromEl.value : "");
  const from = chosen;
  const to = chosen;
  const group = null;
  if(!from) return toast("Veuillez choisir une date.");
  if(fromEl) fromEl.value = from;
  if(toEl) toEl.value = to;
showLoader("Chargement du rapport...");

  try{
    const res = await apiReportSummary(from, to, "");
    if(!res.ok){
      if(res.error === "NOT_AUTHENTICATED") { logout(); return; }
      throw new Error(res.error || "SUMMARY_ERROR");
    }

    const pr = await apiReportPunches(from, to, "");
    if(!pr.ok){
      if(pr.error === "NOT_AUTHENTICATED") { logout(); return; }
      throw new Error(pr.error || "PUNCHES_ERROR");
    }
    // Keep raw (date-filtered) data then apply group filter consistently everywhere
    rawRows = pr.rows || [];
    lastRowsRaw = (rawRows || []).slice();

    try{
      const volsAll = await ensureVolunteers();
      rawVolunteers = volsAll || [];
      lastVolunteersRaw = (rawVolunteers || []).slice();
      populateGroupSelect(rawVolunteers);
    }catch(_e){
      rawVolunteers = rawVolunteers || [];
    }

    applyGroupFilter();

    // Recompute summary totals based on the selected group
    const derivedSummary = {
      ...res,
      totalVolunteers: filteredVolunteers.length,
      uniqueVolunteers: new Set((filteredRows||[]).map(r=>String(r.volunteer_id||""))).size
    };

    renderKPIs(derivedSummary, filteredRows, from, to);
    renderChart(filteredRows, from, to);

    // enrich summary days table from rows
    const days = buildDaysFromRows(filteredRows);
    renderSummary({ ...derivedSummary, days });
  }catch(e){
    console.error(e);
    toast("Erreur lors du chargement du rapport.");
  }finally{
    hideLoader();
    if(loadBtn) setBtnLoading(loadBtn, false, "Afficher");
  }
}

async function exportExcel(opts=null){
  const chosen = (singleDateEl && singleDateEl.value) ? singleDateEl.value : ((fromEl && fromEl.value) ? fromEl.value : "");
  if(chosen){ if(fromEl) fromEl.value = chosen; if(toEl) toEl.value = chosen; }

  const group = getSelectedGroup();
  const from = opts?.from || fromEl.value;
  const to = opts?.to || toEl.value;
if(!window.ExcelJS){
    toast("ExcelJS indisponible (réseau).");
    return;
  }
  const rowsToExport = (opts && opts.from) ? getRowsForRange_(from,to,group) : (lastRows||[]);
  if(!rowsToExport || !rowsToExport.length){
    toast("Aucune donnée à exporter.");
    return;
  }

  const rowsSorted = rowsToExport.slice().sort((a,b)=>{
    const da = String(a.punch_date||"") + " " + String(a.punched_at||"");
    const db = String(b.punch_date||"") + " " + String(b.punched_at||"");
    return db.localeCompare(da);
  });

  try{
    setBtnLoading(exportBtn, true, "Préparation...");
    showLoader("Préparation de l'export Excel...");

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Rapport");

    const colsAll = [
      { header: "Date", key: "date", width: 14 },
      { header: "Heure", key: "time", width: 10 },
      { header: "Nom complet", key: "name", width: 32 },
      { header: "Badge", key: "badge", width: 16 },
      { header: "Téléphone", key: "phone", width: 16 },
      { header: "Rôle", key: "role", width: 18 },
      { header: "Groupe", key: "group", width: 16 },
    ];
    const colsOne = [
      { header: "Date", key: "date", width: 14 },
      { header: "Heure", key: "time", width: 10 },
      { header: "Nom complet", key: "name", width: 32 },
      { header: "Badge", key: "badge", width: 16 },
      { header: "Téléphone", key: "phone", width: 16 },
      { header: "Rôle", key: "role", width: 18 },
    ];
    ws.columns = (group ? colsOne : colsAll);

    // Header style
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.alignment = { vertical:"middle", horizontal:"center" };
    headerRow.fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"FFC8102E" } };
    headerRow.height = 20;

    ws.views = [{ state: "frozen", ySplit: 1 }];

    rowsSorted.forEach((r, idx)=>{
      ws.addRow({
        date: r.punch_date || "",
        time: (r.punched_at ? new Date(r.punched_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}) : ""),
        name: r.full_name || "",
        badge: r.badge_code || "",
        phone: r.phone || "",
        group: r.group || r.groupe || "",
      });
      const row = ws.getRow(idx+2);
      row.alignment = { vertical:"middle", horizontal:"left", wrapText:true };
      // zebra
      if((idx % 2) === 0){
        row.fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"FF111827" } };
        row.font = { color:{ argb:"FFFFFFFF" } };
      }else{
        row.fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"FF0B0F1B" } };
        row.font = { color:{ argb:"FFFFFFFF" } };
      }
      row.eachCell({ includeEmpty:true }, (cell)=>{
        cell.border = {
          top:{style:"thin", color:{argb:"FF2D3748"}},
          left:{style:"thin", color:{argb:"FF2D3748"}},
          bottom:{style:"thin", color:{argb:"FF2D3748"}},
          right:{style:"thin", color:{argb:"FF2D3748"}},
        };
      });
    });

    // Autofilter
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 5 }
    };

    // Metadata rows on top (title)
    ws.insertRow(1, []);
    ws.insertRow(1, [ `Pointage Volunteers FanZone OLM 12h-18h` ]);
    ws.mergeCells("A1:E1");
    ws.getCell("A1").font = { bold:true, size: 14, color:{argb:"FFFFFFFF"} };
    ws.getCell("A1").alignment = { horizontal:"center" };
    ws.getCell("A1").fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"FF0B0F1B" } };

    ws.insertRow(2, [ periodLabel(from,to) ]);
    ws.mergeCells("A2:E2");
    ws.getCell("A2").font = { size: 11, color:{argb:"FFFFFFFF"} };
    ws.getCell("A2").alignment = { horizontal:"center" };
    ws.getCell("A2").fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"FF0B0F1B" } };

    // Adjust header row now at row 3
    ws.getRow(3).font = { bold:true, color:{ argb:"FFFFFFFF" } };
    ws.getRow(3).fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"FFC8102E" } };
    ws.getRow(3).alignment = { vertical:"middle", horizontal:"center" };

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rapport_pointage_${from}.xlsx`;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 800);

  }catch(e){
    console.error(e);
    toast("Erreur lors de l’export Excel.");
  }finally{
    hideLoader();
    setBtnLoading(exportBtn, false);
  }
}



async function exportPdf(opts=null){
  const chosen = (singleDateEl && singleDateEl.value) ? singleDateEl.value : ((fromEl && fromEl.value) ? fromEl.value : "");
  if(chosen){ if(fromEl) fromEl.value = chosen; if(toEl) toEl.value = chosen; }

  const group = getSelectedGroup();
  const from = opts?.from || fromEl.value;
  const to = opts?.to || toEl.value;
if(!window.jspdf?.jsPDF){
    toast("jsPDF indisponible (réseau).");
    return;
  }
  const rowsToExport = (opts && opts.from) ? getRowsForRange_(from,to,group) : (lastRows||[]);
  if(!rowsToExport || !rowsToExport.length){
    toast("Aucune donnée à exporter.");
    return;
  }

  const rowsSorted = rowsToExport.slice().sort((a,b)=>{
    const da = String(a.punch_date||"") + " " + String(a.punched_at||"");
    const db = String(b.punch_date||"") + " " + String(b.punched_at||"");
    return db.localeCompare(da);
  });

  // convert any image dataURL to JPEG (more compatible with jsPDF)
  async function toJpegDataUrl(dataUrl){
    return new Promise((resolve)=>{
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = ()=>{
        try{
          const c = document.createElement("canvas");
          c.width = img.naturalWidth || img.width;
          c.height = img.naturalHeight || img.height;
          const ctx = c.getContext("2d");
          // white background (avoid transparency issues)
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0,0,c.width,c.height);
          ctx.drawImage(img,0,0);
          resolve(c.toDataURL("image/jpeg", 0.92));
        }catch(e){
          resolve(null);
        }
      };
      img.onerror = ()=> resolve(null);
      img.src = dataUrl;
    });
  }

  async function loadAssetDataUrl(path){
    // If you open index/reports via file://, fetch is blocked by the browser (CORS).
    // In that case, load the image via <img> then convert to dataURL using canvas.
    if(location.protocol === "file:"){
      return new Promise((resolve)=>{
        const img = new Image();
        img.onload = ()=>{
          try{
            const c = document.createElement("canvas");
            c.width = img.naturalWidth || img.width;
            c.height = img.naturalHeight || img.height;
            const ctx = c.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0,0,c.width,c.height);
            ctx.drawImage(img,0,0);
            resolve(c.toDataURL("image/png"));
          }catch(e){
            resolve(null);
          }
        };
        img.onerror = ()=> resolve(null);
        img.src = path;
      });
    }

    try{
      const resp = await fetch(path, { cache:"no-store" });
      if(!resp.ok) return null;
      const blob = await resp.blob();
      return await new Promise((resolve)=>{
        const r = new FileReader();
        r.onload = ()=> resolve(r.result);
        r.onerror = ()=> resolve(null);
        r.readAsDataURL(blob);
      });
    }catch(e){
      return null;
    }
  }

  try{
    setBtnLoading(pdfBtn, true, "Préparation...");
    showLoader("Préparation de l'export PDF...");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:"portrait", unit:"pt", format:"a4" });

    // logo
    const logoPath = (window.POINTAGE_CONFIG && window.POINTAGE_CONFIG.PDF_LOGO_PATH) || "./assets/logo-slot.png";
    // You may also use a WEBP here; it will be converted to JPEG for jsPDF
    let logoDataUrl = await loadAssetDataUrl(logoPath);

    const margin = 38;
    const pageW = doc.internal.pageSize.getWidth();
    const top = 26;

    // Centered header block
    const logoW = 260;
    const logoH = 68;
    const logoX = (pageW - logoW) / 2;

    // Try to add logo (PNG -> fallback JPEG)
    if(logoDataUrl){
      let added = false;
      try{
        doc.addImage(logoDataUrl, "PNG", logoX, top, logoW, logoH);
        added = true;
      }catch(e){
        const jpeg = await toJpegDataUrl(logoDataUrl);
        if(jpeg){
          try{
            doc.addImage(jpeg, "JPEG", logoX, top, logoW, logoH);
            added = true;
          }catch(e2){}
        }
      }
      // if not added, continue without logo
    }

    // Title + date centered
    const yTitle = top + logoH + 32;
    doc.setFont("helvetica","bold");
    doc.setFontSize(14);
    doc.text("Pointage Volunteers FanZone OLM 12h-18h", pageW/2, yTitle, { align:"center" });

    doc.setFont("helvetica","normal");
    doc.setFontSize(11);
    doc.text(periodLabel(from,to), pageW/2, yTitle + 18, { align:"center" });

    if(group){
      doc.setFont("helvetica","bold");
      doc.setFontSize(12);
      doc.text(`Groupe: ${group}`, pageW/2, yTitle + 34, { align:"center" });
      doc.setFont("helvetica","normal");
    }

    // ---- Counts (top-left, above the table) ----
    function frDate(iso){
      const s = String(iso||"");
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
    }
    function computeCountsByDate(rows){
      const map = new Map(); // date -> Set(volunteer_id)
      for(const r of (rows||[])){
        const d = String(r.punch_date || "").trim();
        if(!d) continue;
        const vid = String(r.volunteer_id || r.volunteerId || "").trim();
        if(!map.has(d)) map.set(d, new Set());
        if(vid) map.get(d).add(vid);
        else map.get(d).add(String(r.full_name||r.fullName||""));
      }
      return Array.from(map.entries())
        .map(([date,set]) => ({ date, count: set.size }))
        .sort((a,b)=>a.date.localeCompare(b.date));
    }

    const counts = computeCountsByDate(rowsSorted);
    const sameDay = (String(from||"") && String(to||"") && String(from) === String(to));

    doc.setFont("helvetica","bold");
    doc.setFontSize(11);

    let y = group ? (yTitle + 52) : (yTitle + 44);
    const leftX = margin;

    if(sameDay){
      const n = counts[0]?.count || 0;
      doc.text(`Nombre pointés : ${n}`, leftX, y);
      y += 12;
    }else{
      doc.text(`Nombre pointés par date :`, leftX, y);
      y += 12;
      doc.setFont("helvetica","normal");
      // Prevent too tall header block
      const maxLines = 12;
      const list = counts.slice(0, maxLines);
      for(const c of list){
        doc.text(`- ${frDate(c.date)} : ${c.count}`, leftX, y);
        y += 12;
      }
      if(counts.length > maxLines){
        doc.text(`- ...`, leftX, y);
        y += 12;
      }
      doc.setFont("helvetica","bold");
    }

    // Start table after the counts block
    const tableStartY = y + 8;
    doc.setFont("helvetica","normal");

    const isSameDate = !!from && !!to && String(from) === String(to);

    const volsAllForRole = await ensureVolunteers();
    const roleById = new Map((volsAllForRole||[]).map(v=>[String(v.id), String(v.role||"").trim()]));
    const roleByBadge = new Map((volsAllForRole||[]).map(v=>[String(v.badgeCode||"").trim(), String(v.role||"").trim()]));
    const roleForRow = (r)=>{
      const byId = roleById.get(String(r.volunteer_id||"")) || "";
      if(byId) return byId;
      const b = String(r.badge_code||"").trim();
      return (b && roleByBadge.get(b)) ? roleByBadge.get(b) : "";
    };

    const headCols = isSameDate ? ["Nom complet","Badge","Role"] : ["Date","Nom complet","Badge","Role"];

    const rowsMeta = rowsSorted.map(r => {
      const role = String(roleForRow(r) || "").trim();
      const cells = isSameDate
        ? [ (r.full_name || ""), (r.badge_code || ""), role ]
        : [ (r.punch_date || ""), (r.full_name || ""), (r.badge_code || ""), role ];
      return { cells, hasRole: !!role };
    });
    const rows = rowsMeta.map(x => x.cells);
    doc.autoTable({
      startY: tableStartY,
      head: [ headCols ],
      body: rows,
      didParseCell: (data) => {
        if(data.section === "body"){
          const meta = rowsMeta[data.row.index];
          if(meta && meta.hasRole){
            data.cell.styles.fillColor = [240,240,240];
            data.cell.styles.textColor = [0,0,0];
          }
        }
      },
      styles: { font:"helvetica", fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [200,16,46], textColor: 255 },
      theme: "striped",
      margin: { left: margin, right: margin }
    });

    
    // --- Groupe OFF (uniquement si Du == Au) ---
    if(isSameDate){
      try{
        // compter les pointages par groupe
        let cA = 0, cB = 0;
        (rowsSorted || []).forEach(r => {
          const g = rowGroup(r);
          if(g === "A") cA++;
          else if(g === "B") cB++;
        });

        // groupe "actif" = le plus représenté dans les pointages
        const activeGroup = (cA >= cB) ? "A" : "B";
        const offGroup = (activeGroup === "A") ? "B" : "A";

        // récupérer tous les bénévoles (cache local / API)
        const volsAll = await ensureVolunteers();

        const normStr = (s)=> String(s ?? "").trim();
        const getName = (v)=> normStr(v.fullName ?? v.full_name ?? v.name ?? v.nom ?? "");
        const getBadge = (v)=> normStr(v.badgeCode ?? v.badge_code ?? "");
        const getPhone = (v)=> normStr(v.phone ?? v.tel ?? v.telephone ?? "");

        const pointedBadges = new Set((rowsSorted || []).map(r => normStr(r.badge_code ?? r.badgeCode ?? r.badge ?? "")).filter(Boolean));
        const offVolsAll = (volsAll || []).filter(v => volGroup(v) === offGroup);
        // On retire du groupe OFF ceux qui ont déjà pointé ce jour (ils sont déjà dans la table principale)
        const offVols = offVolsAll.filter(v => {
          const b = getBadge(v);
          return !b || !pointedBadges.has(b);
        });

        if(!offVols || offVols.length === 0){
          // Rien à afficher: tout le groupe OFF a pointé ou liste vide
          return;
        }

        const afterY = (doc.lastAutoTable?.finalY || tableStartY) + 14;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`Groupe OFF : ${offGroup}`, margin, afterY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text(`Bénévoles du groupe OFF (hors pointés). Total: ${offVols.length}`, margin, afterY + 10);
        doc.setTextColor(0);

        const offRowsMeta = offVols.map(v => {
          const role = String(v.role || v.volunteerRole || "").trim();
          const cells = [ getName(v), getBadge(v), role ];
          return { cells, hasRole: !!role };
        });
        const offRows = offRowsMeta.map(x => x.cells);

        doc.autoTable({
          startY: afterY + 18,
          head: [ ["Nom complet","Badge","Téléphone","Role"] ],
          body: offRows,
          didParseCell: (data) => {
            if(data.section === "body"){
              const meta = offRowsMeta[data.row.index];
              if(meta && meta.hasRole){
                data.cell.styles.fillColor = [240,240,240];
                data.cell.styles.textColor = [0,0,0];
              }
            }
          },
          styles: { font:"helvetica", fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [17,24,39], textColor: 255 },
          theme: "striped",
          margin: { left: margin, right: margin }
        });
      }catch(e){
        console.warn("OFF_GROUP_SECTION_ERROR", e);
      }
    }

    doc.save(`rapport_pointage_${from}.pdf`);

  }catch(e){
    console.error(e);
    toast("Erreur lors de l’export PDF.");
  }finally{
    hideLoader();
    setBtnLoading(pdfBtn, false);
  }
}

async function exportPdfGrouped(){
  if(!isSuperAdmin()){
    toast("Accès réservé au Super Admin.");
    return;
  }
  if(!window.jspdf?.jsPDF){
    toast("jsPDF indisponible (réseau).");
    return;
  }

  try{
    setBtnLoading(pdfGroupedBtn, true, "Préparation...");
    showLoader("Préparation du PDF (volontaires par groupes)...");

    const volsAll = await ensureVolunteers();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:"portrait", unit:"pt", format:"a4" });

    const margin = 36;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const leftX = margin;

    // logo
    const logoPath = (window.POINTAGE_CONFIG && window.POINTAGE_CONFIG.PDF_LOGO_PATH) || "./assets/logo-slot.png";
    let logoDataUrl = await loadAssetDataUrl(logoPath);
    if(logoDataUrl && /^data:image\/webp/i.test(String(logoDataUrl))){
      const jpeg = await toJpegDataUrl(logoDataUrl);
      if(jpeg) logoDataUrl = jpeg;
    }

    let top = 24;
    let logoH = 0;
    if(logoDataUrl){
      // Draw centered logo
      const maxW = 180;
      const maxH = 70;
      try{
        // default guess ratio 3:1
        const w = maxW;
        const h = Math.min(maxH, Math.round(maxW/3));
        logoH = h;
        doc.addImage(logoDataUrl, "PNG", (pageW - w)/2, top, w, h);
      }catch(e){
        // ignore
      }
    }

    // Header (same as other PDFs)
    const yTitle = top + logoH + 32;
    doc.setFont("helvetica","bold");
    doc.setFontSize(14);
    doc.text("Pointage Volunteers FanZone OLM 12h-18h", pageW/2, yTitle, { align:"center" });

    doc.setFont("helvetica","normal");
    doc.setFontSize(11);
    doc.text("Répartition des volontaires par groupe", pageW/2, yTitle + 18, { align:"center" });

    const groups = ["A","B"];
    let y = yTitle + 52;

    const normStr = (v)=> String(v ?? "").trim();
    const getId = (v)=> normStr(v.id ?? v.volunteer_id ?? v.volunteerId ?? "");
    const getName = (v)=> normStr(v.fullName ?? v.full_name ?? v.name ?? v.nom ?? "");
    const getBadge = (v)=> normStr(v.badgeCode ?? v.badge_code ?? "");
    const getPhone = (v)=> normStr(v.phone ?? v.tel ?? v.telephone ?? "");
    const getGroup = (v)=> normGroup(v.group ?? v.groupe ?? "");

    for(const g of groups){
      const volsG = (volsAll || [])
        .filter(v => getGroup(v) === g)
        .slice()
        .sort((a,b)=> getName(a).localeCompare(getName(b), "fr", { sensitivity:"base" }));

      const count = volsG.length;

      // Page break if needed
      if(y > pageH - 170){
        doc.addPage();
        y = 54;
      }

      doc.setFont("helvetica","bold");
      doc.setFontSize(13);
      doc.text(`GROUPE ${g}`, leftX, y);
      y += 16;

      doc.setFont("helvetica","normal");
      doc.setFontSize(11);
      doc.text(`Nombre de volontaires : ${count}`, leftX, y);
      y += 16;

      const bodyMeta = volsG.map(v => {
        const role = String(v.role || v.volunteerRole || "").trim();
        const cells = [ getName(v), getBadge(v), role ];
        return { cells, hasRole: !!role };
      });
      const body = bodyMeta.map(x => x.cells);

      doc.autoTable({
        startY: y,
        head: [ ["Nom complet","Badge","Role"] ],
        body,
        didParseCell: (data) => {
          if(data.section === "body"){
            const meta = bodyMeta[data.row.index];
            if(meta && meta.hasRole){
              data.cell.styles.fillColor = [240,240,240];
              data.cell.styles.textColor = [0,0,0];
            }
          }
        },
        styles: { font:"helvetica", fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [200,16,46], textColor: 255 },
        theme: "striped",
        margin: { left: margin, right: margin }
      });

      y = (doc.lastAutoTable?.finalY || y) + 26;
    }

    doc.save("repartition_volontaires_groupes.pdf");

  }catch(e){
    console.error(e);
    toast("Erreur lors de l’export PDF (volontaires par groupes).");
  }finally{
    hideLoader();
    setBtnLoading(pdfGroupedBtn, false, "📑 PDF volontaires (groupes)");
  }
}




function getRowsForRange_(from,to,group){
  const rowsAll = Array.isArray(lastRowsRaw) ? lastRowsRaw : (rawRows || []);
  const volsAll = Array.isArray(lastVolunteersRaw) ? lastVolunteersRaw : (rawVolunteers || []);
  const maps = buildVolunteerMaps_(volsAll);
  const norm = normalizeRange_(from,to);
  const f = norm.from, t = norm.to;

  let rows = (rowsAll || []).filter(r=>{
    const d = String(r.punch_date || "");
    return d && d >= f && d <= t;
  });

  if(group){
    // filtrer via groupe du bénévole (source Volunteers)
    rows = rows.filter(r=>{
      const rid = resolveVolunteerId_(r, maps);
      if(!rid) return false;
      const v = maps.byId.get(rid);
      return v && volGroup(v) === group;
    });
  }
  return rows;
}

function normalizeRange_(from,to){
  if(!from || !to) return {from,to};
  return (from > to) ? {from:to, to:from} : {from,to};
}



if(exportBtn) exportBtn.addEventListener("click", () => exportExcel());
if(pdfBtn) pdfBtn.addEventListener("click", () => exportPdf());
if(pdfGroupedBtn) pdfGroupedBtn.addEventListener("click", exportPdfGrouped);
logoutBtn.addEventListener("click", logout);
requireSuperAdmin();

async function ensureVolunteers(){
  if(allVolunteers && allVolunteers.length) return allVolunteers;

  // local cache (5 minutes)
  try{
    const cache = JSON.parse(localStorage.getItem("pointage_vol_cache") || "null");
    if(cache && Array.isArray(cache.volunteers) && cache.volunteers.length && (Date.now() - cache.ts) < 5*60*1000){
      allVolunteers = cache.volunteers;
      return allVolunteers;
    }
  }catch(e){}

  const res = await apiListVolunteers("");
  if(!res.ok){
    throw new Error(res.error || "VOL_LIST_ERROR");
  }
  allVolunteers = (res.volunteers || []).slice();
  try{
    localStorage.setItem("pointage_vol_cache", JSON.stringify({ ts: Date.now(), volunteers: allVolunteers }));
  }catch(e){}
  return allVolunteers;
}

function getSelectedGroup(){ return null; }


function filterVolunteersByGroup(volunteers, group){
  if(!group) return volunteers;
  const g = group.toLowerCase();
  return volunteers.filter(v => String(v.group||"").trim().toLowerCase() === g);
}

function filterRowsByGroup(rows, group){
  if(!group) return rows;
  const g = normGroup(group);
  return (rows||[]).filter(r => normGroup(r.group || r.groupe) === g);
}



function computeAbsents(volunteers, rows){
  const present = new Set((rows||[]).map(r => String(r.volunteer_id || "")));
  return (volunteers||[])
    .filter(v => !present.has(String(v.id)))
    .sort((a,b)=> (a.fullName||"").localeCompare(b.fullName||"", "fr"));
}

function renderAbsents(list){
  if(!absentsTbodyEl) return;
  absentsTbodyEl.innerHTML = (list||[]).map(v => `
    <tr>
      <td>${escapeHtml(v.fullName||"")}</td>
      <td>${escapeHtml(v.badgeCode||"")}</td>
    </tr>
  `).join("");
}

function bindAbsentsUI(){
  if(!absentsModalEl) return;
  absentsModal = new bootstrap.Modal(absentsModalEl);

  absentsBtn?.addEventListener("click", async ()=>{
    try{
      showLoader("Chargement des absents...");
      const volsAll = await ensureVolunteers();
      const gSel = getSelectedGroup();
      const vols = filterVolunteersByGroup(volsAll, gSel);
      const list = computeAbsents(vols, lastRows);

      if(absentsSubtitleEl) absentsSubtitleEl.textContent = periodLabel(fromEl.value, toEl.value);
      if(absentsCountEl) absentsCountEl.textContent = String(list.length);

      renderAbsents(list);

      if(absentsSearchEl) absentsSearchEl.value = "";
      absentsModal.show();

      setTimeout(()=> absentsSearchEl?.focus(), 150);

      absentsSearchEl?.addEventListener("input", ()=>{
        const q = (absentsSearchEl.value || "").toLowerCase().trim();
        const filtered = !q ? list : list.filter(v =>
          (v.fullName||"").toLowerCase().includes(q) || (v.badgeCode||"").toLowerCase().includes(q)
        );
        if(absentsCountEl) absentsCountEl.textContent = String(filtered.length);
        renderAbsents(filtered);
      });

    }catch(e){
      console.error(e);
      toast("Erreur lors du chargement des absents.");
    }finally{
      hideLoader();
    }
  });
}

function parseIso(ts){
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}


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
function offGroupForDate(dateISO){
  const g = plannedGroupForDate(dateISO);
  return (g === "A") ? "B" : "A";
}


function buildVolunteerMaps_(vols){
  const byId = new Map();
  const idByBadge = new Map();
  (vols || []).forEach(v => {
    const id = String(v.id || "").trim();
    if(id) byId.set(id, v);
    const badge = String(v.badgeCode ?? v.badge_code ?? "").trim();
    if(badge) idByBadge.set(badge, id);
  });
  return { byId, idByBadge };
}
function resolveVolunteerId_(row, maps){
  const vid = String(row?.volunteer_id || "").trim();
  if(vid && maps.byId.has(vid)) return vid;

  const badge = String(row?.badge_code || row?.badgeCode || row?.badge || "").trim();
  const mapped = badge ? (maps.idByBadge.get(badge) || "") : "";
  if(mapped && maps.byId.has(mapped)) return mapped;

  return "";
}



function computeAbsentsForDate(volunteers, rows, dateISO, group){
  const present = new Set(
    (rows||[])
      .filter(r => String(r.punch_date||"") === String(dateISO||"") && (!group || rowGroup(r) === group))
      .map(r => String(r.volunteer_id || "").trim())
  );
  return (volunteers||[])
    .filter(v => !present.has(String(v.id)))
    .sort((a,b)=> (a.fullName||"").localeCompare(b.fullName||"", "fr"));
}

function renderAbsencesInto_(list, tbodyEl){
  if(!tbodyEl) return;
  if(!list || !list.length){
    tbodyEl.innerHTML = `<tr><td colspan="3" class="text-center text-white-50">Aucune absence.</td></tr>`;
    return;
  }
  tbodyEl.innerHTML = list.map(v => `
    <tr>
      <td>${escapeHtml(v.fullName||v.full_name||"")}</td>
      <td>${escapeHtml(v.badgeCode||v.badge_code||"")}</td>
      <td>${escapeHtml(formatPhoneForUi_(v.phone))}</td>
    </tr>
  `).join("");
}

function renderAbsencesList(list){
  renderAbsencesInto_(list, absencesTbody);
}


function closeAbsencesModal(){
  if(!absencesModalEl) return;
  absencesModalEl.classList.add("d-none");
}

function openAbsencesModal(dateISO){
  if(!absencesModalEl) return;
  absencesModalEl.classList.remove("d-none");
  const workG = plannedGroupForDate(dateISO);
  const offG = offGroupForDate(dateISO);
  if(absencesSubEl) absencesSubEl.textContent = `Date : ${dateISO} — Groupe actif : ${workG} (OFF: ${offG})`;
  setTimeout(()=> absencesSearchEl?.focus(), 120);
}

function bindAbsencesModal(){
  if(!absencesModalEl) return;

  absencesCloseEl?.addEventListener("click", closeAbsencesModal);
  absencesCloseEl2?.addEventListener("click", closeAbsencesModal);
  absencesModalEl.querySelector(".olm-modal-backdrop")?.addEventListener("click", closeAbsencesModal);

  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape" && !absencesModalEl.classList.contains("d-none")){
      closeAbsencesModal();
    }
  });
}

function formatHM(ts){
  const d = parseIso(ts);
  if(!d) return "—";
  return d.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
}

function renderKPIs(summary, rows, from, to){
  const group = getSelectedGroup();
  const total = group ? Number((lastVolunteersFiltered||[]).length) : Number(summary.totalVolunteers ?? 0);
  const uniquePeriod = new Set((rows||[]).map(r=>String(r.volunteer_id||""))).size;

  // days length (inclusive)
  let daysLen = 0;
  try{
    if(Array.isArray(summary.days) && summary.days.length){
      daysLen = summary.days.length;
    }else{
      const d1 = new Date(from + "T00:00:00");
      const d2 = new Date(to + "T00:00:00");
      const diff = Math.round((d2 - d1) / 86400000);
      daysLen = Math.max(1, diff + 1);
    }
  }catch(e){ daysLen = 1; }

  // Average present/day based on daily rows if available
  let avgPresent = 0;
  let avgRate = 0;
  if(Array.isArray(summary.days) && summary.days.length){
    const sum = summary.days.reduce((acc,d)=> acc + Number(d.count||0), 0);
    avgPresent = sum / Math.max(1, summary.days.length);
  }else{
    // fallback: use uniquePeriod as approximation
    avgPresent = uniquePeriod;
  }
  avgRate = total ? (avgPresent / total) * 100 : 0;

  if(kpiRateEl) kpiRateEl.textContent = `${avgRate.toFixed(1)}%`;
  if(kpiAbsentsEl) kpiAbsentsEl.textContent = `${daysLen} jour${daysLen>1?'s':''}`;

  if(kpiCountsEl){
    const avgAbsent = Math.max(0, total - avgPresent);
    kpiCountsEl.textContent = `Pointés: ${avgPresent.toFixed(1)}/jour (${daysLen} j) • Absents: ${avgAbsent.toFixed(1)}/jour • Total: ${total}`;
  }
let first = null, last = null;
  (rows||[]).forEach(r=>{
    const d = parseIso(r.punched_at);
    if(!d) return;
    if(!first || d.getTime() < first.d.getTime()) first = { d, r };
    if(!last || d.getTime() > last.d.getTime()) last = { d, r };
  });

  if(first){
    if(kpiFirstEl) kpiFirstEl.textContent = first.r.full_name || "—";
    if(kpiFirstTimeEl) kpiFirstTimeEl.textContent = `${first.r.punch_date || ""} • ${formatHM(first.r.punched_at)}`;
  }else{
    if(kpiFirstEl) kpiFirstEl.textContent = "—";
    if(kpiFirstTimeEl) kpiFirstTimeEl.textContent = "—";
  }

  if(last){
    if(kpiLastEl) kpiLastEl.textContent = last.r.full_name || "—";
    if(kpiLastTimeEl) kpiLastTimeEl.textContent = `${last.r.punch_date || ""} • ${formatHM(last.r.punched_at)}`;
  }else{
    if(kpiLastEl) kpiLastEl.textContent = "—";
    if(kpiLastTimeEl) kpiLastTimeEl.textContent = "—";
  }

  if(graphSubEl) graphSubEl.textContent = periodLabel(from,to);
}

function renderChart(rows, from, to){
  if(!dashChartCanvas || !window.Chart) return;

  let labels = [];
  let values = [];
  let label = "";

  if(from === to){
    // Pointages par heure + répartition par groupe
    const byHourA = {};
    const byHourB = {};
    (rows||[]).forEach(r=>{
      const d = parseIso(r.punched_at);
      if(!d) return;
      const h = d.toLocaleTimeString("fr-FR", { hour:"2-digit" });
      const g = rowGroup(r);
      if(g === "A") byHourA[h] = (byHourA[h]||0)+1;
      else if(g === "B") byHourB[h] = (byHourB[h]||0)+1;
    });
    labels = Array.from(new Set([...Object.keys(byHourA), ...Object.keys(byHourB)])).sort((a,b)=>Number(a)-Number(b));
    const valuesA = labels.map(h=>byHourA[h]||0);
    const valuesB = labels.map(h=>byHourB[h]||0);
    label = "Pointages par heure";
    values = null; // unused

    if(dashChart) dashChart.destroy();
    dashChart = new Chart(dashChartCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Groupe A", data: valuesA, backgroundColor: "rgba(81,120,255,0.85)" },
          { label: "Groupe B", data: valuesB, backgroundColor: "rgba(200,16,46,0.75)" }
        ]
      },
      options: { responsive:true, plugins:{ legend:{ display:true } }, scales:{ x:{ stacked:false }, y:{ beginAtZero:true } } }
    });
    return;
  }else{
    label = "Pointages par jour";
    const byDay = {};
    (rows||[]).forEach(r=>{
      const day = r.punch_date || "";
      if(!day) return;
      byDay[day] = (byDay[day]||0)+1;
    });
    labels = Object.keys(byDay).sort();
    values = labels.map(d=>byDay[d]);
  }

  if(dashChart) dashChart.destroy();
  dashChart = new Chart(dashChartCanvas.getContext("2d"), {
    type: "bar",
    data: { labels, datasets: [{ label, data: values }] },
    options: { responsive:true, plugins:{ legend:{ display:true } } }
  });
}

function periodLabel(from, to){
  if(from === to) return `Date : ${from}`;
  return `Période : du ${from} au ${to}`;
}




document.addEventListener("DOMContentLoaded", () => {
  
  try{ __checkNetworkStatus(); }catch(e){}
  try{ setInterval(()=>{ try{ __checkNetworkStatus(); }catch(e){} }, 8000); }catch(e){}
  window.addEventListener("online", ()=> __setNetDot("online"));
  window.addEventListener("offline", ()=> __setNetDot("offline"));
setDefaultDates();
  if(loadBtn){
    loadBtn.addEventListener("click", load);
  }
  // chargement initial (aujourd'hui)
  load();
});