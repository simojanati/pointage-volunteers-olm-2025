/* Viewer page (no login) */
(function () {
  const qName = document.getElementById("qName");
  const qBadge = document.getElementById("qBadge");
  const qGroup = document.getElementById("qGroup");
  const listEl = document.getElementById("list");
  const totalCountEl = document.getElementById("totalCount");
  const emptyStateEl = document.getElementById("emptyState");
  const loaderEl = document.getElementById("viewerLoader");

  const modalEl = document.getElementById("viewerHistoryModal");
  const modalBackdrop = modalEl?.querySelector(".olm-modal-backdrop");
  const closeBtn = document.getElementById("viewerHistClose");
  const closeBtn2 = document.getElementById("viewerHistClose2");
  const histTitle = document.getElementById("viewerHistTitle");
  const histSub = document.getElementById("viewerHistSub");
  const histFrom = document.getElementById("histFrom");
  const histTo = document.getElementById("histTo");
  const histLoad = document.getElementById("histLoad");
  const histTbody = document.getElementById("histTbody");
  const histCount = document.getElementById("histCount");
  const histMsg = document.getElementById("histMsg");

  let volunteers = [];
  let currentVolunteer = null;

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normGroup(g) { return String(g ?? "").trim().toUpperCase(); }

  function showLoader(on) {
    if (!loaderEl) return;
    loaderEl.classList.toggle("d-none", !on);
  }

  function renderList() {
    const nameQ = (qName?.value || "").trim().toLowerCase();
    const badgeQ = (qBadge?.value || "").trim().toLowerCase();
    const groupQ = normGroup(qGroup?.value || "");

    const filtered = volunteers.filter(v => {
      const fn = (v.fullName || "").toLowerCase();
      const bc = (v.badgeCode || "").toLowerCase();
      const g = normGroup(v.group || v.groupe);

      if (nameQ && !fn.includes(nameQ)) return false;
      if (badgeQ && !bc.includes(badgeQ)) return false;
      if (groupQ && g !== groupQ) return false;
      return true;
    });

    totalCountEl.textContent = String(filtered.length);
    emptyStateEl.classList.toggle("d-none", filtered.length !== 0);

    listEl.innerHTML = filtered.map(v => {
      const g = normGroup(v.group || v.groupe);
      const gBadge = g ? `<span class="badge badge-soft text-white">👥 Groupe  ${escapeHtml(g)}</span>` : `<span class="badge badge-soft text-white">👥 —</span>`;
      const badge = v.badgeCode ? `<span class="badge badge-soft text-white">🏷️ ${escapeHtml(v.badgeCode)}</span>` : `<span class="badge badge-soft text-white">🏷️ —</span>`;

      return `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card bg-glass h-100">
            <div class="card-body">
              <div class="d-flex align-items-start justify-content-between gap-2">
                <div class="text-white fw-bold">${escapeHtml(v.fullName || "")}</div>
                <button class="btn btn-sm btn-danger" data-action="history" data-id="${escapeHtml(v.id)}">Historique</button>
              </div>
              <div class="d-flex flex-wrap gap-2 mt-2">
                ${badge}
                ${gBadge}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  function openModal() {
    modalEl?.classList.remove("d-none");
  }
  function closeModal() {
    modalEl?.classList.add("d-none");
    currentVolunteer = null;
  }

  function todayInputValue() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`; // format ديال <input type="date">
  }

  async function loadHistory() {
    if (!currentVolunteer) return;
    let from = histFrom.value;
    let to = histTo.value;
    if (!to) to = todayInputValue();
    if (!from) from = to;
    histFrom.value = from;
    histTo.value = to;

    histMsg.textContent = "";
    histMsg.className = "small";
    histTbody.innerHTML = `<tr><td colspan="3" class="text-muted2 small">Chargement…</td></tr>`;
    histCount.textContent = "0";

    try {
      const res = await apiPublicVolunteerHistory(currentVolunteer.id, from, to);
      if (!res.ok) {
        histMsg.textContent = "Erreur: " + (res.error || "UNKNOWN");
        histMsg.className = "small text-danger";
        histTbody.innerHTML = "";
        return;
      }

      const rows = (res.rows || []).slice();
      // newest first
      rows.sort((a, b) => {
        if (a.punch_date !== b.punch_date) return String(b.punch_date || "").localeCompare(String(a.punch_date || ""));
        return String(b.punched_at || "").localeCompare(String(a.punched_at || ""));
      });

      histCount.textContent = String(rows.length);
      if (!rows.length) {
        histTbody.innerHTML = `<tr><td colspan="3" class="text-muted2 small">Aucun pointage sur cette période.</td></tr>`;
        return;
      }

      histTbody.innerHTML = rows.map(r => {
        const time = r.punched_at ? new Date(r.punched_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
        return `
          <tr>
            <td class="fw-bold">${escapeHtml(r.punch_date || "")}</td>
            <td>${escapeHtml(time)}</td>
          </tr>
        `;
      }).join("");
    } catch (err) {
      console.error(err);
      histMsg.textContent = "Impossible de charger l'historique.";
      histMsg.className = "small text-danger";
      histTbody.innerHTML = "";
    }
  }

  async function init() {
    // default dates (30 days)
    histTo.value = todayInputValue();
    histFrom.value = "2025-12-22";

    bind();
    showLoader(true);
    try {
      const res = await apiPublicListVolunteers("");
      if (!res.ok) {
        throw new Error(res.error || "API_ERROR");
      }
      volunteers = (res.volunteers || []).map(v => ({ ...v, group: normGroup(v.group || v.groupe) }));
      renderList();
    } catch (err) {
      console.error(err);
      emptyStateEl.classList.remove("d-none");
      emptyStateEl.textContent = "Impossible de charger les bénévoles. " + (err && err.message ? ("Détail: " + err.message) : "(Backend non à jour ou configuration API_URL).");
    } finally {
      showLoader(false);
    }
  }

  function bind() {
    qName?.addEventListener("input", renderList);
    qBadge?.addEventListener("input", renderList);
    qGroup?.addEventListener("change", renderList);

    listEl?.addEventListener("click", (e) => {
      const btn = e.target.closest('[data-action="history"]');
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const v = volunteers.find(x => String(x.id) === String(id));
      if (!v) return;
      currentVolunteer = v;
      histTitle.textContent = "Historique";
      histSub.textContent = `${v.fullName || ""} • Badge: ${v.badgeCode || "—"} • Groupe: ${normGroup(v.group) || "—"}`;
      // Default date range (required by API)
      if (!histTo.value) histTo.value = todayInputValue();
      if (!histFrom.value) histFrom.value = histTo.value;

      openModal();
      loadHistory();
    });

    histLoad?.addEventListener("click", loadHistory);

    closeBtn?.addEventListener("click", closeModal);
    closeBtn2?.addEventListener("click", closeModal);
    modalBackdrop?.addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalEl && !modalEl.classList.contains("d-none")) closeModal();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
