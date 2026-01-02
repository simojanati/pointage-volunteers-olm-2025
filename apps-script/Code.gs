/**
 * Google Apps Script (Web App) for Pointage (JSONP compatible)
 * Sheets required:
 *  - Volunteers: id | full_name | badge_code | qr_code | phone | group
 *  - Punches: punch_date | volunteer_id | punched_at | badge_code | full_name
 *  - Users: username | pin | role | active | nomComplet
 */
const TOKEN = "TOKEN_OLM_FANZONE_2025_12H_18H";

const SHEET_VOL = "Volunteers";
const SHEET_VOL_ARCHIVE = "ArchiveVolunteers";
const SHEET_PUNCH = "Punches";
const SHEET_USERS = "Users";
const SHEET_LOGS = "Logs";

const ROLE_ORDER = { "ADMIN": 1, "SUPER_ADMIN": 2 };

function sheetTZ(){
  try { return SpreadsheetApp.getActive().getSpreadsheetTimeZone(); }
  catch(e){ return Session.getScriptTimeZone(); }
}

function toYMD(v){
  if (v instanceof Date) return Utilities.formatDate(v, sheetTZ(), "yyyy-MM-dd");
  return String(v || "").trim();
}

function toISO(v){
  // IMPORTANT: avoid UTC shift ("-1h") when displaying times in the UI.
  // We serialize dates in the spreadsheet timezone WITHOUT the trailing "Z".
  // Example: 2025-12-27T15:04:00
  if (v instanceof Date) return Utilities.formatDate(v, sheetTZ(), "yyyy-MM-dd'T'HH:mm:ss");
  return String(v || "").trim();
}

