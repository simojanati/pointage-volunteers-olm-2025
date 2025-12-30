

// === Sound helpers (WebAudio) ===
let __audioCtx = null;
function ensureAudioCtx_(){
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return null;
  if(!__audioCtx) __audioCtx = new AC();
  try{
    if(__audioCtx.state === "suspended") __audioCtx.resume().catch(()=>{});
  }catch(e){}
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
  o.connect(g);
  g.connect(ctx.destination);
  const t = ctx.currentTime;
  o.start(t);
  try{
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durSec);
  }catch(e){}
  o.stop(t + durSec);
}
function soundOk_(){
  beep_(880, 0.10, 0.22, "sine");
  setTimeout(()=>beep_(1175, 0.08, 0.18, "sine"), 120);
  try{ navigator.vibrate && navigator.vibrate(40); }catch(e){}
}
function soundErr_(){
  beep_(220, 0.14, 0.20, "square");
  try{ navigator.vibrate && navigator.vibrate([30,30,30]); }catch(e){}
}
// Prime audio context on first user interaction (important on mobile)
document.addEventListener("pointerdown", ()=>{ ensureAudioCtx_(); }, { once:true });

// Scan QR page (Admin & Super Admin)
requireAdmin();



// Son de confirmation (scan -> pointage OK)
function playSuccessBeep(){
  try{
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.08;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(()=>{ o.stop(); ctx.close(); }, 120);
  }catch(e){}
}

const toastEl = document.getElementById('toast');
const logoutBtn = document.getElementById('logoutBtn');
const scanStatusEl = document.getElementById('scanStatus');
const lastScanEl = document.getElementById('lastScan');
const toggleScanBtn = document.getElementById('toggleScanBtn');
const switchCamBtn = document.getElementById('switchCamBtn');
const manualCodeEl = document.getElementById('manualCode');
const manualSubmitBtn = document.getElementById('manualSubmit');


// Assign QR -> Volunteer modal
const assignModalEl = document.getElementById('assignQrModal');
const assignQrCodeEl = document.getElementById('assignQrCode');
const assignSearchEl = document.getElementById('assignSearch');
const assignListEl = document.getElementById('assignList');
const assignInfoEl = document.getElementById('assignInfo');
const copyQrBtn = document.getElementById('copyQrBtn');

let assignModal = null;
let pendingAssignCode = '';
let assignIndex = [];
let holdScan = false; // when modal is open, keep scanner paused

function normSearch(s){
  let x = String(s || '').toLowerCase().trim();
  try{ x = x.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }catch(e){}
  return x;
}

async function copyToClipboard(text){
  const t = String(text || '');
  if(!t) return false;
  try{
    await navigator.clipboard.writeText(t);
    return true;
  }catch(e){
    // fallback: hidden textarea
    try{
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }catch(e2){
      return false;
    }
  }
}

function ensureAssignModal(){
  if(!assignModalEl || !window.bootstrap) return null;
  if(!assignModal) assignModal = new bootstrap.Modal(assignModalEl, { backdrop: 'static' });
  return assignModal;
}

function buildAssignIndex(){
  assignIndex = (volunteers || []).map(v => {
    const key = normSearch(`${v.fullName || ''} ${v.badgeCode || ''}`);
    return { v, key };
  });
}

function renderAssignResults(query=''){
  if(!assignListEl) return;
  const q = normSearch(query);
  let items = assignIndex;
  if(q){
    items = assignIndex.filter(it => it.key.includes(q));
  }
  const total = items.length;
  items = items.slice(0, 80);

  if(assignInfoEl){
    assignInfoEl.className = 'small text-muted2';
    assignInfoEl.textContent = total ? `${Math.min(80,total)} résultat(s) affiché(s) sur ${total}.` : 'Aucun résultat.';
  }

  assignListEl.innerHTML = items.map(({v}) => {
    const name = escapeHtml(v.fullName || '—');
    const badge = escapeHtml(v.badgeCode || '');
    const id = escapeHtml(v.id || '');
    return `
      <div class="list-group-item bg-transparent text-white border border-light border-opacity-10 rounded-3 mb-2">
        <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
          <div>
            <div class="fw-semibold">${name}</div>
            <div class="small text-muted2">Badge: <code>${badge || '—'}</code></div>
          </div>
          <button class="btn btn-sm btn-primary" data-assign-id="${id}">Associer</button>
        </div>
      </div>`;
  }).join('');

  // bind events
  assignListEl.querySelectorAll('[data-assign-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-assign-id');
      if(!id) return;
      await assignQrToVolunteer(id);
    });
  });
}

