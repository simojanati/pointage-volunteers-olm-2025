function renderUserPill(){
  const el = document.getElementById("userPill");
  if(!el) return;

  const u = localStorage.getItem("username") || "—";
  const r = (localStorage.getItem("role") || "—").toUpperCase();
  const roleClass = r === "SUPER_ADMIN" ? "badge-role-super" : (r === "ADMIN" ? "badge-role-admin" : "badge-role-unknown");

  el.innerHTML = `<span class="me-2">${escapeHtml(String(u))}</span><span class="badge ${roleClass}">${escapeHtml(String(r))}</span>`;

  // Always keep pill on the left of the first visible action button (Rapports/Pointage/Déconnexion).
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


function normGroup(g){
  return String(g ?? "").trim().toUpperCase();
}

function rowGroup(r){
  return normGroup(r?.group || r?.groupe || "");
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
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

const fromEl = document.getElementById("fromDate");
const toEl = document.getElementById("toDate");
const groupEl = document.getElementById("groupSelect");
const loadBtn = document.getElementById("loadBtn");
const exportBtn = document.getElementById("exportBtn");
const pdfBtn = document.getElementById("pdfBtn");
const totalEl = document.getElementById("totalVolunteers");
const uniqueEl = document.getElementById("uniqueVolunteers");
const absentsEl = document.getElementById("absents");
const rateEl = document.getElementById("ratePct");
const daysBody = document.getElementById("daysBody");
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
  const now = new Date();
  const to = isoDate(now);
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 6);
  fromEl.value = isoDate(fromDate);
  toEl.value = to;
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

  const _g = getSelectedGroup();
  const total = _g ? Number((filteredVolunteers||[]).length) : Number(data.totalVolunteers || 0);

  // Days summary (sorted: newest first)
  const days = (data.days || []).slice();
  days.sort((a,b)=> {
    const da = new Date(String(a.date||"") + "T00:00:00");
    const db = new Date(String(b.date||"") + "T00:00:00");
    if(!isNaN(da) && !isNaN(db)) return db - da;
    return String(b.date||"").localeCompare(String(a.date||""));
  });

  const nbDays = Math.max(1, days.length);
  daysCount.textContent = `${days.length} jours`;

  const sumPresent = days.reduce((acc,d)=> acc + Number(d.count || 0), 0);
  const avgPresent = sumPresent / nbDays;

  const presentPct = total ? (avgPresent / total) * 100 : 0;

  const avgAbsent = Math.max(0, total - avgPresent);
  const absentPct = total ? (avgAbsent / total) * 100 : 0;

  // KPI
  totalEl.textContent = total;

  // Pointés (uniques) = moyenne / jour + % + (Xj)
  uniqueEl.textContent = `${presentPct.toFixed(2)}% (${days.length}j)`;

  // Absents = moyenne / jour + % + (Xj)
  if(absentsEl) absentsEl.textContent = `${absentPct.toFixed(2)}% (${days.length}j)`;

  // Small badge in Absents card: show absent %
  if(rateEl){ rateEl.textContent = ""; rateEl.style.display = "none"; }

  // Presence card: show presence % and days badge
  const kpiRateEl = document.getElementById("kpiRate");
  if(kpiRateEl) kpiRateEl.textContent = `${presentPct.toFixed(2)}% (${days.length}j)`;

  const kpiAbsentsEl = document.getElementById("kpiAbsents");
  if(kpiAbsentsEl){ kpiAbsentsEl.textContent = ""; kpiAbsentsEl.style.display = "none"; }

  // Render days table (newest first)
  daysBody.innerHTML = days.map(r => {
    const count = Number(r.count || 0);
    const absCount = Math.max(0, total - count);
    return `
      <tr>
        <td class="fw-bold">${r.date}</td>
        <td><span class="badge text-bg-primary">${count}</span></td>
        <td class="text-end">
          <span class="badge badge-soft text-white abs-day-btn" role="button" tabindex="0" data-date="${r.date}" title="Voir la liste des absents">${absCount}</span>
        </td>
      </tr>
    `;
  }).join("");
}


