/**
 * Google Apps Script (Web App) for Pointage (JSONP compatible)
 * Sheets required:
 *  - Volunteers: id | full_name | badge_code | phone
 *  - Punches: punch_date | volunteer_id | punched_at | badge_code | full_name
 */
const TOKEN = "abcd-12456-olm-caf";
const SHEET_VOL = "Volunteers";
const SHEET_PUNCH = "Punches";

function sheetTZ(){
  try { return SpreadsheetApp.getActive().getSpreadsheetTimeZone(); }
  catch(e){ return Session.getScriptTimeZone(); }
}

function toYMD(v){
  if (v instanceof Date) return Utilities.formatDate(v, sheetTZ(), "yyyy-MM-dd");
  return String(v || "").trim();
}

function toISO(v){
  if (v instanceof Date) return v.toISOString();
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
  return { ok:true, idx, values };
}

function mustHave(idx, cols){
  const missing = cols.filter(c => idx[c] === undefined);
  return missing.length ? missing : null;
}

function doGet(e) {
  const p = e.parameter || {};
  const callback = p.callback || "cb";
  const action = p.action;

  if (p.token !== TOKEN) return jsonp({ ok:false, error:"UNAUTHORIZED" }, callback);

  try {
    if (action === "listVolunteers") return jsonp(listVolunteers(p.search || ""), callback);
    if (action === "punch") return jsonp(punch(p), callback);
    if (action === "deletePunch") return jsonp(deletePunch(p), callback);
    if (action === "addVolunteer") return jsonp(addVolunteer(p), callback);
    if (action === "reportSummary") return jsonp(reportSummary(p.from, p.to), callback);
    if (action === "reportPunches") return jsonp(reportPunches(p.from, p.to), callback);

    return jsonp({ ok:false, error:"UNKNOWN_ACTION" }, callback);
  } catch (err) {
    return jsonp({ ok:false, error:"SERVER_ERROR", detail:String(err) }, callback);
  }
}

function listVolunteers(search) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_VOL);
  const h = headerIndex(sh);
  if(!h.ok) return h;

  const idx = h.idx;
  const missing = mustHave(idx, ["id","full_name","badge_code","phone"]);
  if(missing) return { ok:false, error:"SCHEMA_INVALID_VOLUNTEERS", missing };

  const s = norm(search);
  const rows = h.values.slice(1)
    .map(r => ({
      id: r[idx.id],
      fullName: r[idx.full_name],
      badgeCode: r[idx.badge_code] || "",
      phone: r[idx.phone] || ""
    }))
    .filter(v => !s || norm(v.fullName).includes(s) || norm(v.badgeCode).includes(s));

  return { ok:true, volunteers: rows };
}

function punch(p) {
  const volunteerId = String(p.volunteerId || "").trim();
  const date = String(p.date || "").trim(); // YYYY-MM-DD
  if (!volunteerId || !date) return { ok:false, error:"MISSING_FIELDS" };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // يمنع دوبل فـ نفس الوقت

  try{
    const ss = SpreadsheetApp.getActive();

    // Volunteers
    const shV = ss.getSheetByName(SHEET_VOL);
    const hv = headerIndex(shV);
    if(!hv.ok) return hv;

    const iv = hv.idx;
    const missV = mustHave(iv, ["id","full_name","badge_code","phone"]);
    if(missV) return { ok:false, error:"SCHEMA_INVALID_VOLUNTEERS", missing: missV };

    const vRow = hv.values.slice(1).find(r => String(r[iv.id]) === volunteerId);
    if (!vRow) return { ok:false, error:"VOLUNTEER_NOT_FOUND" };

    // Punches
    const shP = ss.getSheetByName(SHEET_PUNCH);
    const hp = headerIndex(shP);
    if(!hp.ok) return hp;

    const ip = hp.idx;
    const missP = mustHave(ip, ["punch_date","volunteer_id","punched_at"]);
    if(missP) return { ok:false, error:"SCHEMA_INVALID_PUNCHES", missing: missP };
    const rows = hp.values.slice(1);
    
    // تحقق: واش ديجا كاين
    const already = rows.some(r =>
      String(r[ip.volunteer_id]) === volunteerId &&
      toYMD(r[ip.punch_date]) === date
    );

    if (already) return { ok:false, error:"ALREADY_PUNCHED_TODAY", date };

    const nowIso = new Date().toISOString();

    // نكتب الأعمدة كاملة بالترتيب الموجود فـ Sheet
    // إذا كانت أعمدة اختيارية ماشي موجودة، كنضيفها فآخر السطر
    const out = [];
    const header = hp.values[0].map(h => norm(h));
    header.forEach(hname => {
      if (hname === "punch_date") out.push(date);
      else if (hname === "volunteer_id") out.push(volunteerId);
      else if (hname === "punched_at") out.push(nowIso);
      else if (hname === "badge_code") out.push(vRow[iv.badge_code] || "");
      else if (hname === "full_name") out.push(vRow[iv.full_name] || "");
      else out.push(""); // أي عمود زائد
    });

    shP.appendRow(out);
    return { ok:true, punchedAt: nowIso };
  } finally {
    lock.releaseLock();
  }
}