async function punchVolunteerAfterAssign(v, rawCode){
  const today = isoDate(new Date());
  setLast(`<span class="fw-semibold">${escapeHtml(v.fullName||'')}</span> <span class="opacity-75">—</span> <code>${escapeHtml(rawCode)}</code>`);
  setStatus(`⏳ Pointage en cours : <b>${escapeHtml(v.fullName||'')}</b>…`, 'ok');

  try{
    const res = await apiPunch(v.id, today);
    if(res?.ok){
      setStatus(`✅ Pointage enregistré : <b>${escapeHtml(v.fullName||'')}</b>`, 'success');
      playSuccessBeep();
      toast('✅ Pointage enregistré');
    soundOk_();
    soundOk_();
      return;
    }
    if(res?.error === 'ALREADY_PUNCHED'){
      const t = res?.punchedAt ? formatTimeLocal(res.punchedAt) : '';
      const at = t ? ` à <b>${escapeHtml(t)}</b>` : '';
      setStatus(`❌ <b>${escapeHtml(v.fullName||'')}</b> est déjà pointé aujourd’hui${at}.`, 'danger');
      toast('Déjà pointé');
      return;
    }
    if(res?.error === 'NOT_AUTHENTICATED'){
      logout();
      return;
    }
    setStatus(`❌ Erreur: ${escapeHtml(res?.error || 'UNKNOWN')}`, 'danger');
    toast('Erreur');
  }catch(e){
    setStatus('❌ Erreur API (Apps Script).', 'danger');
    toast('Erreur API');
  }
}

async function assignQrToVolunteer(volunteerId){
  const code = String(pendingAssignCode || '').trim();
  if(!code){ toast('Code manquant'); return; }

  // find volunteer from current list
  const v = (volunteers || []).find(x => String(x.id) === String(volunteerId));
  if(!v){
    toast('Bénévole introuvable');
    return;
  }

  // disable buttons while updating
  assignListEl?.querySelectorAll('button').forEach(b => b.disabled = true);
  if(assignInfoEl){
    assignInfoEl.className = 'small';
    assignInfoEl.innerHTML = '⏳ Association en cours…';
  }

  try{
        const res = await apiAssignQrCode(v.id, code);
    if(res?.ok){
      // update local model + cache
      v.qrCode = code;
      writeLocal(volunteers);
      buildIndex();
      buildAssignIndex();

      if(assignInfoEl){
        assignInfoEl.className = 'small text-success';
        assignInfoEl.textContent = '✅ Code QR associé. Pointage en cours…';
      }

      // close modal then punch
      try{
        const m = ensureAssignModal();
        m?.hide();
      }catch(e){}

      holdScan = false;
      // allow scanning again
      try{ html5QrCode?.resume(); }catch(e){}

      // avoid anti-bounce blocking the same code
      lastCode = '';
      lastAt = 0;

      await punchVolunteerAfterAssign(v, code);
      return;
    }
    if(res?.error === 'QR_ALREADY_EXISTS'){
      if(assignInfoEl){
        assignInfoEl.className = 'small text-danger';
        assignInfoEl.textContent = '❌ Ce code QR est déjà utilisé par un autre bénévole.';
      }
      toast('Code QR déjà utilisé');
    soundErr_();
    }else if(res?.error === 'NOT_AUTHENTICATED'){
      logout();
      return;
    }else{
      if(assignInfoEl){
        assignInfoEl.className = 'small text-danger';
        assignInfoEl.textContent = `❌ Erreur: ${res?.error || 'UNKNOWN'}`;
      }
      toast('Erreur');
    }
  }catch(e){
    if(assignInfoEl){
      assignInfoEl.className = 'small text-danger';
      assignInfoEl.textContent = '❌ Erreur API (Apps Script).';
    }
    toast('Erreur API');
  } finally {
    // re-enable buttons
    assignListEl?.querySelectorAll('button').forEach(b => b.disabled = false);
  }
}

