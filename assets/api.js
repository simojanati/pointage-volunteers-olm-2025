function jsonpRequest(params) {
  const { API_URL, TOKEN } = window.POINTAGE_CONFIG || {};
  if (!API_URL || API_URL.includes("PASTE_")) throw new Error("API_URL not configured");
  if (!TOKEN || TOKEN.includes("PASTE_")) throw new Error("TOKEN not configured");

  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).slice(2);
    window[cb] = (data) => {
      try { delete window[cb]; } catch(e) {}
      script.remove();
      resolve(data);
    };

    const q = new URLSearchParams({ token: TOKEN, callback: cb, ...params });
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

async function apiReportSummary(fromISO, toISO) {
  return jsonpRequest({ action:"reportSummary", from: fromISO, to: toISO });
}

async function apiReportPunches(fromISO, toISO) {
  return jsonpRequest({ action:"reportPunches", from: fromISO, to: toISO });
}

function isoDate(d){ return d.toISOString().slice(0,10); }

async function apiAddVolunteer(fullName, badgeCode="", phone="") {
  return jsonpRequest({ action:"addVolunteer", fullName, badgeCode, phone });
}

async function apiDeletePunch(volunteerId, dateISO) {
  return jsonpRequest({ action:"deletePunch", volunteerId: String(volunteerId), date: dateISO });
}
