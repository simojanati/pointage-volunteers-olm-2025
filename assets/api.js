function getSessionToken(){
  return localStorage.getItem("sessionToken") || "";
}

function jsonpRequest(params) {
  const { API_URL, TOKEN } = window.POINTAGE_CONFIG || {};
  if (!API_URL || API_URL.includes("PASTE_")) throw new Error("API_URL not configured");

  const action = String(params?.action || "");
  const isPublicAction = action.startsWith("public");

  // Token requis uniquement pour les actions privées/admin
  if (!isPublicAction) {
    if (!TOKEN || TOKEN.includes("PASTE_")) throw new Error("TOKEN not configured");
    // attach sessionToken to every request except login
    if (action !== "login") {
      params.sessionToken = params.sessionToken || getSessionToken();
    }
  }

  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).slice(2);
    window[cb] = (data) => {
      try { delete window[cb]; } catch(e) {}
      script.remove();
      resolve(data);
    };

    const baseParams = isPublicAction ? { callback: cb, ...params } : { token: TOKEN, callback: cb, ...params };
    const q = new URLSearchParams(baseParams);
    const script = document.createElement("script");
    script.src = `${API_URL}?${q.toString()}`;
    script.onerror = () => {
      try { delete window[cb]; } catch(e) {}
      script.remove();
      reject(new Error("JSONP error"));
    };
    document.body.appendChild(script);
  });
}


async function apiListVolunteers(search="") {
  return jsonpRequest({ action:"listVolunteers", search });
}

async function apiPunch(volunteerId, dateISO) {
  return jsonpRequest({ action:"punch", volunteerId: String(volunteerId), date: dateISO });
}

// SUPER_ADMIN: punch all volunteers of a group for a date (YYYY-MM-DD)
async function apiPunchGroup(group, dateISO){
  return jsonpRequest({ action:"punchGroup", group: String(group||""), date: String(dateISO||"") });
}

async function apiReportSummary(fromISO, toISO) {
  return jsonpRequest({ action:"reportSummary", from: fromISO, to: toISO });
}

async function apiReportPunches(fromISO, toISO) {
  return jsonpRequest({ action:"reportPunches", from: fromISO, to: toISO });
}

// Local YYYY-MM-DD (avoid UTC shift from toISOString)
function isoDate(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const da = String(d.getDate()).padStart(2,'0');
  return y + '-' + m + '-' + da;
}

async function apiAddVolunteer(fullName, badgeCode="", qrCode="", phone="", group="") {
  return jsonpRequest({ action:"addVolunteer", fullName, badgeCode, qrCode, phone, group });
}

async function apiDeletePunch(volunteerId, dateISO) {
  return jsonpRequest({ action:"deletePunch", volunteerId: String(volunteerId), date: dateISO });
}


async function apiUpdateVolunteer(id, fullName, badgeCode="", qrCode="", phone="", group="") {
  return jsonpRequest({ action:"updateVolunteer", id: String(id), fullName, badgeCode, qrCode, phone, group });
}


function apiAssignQrCode(volunteerId, qrCode){
  return jsonpRequest({ action:"assignQrCode", volunteerId: String(volunteerId), qrCode: String(qrCode || "") });
}


function apiListLogs(limit=500){
  return jsonpRequest({ action:"listLogs", limit: String(limit) });
}

async function apiLogin(username, pin){
  return jsonpRequest({ action:"login", username, pin });
}

async function apiMe(){
  return jsonpRequest({ action:"me" });
}

async function apiDashboardStats(from, to, group){
  return jsonpRequest({ action:"dashboardStats", from, to, group });
}

async function apiVolunteerHistory(volunteerId, from, to){
  return jsonpRequest({ action:"volunteerHistory", volunteerId: String(volunteerId), from, to });
}


// Public (no login) - used by viewer.html
async function apiPublicListVolunteers(search=""){
  let res = await jsonpRequest({ action:"publicListVolunteers", search });
  if(res && res.ok) return res;
  // compat: anciens noms
  if(res && String(res.error||"") === "UNKNOWN_ACTION"){
    res = await jsonpRequest({ action:"public_list_volunteers", search });
    if(res && res.ok) return res;
  }
  return res;
}

async function apiPublicVolunteerHistory(volunteerId, from="", to=""){
  let res = await jsonpRequest({ action:"publicVolunteerHistory", volunteerId: String(volunteerId||""), from, to });
  if(res && res.ok) return res;
  if(res && String(res.error||"") === "UNKNOWN_ACTION"){
    res = await jsonpRequest({ action:"public_volunteer_history", volunteerId: String(volunteerId||""), from, to });
    if(res && res.ok) return res;
  }
  return res;
}