function deletePunch(p){
  const volunteerId = String(p.volunteerId || "").trim();
  const date = String(p.date || "").trim();
  if (!volunteerId || !date) return { ok:false, error:"MISSING_FIELDS" };

  const shP = SpreadsheetApp.getActive().getSheetByName(SHEET_PUNCH);
  const hp = headerIndex(shP);
  if(!hp.ok) return hp;

  const ip = hp.idx;
  const missP = mustHave(ip, ["punch_date","volunteer_id"]);
  if(missP) return { ok:false, error:"SCHEMA_INVALID_PUNCHES", missing: missP };

  const values = hp.values.slice(1);
  let deleted = 0;

  for (let i = values.length - 1; i >= 0; i--){
    const r = values[i];
    if (String(r[ip.volunteer_id]) === volunteerId && toYMD(r[ip.punch_date]) === date){
      shP.deleteRow(i + 2);
      deleted++;
    }
  }
  return { ok:true, deleted };
}

function reportSummary(from, to) {
  if (!from || !to) return { ok:false, error:"MISSING_RANGE" };

  const shP = SpreadsheetApp.getActive().getSheetByName(SHEET_PUNCH);
  const hp = headerIndex(shP);
  if(!hp.ok) return hp;

  const ip = hp.idx;
  const missP = mustHave(ip, ["punch_date","volunteer_id"]);
  if(missP) return { ok:false, error:"SCHEMA_INVALID_PUNCHES", missing: missP };

  const map = new Map();
  const uniq = new Set();
  let total = 0;

  hp.values.slice(1).forEach(r => {
    const d = toYMD(r[ip.punch_date]);
    if (d < from || d > to) return;
    total++;
    uniq.add(String(r[ip.volunteer_id]));
    map.set(d, (map.get(d) || 0) + 1);
  });

  const days = Array.from(map.entries())
    .sort((a,b)=> b[0].localeCompare(a[0]))
    .map(([date,count])=>({date,count}));

  return { ok:true, from, to, totalPunches: total, uniqueVolunteers: uniq.size, days };
}

function reportPunches(from, to) {
  if (!from || !to) return { ok:false, error:"MISSING_RANGE" };

  const shP = SpreadsheetApp.getActive().getSheetByName(SHEET_PUNCH);
  const hp = headerIndex(shP);
  if(!hp.ok) return hp;

  const ip = hp.idx;
  const missP = mustHave(ip, ["punch_date","volunteer_id","punched_at"]);
  if(missP) return { ok:false, error:"SCHEMA_INVALID_PUNCHES", missing: missP };

  const punches = hp.values.slice(1)
    .filter(r => {
      const d = toYMD(r[ip.punch_date]);
      return d >= from && d <= to;
    })
    .map(r => ({
      punch_date: toYMD(r[ip.punch_date]),
      punched_at: toISO(r[ip.punched_at]),
      volunteer_id: r[ip.volunteer_id],
      badge_code: ip["badge_code"] !== undefined ? r[ip["badge_code"]] : "",
      full_name: ip["full_name"] !== undefined ? r[ip["full_name"]] : ""
    }));


  return { ok:true, from, to, punches };
}

function addVolunteer(p){
  const fullName = String(p.fullName || "").trim();
  const badgeCodeRaw = String(p.badgeCode || "").trim();
  const phone = String(p.phone || "").trim();
  if (!fullName) return { ok:false, error:"MISSING_FULL_NAME" };

  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_VOL);
  const hv = headerIndex(sh);
  if(!hv.ok) return hv;

  const idx = hv.idx;
  const missV = mustHave(idx, ["id","full_name","badge_code","phone"]);
  if(missV) return { ok:false, error:"SCHEMA_INVALID_VOLUNTEERS", missing: missV };

  const badgeCode = badgeCodeRaw ? badgeCodeRaw.replace(/\s+/g, "") : "";
  if (badgeCode){
    const exists = hv.values.slice(1).some(r => String(r[idx.badge_code] || "").replace(/\s+/g,"") === badgeCode);
    if (exists) return { ok:false, error:"BADGE_ALREADY_EXISTS" };
  }

  // new id
  let newId = "";
  const ids = hv.values.slice(1).map(r => Number(r[idx.id])).filter(n => !isNaN(n));
  newId = ids.length ? String(Math.max.apply(null, ids) + 1) : Utilities.getUuid();

  sh.appendRow([ newId, fullName, badgeCode || "", phone || "" ]);
  return { ok:true, id: newId };
}