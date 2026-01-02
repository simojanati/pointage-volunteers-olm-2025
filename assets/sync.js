// Auto-sync prompt (when back online) + reusable sync function
// Safe: does not change existing flows. If a page already has its own sync button/logic,
// we reuse it when possible.
(function(){
  const DISMISS_KEY = "pointage_sync_prompt_dismissed_at";
  const DISMISS_MS = 10 * 60 * 1000; // 10 minutes
  let __promptEl = null;
  let __busy = false;

  function qs(id){ return document.getElementById(id); }

  function ensurePromptEl(){
    if(__promptEl) return __promptEl;
    const el = document.createElement('div');
    el.id = 'syncPrompt';
    el.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:16px',
      'transform:translateX(-50%)',
      'z-index:9999',
      'max-width:720px',
      'width:calc(100% - 24px)',
      'background:rgba(10,15,27,0.95)',
      'border:1px solid rgba(255,255,255,0.18)',
      'border-radius:999px',
      'padding:10px 12px',
      'display:none',
      'align-items:center',
      'gap:10px',
      'box-shadow:0 10px 30px rgba(0,0,0,0.35)',
      'color:#fff',
      'backdrop-filter: blur(8px)'
    ].join(';');

    el.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; flex: 1; min-width: 0;">
        <span style="font-size:16px;">🔄</span>
        <div style="min-width:0;">
          <div id="syncPromptText" style="font-size:13px; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            Connexion détectée. Des pointages sont en attente.
          </div>
          <div id="syncPromptSub" style="font-size:12px; opacity:.8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            Synchroniser maintenant ?
          </div>
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button id="syncPromptLater" type="button" style="border:1px solid rgba(255,255,255,0.22); background:transparent; color:#fff; border-radius:999px; padding:6px 10px; font-size:12px;">Plus tard</button>
        <button id="syncPromptNow" type="button" style="border:1px solid rgba(255,255,255,0.0); background:#f59e0b; color:#111827; border-radius:999px; padding:6px 10px; font-size:12px; font-weight:700;">Synchroniser</button>
      </div>
    `;

    document.body.appendChild(el);
    __promptEl = el;

    qs('syncPromptLater')?.addEventListener('click', ()=>{
      try{ localStorage.setItem(DISMISS_KEY, String(Date.now())); }catch(e){}
      hidePrompt();
    });
    qs('syncPromptNow')?.addEventListener('click', async ()=>{
      await syncNow();
    });

    return el;
  }

  function showPrompt(count){
    const el = ensurePromptEl();
    const t = qs('syncPromptText');
    if(t) t.textContent = `Connexion détectée — ${count} pointage${count>1?'s':''} en attente.`;
    el.style.display = 'flex';
  }

  function hidePrompt(){
    if(__promptEl) __promptEl.style.display = 'none';
  }

  function dismissedRecently(){
    try{
      const v = Number(localStorage.getItem(DISMISS_KEY) || 0);
      return v && (Date.now() - v) < DISMISS_MS;
    }catch(e){
      return false;
    }
  }

  async function getQueueCount(){
    if(!window.OfflineStore || !OfflineStore.queueCount) return 0;
    try{ return await OfflineStore.queueCount(); }catch(e){ return 0; }
  }

  async function syncNow(){
    if(__busy) return;
    __busy = true;
    try{
      // Prefer page-native sync if available (admin/app.js)
      if(typeof window.__syncOfflineQueue === 'function'){
        hidePrompt();
        await window.__syncOfflineQueue();
        return;
      }

      if(!window.OfflineStore || !window.apiPunch){
        hidePrompt();
        return;
      }

      const btn = qs('syncPromptNow');
      if(btn){ btn.disabled = true; btn.textContent = 'Sync...'; }

      const ops = await OfflineStore.queueList();
      if(!ops || !ops.length){
        hidePrompt();
        return;
      }

      const successIds = [];
      for(const op of ops){
        if(op && op.type === 'PUNCH'){
          try{
            const resp = await apiPunch(op.volunteerId, op.dateISO);
            if(resp && resp.ok){
              successIds.push(op.id);
            }else{
              // Stop on first server error (avoid partial confusion)
              break;
            }
          }catch(e){
            break;
          }
        }
      }

      if(successIds.length){
        await OfflineStore.queueDeleteByIds(successIds);
      }

      // refresh any UI counters if present
      if(typeof window.__refreshSyncUi === 'function'){
        try{ await window.__refreshSyncUi(); }catch(e){}
      }

      const remaining = await getQueueCount();
      if(remaining > 0){
        // keep prompt visible with updated count
        showPrompt(remaining);
      }else{
        hidePrompt();
      }

    }finally{
      const btn = qs('syncPromptNow');
      if(btn){ btn.disabled = false; btn.textContent = 'Synchroniser'; }
      __busy = false;
    }
  }

  async function onBackOnline(){
    if(dismissedRecently()) return;
    if(!navigator.onLine) return;
    const n = await getQueueCount();
    if(n > 0) showPrompt(n);
  }

  // Expose small API
  window.PointageSync = {
    getQueueCount,
    syncNow,
    check: onBackOnline
  };

  // Attach listeners
  window.addEventListener('online', ()=>{ onBackOnline(); });

  // Also check on load (if already online)
  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(()=>{ onBackOnline(); }, 400);
  });
})();
