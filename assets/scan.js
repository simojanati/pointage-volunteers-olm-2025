

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
const __okAudio = new Audio("data:audio/wav;base64,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");
const __errAudio = new Audio("data:audio/wav;base64,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");

function soundOk_(){
  beep_(880, 0.10, 0.22, "sine");
  setTimeout(()=>beep_(1175, 0.08, 0.18, "sine"), 120);
  try{ navigator.vibrate && navigator.vibrate(40); }catch(e){}
  try{ __okAudio.currentTime = 0; __okAudio.play().catch(()=>{}); }catch(e){}
}

function soundErr_(){
  beep_(220, 0.14, 0.20, "square");
  try{ navigator.vibrate && navigator.vibrate([30,30,30]); }catch(e){}
  try{ __errAudio.currentTime = 0; __errAudio.play().catch(()=>{}); }catch(e){}
}

// Prime audio context on first user interaction (important on mobile)
document.addEventListener("pointerdown", ()=>{ ensureAudioCtx_(); }, { once:true });

// Sound hint (mobile browsers require a user gesture)
let __soundEnabled = false;
function markSoundEnabled_(){
  __soundEnabled = true;
  const el = document.getElementById("soundHint");
  if(el) el.remove();
}
document.addEventListener("pointerdown", ()=>{
  ensureAudioCtx_();
  markSoundEnabled_();
}, { once:true });
window.addEventListener("load", ()=>{
  if(!document.getElementById("soundHint")){
    const div = document.createElement("div");
    div.id = "soundHint";
    div.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:2000;background:rgba(0,0,0,.75);color:#fff;padding:10px 12px;border-radius:12px;font-size:13px;display:flex;gap:8px;align-items:center;justify-content:center;";
    div.innerHTML = "🔊 Touchez l’écran une fois pour activer le son.";
    document.body.appendChild(div);
    setTimeout(()=>{ const el=document.getElementById('soundHint'); if(el) el.style.opacity='0.9'; }, 50);
  }
});

// Scan QR page (Admin & Super Admin)
requireAdmin();



// Son de confirmation (scan -> pointage OK)
function playSuccessBeep(){ soundOk_(); }

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
    let res = null;
    try{
      res = await apiPunch(v.id, today);
    }catch(e){
      if(OfflineStore?.isLikelyOffline?.(e)){
        try{ await OfflineStore.enqueuePunch(v.id, today, 'scan'); }catch(_e){}
        setStatus(`✅ Enregistré hors-ligne : <b>${escapeHtml(v.fullName||'')}</b>`, 'success');
        playSuccessBeep();
        toast('✅ Enregistré hors-ligne');
        return;
      }
      throw e;
    }
    if(res?.ok){
      setStatus(`✅ Pointage enregistré : <b>${escapeHtml(v.fullName||'')}</b>`, 'success');
      playSuccessBeep();
      toast('✅ Pointage enregistré');
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
      try{ OfflineStore?.cacheVolunteersWrite?.(volunteers); }catch(e){}
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
      try{ OfflineStore?.cacheVolunteersWrite?.(volunteers); }catch(e){}
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
  ensureAudioCtx_(); soundOk_(); // test son au démarrage

  ensureAudioCtx_(); // prime audio for beep/vibration

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
  
  ensureAudioCtx_();
if(scanning) await stopScan();
  else await startScan();
});

ensureAudioCtx_();
switchCamBtn?.addEventListener('click', switchCamera);

manualSubmitBtn?.addEventListener('click', async ()=>{
  
  ensureAudioCtx_();
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

// Démarrage manuel (nécessaire pour activer le son / vibration sur mobile)
setStatus('Cliquez sur “Démarrer” pour lancer la caméra. (Astuce : HTTPS est requis)', 'ok');

// AUTO_START_SCAN: tentative de démarrage automatique (si le navigateur l'autorise)
try{
  setTimeout(()=>{
    try{
      if(!scanning){ startScan(); }
    }catch(e){}
  }, 350);
}catch(e){}