function bindDaysAbsences(){
  if(!daysBody) return;
  daysBody.addEventListener("click", async (e)=>{
    const btn = e.target.closest(".abs-day-btn");
    if(!btn) return;
    const dateISO = btn.getAttribute("data-date");
    if(!dateISO) return;

    try{
      showLoader("Chargement des absences...");
      // Use the already filtered caches to keep counts consistent with KPIs
      const vols = (filteredVolunteers && filteredVolunteers.length) ? filteredVolunteers : filterVolunteersByGroup(await ensureVolunteers(), getSelectedGroup());
      const rowsForDay = (filteredRows && filteredRows.length) ? filteredRows : lastRows;
      const list = computeAbsentsForDate(vols, rowsForDay, dateISO);

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
  
  const from = fromEl.value;
  const to = toEl.value;
  const group = getSelectedGroup();
  if(!from || !to) return toast("Veuillez choisir une période (du / au).");

  setBtnLoading(loadBtn, true, "Chargement...");
  showLoader("Chargement du rapport...");

  try{
    const res = await apiReportSummary(from, to, group);
    if(!res.ok){
      if(res.error === "NOT_AUTHENTICATED") { logout(); return; }
      throw new Error(res.error || "SUMMARY_ERROR");
    }

    const pr = await apiReportPunches(from, to, group);
    if(!pr.ok){
      if(pr.error === "NOT_AUTHENTICATED") { logout(); return; }
      throw new Error(pr.error || "PUNCHES_ERROR");
    }
    // Keep raw (date-filtered) data then apply group filter consistently everywhere
    rawRows = pr.rows || [];

    try{
      const volsAll = await ensureVolunteers();
      rawVolunteers = volsAll || [];
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
    setBtnLoading(loadBtn, false);
  }
}

async function exportExcel(){
  const from = fromEl.value;
  const to = toEl.value;
  const group = getSelectedGroup();

  if(!window.ExcelJS){
    toast("ExcelJS indisponible (réseau).");
    return;
  }
  if(!lastRows || !lastRows.length){
    toast("Aucune donnée à exporter.");
    return;
  }

  const rowsSorted = lastRows.slice().sort((a,b)=>{
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
      { header: "Groupe", key: "group", width: 16 },
    ];
    const colsOne = [
      { header: "Date", key: "date", width: 14 },
      { header: "Heure", key: "time", width: 10 },
      { header: "Nom complet", key: "name", width: 32 },
      { header: "Badge", key: "badge", width: 16 },
      { header: "Téléphone", key: "phone", width: 16 },
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
    a.download = `rapport_pointage_${from}_${to}.xlsx`;
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



async function exportPdf(){
  const from = fromEl.value;
  const to = toEl.value;
  const group = getSelectedGroup();

  if(!window.jspdf?.jsPDF){
    toast("jsPDF indisponible (réseau).");
    return;
  }
  if(!lastRows || !lastRows.length){
    toast("Aucune donnée à exporter.");
    return;
  }

  const rowsSorted = lastRows.slice().sort((a,b)=>{
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

    const tableStartY = group ? (yTitle + 52) : (yTitle + 44);

    const rows = rowsSorted.map(r => (group ? ([
      r.punch_date || "",
      (r.punched_at ? new Date(r.punched_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}) : ""),
      r.full_name || "",
      r.badge_code || "",
      r.phone || ""
    ]) : ([
      r.punch_date || "",
      (r.punched_at ? new Date(r.punched_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}) : ""),
      r.full_name || "",
      r.badge_code || "",
      r.phone || "",
      (r.group || r.groupe || "")
    ])));

    doc.autoTable({
      startY: tableStartY,
      head: [ group ? ["Date","Heure","Nom complet","Badge","Téléphone"] : ["Date","Heure","Nom complet","Badge","Téléphone","Groupe"] ],
      body: rows,
      styles: { font:"helvetica", fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [200,16,46], textColor: 255 },
      theme: "striped",
      margin: { left: margin, right: margin }
    });

    doc.save(`rapport_pointage_${from}_${to}.pdf`);

  }catch(e){
    console.error(e);
    toast("Erreur lors de l’export PDF.");
  }finally{
    hideLoader();
    setBtnLoading(pdfBtn, false);
  }
}

loadBtn.addEventListener("click", load);
exportBtn.addEventListener("click", exportExcel);
pdfBtn.addEventListener("click", exportPdf);
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

function getSelectedGroup(){
  return normGroup(groupEl?.value || "");
}

function populateGroupSelect(_volunteers){
  if(!groupEl) return;
  // Static groups: A / B
  const selected = groupEl.value;
  groupEl.innerHTML = [
    '<option value="">Tous les groupes</option>',
    '<option value="A">Groupe A</option>',
    '<option value="B">Groupe B</option>',
  ].join("");
  if(selected) groupEl.value = selected;
}

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

function computeAbsentsForDate(volunteers, rows, dateISO){
  const present = new Set((rows||[]).filter(r => r.punch_date === dateISO).map(r => String(r.volunteer_id || "")));
  return (volunteers||[])
    .filter(v => !present.has(String(v.id)))
    .sort((a,b)=> (a.fullName||"").localeCompare(b.fullName||"", "fr"));
}

function renderAbsencesList(list){
  if(!absencesTbodyEl) return;
  absencesTbodyEl.innerHTML = (list||[]).map(v => `
    <tr>
      <td>${escapeHtml(v.fullName||"")}</td>
      <td>${escapeHtml(v.badgeCode||"")}</td>
      <td>${escapeHtml(v.phone||"")}</td>
    </tr>
  `).join("");
}

function closeAbsencesModal(){
  if(!absencesModalEl) return;
  absencesModalEl.classList.add("d-none");
}

function openAbsencesModal(dateISO){
  if(!absencesModalEl) return;
  absencesModalEl.classList.remove("d-none");
  if(absencesSubEl) absencesSubEl.textContent = `Date : ${dateISO}`;
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
    label = "Pointages par heure";
    const byHour = {};
    (rows||[]).forEach(r=>{
      const d = parseIso(r.punched_at);
      if(!d) return;
      const h = d.toLocaleTimeString("fr-FR", { hour:"2-digit" });
      byHour[h] = (byHour[h]||0)+1;
    });
    labels = Object.keys(byHour).sort((a,b)=>Number(a)-Number(b));
    values = labels.map(h=>byHour[h]);
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

window.addEventListener('DOMContentLoaded', ()=>{ setDefaultDates(); load(); });
  daysBody.addEventListener("keydown", async (e)=>{
    if(e.key !== "Enter" && e.key !== " ") return;
    const btn = e.target.closest(".abs-day-btn");
    if(!btn) return;
    e.preventDefault();
    btn.click();
  });

