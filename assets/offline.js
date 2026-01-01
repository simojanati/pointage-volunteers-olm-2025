// OfflineStore (IndexedDB): cache + queue (PUNCH uniquement)
(function(){
  const IDB_NAME = "pointage_volunteers_olm_2025";
  const IDB_VERSION = 1;
  let __idbPromise = null;

  function openIdb(){
    if(__idbPromise) return __idbPromise;
    __idbPromise = new Promise((resolve, reject)=>{
      try{
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = ()=>{
          const db = req.result;
          if(!db.objectStoreNames.contains("kv")){
            db.createObjectStore("kv", { keyPath:"key" });
          }
          if(!db.objectStoreNames.contains("queue")){
            const st = db.createObjectStore("queue", { keyPath:"id", autoIncrement:true });
            st.createIndex("dedupKey", "dedupKey", { unique:true });
            st.createIndex("createdAt", "createdAt", { unique:false });
          }
        };
        req.onsuccess = ()=> resolve(req.result);
        req.onerror = ()=> reject(req.error || new Error("IDB_OPEN_ERROR"));
      }catch(e){ reject(e); }
    });
    return __idbPromise;
  }

  async function idbSet(key, value){
    const db = await openIdb();
    return await new Promise((resolve, reject)=>{
      const tx = db.transaction(["kv"], "readwrite");
      const st = tx.objectStore("kv");
      const req = st.put({ key, value });
      req.onsuccess = ()=> resolve(true);
      req.onerror = ()=> reject(req.error || new Error("IDB_SET_ERROR"));
    });
  }

  async function idbGet(key){
    const db = await openIdb();
    return await new Promise((resolve, reject)=>{
      const tx = db.transaction(["kv"], "readonly");
      const st = tx.objectStore("kv");
      const req = st.get(key);
      req.onsuccess = ()=> resolve(req.result ? req.result.value : null);
      req.onerror = ()=> reject(req.error || new Error("IDB_GET_ERROR"));
    });
  }

  async function cacheVolunteersWrite(vols){
    try{ await idbSet("volunteers", { ts: Date.now(), data: vols }); }catch(e){}
  }
  async function cacheVolunteersRead(){
    try{ return await idbGet("volunteers"); }catch(e){ return null; }
  }

  async function cachePunchesWrite(dateISO, map){
    try{
      const arr = Array.from((map || new Map()).entries());
      await idbSet("punches:" + String(dateISO||""), { ts: Date.now(), data: arr });
    }catch(e){}
  }
  async function cachePunchesRead(dateISO){
    try{ return await idbGet("punches:" + String(dateISO||"")); }catch(e){ return null; }
  }

  async function queueAdd(op){
    const db = await openIdb();
    return await new Promise((resolve, reject)=>{
      const tx = db.transaction(["queue"], "readwrite");
      const st = tx.objectStore("queue");
      const req = st.add(op);
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error || new Error("IDB_ADD_ERROR"));
    });
  }

  async function queueCount(){
    const db = await openIdb();
    return await new Promise((resolve, reject)=>{
      const tx = db.transaction(["queue"], "readonly");
      const st = tx.objectStore("queue");
      const req = st.count();
      req.onsuccess = ()=> resolve(Number(req.result || 0));
      req.onerror = ()=> reject(req.error || new Error("IDB_COUNT_ERROR"));
    });
  }

  async function queueList(){
    const db = await openIdb();
    return await new Promise((resolve, reject)=>{
      const tx = db.transaction(["queue"], "readonly");
      const st = tx.objectStore("queue");
      const idx = st.index("createdAt");
      const req = idx.getAll();
      req.onsuccess = ()=> resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = ()=> reject(req.error || new Error("IDB_LIST_ERROR"));
    });
  }

  async function queueDeleteByIds(ids){
    const db = await openIdb();
    const arr = Array.isArray(ids) ? ids : [];
    if(arr.length === 0) return 0;
    return await new Promise((resolve, reject)=>{
      const tx = db.transaction(["queue"], "readwrite");
      const st = tx.objectStore("queue");
      arr.forEach(id=> st.delete(id));
      tx.oncomplete = ()=> resolve(arr.length);
      tx.onerror = ()=> reject(tx.error || new Error("IDB_DELETE_ERROR"));
    });
  }

  async function enqueuePunch(volunteerId, dateISO, source){
    const vid = String(volunteerId);
    const date = String(dateISO||"");
    const dedupKey = `PUNCH|${vid}|${date}`;
    const op = {
      type: "PUNCH",
      volunteerId: vid,
      dateISO: date,
      source: String(source||""),
      createdAt: Date.now(),
      dedupKey
    };
    try{ await queueAdd(op); }catch(e){ /* already queued */ }

    // optimistic cache update for deja-pointé
    try{
      const cached = await cachePunchesRead(date);
      let map = new Map();
      if(cached && Array.isArray(cached.data)){
        map = new Map(cached.data);
      }
      if(!map.get(vid)){
        map.set(vid, new Date().toISOString());
        await cachePunchesWrite(date, map);
      }
    }catch(e){}
  }

  function isLikelyOffline(err){
    const msg = String((err && err.message) ? err.message : err || "");
    return /Failed to fetch|NetworkError|JSONP|timeout|offline/i.test(msg);
  }

  window.OfflineStore = {
    openIdb,
    cacheVolunteersWrite,
    cacheVolunteersRead,
    cachePunchesWrite,
    cachePunchesRead,
    enqueuePunch,
    queueCount,
    queueList,
    queueDeleteByIds,
    isLikelyOffline
  };
})();