function openAssignModal(rawCode){
  pendingAssignCode = String(rawCode || '').trim();
  if(assignQrCodeEl) assignQrCodeEl.textContent = pendingAssignCode || '—';

  // copy automatically
  copyToClipboard(pendingAssignCode).then(ok => {
    if(ok) toast('Code copié');
  });

  buildAssignIndex();
  if(assignSearchEl) assignSearchEl.value = '';
  renderAssignResults('');

  holdScan = true;
  try{ html5QrCode?.pause(true); }catch(e){}

  const m = ensureAssignModal();
  m?.show();
  setTimeout(()=> assignSearchEl?.focus(), 150);
}

assignSearchEl?.addEventListener('input', (e)=>{
  renderAssignResults(e.target.value || '');
});

copyQrBtn?.addEventListener('click', async ()=>{
  const ok = await copyToClipboard(pendingAssignCode);
  toast(ok ? 'Copié' : 'Copie impossible');
});

assignModalEl?.addEventListener('hidden.bs.modal', ()=>{
  holdScan = false;
  // resume scan if running
  try{ html5QrCode?.resume(); }catch(e){}
});

function toast(msg){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.opacity = '1';
  setTimeout(()=> (toastEl.style.opacity = '0'), 2200);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[s]));
}

function renderUserPill(){
  const el = document.getElementById('userPill');
  if(!el) return;
  const u = localStorage.getItem('username') || '—';
  const r = (localStorage.getItem('role') || '—').toUpperCase();
  const roleClass = r === 'SUPER_ADMIN' ? 'badge-role-super' : (r === 'ADMIN' ? 'badge-role-admin' : 'badge-role-unknown');
  el.innerHTML = `<span class="me-2 user-name">${escapeHtml(u)}</span><span class="badge ${roleClass}">${escapeHtml(r)}</span>`;
}

renderUserPill();
logoutBtn?.addEventListener('click', logout);

// Volunteers cache (shared key with admin page)
const LS_KEY = 'pointage_volunteers_cache_v1';
const LS_TS_KEY = 'pointage_volunteers_cache_ts_v1';

let volunteers = [];
let byCode = new Map();

function normalizeCode(s){
  return String(s || '').trim().toLowerCase().replace(/\s+/g, '');
}


function formatTimeLocal(iso){
  if(!iso) return "";
  try{
    return new Date(iso).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
  }catch(e){
    return String(iso).slice(11,16);
  }
}


function buildIndex(){
  byCode = new Map();
  (volunteers || []).forEach(v => {
    const code = normalizeCode(v.qrCode || '');
    if(code) byCode.set(code, v);
  });
}

function readLocal(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return null;
    const data = JSON.parse(raw);
    if(!Array.isArray(data)) return null;
    return data;
  }catch(e){
    return null;
  }
}

function writeLocal(data){
  try{
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    localStorage.setItem(LS_TS_KEY, String(Date.now()));
  }catch(e){}
}

async function loadVolunteers(){
  // fast path: local cache
  const cached = readLocal();
  if(cached?.length){
    volunteers = cached;
    buildIndex();
  }

  // always refresh once in background to avoid stale list
  try{
    const res = await apiListVolunteers('');
    if(res?.ok){
      volunteers = res.volunteers || [];
      writeLocal(volunteers);
      buildIndex();
    }else if(res?.error === 'NOT_AUTHENTICATED'){
      logout();
    }
  }catch(e){
    // offline / error -> keep cached
  }
}

