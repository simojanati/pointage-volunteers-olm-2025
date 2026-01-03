/* OLM Pointage — Theme switch (Jour/Nuit)
   Jour = thème clair (lisible)
   Nuit = thème sombre (design actuel)
   Auto (si aucun choix): Casablanca (GMT+1)
   - Nuit (sombre): 18:32 → 08:30
   - Jour (clair): 08:33 → 18:31
*/
(function () {
  var STORAGE_KEY = 'olm_theme'; // 'day' | 'night'
  var STORAGE_VER = 'olm_theme_schema'; // migration marker
  var TZ_LABEL = 'Africa/Casablanca (GMT+1)';

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }
  function safeDel(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function getStoredTheme() {
    var v = safeGet(STORAGE_KEY);
    return (v === 'day' || v === 'night') ? v : null;
  }

function migrateStoredTheme() {
  // If a previous version stored theme meaning was inverted, migrate once.
  // Old: day=dark, night=light  -> New: day=light, night=dark
  try {
    var v = safeGet(STORAGE_VER);
    if (v === '2') return;
    var t = safeGet(STORAGE_KEY);
    if (t === 'day') safeSet(STORAGE_KEY, 'night');
    else if (t === 'night') safeSet(STORAGE_KEY, 'day');
    safeSet(STORAGE_VER, '2');
  } catch (e) {}
}

  // Casablanca clock: prefer Intl if available; otherwise compute from UTC (+1)
  function getCasablancaClock() {
    var now = new Date();
    var hour = now.getHours();
    var minute = now.getMinutes();

    // Try Intl timezone conversion
    try {
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        var fmt = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Africa/Casablanca',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        if (fmt.formatToParts) {
          var parts = fmt.formatToParts(now);
          var i, p, hh = null, mm = null;
          for (i = 0; i < parts.length; i++) {
            p = parts[i];
            if (p && p.type === 'hour') hh = p.value;
            if (p && p.type === 'minute') mm = p.value;
          }
          if (hh != null) hour = parseInt(hh, 10);
          if (mm != null) minute = parseInt(mm, 10);
        } else {
          // Fallback: parse "HH:MM"
          var s = fmt.format(now);
          var m = /(\d{2}):(\d{2})/.exec(s);
          if (m) { hour = parseInt(m[1],10); minute = parseInt(m[2],10); }
        }
      }
    } catch (e) {
      // Compute from UTC with +1 offset (GMT+1)
      try {
        var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        var cas = new Date(utc + (60 * 60000));
        hour = cas.getHours();
        minute = cas.getMinutes();
      } catch (e2) {}
    }

    // Ensure numbers
    hour = (hour == null || isNaN(hour)) ? now.getHours() : hour;
    minute = (minute == null || isNaN(minute)) ? now.getMinutes() : minute;

    var hh2 = ('0' + hour).slice(-2);
    var mm2 = ('0' + minute).slice(-2);
    return { hour: hour, minute: minute, hhmm: hh2 + ':' + mm2, tz: TZ_LABEL };
  }

  function detectAutoTheme() {
    var c = getCasablancaClock();
    var t = (c.hour * 60) + (c.minute || 0);
    var DAY_START = (8 * 60) + 33;     // 08:33
    var DAY_END   = (18 * 60) + 31;    // 18:31
    // Nuit: 18:32 → 08:30 (everything outside day window)
    return (t >= DAY_START && t <= DAY_END) ? 'day' : 'night';
  }

    migrateStoredTheme();

  function getInitialTheme() {
    return getStoredTheme() || detectAutoTheme();
  }

  // Apply ASAP to avoid flash (attribute only)
  try { document.documentElement.setAttribute('data-theme', getInitialTheme()); } catch (e) {}

  function applyTheme(theme) {
    try { document.documentElement.setAttribute('data-theme', theme); } catch (e) {}
    try { if (document.body) document.body.setAttribute('data-theme', theme); } catch (e2) {}

    // Classes for CSS
    try { document.documentElement.className = document.documentElement.className.replace(/\btheme-(day|night)\b/g,'').trim(); } catch (e3) {}
    try {
      document.documentElement.classList.add(theme === 'night' ? 'theme-night' : 'theme-day');
      if (document.body) {
        document.body.classList.remove('theme-night', 'theme-day');
        document.body.classList.add(theme === 'night' ? 'theme-night' : 'theme-day');
      }
    } catch (e4) {}

    // Native controls hint
    try {
      document.documentElement.style.colorScheme = (theme === 'night') ? 'light' : 'dark';
    } catch (e5) {}
  }

  function setTheme(theme, fromUser) {
    if (theme !== 'day' && theme !== 'night') theme = detectAutoTheme();
    if (fromUser) safeSet(STORAGE_KEY, theme);
    applyTheme(theme);
    updateToggle(theme, !fromUser);
  }

  function el(id){ return document.getElementById(id); }

  function injectToggle() {
    if (el('themeToggle')) return;

    var slot = el('navThemeSlot');
    var navActions = el('navActions');
    var host = slot || navActions;
    if (!host) return;

    var wrap = document.createElement('div');
    wrap.className = 'theme-toggle d-flex align-items-center gap-2';

    wrap.innerHTML =
      '<button type="button" class="theme-side theme-side-left" id="themeDayBtn" aria-label="Jour (thème clair)">' +
        '<span class="theme-ico" aria-hidden="true">☀️</span>' +
        '<span class="theme-txt">Jour</span>' +
      '</button>' +
      '<div class="form-check form-switch m-0">' +
        '<input class="form-check-input" type="checkbox" role="switch" id="themeToggle" aria-label="Basculer le thème (jour/nuit)">' +
      '</div>' +
      '<button type="button" class="theme-side theme-side-right" id="themeNightBtn" aria-label="Nuit (thème sombre)">' +
        '<span class="theme-ico" aria-hidden="true">🌙</span>' +
        '<span class="theme-txt">Nuit</span>' +
      '</button>';

    // Place between brand and actions: if we have navActions, insert before user pill when possible
    if (!slot && navActions) {
      var userPill = el('userPill');
      if (userPill && userPill.parentElement === navActions) {
        navActions.insertBefore(wrap, userPill);
      } else {
        navActions.insertBefore(wrap, navActions.firstChild);
      }
    } else {
      host.appendChild(wrap);
    }

    // Bind events
    var toggle = el('themeToggle');
    var dayBtn = el('themeDayBtn');
    var nightBtn = el('themeNightBtn');

    function onToggle() {
      var t = toggle && toggle.checked ? 'night' : 'day';
      setTheme(t, true);
    }

    if (toggle) {
      toggle.addEventListener('change', onToggle);
      toggle.addEventListener('input', onToggle);
      toggle.addEventListener('click', onToggle);
      toggle.addEventListener('touchstart', onToggle);
    }
    if (dayBtn) dayBtn.addEventListener('click', function(){ setTheme('day', true); });
    if (nightBtn) nightBtn.addEventListener('click', function(){ setTheme('night', true); });

    // Initial state
    updateToggle(getInitialTheme(), !getStoredTheme());
  }

  function updateToggle(theme, isAuto) {
    var toggle = el('themeToggle');
    var dayBtn = el('themeDayBtn');
    var nightBtn = el('themeNightBtn');

    if (toggle) toggle.checked = (theme === 'night');

    try {
      if (dayBtn) dayBtn.classList.toggle('is-active', theme === 'day');
      if (nightBtn) nightBtn.classList.toggle('is-active', theme === 'night');
    } catch (e) {}

    // Tooltip with Casablanca clock
    try {
      var c = getCasablancaClock();
      var tip = (isAuto ? 'Auto' : 'Manuel') + ' — ' + c.hhmm + ' • ' + c.tz;
      if (toggle) toggle.title = tip;
      if (dayBtn) dayBtn.title = tip;
      if (nightBtn) nightBtn.title = tip;
    } catch (e2) {}
  }

  // Boot
  function boot() {
    setTheme(getInitialTheme(), false); // apply + update
    injectToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose small debug helpers
  window.OLM_THEME = {
    set: function(t){ safeSet(STORAGE_KEY, t); setTheme(t, false); },
    clear: function(){ safeDel(STORAGE_KEY); setTheme(detectAutoTheme(), false); }
  };
})();
