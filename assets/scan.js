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
  if(kind === 'warn') kind = 'warning';
  const cls = kind === 'success'
    ? 'text-success'
    : (kind === 'warning'
        ? 'text-warning'
        : (kind === 'danger' ? 'text-danger' : 'text-muted2'));
  scanStatusEl.className = `mt-3 small ${cls}`;
  scanStatusEl.innerHTML = html;
}

function setLast(text){
  if(lastScanEl) lastScanEl.textContent = text || '—';
}

let html5QrCode = null;
let cameras = [];
let camIndex = 0;
let scanning = false;
let processing = false;
let lastCode = '';
let lastAt = 0;

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


function pickCameraId(){
  if(cameras?.length){
    return cameras[camIndex % cameras.length].id;
  }
  return { facingMode: 'environment' };
}

async function startScan(){
  if(scanning) return;
  await loadVolunteers();

  const cams = await ensureCameras();
  if(!cams.length && location.protocol !== 'https:' && location.hostname !== 'localhost'){
    setStatus('La caméra nécessite HTTPS (ou localhost) et une autorisation.', 'warning');
  }

  if(!html5QrCode){
    html5QrCode = new Html5Qrcode('qrReader');
  }

  const camera = pickCameraId();
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
    setStatus('✅ Scanner prêt… présentez le QR devant la caméra.', 'success');
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
  await ensureCameras();
  if(!cameras.length){
    toast('Aucune caméra détectée.');
    return;
  }
  camIndex = (camIndex + 1) % cameras.length;
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
  setLast(`${rawCode}`);

  if(!v){
    setStatus(`❌ Le code <code>${escapeHtml(rawCode)}</code> n'existe pas dans la liste des bénévoles.`, 'danger');
    toast('Code introuvable');
    return;
  }

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
      setStatus(`⚠️ <b>${escapeHtml(v.fullName||'')}</b> est déjà pointé aujourd’hui (${escapeHtml(today)}).`, 'warning');
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
  setStatus('Cliquez sur “Démarrer”. (Astuce : HTTPS permet l’accès à la caméra)', 'warning');
}
