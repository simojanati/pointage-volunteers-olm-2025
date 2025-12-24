const fromEl = document.getElementById("fromDate");
const toEl = document.getElementById("toDate");
const loadBtn = document.getElementById("loadBtn");
const exportBtn = document.getElementById("exportBtn");
const totalEl = document.getElementById("totalPunches");
const uniqueEl = document.getElementById("uniqueVolunteers");
const daysBody = document.getElementById("daysBody");
const daysCount = document.getElementById("daysCount");
const emptyMsg = document.getElementById("emptyMsg");
const toastEl = document.getElementById("toast");
const logoutBtn = document.getElementById("logoutBtn");

function toast(msg){
  toastEl.textContent = msg;
  toastEl.style.opacity = "1";
  setTimeout(()=> toastEl.style.opacity = "0", 2200);
}

function setDefaultDates(){
  const now = new Date();
  const to = isoDate(now);
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 6);
  fromEl.value = isoDate(fromDate);
  toEl.value = to;
}

function renderSummary(data){
  totalEl.textContent = data.totalPunches ?? 0;
  uniqueEl.textContent = data.uniqueVolunteers ?? 0;

  const days = data.days || [];
  daysCount.textContent = `${days.length} jours`;
  daysBody.innerHTML = days.map(r => `
    <tr>
      <td class="fw-bold">${r.date}</td>
      <td><span class="badge text-bg-primary">${r.count}</span></td>
    </tr>
  `).join("");

  emptyMsg.style.display = days.length ? "none" : "block";
}

async function load(){
  const from = fromEl.value;
  const to = toEl.value;
  if(!from || !to) return toast("Veuillez choisir une période (du / au).");

  try{
    const res = await apiReportSummary(from, to);
    if(!res.ok) throw new Error(res.error || "SUMMARY_ERROR");
    renderSummary(res);
  }catch(e){
    console.error(e);
    toast("Erreur lors du chargement du rapport.");
  }
}

async function exportExcel(){
  const from = fromEl.value;
  const to = toEl.value;
  if(!from || !to) return toast("Veuillez choisir une période (du / au).");

  exportBtn.disabled = true;
  exportBtn.textContent = "Préparation...";

  try{
    const res = await apiReportPunches(from, to);
    if(!res.ok) throw new Error(res.error || "PUNCHES_ERROR");

    const rows = (res.punches || []).map(p => ({
      "Date": p.punch_date,
      "Heure": (p.punched_at || "").slice(11,16),
      "Nom complet": p.full_name || "",
      "Badge": p.badge_code || "",
      "Volunteer ID": p.volunteer_id || ""
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pointage");
    XLSX.writeFile(wb, `pointage_${from}_au_${to}.xlsx`);

    toast("✅ Export Excel terminé");
  }catch(e){
    console.error(e);
    toast("Erreur lors de l'export.");
  }finally{
    exportBtn.disabled = false;
    exportBtn.textContent = "⬇ Export Excel";
  }
}

loadBtn.addEventListener("click", load);
exportBtn.addEventListener("click", exportExcel);
logoutBtn.addEventListener("click", logout);

requireAuth();
setDefaultDates();
load();