function setStatus(html, kind){
  if(!scanStatusEl) return;
  // Requested UX: only two colors (green/red)
  const cls = (kind === 'success' || kind === 'ok' || kind === 'info' || kind === '')
    ? 'text-success'
    : 'text-danger';
  scanStatusEl.className = `mt-3 small ${cls}`;
  scanStatusEl.innerHTML = html;
}

function setLast(html){
  if(!lastScanEl) return;
  lastScanEl.innerHTML = html || '—';
}

let html5QrCode = null;
let cameras = [];
let camIndex = 0;
let scanning = false;
let processing = false;
let lastCode = '';
let lastAt = 0;
let usingDeviceId = false;
let currentFacingMode = 'environment'; // fallback when camera list is not available (iOS/Safari)

function pickRearCameraIndex(list){
  if(!Array.isArray(list) || !list.length) return 0;
  // labels are available after permission is granted
  const labelRegex = /back|rear|environment|arrière|arri[èe]re/i;
  const idxByLabel = list.findIndex(c => labelRegex.test(c.label || ''));
  if(idxByLabel >= 0) return idxByLabel;
  // common: last camera is the rear one
  if(list.length >= 2) return list.length - 1;
  return 0;
}

async function ensureCameras(){
  if(!window.Html5Qrcode){
    setStatus('Bibliothèque QR non chargée. Vérifiez le <script> html5-qrcode.min.js.', 'danger');
    return [];
  }
  try{
    cameras = await Html5Qrcode.getCameras();
  }catch(e){
    cameras = [];
  }
  // Sur certains navigateurs, la liste des caméras est vide tant que la permission n'est pas accordée.
  if(!cameras.length && navigator.mediaDevices?.getUserMedia){
    try{
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      cameras = await Html5Qrcode.getCameras();
    }catch(e){
      // ignore
    }
  }
  return cameras;
}


function pickCameraRequest(){
  // Preferred: explicit deviceId (rear by default)
  if(cameras?.length){
    usingDeviceId = true;
    const cam = cameras[camIndex % cameras.length];
    return { deviceId: { exact: cam.id } };
  }
  // Fallback: facingMode (some browsers don't expose camera list)
  usingDeviceId = false;
  return { facingMode: currentFacingMode || 'environment' };
}

async function startScan(){
  if(scanning) return;
  await loadVolunteers();

  const cams = await ensureCameras();
  // Default to rear camera when a list is available
  if(cams?.length){
    camIndex = pickRearCameraIndex(cams);
  }
  if(!cams.length && location.protocol !== 'https:' && location.hostname !== 'localhost'){
    setStatus('La caméra nécessite HTTPS (ou localhost) et une autorisation.', 'danger');
  }

  if(!html5QrCode){
    html5QrCode = new Html5Qrcode('qrReader');
  }

  const camera = pickCameraRequest();
  setStatus('📷 Préparation de la caméra...', '');
  toggleScanBtn.textContent = '⏸️ Pause';

  try{
    await html5QrCode.start(
      camera,
      {
        fps: 10,
        qrbox: { width: 260, height: 260 },
        rememberLastUsedCamera: true,
        aspectRatio: 1.0
      },
      onScanSuccess,
      () => {}
    );
    scanning = true;
    setStatus('✅ Caméra arrière prête… présentez le code QR devant la caméra.', 'success');
  }catch(e){
    scanning = false;
    toggleScanBtn.textContent = '▶️ Démarrer';
    setStatus('Impossible de démarrer la caméra. Autorisez l’accès à la caméra, puis réessayez (ou utilisez le fallback manuel).', 'danger');
  }
}

async function stopScan(){
  if(!html5QrCode) return;
  try{
    if(scanning){
      await html5QrCode.stop();
    }
  }catch(e){}
  scanning = false;
  toggleScanBtn.textContent = '▶️ Démarrer';
  setStatus('⏸️ Pause.', '');
}

