

// === Scan success feedback (sound + overlay) ===
let __scanAudioCtx = null;
function __ensureScanAudioCtx_(){
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return null;
  if(!__scanAudioCtx) __scanAudioCtx = new AC();
  try{ if(__scanAudioCtx.state === "suspended") __scanAudioCtx.resume().catch(()=>{}); }catch(e){}
  return __scanAudioCtx;
}
// prime silently on first user interaction (no UI)
document.addEventListener("pointerdown", ()=>{ __ensureScanAudioCtx_(); }, { once:true });

function __beepScanOk_(){
  try{
    const ctx = __ensureScanAudioCtx_();
    if(!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.18;
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime;
    o.start(t);
    try{
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    }catch(e){}
    o.stop(t + 0.12);

    setTimeout(()=>{
      try{
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type="sine";
        o2.frequency.value=1175;
        g2.gain.value=0.14;
        o2.connect(g2); g2.connect(ctx.destination);
        const t2 = ctx.currentTime;
        o2.start(t2);
        try{
          g2.gain.setValueAtTime(0.14, t2);
          g2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.10);
        }catch(e){}
        o2.stop(t2 + 0.10);
      }catch(e){}
    }, 140);
  }catch(e){}
  try{ navigator.vibrate && navigator.vibrate(70); }catch(e){}
}

let __scanOverlayEl = null;
let __scanOverlayTimer = null;

function __showScanSuccessOverlay_(){
  try{
    if(!__scanOverlayEl){
      const wrap = document.createElement("div");
      wrap.id = "scanSuccessOverlay";
      wrap.style.cssText =
        "position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;" +
        "background:rgba(0,0,0,.18);";
      const img = document.createElement("img");
      img.src = "assets/qr-code-succes.png";
      img.alt = "Succès";
      img.style.cssText = "width:min(240px,72vw);height:auto;filter:drop-shadow(0 10px 24px rgba(0,0,0,.35));";
      wrap.appendChild(img);
      __scanOverlayEl = wrap;
      document.body.appendChild(__scanOverlayEl);
    }
    __scanOverlayEl.style.display = "flex";
    if(__scanOverlayTimer) clearTimeout(__scanOverlayTimer);
    __scanOverlayTimer = setTimeout(()=>{ try{ __scanOverlayEl.style.display='none'; }catch(e){} }, 2000);
  }catch(e){}
}

// Scan QR page (Admin & Super Admin)
requireAdmin();

const toastEl = document.getElementById('toast');
const logoutBtn = document.getElementById('logoutBtn');
const scanStatusEl = document.getElementById('scanStatus');
const lastScanEl = document.getElementById('lastScan');
const toggleScanBtn = document.getElementById('toggleScanBtn');
const switchCamBtn = document.getElementById('switchCamBtn');
const manualCodeEl = document.getElementById('manualCode');
const manualSubmitBtn = document.getElementById('manualSubmit');

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
  el.innerHTML = `<span class="me-2">${escapeHtml(u)}</span><span class="badge ${roleClass}">${escapeHtml(r)}</span>`;
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
    setStatus(`❌ Le code <code>${escapeHtml(rawCode)}</code> n'existe pas dans la liste des bénévoles.`, 'danger');
    toast('Code introuvable');
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
      
      __beepScanOk_();
      __showScanSuccessOverlay_();
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
        try{ html5QrCode?.resume(); }catch(e){}
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