function jsonp(obj, callback) {
  return ContentService
    .createTextOutput(`${callback}(${JSON.stringify(obj)})`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function norm(s){ return String(s || "").trim().toLowerCase(); }

function headerIndex(sheet){
  const values = sheet.getDataRange().getValues();
  if (!values.length) return { ok:false, error:"EMPTY_SHEET" };
  const header = values[0].map(h => norm(h));
  const idx = {};
  header.forEach((h,i) => { if(h) idx[h]=i; });
  return { ok:true, values, header, idx };
}

function ensureHeader(sheet, name){
  if(!sheet) return;
  const lastCol = Math.max(1, sheet.getLastColumn());
  const header = sheet.getRange(1,1,1,lastCol).getValues()[0].map(h => norm(h));
  const key = norm(name);
  if(header.indexOf(key) === -1){
    sheet.getRange(1, lastCol+1).setValue(name);
  }
}

function pickGroup(idx, row){
  // support header "group" or "groupe"
  const gi = (idx["group"] !== undefined) ? idx["group"] : idx["groupe"];
  if(gi === undefined) return "";
  return String(row[gi] || "").trim();
}


function nowTs_(){
  return new Date();
}

function tzLabel_(){
  // Requested display label
  return "GMT+1";
}

function formatTsDisplay_(v){
  try{
    const tz = sheetTZ();
    let d = v;
    if(!(d instanceof Date)){
      // try parse string
      const s = String(v||"").trim();
      // Accept 'yyyy-MM-dd HH:mm:ss' or ISO
      if(s){
        const iso = s.includes("T") ? s : s.replace(" ", "T") + ":00";
        const parsed = new Date(iso);
        if(!isNaN(parsed.getTime())) d = parsed;
      }
    }
    if(d instanceof Date && !isNaN(d.getTime())){
      return Utilities.formatDate(d, tz, "dd/MM/yyyy HH:mm:ss");
    }
  }catch(e){}
  return String(v||"").trim();
}

function ensureLogsSheet_(){
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_LOGS);
  if(!sh) sh = ss.insertSheet(SHEET_LOGS);
  ensureHeader(sh, "ts");
  ensureHeader(sh, "actor_username");
  ensureHeader(sh, "actor_role");
  ensureHeader(sh, "action");
  ensureHeader(sh, "volunteer_id");
  ensureHeader(sh, "volunteer_name");
  ensureHeader(sh, "badge_code");
  ensureHeader(sh, "group");
  ensureHeader(sh, "result");
  ensureHeader(sh, "details");
  return sh;
}


function logSignature_(session, action, payload){
  const actorU = session?.username || "";
  const actorR = session?.role || "";
  const vid = payload?.volunteerId || "";
  const res = payload?.result || "";
  const det = (payload && payload.details !== undefined) ? payload.details : "";
  const detS = (det && typeof det === "object") ? JSON.stringify(det) : String(det||"");
  return [actorU, actorR, String(action||""), String(vid||""), String(res||""), detS].join("|");
}

function isDuplicateLog_(sh, h, sig){
  try{
    const lastRow = sh.getLastRow();
    if(lastRow <= 1) return false;
    const take = Math.min(6, lastRow-1);
    const start = lastRow - take + 1;
    const rng = sh.getRange(start, 1, take, sh.getLastColumn()).getValues();
    // indices
    const idx = {};
    h.header.forEach((k, i)=> idx[k]=i);
    const now = new Date().getTime();
    for(let i=rng.length-1;i>=0;i--){
      const r = rng[i];
      const ts = r[idx.ts];
      const tsMs = (ts instanceof Date) ? ts.getTime() : 0;
      // only dedup within 5 seconds
      if(tsMs && Math.abs(now - tsMs) > 5000) continue;

      const actorU = String(r[idx.actor_username]||"");
      const actorR = String(r[idx.actor_role]||"");
      const act = String(r[idx.action]||"");
      const vid = String(r[idx.volunteer_id]||"");
      const res = String(r[idx.result]||"");
      const det = String(r[idx.details]||"");
      const sig2 = [actorU, actorR, act, vid, res, det].join("|");
      if(sig2 === sig) return true;
    }
  }catch(e){}
  return false;
}


function appendLog_(session, action, payload){
  try{
    const sh = ensureLogsSheet_();
    const h = headerIndex(sh);
    if(!h.ok) return;

    const row = [];
    h.header.forEach(k => {
      if(k === "ts") row.push(nowTs_());
      else if(k === "actor_username") row.push(session?.username || "");
      else if(k === "actor_role") row.push(session?.role || "");
      else if(k === "action") row.push(action || "");
      else if(k === "volunteer_id") row.push(payload?.volunteerId || "");
      else if(k === "volunteer_name") row.push(payload?.volunteerName || "");
      else if(k === "badge_code") row.push(payload?.badgeCode || "");
      else if(k === "group" || k === "groupe") row.push(payload?.group || "");
      else if(k === "result") row.push(payload?.result || "");
      else if(k === "details") {
        const det = (payload && payload.details !== undefined) ? payload.details : "";
        row.push((det && typeof det === "object") ? JSON.stringify(det) : (det || ""));
      }
      else row.push("");
    });

    const sig = logSignature_(session, action, payload);
    // prevent duplicates caused by retries/network
    if(isDuplicateLog_(sh, h, sig)) return;

    sh.appendRow(row);
  }catch(err){
    // no-op
  }
}


/** ---------------- Sessions ---------------- */
function newSession(user){
  const token = Utilities.getUuid();
  const cache = CacheService.getScriptCache();
  cache.put("sess_"+token, JSON.stringify({
    username: user.username,
    role: user.role,
    nomComplet: user.nomComplet || ""
  }), 6 * 60 * 60); // 6h
  return token;
}

function getSession(sessionToken){
  if(!sessionToken) return null;
  const cache = CacheService.getScriptCache();
  const raw = cache.get("sess_"+sessionToken);
  if(!raw) return null;
  try { return JSON.parse(raw); } catch(e){ return null; }
}

function requireRole(p, minRole){
  const sess = getSession(p.sessionToken);
  if(!sess) return { ok:false, error:"NOT_AUTHENTICATED" };
  const need = ROLE_ORDER[minRole] || 999;
  const has = ROLE_ORDER[sess.role] || 0;
  if(has < need) return { ok:false, error:"FORBIDDEN" };
  return { ok:true, session:sess };
}

/** ---------------- Actions ---------------- */
function doGet(e){
  const p = e.parameter || {};
  const callback = p.callback || "cb";
  const action = p.action || "";
  const isPublic = String(action).indexOf("public") === 0;

  // Token uniquement pour actions non publiques
  if(!isPublic){
    const token = p.token || "";
    if (token !== TOKEN) return jsonp({ ok:false, error:"UNAUTHORIZED" }, callback);
  }
  try{
    if(action === "login") return jsonp(login(p), callback);
    if(action === "me") return jsonp(me(p), callback);

    // PUBLIC actions (Viewer, no sessionToken)
    if(action === "publicListVolunteers" || action === "public_list_volunteers" || action === "PUBLIC_LIST_VOLUNTEERS"){
      return jsonp(listVolunteers(p.search || ""), callback);
    }
    if(action === "publicVolunteerHistory" || action === "public_volunteer_history" || action === "PUBLIC_VOLUNTEER_HISTORY"){
      return jsonp(volunteerHistory(p), callback);
    }

    // ADMIN actions
    if(action === "listVolunteers"){
      const auth = requireRole(p, "ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      return jsonp(listVolunteers(p.search || ""), callback);
    }
    if(action === "punch"){
      const auth = requireRole(p, "ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      p.__session = auth.session;
      return jsonp(punch(p), callback);
    }
    if(action === "deletePunch"){
      const auth = requireRole(p, "ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      p.__session = auth.session;
      return jsonp(deletePunch(p), callback);
    }

    if(action === "assignQrCode"){
      const auth = requireRole(p, "ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      p.__session = auth.session;
      return jsonp(assignQrCode(p), callback);
    }

    if(action === "punchGroup"){
      const auth = requireRole(p, "SUPER_ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      p.__session = auth.session;
      return jsonp(punchGroup(p), callback);
    }

    // SUPER ADMIN actions
    if(action === "addVolunteer"){
      const auth = requireRole(p, "SUPER_ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      p.__session = auth.session;
      return jsonp(addVolunteer(p), callback);
    }
    if(action === "updateVolunteer"){
      const auth = requireRole(p, "SUPER_ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      p.__session = auth.session;
      return jsonp(updateVolunteer(p), callback);
    }
    if(action === "deleteVolunteer"){
      const auth = requireRole(p, "SUPER_ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      p.__session = auth.session;
      return jsonp(deleteVolunteer(p), callback);
    }

    if(action === "listArchivedVolunteers"){
      const auth = requireRole(p, "SUPER_ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      p.__session = auth.session;
      return jsonp(listArchivedVolunteers(p), callback);
    }

    if(action === "reactivateVolunteer"){
      const auth = requireRole(p, "SUPER_ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      p.__session = auth.session;
      return jsonp(reactivateVolunteer(p), callback);
    }
    if(action === "runAutoPunchRoles"){
      const auth = requireRole(p, "ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      p.__session = auth.session;
      return jsonp(runAutoPunchRolesNow(p), callback);
    }
    if(action === "reportSummary"){
      const auth = requireRole(p, "ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      p.__session = auth.session;
      return jsonp(reportSummary(p), callback);
    }
    if(action === "reportPunches"){
      const auth = requireRole(p, "ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      p.__session = auth.session;
      return jsonp(reportPunches(p), callback);
    }
        if(action === "listLogs"){
      const auth = requireRole(p, "SUPER_ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      p.__session = auth.session;
      return jsonp(listLogs(p), callback);
    }

if(action === "dashboardStats"){
      const auth = requireRole(p, "ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      return jsonp(dashboardStats(p), callback);
    }
    if(action === "volunteerHistory"){
      const auth = requireRole(p, "ADMIN");
      if(!auth.ok) return jsonp(auth, callback);
      p.__session = auth.session;
      return jsonp(volunteerHistory(p), callback);
    }

    return jsonp({ ok:false, error:"UNKNOWN_ACTION" }, callback);
  }catch(err){
    return jsonp({ ok:false, error:"SERVER_ERROR", detail:String(err) }, callback);
  }
}

function me(p){
  const sess = getSession(p.sessionToken);
  if(!sess) return { ok:false, error:"NOT_AUTHENTICATED" };
  return { ok:true, username:sess.username, role:sess.role, nomComplet:sess.nomComplet || "" };
}

function login(p){
  const username = String(p.username || "").trim();
  const pin = String(p.pin || "").trim();
  if(!username || !pin) return { ok:false, error:"MISSING_CREDENTIALS" };

  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_USERS);
  if(!sh) return { ok:false, error:"USERS_SHEET_NOT_FOUND" };
  ensureHeader(sh, "nomComplet");

  const h = headerIndex(sh);
  if(!h.ok) return h;

  const idx = h.idx;
  const rows = h.values.slice(1);

  const row = rows.find(r =>
    String(r[idx.username]||"").trim() === username &&
    String(r[idx.pin]||"").trim() === pin &&
    String(r[idx.active]||"").toUpperCase() === "TRUE"
  );
  if(!row) return { ok:false, error:"BAD_CREDENTIALS" };

  let role = String(row[idx.role]||"ADMIN").trim().toUpperCase();
  if(!(role in ROLE_ORDER)) role = "ADMIN";

  const nomComplet = (idx.nomcomplet !== undefined) ? String(row[idx.nomcomplet]||"").trim() : "";
  const sessionToken = newSession({ username, role, nomComplet });

  return { ok:true, sessionToken, role, username, nomComplet };
}

/** ---------------- Core: Volunteers & Punches ---------------- */
function listVolunteers(search){
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_VOL);
  if(!sh) return { ok:false, error:"VOL_SHEET_NOT_FOUND" };
  ensureHeader(sh, "group");
  ensureHeader(sh, "qr_code");
  ensureHeader(sh, "role");
  const h = headerIndex(sh);
  if(!h.ok) return h;

  const idx = h.idx;
  const rows = h.values.slice(1);

  const q = norm(search);
  const out = [];
  rows.forEach(r => {
    const id = r[idx.id];
    const fullName = String(r[idx["full_name"]]||"").trim();
    const badgeCode = String(r[idx["badge_code"]]||"").trim();
    const qrCode = (idx["qr_code"] !== undefined) ? String(r[idx["qr_code"]]||"").trim() : "";
    const phone = String(r[idx.phone]||"").trim();
    const group = pickGroup(idx, r);
    if(!id) return;

    if(q){
      const hay = norm(fullName) + " " + norm(badgeCode) + " " + norm(qrCode) + " " + norm(phone) + " " + norm(group);
      if(!hay.includes(q)) return;
    }
    const role = (idx["role"] !== undefined) ? String(r[idx["role"]] || "").trim() : "";
    out.push({ id, fullName, badgeCode, qrCode, phone, group, role });
  });

  return { ok:true, volunteers: out };
}

function punch(p){
  const sess = p.__session || null;
  const volunteerId = String(p.volunteerId || "").trim();
  const date = String(p.date || "").trim(); // yyyy-MM-dd
  if(!volunteerId || !date) return { ok:false, error:"MISSING_PARAMS" };

  const shP = SpreadsheetApp.getActive().getSheetByName(SHEET_PUNCH);
  const shV = SpreadsheetApp.getActive().getSheetByName(SHEET_VOL);
  if(!shP) return { ok:false, error:"PUNCH_SHEET_NOT_FOUND" };
  if(!shV) return { ok:false, error:"VOL_SHEET_NOT_FOUND" };

  ensureHeader(shP, "group");
  ensureHeader(shV, "group");
  const hp = headerIndex(shP);
  const hv = headerIndex(shV);
  if(!hp.ok) return hp;
  if(!hv.ok) return hv;

  const ip = hp.idx;
  const iv = hv.idx;

  // Find volunteer info
  const vrows = hv.values.slice(1);
  const vrow = vrows.find(r => String(r[iv.id]) === volunteerId);
  if(!vrow) return { ok:false, error:"VOLUNTEER_NOT_FOUND" };

  const fullName = String(vrow[iv["full_name"]]||"").trim();
  const badgeCode = String(vrow[iv["badge_code"]]||"").trim();
  const group = pickGroup(iv, vrow);

  const rows = hp.values.slice(1);
  let existingTs = null;
  for(let i=0;i<rows.length;i++){
    const r = rows[i];
    if(String(r[ip.volunteer_id]) === volunteerId && toYMD(r[ip.punch_date]) === date){
      existingTs = r[ip.punched_at];
      break;
    }
  }
  if(existingTs){
    appendLog_(sess, "PUNCH", { volunteerId, volunteerName: fullName, badgeCode, group, result:"ALREADY", details:`date=${date}` });
    return { ok:false, error:"ALREADY_PUNCHED", punchedAt: toISO(existingTs) };
  }

  const now = new Date(); // keep as Date object (sheet TZ)
  const outRow = [];
  hp.header.forEach(hname => {
    if(hname === "punch_date") outRow.push(date);
    else if(hname === "volunteer_id") outRow.push(volunteerId);
    else if(hname === "punched_at") outRow.push(now);
    else if(hname === "badge_code") outRow.push(badgeCode);
    else if(hname === "full_name") outRow.push(fullName);
    else if(hname === "group" || hname === "groupe") outRow.push(group);
    else outRow.push("");
  });

  shP.appendRow(outRow);
  appendLog_(sess, "PUNCH", { volunteerId, volunteerName: fullName, badgeCode, group, result:"OK", details:`date=${date}` });
  return { ok:true };
}

/**
 * SUPER_ADMIN: Punch all volunteers for a given group and date.
 * Params: group (string), date (yyyy-MM-dd)
 * Returns: ok, totalInGroup, punchedNew, alreadyPunched, date, group
 */
function punchGroup(p){
  const sess = p.__session || null;
  const group = String(p.group || "").trim();
  const date = String(p.date || "").trim();
  if(!group || !date) return { ok:false, error:"MISSING_PARAMS" };

  const shP = SpreadsheetApp.getActive().getSheetByName(SHEET_PUNCH);
  const shV = SpreadsheetApp.getActive().getSheetByName(SHEET_VOL);
  if(!shP) return { ok:false, error:"PUNCH_SHEET_NOT_FOUND" };
  if(!shV) return { ok:false, error:"VOL_SHEET_NOT_FOUND" };

  ensureHeader(shP, "group");
  ensureHeader(shV, "group");
  const hp = headerIndex(shP);
  const hv = headerIndex(shV);
  if(!hp.ok) return hp;
  if(!hv.ok) return hv;

  const ip = hp.idx;
  const iv = hv.idx;

  // Build set of already punched volunteerIds for the date
  const punchedSet = {};
  hp.values.slice(1).forEach(r => {
    const d = toYMD(r[ip.punch_date]);
    if(d === date){
      punchedSet[String(r[ip.volunteer_id]||"")] = true;
    }
  });

  const gNorm = norm(group);
  const vrows = hv.values.slice(1);
  const targets = [];
  vrows.forEach(r => {
    const id = String(r[iv.id]||"").trim();
    if(!id) return;
    const g = pickGroup(iv, r);
    if(norm(g) !== gNorm) return;
    targets.push({
      id,
      fullName: String(r[iv["full_name"]]||"").trim(),
      badgeCode: String(r[iv["badge_code"]]||"").trim(),
      group: g
    });
  });

  const totalInGroup = targets.length;
  if(totalInGroup === 0){
    return { ok:false, error:"EMPTY_GROUP", group, date };
  }

  let alreadyPunched = 0;
  const now = new Date();
  const rowsToAppend = [];

  targets.forEach(v => {
    if(punchedSet[String(v.id)]){
      alreadyPunched++;
      return;
    }
    const outRow = [];
    hp.header.forEach(hname => {
      if(hname === "punch_date") outRow.push(date);
      else if(hname === "volunteer_id") outRow.push(v.id);
      else if(hname === "punched_at") outRow.push(now);
      else if(hname === "badge_code") outRow.push(v.badgeCode);
      else if(hname === "full_name") outRow.push(v.fullName);
      else if(hname === "group" || hname === "groupe") outRow.push(v.group);
      else outRow.push("");
    });
    rowsToAppend.push(outRow);
  });

  if(rowsToAppend.length){
    const startRow = shP.getLastRow() + 1;
    shP.getRange(startRow, 1, rowsToAppend.length, hp.header.length).setValues(rowsToAppend);
  }
  appendLog_(sess, "PUNCH_GROUP", { group, result:"OK", details:`date=${date}; total=${totalInGroup}; new=${punchedNew}; already=${alreadyPunched}` });
  return { ok:true,
    group,
    date,
    totalInGroup,
    alreadyPunched,
    punchedNew: rowsToAppend.length
  };
}

function deletePunch(p){
  const sess = p.__session || null;
  const volunteerId = String(p.volunteerId || "").trim();
  const date = String(p.date || "").trim();
  if(!volunteerId || !date) return { ok:false, error:"MISSING_PARAMS" };

  const shP = SpreadsheetApp.getActive().getSheetByName(SHEET_PUNCH);
  if(!shP) return { ok:false, error:"PUNCH_SHEET_NOT_FOUND" };
  const hp = headerIndex(shP);
  if(!hp.ok) return hp;
  const ip = hp.idx;

  const rows = hp.values.slice(1);
  let rowIndex = -1;
  for(let i=0;i<rows.length;i++){
    const r = rows[i];
    if(String(r[ip.volunteer_id]) === volunteerId && toYMD(r[ip.punch_date]) === date){
      rowIndex = i+2; // + header
      break;
    }
  }
  if(rowIndex === -1) return { ok:false, error:"NOT_FOUND" };

  shP.deleteRow(rowIndex);
  appendLog_(sess, "DELETE_PUNCH", { volunteerId: String(volunteerId||""), result:"OK", details:{ date: String(date||"") } });
  return { ok:true };
}

function addVolunteer(p){
  const sess = p.__session || null;
  const fullName = String(p.fullName || "").trim();
  const badgeCode = String(p.badgeCode || "").trim();
  const qrCode = String(p.qrCode || "").trim();
  const phone = String(p.phone || "").trim();
  const group = String(p.group || "").trim();
  if(!fullName) return { ok:false, error:"NAME_REQUIRED" };

  const shV = SpreadsheetApp.getActive().getSheetByName(SHEET_VOL);
  if(!shV) return { ok:false, error:"VOL_SHEET_NOT_FOUND" };
  ensureHeader(shV, "group");
  ensureHeader(shV, "qr_code");
  ensureHeader(shV, "role");
  const hv = headerIndex(shV);
  if(!hv.ok) return hv;
  const iv = hv.idx;

  // unique badge
  if(badgeCode){
    const exists = hv.values.slice(1).some(r => String(r[iv["badge_code"]]||"").trim() === badgeCode);
    if(exists) return { ok:false, error:"BADGE_ALREADY_EXISTS" };
  }

  // unique qr_code
  if(qrCode){
    const existsQr = hv.values.slice(1).some(r => String(r[iv["qr_code"]]||"").trim() === qrCode);
    if(existsQr) return { ok:false, error:"QR_ALREADY_EXISTS" };
  }

  // new id = max(id)+1
  const ids = hv.values.slice(1).map(r => Number(r[iv.id]||0)).filter(n => !isNaN(n));
  const newId = (ids.length ? Math.max.apply(null, ids) : 0) + 1;

  const row = [];
  hv.header.forEach(hname=>{
    if(hname === "id") row.push(newId);
    else if(hname === "full_name") row.push(fullName);
    else if(hname === "badge_code") row.push(badgeCode);
    else if(hname === "qr_code") row.push(qrCode);
    else if(hname === "phone") row.push(phone);
    else if(hname === "group") row.push(group);
    else row.push("");
  });

  shV.appendRow(row);
  appendLog_(sess, "ADD_VOLUNTEER", { volunteerId: String(newId||""), volunteerName: fullName, badgeCode, group, result:"OK", details:{ created:{ fullName, badgeCode, qrCode, phone, group } } });
  return { ok:true, id:newId };
}

function updateVolunteer(p){
  const sess = p.__session || null;
  const id = String(p.id || "").trim();
  const fullName = String(p.fullName || "").trim();
  const badgeCode = String(p.badgeCode || "").trim();
  const qrCode = String(p.qrCode || "").trim();
  const phone = String(p.phone || "").trim();
  const group = String(p.group || "").trim();
  if(!id || !fullName) return { ok:false, error:"MISSING_PARAMS" };

  const shV = SpreadsheetApp.getActive().getSheetByName(SHEET_VOL);
  const shP = SpreadsheetApp.getActive().getSheetByName(SHEET_PUNCH);
  if(!shV) return { ok:false, error:"VOL_SHEET_NOT_FOUND" };
  if(!shP) return { ok:false, error:"PUNCH_SHEET_NOT_FOUND" };

  ensureHeader(shV, "group");
  ensureHeader(shV, "qr_code");
  ensureHeader(shV, "role");
  ensureHeader(shP, "group");
  const hv = headerIndex(shV);
  const hp = headerIndex(shP);
  if(!hv.ok) return hv;
  if(!hp.ok) return hp;

  const iv = hv.idx;
  const ip = hp.idx;

  const rows = hv.values.slice(1);
  let rowIndex = -1;
  let currentRow = null;
  let currentBadge = "";
  for(let i=0;i<rows.length;i++){
    const r = rows[i];
    if(String(r[iv.id]) === id){
      rowIndex = i+2;
      currentBadge = String(r[iv["badge_code"]]||"").trim();
      currentRow = r;
      break;
    }
  }
  if(rowIndex === -1) return { ok:false, error:"VOLUNTEER_NOT_FOUND" };

  const oldFullName = String(currentRow[iv["full_name"]] || "").trim();
  const oldBadgeCode = String(currentRow[iv["badge_code"]] || "").trim();
  const oldPhone = (iv.phone !== undefined) ? String(currentRow[iv.phone] || "").trim() : "";
  const oldQr = (iv["qr_code"] !== undefined) ? String(currentRow[iv["qr_code"]] || "").trim() : "";
  const oldGroup = pickGroup(iv, currentRow);

  // unique badge
  if(badgeCode && badgeCode !== currentBadge){
    const exists = rows.some(r => String(r[iv["badge_code"]]||"").trim() === badgeCode);
    if(exists) return { ok:false, error:"BADGE_ALREADY_EXISTS" };
  }


  // unique qr_code (excluding current id)
  if(qrCode){
    const rows2 = hv.values.slice(1).filter(r => String(r[iv.id]) !== id);
    const existsQr = rows2.some(r => String(r[iv["qr_code"]]||"").trim() === qrCode);
    if(existsQr) return { ok:false, error:"QR_ALREADY_EXISTS" };
  }

  // Update volunteer row
  const update = {};
  update[iv["full_name"]] = fullName;
  update[iv["badge_code"]] = badgeCode;
  if(iv["qr_code"] !== undefined) update[iv["qr_code"]] = qrCode;
  update[iv.phone] = phone;
  if(iv["group"] !== undefined) update[iv["group"]] = group;
  else if(iv["groupe"] !== undefined) update[iv["groupe"]] = group;

  const range = shV.getRange(rowIndex, 1, 1, hv.header.length);
  const values = range.getValues()[0];
  Object.keys(update).forEach(k => values[Number(k)] = update[k]);
  range.setValues([values]);

  // Update punches table (denormalized fields)
  const pvals = hp.values;
  const prows = pvals.slice(1);
  const toUpdate = [];
  prows.forEach((r,i)=>{
    if(String(r[ip.volunteer_id]) === id){
      const rr = r.slice();
      rr[ip.full_name] = fullName;
      rr[ip.badge_code] = badgeCode;
      toUpdate.push({ row:i+2, rr });
    }
  });
  toUpdate.forEach(u=>{
    shP.getRange(u.row, 1, 1, hp.header.length).setValues([u.rr]);
  });

  const volunteerChanges_ = [];
  const addCh_ = (field, o, n) => { if(String(o||"") !== String(n||"")) volunteerChanges_.push({ field, old: String(o||""), new: String(n||"") }); };
  addCh_("fullName", oldFullName, fullName);
  addCh_("badgeCode", oldBadgeCode, badgeCode);
  addCh_("qrCode", oldQr, qrCode);
  addCh_("phone", oldPhone, phone);
  addCh_("group", oldGroup, group);

  if(volunteerChanges_.length){
    appendLog_(sess, "UPDATE_VOLUNTEER", { volunteerId: id, volunteerName: fullName, badgeCode: badgeCode, group: group, result:"OK", details:{ changes: volunteerChanges_ } });
  }
  return { ok:true };
}

function deleteVolunteer(p){
  const sess = p.__session || null;
  const id = String(p.id || "").trim();
  if(!id) return { ok:false, error:"MISSING_ID" };

  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_VOL);
  if(!sh) return { ok:false, error:"VOL_SHEET_NOT_FOUND" };

  ensureHeader(sh, "group");
  ensureHeader(sh, "qr_code");
  ensureHeader(sh, "role");

  const h = headerIndex(sh);
  if(!h.ok) return h;

  const idx = h.idx;
  const values = h.values;

  let rowToDelete = -1;
  let snapshot = null;

  for(let r=1; r<values.length; r++){
    const row = values[r];
    if(String(row[idx.id] || "").trim() === id){
      rowToDelete = r + 1; // sheet row index (1-based)
      snapshot = {
        id,
        fullName: String(row[idx["full_name"]] || "").trim(),
        badgeCode: String(row[idx["badge_code"]] || "").trim(),
        qrCode: (idx["qr_code"] !== undefined) ? String(row[idx["qr_code"]] || "").trim() : "",
        phone: String(row[idx.phone] || "").trim(),
        group: pickGroup(idx, row),
        role: (idx["role"] !== undefined) ? String(row[idx["role"]] || "").trim() : ""
      };
      break;
    }
  }

  if(rowToDelete < 0) return { ok:false, error:"NOT_FOUND" };

  // Archive before delete (keep historical punches intact)
  const shA = SpreadsheetApp.getActive().getSheetByName(SHEET_VOL_ARCHIVE) || SpreadsheetApp.getActive().insertSheet(SHEET_VOL_ARCHIVE);
  ensureHeader(shA, "deleted_at");
  ensureHeader(shA, "deleted_by");
  ensureHeader(shA, "id");
  ensureHeader(shA, "full_name");
  ensureHeader(shA, "badge_code");
  ensureHeader(shA, "qr_code");
  ensureHeader(shA, "phone");
  ensureHeader(shA, "group");
  ensureHeader(shA, "role");

  const ha = headerIndex(shA);
  const ia = ha.idx;

  const deletedAt = Utilities.formatDate(new Date(), "GMT+1", "dd/MM/yyyy HH:mm:ss") + " (GMT+1)";
  const deletedBy = sess ? String(sess.username || "") : "";

  const rowA = [];
  rowA[ia["deleted_at"]] = deletedAt;
  rowA[ia["deleted_by"]] = deletedBy;
  rowA[ia["id"]] = snapshot.id || "";
  rowA[ia["full_name"]] = snapshot.fullName || "";
  rowA[ia["badge_code"]] = snapshot.badgeCode || "";
  rowA[ia["qr_code"]] = snapshot.qrCode || "";
  rowA[ia["phone"]] = snapshot.phone || "";
  rowA[ia["group"]] = snapshot.group || "";
  rowA[ia["role"]] = snapshot.role || "";

  shA.appendRow(rowA);


  sh.deleteRow(rowToDelete);

  appendLog_(sess, "DELETE_VOLUNTEER", { volunteerId: id, result:"OK", deleted: snapshot });
  return { ok:true };
}


function listArchivedVolunteers(p){
  const shA = SpreadsheetApp.getActive().getSheetByName(SHEET_VOL_ARCHIVE);
  if(!shA) return { ok:true, volunteers: [] };

  // Ensure expected headers exist (backward compatible)
  ensureHeader(shA, "deleted_at");
  ensureHeader(shA, "deleted_by");
  ensureHeader(shA, "id");
  ensureHeader(shA, "full_name");
  ensureHeader(shA, "badge_code");
  ensureHeader(shA, "qr_code");
  ensureHeader(shA, "phone");
  ensureHeader(shA, "group");
  ensureHeader(shA, "role");

  const h = headerIndex(shA);
  if(!h.ok) return h;
  const idx = h.idx;
  const rows = h.values.slice(1);

  const out = [];
  rows.forEach(r => {
    const id = (idx.id !== undefined) ? String(r[idx.id] || "").trim() : "";
    if(!id) return;
    out.push({
      id,
      fullName: (idx["full_name"] !== undefined) ? String(r[idx["full_name"]] || "").trim() : "",
      badgeCode: (idx["badge_code"] !== undefined) ? String(r[idx["badge_code"]] || "").trim() : "",
      qrCode: (idx["qr_code"] !== undefined) ? String(r[idx["qr_code"]] || "").trim() : "",
      phone: (idx.phone !== undefined) ? String(r[idx.phone] || "").trim() : "",
      group: pickGroup(idx, r),
      role: (idx.role !== undefined) ? String(r[idx.role] || "").trim() : "",
      deletedAt: (idx["deleted_at"] !== undefined) ? String(r[idx["deleted_at"]] || "").trim() : "",
      deletedBy: (idx["deleted_by"] !== undefined) ? String(r[idx["deleted_by"]] || "").trim() : ""
    });
  });

  // Optional: most recent deletions first (best effort)
  out.reverse();
  return { ok:true, volunteers: out };
}


function reactivateVolunteer(p){
  const sess = p.__session || null;
  const id = String(p.id || "").trim();
  if(!id) return { ok:false, error:"MISSING_ID" };

  const ss = SpreadsheetApp.getActive();
  const shA = ss.getSheetByName(SHEET_VOL_ARCHIVE);
  if(!shA) return { ok:false, error:"ARCHIVE_SHEET_NOT_FOUND" };

  ensureHeader(shA, "id");
  ensureHeader(shA, "full_name");
  ensureHeader(shA, "badge_code");
  ensureHeader(shA, "qr_code");
  ensureHeader(shA, "phone");
  ensureHeader(shA, "group");
  ensureHeader(shA, "role");

  const ha = headerIndex(shA);
  if(!ha.ok) return ha;
  const ia = ha.idx;

  let rowToRestore = -1;
  let snapshot = null;

  for(let r=1; r<ha.values.length; r++){
    const row = ha.values[r];
    if(String(row[ia.id] || "").trim() === id){
      rowToRestore = r + 1; // sheet row index
      snapshot = {
        id,
        fullName: (ia["full_name"] !== undefined) ? String(row[ia["full_name"]] || "").trim() : "",
        badgeCode: (ia["badge_code"] !== undefined) ? String(row[ia["badge_code"]] || "").trim() : "",
        qrCode: (ia["qr_code"] !== undefined) ? String(row[ia["qr_code"]] || "").trim() : "",
        phone: (ia.phone !== undefined) ? String(row[ia.phone] || "").trim() : "",
        group: pickGroup(ia, row),
        role: (ia.role !== undefined) ? String(row[ia.role] || "").trim() : ""
      };
      break;
    }
  }

  if(rowToRestore < 0 || !snapshot) return { ok:false, error:"NOT_FOUND" };

  const shV = ss.getSheetByName(SHEET_VOL);
  if(!shV) return { ok:false, error:"VOL_SHEET_NOT_FOUND" };

  ensureHeader(shV, "group");
  ensureHeader(shV, "qr_code");
  ensureHeader(shV, "role");

  const hv = headerIndex(shV);
  if(!hv.ok) return hv;
  const iv = hv.idx;

  // If already active, stop
  const existsId = hv.values.slice(1).some(r => String(r[iv.id]||"").trim() === id);
  if(existsId) return { ok:false, error:"ALREADY_ACTIVE" };

  // Uniqueness checks (badge_code & qr_code)
  const badge = String(snapshot.badgeCode || "").trim();
  if(badge){
    const existsBadge = hv.values.slice(1).some(r => String(r[iv["badge_code"]]||"").trim() === badge);
    if(existsBadge) return { ok:false, error:"BADGE_ALREADY_EXISTS" };
  }
  const qr = String(snapshot.qrCode || "").trim();
  if(qr && iv["qr_code"] !== undefined){
    const existsQr = hv.values.slice(1).some(r => String(r[iv["qr_code"]]||"").trim() === qr);
    if(existsQr) return { ok:false, error:"QR_ALREADY_EXISTS" };
  }

  // Append restored volunteer to Volunteers
  const outRow = [];
  hv.header.forEach(hname => {
    if(hname === "id") outRow.push(snapshot.id);
    else if(hname === "full_name") outRow.push(snapshot.fullName);
    else if(hname === "badge_code") outRow.push(snapshot.badgeCode);
    else if(hname === "qr_code") outRow.push(snapshot.qrCode);
    else if(hname === "phone") outRow.push(snapshot.phone);
    else if(hname === "group" || hname === "groupe") outRow.push(snapshot.group);
    else if(hname === "role") outRow.push(snapshot.role);
    else outRow.push("");
  });
  shV.appendRow(outRow);

  // Remove from archive
  shA.deleteRow(rowToRestore);

  appendLog_(sess, "REACTIVATE_VOLUNTEER", { volunteerId: id, volunteerName: snapshot.fullName, badgeCode: snapshot.badgeCode, group: snapshot.group, result:"OK" });
  return { ok:true };
}



function assignQrCode(p){
  const sess = p.__session || null;
  const volunteerId = String(p.volunteerId || p.id || "").trim();
  const qrCode = String(p.qrCode || "").trim();
  if(!volunteerId || !qrCode) return { ok:false, error:"MISSING_PARAMS" };

  const shV = SpreadsheetApp.getActive().getSheetByName(SHEET_VOL);
  if(!shV) return { ok:false, error:"VOL_SHEET_NOT_FOUND" };
  ensureHeader(shV, "qr_code");
  const h = headerIndex(shV);
  if(!h.ok) return h;

  const idx = h.idx;
  if(idx.id === undefined) return { ok:false, error:"ID_COL_NOT_FOUND" };
  if(idx["qr_code"] === undefined) return { ok:false, error:"QR_COL_NOT_FOUND" };

  // Find target row (sheet row index)
  let targetRow = -1;
  for(let i=1;i<h.values.length;i++){
    const rid = String(h.values[i][idx.id] || "").trim();
    if(rid === volunteerId){
      targetRow = i + 1;
      break;
    }
  }
  if(targetRow < 0) return { ok:false, error:"VOLUNTEER_NOT_FOUND" };

  // Read current volunteer row (for logging + response)
  const rowBefore = shV.getRange(targetRow, 1, 1, shV.getLastColumn()).getValues()[0];
  const oldQr = (idx["qr_code"] !== undefined) ? String(rowBefore[idx["qr_code"]] || "").trim() : "";
  const fullName = String(rowBefore[idx["full_name"]] || "").trim();
  const badgeCode = String(rowBefore[idx["badge_code"]] || "").trim();
  const phone = (idx.phone !== undefined) ? String(rowBefore[idx.phone] || "").trim() : "";
  const group = pickGroup(idx, rowBefore);

  // Uniqueness check
  const qn = norm(qrCode);
  for(let i=1;i<h.values.length;i++){
    const rid = String(h.values[i][idx.id] || "").trim();
    const existing = String(h.values[i][idx["qr_code"]] || "").trim();
    if(existing && norm(existing) === qn && rid !== volunteerId){
      return { ok:false, error:"QR_ALREADY_EXISTS" };
    }
  }

  // Write value
  shV.getRange(targetRow, idx["qr_code"] + 1).setValue(qrCode);

  // Log
  appendLog_(sess, "ASSIGN_QR", {
    volunteerId,
    volunteerName: fullName,
    badgeCode,
    group,
    result:"OK",
    details:{ changes:[{ field:"qrCode", old: oldQr, new: qrCode }] }
  });

  return { ok:true, id: volunteerId, fullName, badgeCode, qrCode, phone, group };
}

function reportSummary(p){
  const from = String(p.from || "").trim();
  const to = String(p.to || "").trim();
  const group = String(p.group || "").trim();
  if(!from || !to) return { ok:false, error:"MISSING_PARAMS" };

  const shP = SpreadsheetApp.getActive().getSheetByName(SHEET_PUNCH);
  if(!shP) return { ok:false, error:"PUNCH_SHEET_NOT_FOUND" };
  ensureHeader(shP, "group");
  const hp = headerIndex(shP);
  if(!hp.ok) return hp;
  const ip = hp.idx;

  // group map + total volunteers (filtered if group)
  const shV = SpreadsheetApp.getActive().getSheetByName(SHEET_VOL);
  const totalByGroup = { all: 0 };
  const groupById = {};
  if(shV){
    ensureHeader(shV, "group");
    const hv = headerIndex(shV);
    if(hv.ok){
      const iv = hv.idx;
      hv.values.slice(1).forEach(r=>{
        const id = String(r[iv.id]||"");
        const g = pickGroup(iv, r);
        groupById[id] = g;
        totalByGroup.all++;
        const key = norm(g) || "(sans)";
        totalByGroup[key] = (totalByGroup[key]||0)+1;
      });
    }
  }


  let count = 0;
  const unique = {};
  hp.values.slice(1).forEach(r=>{
    const d = toYMD(r[ip.punch_date]);
    if(d >= from && d <= to){
      const vid = String(r[ip.volunteer_id]||"");
      const punchGroup = pickGroup(ip, r) || (groupById[vid] || "");
      if(group && norm(group) !== "all" && norm(punchGroup) !== norm(group)) return;

      count++;
      unique[vid] = true;
    }
  });
  const uniqueCount = Object.keys(unique).length;
  // Total volunteers (filtered by group)
  const totalVolunteers = (group && norm(group) !== "all") ? (totalByGroup[norm(group)] || 0) : (totalByGroup.all || 0);

  const absents = Math.max(0, totalVolunteers - uniqueCount);
  const ratePct = totalVolunteers ? Math.round((uniqueCount/totalVolunteers) * 100) : 0;

  return {
    ok:true,
    totalVolunteers,
    totalPunches: count,
    uniqueVolunteers: uniqueCount,
    absents,
    ratePct
  };
}

function reportPunches(p){
  const from = String(p.from || "").trim();
  const to = String(p.to || "").trim();
  const group = String(p.group || "").trim();
  if(!from || !to) return { ok:false, error:"MISSING_PARAMS" };

  const shP = SpreadsheetApp.getActive().getSheetByName(SHEET_PUNCH);
  const shV = SpreadsheetApp.getActive().getSheetByName(SHEET_VOL);
  if(!shP) return { ok:false, error:"PUNCH_SHEET_NOT_FOUND" };
  if(!shV) return { ok:false, error:"VOL_SHEET_NOT_FOUND" };

  ensureHeader(shP, "group");
  ensureHeader(shV, "group");
  const hp = headerIndex(shP);
  const hv = headerIndex(shV);
  if(!hp.ok) return hp;
  if(!hv.ok) return hv;
  const ip = hp.idx;
  const iv = hv.idx;

  // map volunteer phone/group by id
  const phoneById = {};
  const groupById = {};
  hv.values.slice(1).forEach(r=>{
    const id = String(r[iv.id]||"");
    phoneById[id] = String(r[iv.phone]||"").trim();
    groupById[id] = pickGroup(iv, r);
  });

  const out = [];
  hp.values.slice(1).forEach(r=>{
    const d = toYMD(r[ip.punch_date]);
    if(d >= from && d <= to){
      const vid = String(r[ip.volunteer_id]||"");
      const punchGroup = pickGroup(ip, r) || (groupById[vid] || "");
      if(group && norm(group) !== "all" && norm(punchGroup) !== norm(group)) return;

      out.push({
        punch_date: d,
        volunteer_id: vid,
        punched_at: toISO(r[ip.punched_at]),
        badge_code: r[ip.badge_code] || "",
        full_name: r[ip.full_name] || "",
        phone: phoneById[vid] || "",
        group: punchGroup
      });
    }
  });

  // sort by date then time
  out.sort((a,b)=>{
    if(a.punch_date !== b.punch_date) return a.punch_date.localeCompare(b.punch_date);
    return String(a.punched_at||"").localeCompare(String(b.punched_at||""));
  });

  return { ok:true, rows: out };
}


function listLogs(p){
  const limit = Math.min(2000, Math.max(1, parseInt(p.limit || "500", 10)));
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LOGS);
  if(!sh) return { ok:true, logs: [] };

  const h = headerIndex(sh);
  if(!h.ok) return h;
  const idx = h.idx;
  const rows = h.values.slice(1);

  const out = [];
  for(let i=rows.length-1; i>=0 && out.length < limit; i--){
    const r = rows[i];
    const act0 = String((idx.action!==undefined)?(r[idx.action]||""):"").trim();
    const ts0 = (idx.ts!==undefined)?(r[idx.ts]||""):"";
    if(!act0 && !ts0) continue;
    const tsRaw = (idx.ts !== undefined) ? r[idx.ts] : "";
    const tsMs = (tsRaw instanceof Date) ? tsRaw.getTime() : (function(){
      const s = String(tsRaw||"").trim();
      if(!s) return 0;
      const iso = s.includes("T") ? s : s.replace(" ","T") + ":00";
      const d = new Date(iso);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    })();
    out.push({
      ts: formatTsDisplay_(tsRaw),
      tsMs: tsMs,
      tz: tzLabel_(),
      actorUsername: String(r[idx.actor_username] || "").trim(),
      actorRole: String(r[idx.actor_role] || "").trim(),
      action: String(r[idx.action] || "").trim(),
      volunteerId: String(r[idx.volunteer_id] || "").trim(),
      volunteerName: String(r[idx.volunteer_name] || "").trim(),
      badgeCode: String(r[idx.badge_code] || "").trim(),
      group: (idx.group !== undefined) ? String(r[idx.group] || "").trim() : ((idx.groupe !== undefined) ? String(r[idx.groupe] || "").trim() : ""),
      result: String(r[idx.result] || "").trim(),
      details: String(r[idx.details] || "").trim()
    });
  }
  return { ok:true, logs: out };
}


function dashboardStats(p){
  const from = String(p.from || "").trim();
  const to = String(p.to || "").trim();
  const group = String(p.group || "").trim();
  if(!from || !to) return { ok:false, error:"MISSING_PARAMS" };

  const shP = SpreadsheetApp.getActive().getSheetByName(SHEET_PUNCH);
  const shV = SpreadsheetApp.getActive().getSheetByName(SHEET_VOL);
  if(!shP) return { ok:false, error:"PUNCH_SHEET_NOT_FOUND" };
  if(!shV) return { ok:false, error:"VOL_SHEET_NOT_FOUND" };

  ensureHeader(shP, "group");
  ensureHeader(shV, "group");
  const hp = headerIndex(shP);
  const hv = headerIndex(shV);
  if(!hp.ok) return hp;
  if(!hv.ok) return hv;
  const ip = hp.idx;
  const iv = hv.idx;
  const groupById = {};
  const totalByGroup = { all: 0 };
  hv.values.slice(1).forEach(r=>{
    const id = String(r[iv.id]||"");
    const g = pickGroup(iv, r);
    groupById[id] = g;
    totalByGroup.all++;
    const key = norm(g) || "(sans)";
    totalByGroup[key] = (totalByGroup[key]||0)+1;
  });
  const totalVolunteers = (group && norm(group)!=="all") ? (totalByGroup[norm(group)]||0) : (totalByGroup.all||0);

  const unique = {};
  const byHour = {};
  const byDay = {};
  let last = null; // {time, full_name}

  hp.values.slice(1).forEach(r=>{
    const d = toYMD(r[ip.punch_date]);
    if(d < from || d > to) return;

    const punchGroup = pickGroup(ip, r) || (groupById[vid] || "");
    if(group && norm(group) !== "all" && norm(punchGroup) !== norm(group)) return;

    const vid = String(r[ip.volunteer_id]||"");
    unique[vid] = true;

    byDay[d] = (byDay[d] || 0) + 1;

    // hour
    let ts = null;
    const rawTs = r[ip.punched_at];
    if(rawTs instanceof Date){
      ts = rawTs;
    }else if(rawTs){
      const d2 = new Date(rawTs);
      if(!isNaN(d2.getTime())) ts = d2;
    }
    if(ts){
      const hour = Utilities.formatDate(ts, sheetTZ(), "HH");
      byHour[hour] = (byHour[hour] || 0) + 1;

      if(!last || ts.getTime() > last.ts){
        last = { ts: ts.getTime(), time: Utilities.formatDate(ts, sheetTZ(), "HH:mm"), full_name: String(r[ip.full_name]||"") };
      }
    }
  });

  const uniqueVolunteers = Object.keys(unique).length;
  const absents = Math.max(0, totalVolunteers - uniqueVolunteers);
  const ratePct = totalVolunteers ? Math.round((uniqueVolunteers/totalVolunteers) * 100) : 0;

  return {
    ok:true,
    totalVolunteers,
    uniqueVolunteers,
    absents,
    ratePct,
    lastPunch: last ? { full_name:last.full_name, time:last.time } : null,
    byHour,
    byDay
  };
}

function volunteerHistory(p){
  const volunteerId = String(p.volunteerId || "").trim();
  const from = String(p.from || "").trim();
  const to = String(p.to || "").trim();
  if(!volunteerId || !from || !to) return { ok:false, error:"MISSING_PARAMS" };

  const shP = SpreadsheetApp.getActive().getSheetByName(SHEET_PUNCH);
  if(!shP) return { ok:false, error:"PUNCH_SHEET_NOT_FOUND" };

  const hp = headerIndex(shP);
  if(!hp.ok) return hp;
  const ip = hp.idx;

  const rows = [];
  hp.values.slice(1).forEach(r=>{
    const vid = String(r[ip.volunteer_id]||"");
    if(vid !== volunteerId) return;
    const d = toYMD(r[ip.punch_date]);
    if(d < from || d > to) return;
    rows.push({
      punch_date: d,
      punched_at: toISO(r[ip.punched_at]),
      full_name: r[ip.full_name] || "",
      badge_code: r[ip.badge_code] || ""
    });
  });

  rows.sort((a,b)=>{
    if(a.punch_date !== b.punch_date) return a.punch_date.localeCompare(b.punch_date);
    return String(a.punched_at||"").localeCompare(String(b.punched_at||""));
  });

  return { ok:true, rows };
}


/**
 * === AUTO POINTAGE DES RESPONSABLES / CHEFS (ROLE REMPLI) ===
 *
 * Objectif:
 * - Chaque jour à 10h, créer automatiquement un pointage pour tous les bénévoles
 *   dont le champ "role" est renseigné.
 * - Le pointage créé est daté du jour (punch_date) et avec une heure fixe 15:00.
 *
 * IMPORTANT:
 * - Le trigger utilise le fuseau horaire du projet Apps Script (à vérifier).
 *   Recommandé: Africa/Casablanca.
 */

// Helper: parse yyyy-MM-dd -> Date (local TZ)
function parseYMD_(ymd){
  const m = String(ymd||"").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  return { y, mo, d };
}

function autoPunchRoles_(dateYmd, hour, minute, opts){
  opts = opts || {};
  const dryRun = (opts.dryRun === true || String(opts.dryRun||"") === "1");
  const sess = opts.session || null;

  const shP = SpreadsheetApp.getActive().getSheetByName(SHEET_PUNCH);
  const shV = SpreadsheetApp.getActive().getSheetByName(SHEET_VOL);
  if(!shP) return { ok:false, error:"PUNCH_SHEET_NOT_FOUND" };
  if(!shV) return { ok:false, error:"VOL_SHEET_NOT_FOUND" };

  ensureHeader(shP, "group");
  ensureHeader(shV, "group");
  ensureHeader(shV, "qr_code");
  ensureHeader(shV, "role");

  const hp = headerIndex(shP);
  const hv = headerIndex(shV);
  if(!hp.ok) return hp;
  if(!hv.ok) return hv;

  const ip = hp.idx;
  const iv = hv.idx;

  // Role volunteers
  const vrows = hv.values.slice(1);
  const roleVols = [];
  vrows.forEach(r => {
    const role = (iv["role"] !== undefined) ? String(r[iv["role"]]||"").trim() : "";
    if(!role) return;
    const id = String(r[iv.id]||"").trim();
    if(!id) return;
    roleVols.push({
      id,
      fullName: String(r[iv["full_name"]]||"").trim(),
      badgeCode: String(r[iv["badge_code"]]||"").trim(),
      group: pickGroup(iv, r),
      role
    });
  });

  // Already punched set for the date
  const existing = new Set();
  const prows = hp.values.slice(1);
  prows.forEach(r => {
    const d = toYMD(r[ip.punch_date]);
    if(d !== dateYmd) return;
    const vid = String(r[ip.volunteer_id]||"").trim();
    if(vid) existing.add(vid);
  });

  const parsed = parseYMD_(dateYmd);
  if(!parsed) return { ok:false, error:"INVALID_DATE", date: dateYmd };

  const punchedAt = new Date(parsed.y, parsed.mo-1, parsed.d, Number(hour||15), Number(minute||0), 0);

  let punchedNew = 0;
  let already = 0;
  const willPunch = [];

  roleVols.forEach(v => {
    if(existing.has(v.id)){
      already++;
      return;
    }
    willPunch.push(v);
    if(dryRun) return;

    const outRow = [];
    hp.header.forEach(hname => {
      if(hname === "punch_date") outRow.push(dateYmd);
      else if(hname === "volunteer_id") outRow.push(v.id);
      else if(hname === "punched_at") outRow.push(punchedAt);
      else if(hname === "badge_code") outRow.push(v.badgeCode);
      else if(hname === "full_name") outRow.push(v.fullName);
      else if(hname === "group" || hname === "groupe") outRow.push(v.group);
      else outRow.push("");
    });
    shP.appendRow(outRow);
    punchedNew++;
  });

  appendLog_(sess, "AUTO_PUNCH_ROLE", {
    date: dateYmd,
    hour: String(hour||15).padStart(2,"0") + ":" + String(minute||0).padStart(2,"0"),
    totalRoleVolunteers: roleVols.length,
    punchedNew,
    alreadyPunched: already,
    dryRun
  });

  return {
    ok:true,
    date: dateYmd,
    punchTime: String(hour||15).padStart(2,"0") + ":" + String(minute||0).padStart(2,"0"),
    totalRoleVolunteers: roleVols.length,
    punchedNew,
    alreadyPunched: already,
    dryRun: false,
    sample: willPunch.slice(0, 10).map(v => ({ id:v.id, badgeCode:v.badgeCode, fullName:v.fullName, role:v.role, group:v.group }))
  };
}

/**
 * Trigger quotidien (10h): crée les pointages à 15h pour les bénévoles ayant un role.
 * (Fonction à utiliser dans un déclencheur time-based)
 */

/** Installer le déclencheur quotidien à 10h (heure du projet Apps Script). */

/** Tester sans attendre 10h: DRY-RUN (n'écrit rien). */

/** Tester maintenant en écrivant (à utiliser avec prudence: évite les doublons). */
function runAutoPunchRolesNow(p){
  const sess = p && p.__session ? p.__session : null;
  const date = (p && p.date) ? String(p.date).trim() : toYMD(new Date());

  // IMPORTANT: Always write (no dry-run) for this action.
  return autoPunchRoles_(date, 15, 0, { dryRun:false, session: sess });
}