async function switchCamera(){
  const cams = await ensureCameras();

  // If the browser doesn't expose device list (common on iOS), toggle facingMode
  if(!cams.length){
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    toast(currentFacingMode === 'environment' ? 'Caméra arrière.' : 'Caméra frontale.');
    if(scanning){
      await stopScan();
      await startScan();
    }
    return;
  }

  if(cams.length === 1){
    toast('Une seule caméra détectée.');
    return;
  }

  camIndex = (camIndex + 1) % cams.length;
  toast('Caméra changée.');
  if(scanning){
    await stopScan();
    await startScan();
  }
}

async function processCode(rawCode, source='scan'){
  const code = normalizeCode(rawCode);
  if(!code) return;

  // small anti-bounce: same code within 1.2s
  const now = Date.now();
  if(code === lastCode && (now - lastAt) < 1200) return;
  lastCode = code;
  lastAt = now;

  await loadVolunteers();
  const v = byCode.get(code);

  if(!v){
    setLast(`<span class="fw-semibold">Code :</span> <code>${escapeHtml(rawCode)}</code>`);
    setStatus(`❌ Le code <code>${escapeHtml(rawCode)}</code> est introuvable. Vous pouvez l’associer à un bénévole.`, 'danger');
    toast('Code introuvable');
    openAssignModal(rawCode);
    return;
  }

  setLast(`<span class="fw-semibold">${escapeHtml(v.fullName||'')}</span> <span class="opacity-75">—</span> <code>${escapeHtml(rawCode)}</code>`);

  const today = isoDate(new Date());
  setStatus(`⏳ Pointage en cours : <b>${escapeHtml(v.fullName||'')}</b>…`, '');

  try{
    const res = await apiPunch(v.id, today);
    if(res?.ok){
      setStatus(`✅ Pointage enregistré : <b>${escapeHtml(v.fullName||'')}</b>`, 'success');
      toast('✅ Pointage enregistré');
      return;
    }
    if(res?.error === 'ALREADY_PUNCHED'){
      const t = res?.punchedAt ? formatTimeLocal(res.punchedAt) : '';
      const at = t ? ` à <b>${escapeHtml(t)}</b>` : '';
      setStatus(`❌ <b>${escapeHtml(v.fullName||'')}</b> est déjà pointé aujourd’hui${at}.`, 'danger');
      toast('Déjà pointé');
      return;
    }
    if(res?.error === 'NOT_AUTHENTICATED'){
      logout();
      return;
    }
    setStatus(`❌ Erreur: ${escapeHtml(res?.error || 'UNKNOWN')}`, 'danger');
    toast('Erreur');
  }catch(e){
    setStatus('❌ Erreur API (Apps Script).', 'danger');
    toast('Erreur API');
  }
}

function onScanSuccess(decodedText){
  if(processing) return;
  processing = true;

  // Pause to avoid multiple reads of the same QR while processing
  try{ html5QrCode?.pause(true); }catch(e){}

  processCode(decodedText, 'scan')
    .finally(()=>{
      setTimeout(()=>{
        processing = false;
        if(!holdScan){
          try{ html5QrCode?.resume(); }catch(e){}
        }
      }, 650);
    });
}

toggleScanBtn?.addEventListener('click', async ()=>{
  if(scanning) await stopScan();
  else await startScan();
});

switchCamBtn?.addEventListener('click', switchCamera);

manualSubmitBtn?.addEventListener('click', async ()=>{
  const code = (manualCodeEl.value || '').trim();
  if(!code){ toast('Veuillez saisir un code.'); return; }
  await processCode(code, 'manual');
  manualCodeEl.select();
});

manualCodeEl?.addEventListener('keydown', async (e)=>{
  if(e.key === 'Enter'){
    e.preventDefault();
    manualSubmitBtn?.click();
  }
});

// Auto start (nice UX) but keep safe: only if secure context
if(window.isSecureContext){
  // small delay so UI paints
  setTimeout(()=> startScan(), 200);
}else{
  setStatus('Cliquez sur “Démarrer”. (Astuce : HTTPS permet l’accès à la caméra)', 'ok');
}
