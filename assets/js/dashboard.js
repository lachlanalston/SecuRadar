let allAdvisories   = [];
let selectedSeverities = [];
let selectedSources    = [];
let cveSourceMap       = {}; // CVE ID → Set of source names

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const HOT_MS  = 24 * 60 * 60 * 1000;       // < 24 hours — pulsing highlight
const NEW_MS  = 7  * 24 * 60 * 60 * 1000;  // < 7 days — warm tint

function isHot(dateStr) {
  return !!dateStr && (Date.now() - new Date(dateStr).getTime()) <= HOT_MS;
}

function isNew(dateStr) {
  return !!dateStr && (Date.now() - new Date(dateStr).getTime()) <= NEW_MS;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Cross-source CVE index ───────────────────────────────────

function buildCveSourceMap() {
  cveSourceMap = {};
  for (const a of allAdvisories) {
    if (!a.cve || a.cve === 'N/A' || !a.source) continue;
    for (const cve of a.cve.split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(s => s.startsWith('CVE-'))) {
      if (!cveSourceMap[cve]) cveSourceMap[cve] = new Set();
      cveSourceMap[cve].add(a.source);
    }
  }
}

function getCorroboratingSources(cveStr, ownSource) {
  if (!cveStr || cveStr === 'N/A') return [];
  const others = new Set();
  for (const cve of cveStr.split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(s => s.startsWith('CVE-'))) {
    if (cveSourceMap[cve]) {
      cveSourceMap[cve].forEach(s => { if (s !== ownSource) others.add(s); });
    }
  }
  return [...others];
}

// ── Source filter buttons ────────────────────────────────────

function renderSourceFilters() {
  const sources = [...new Set(allAdvisories.map(a => a.source).filter(Boolean))].sort();
  const container = document.getElementById('sourceFilters');

  container.innerHTML = sources.map(s => {
    const active = selectedSources.includes(s) ? ' active' : '';
    return `<button class="source-btn${active}" data-source="${escapeHtml(s)}">${escapeHtml(s)}</button>`;
  }).join('');

  container.querySelectorAll('.source-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const src = btn.dataset.source;
      if (selectedSources.includes(src)) {
        selectedSources = selectedSources.filter(s => s !== src);
        btn.classList.remove('active');
      } else {
        selectedSources.push(src);
        btn.classList.add('active');
      }
      renderAll();
    });
  });
}

// ── Filtering & sorting ──────────────────────────────────────

function getFiltered() {
  const search = document.getElementById('search').value.toLowerCase().trim();
  const vendor = document.getElementById('vendorFilter').value.toLowerCase().trim();
  const cve    = document.getElementById('cveFilter').value.toLowerCase().trim();
  const sort   = document.getElementById('sortBy').value;

  let list = allAdvisories.filter(a => {
    const matchSearch = !search ||
      (a.title   || '').toLowerCase().includes(search) ||
      (a.summary || '').toLowerCase().includes(search) ||
      (a.vendor  || '').toLowerCase().includes(search) ||
      (a.cve     || '').toLowerCase().includes(search) ||
      (a.source  || '').toLowerCase().includes(search);

    const matchVendor = !vendor || (a.vendor || '').toLowerCase().includes(vendor);
    const matchCVE    = !cve    || (a.cve    || '').toLowerCase().includes(cve);

    let matchSeverity = true;
    if (selectedSeverities.length > 0) {
      matchSeverity = selectedSeverities.some(s =>
        s === 'New' ? isNew(a.date) : a.severity === s
      );
    }

    const matchSource = selectedSources.length === 0 || selectedSources.includes(a.source || '');

    return matchSearch && matchVendor && matchCVE && matchSeverity && matchSource;
  });

  list.sort((a, b) => {
    if (sort === 'date-asc') return new Date(a.date) - new Date(b.date);
    if (sort === 'severity') return (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    return new Date(b.date) - new Date(a.date);
  });

  return list;
}

// ── Render ───────────────────────────────────────────────────

function renderStats() {
  const a = allAdvisories;
  document.getElementById('countTotal').textContent    = a.length;
  document.getElementById('countCritical').textContent = a.filter(x => x.severity === 'Critical').length;
  document.getElementById('countHigh').textContent     = a.filter(x => x.severity === 'High').length;
  document.getElementById('countMedium').textContent   = a.filter(x => x.severity === 'Medium').length;
  document.getElementById('countLow').textContent      = a.filter(x => x.severity === 'Low').length;
  document.getElementById('countNew').textContent      = a.filter(x => isNew(x.date)).length;
}

function renderCards(list) {
  const grid = document.getElementById('advisoriesGrid');

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <strong>No advisories found</strong>
        <p>Try adjusting your filters or search terms.</p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map(a => {
    const hot  = isHot(a.date);
    const nov  = !hot && isNew(a.date);
    const cardClass = hot ? ' is-hot' : nov ? ' is-new' : '';

    const recencyBadge = hot
      ? `<span class="badge-hot">Today</span>`
      : nov
        ? `<span class="badge-new">New</span>`
        : '';

    const cveText    = a.cve    && a.cve    !== 'N/A' ? a.cve    : null;
    const vendor     = a.vendor && a.vendor !== 'N/A' ? a.vendor : null;
    const sourceKey  = (a.source || '').replace(/\s+/g, '-').toLowerCase();
    const corroboration = getCorroboratingSources(a.cve, a.source);
    const corrobBadge = corroboration.length
      ? `<span class="badge-corroboration" title="Also reported by: ${escapeHtml(corroboration.join(', '))}">⚑ ${corroboration.length + 1} sources</span>`
      : '';
    const patchBadge = a.severity === 'Critical'
      ? `<span class="badge-patch">Patch: 48h</span>`
      : '';

    return `
      <article class="advisory-card${cardClass}" data-severity="${a.severity || ''}">
        <div class="card-top">
          <div class="card-badges">
            <span class="badge-severity ${a.severity || ''}">${a.severity || 'Unknown'}</span>
            ${recencyBadge}
            ${corrobBadge}
            ${patchBadge}
          </div>
          <span class="card-date">${formatDate(a.date)}</span>
        </div>
        <a class="card-title" href="${a.link || '#'}" target="_blank" rel="noopener">
          ${escapeHtml(a.title || 'Untitled')}
        </a>
        <div class="card-meta">
          ${a.source ? `<span class="meta-item"><span class="badge-source source-${sourceKey}">${escapeHtml(a.source)}</span></span>` : ''}
          ${vendor   ? `<span class="meta-item"><span class="meta-label">Vendor</span>${escapeHtml(vendor)}</span>` : ''}
          ${cveText  ? `<span class="meta-item"><span class="meta-label">CVE</span>${escapeHtml(cveText)}</span>` : ''}
        </div>
        <p class="card-summary">${escapeHtml(a.summary || '')}</p>
        <div class="card-footer">
          <a class="view-link" href="${a.link || '#'}" target="_blank" rel="noopener">
            View advisory →
          </a>
        </div>
      </article>`;
  }).join('');
}

function renderResultsBar(count) {
  document.getElementById('resultCount').textContent =
    `${count} ${count === 1 ? 'advisory' : 'advisories'}`;

  const tags = [];
  const search = document.getElementById('search').value.trim();
  const vendor = document.getElementById('vendorFilter').value.trim();
  const cve    = document.getElementById('cveFilter').value.trim();

  if (search) tags.push(`"${search}"`);
  if (vendor) tags.push(`Vendor: ${vendor}`);
  if (cve)    tags.push(`CVE: ${cve}`);
  selectedSeverities.forEach(s => tags.push(s));
  selectedSources.forEach(s => tags.push(s));

  document.getElementById('activeFilters').innerHTML =
    tags.map(t => `<span class="filter-tag">${escapeHtml(t)}</span>`).join('');
}

function renderAll() {
  renderStats();
  const list = getFiltered();
  renderCards(list);
  renderResultsBar(list.length);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Data loading & auto-poll ─────────────────────────────────

const POLL_INTERVAL_MS = 5 * 60 * 1000; // re-check every 5 minutes
let lastSeenUpdated = null;

async function loadAdvisories(isPolling = false) {
  try {
    // Cache-bust so the browser doesn't serve a stale file
    const res  = await fetch(`data/advisories.json?_=${Date.now()}`);
    const data = await res.json();

    const incoming = Array.isArray(data) ? null : data.last_updated;

    // Skip re-render on poll if nothing changed
    if (isPolling && incoming && incoming === lastSeenUpdated) {
      updateLastUpdatedLabel(incoming);
      return;
    }

    lastSeenUpdated = incoming;
    allAdvisories   = Array.isArray(data) ? data : (data.advisories || []);

    updateLastUpdatedLabel(incoming);
    buildCveSourceMap();
    renderSourceFilters();
    renderAll();

    if (isPolling) showRefreshToast();
  } catch (err) {
    if (!isPolling) {
      document.getElementById('advisoriesGrid').innerHTML =
        `<div class="error-state">Failed to load advisories. ${err.message}</div>`;
    }
  }
}

function updateLastUpdatedLabel(isoStr) {
  if (!isoStr) return;
  document.getElementById('lastUpdated').textContent = `Updated ${timeAgo(isoStr)}`;
}

function showRefreshToast() {
  const toast = document.createElement('div');
  toast.className = 'refresh-toast';
  toast.textContent = 'Dashboard refreshed';
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

setInterval(() => loadAdvisories(true), POLL_INTERVAL_MS);

// ── Event listeners ──────────────────────────────────────────

document.getElementById('search').addEventListener('input', renderAll);
document.getElementById('vendorFilter').addEventListener('input', renderAll);
document.getElementById('cveFilter').addEventListener('input', renderAll);
document.getElementById('sortBy').addEventListener('change', renderAll);

document.getElementById('clearAll').addEventListener('click', () => {
  document.getElementById('search').value       = '';
  document.getElementById('vendorFilter').value  = '';
  document.getElementById('cveFilter').value     = '';
  document.getElementById('sortBy').value        = 'date-desc';
  selectedSeverities = [];
  selectedSources    = [];
  document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
  renderAll();
});

document.querySelectorAll('.stat-card[data-severity]').forEach(card => {
  card.addEventListener('click', () => {
    const sev = card.dataset.severity;
    if (sev === 'All') {
      selectedSeverities = [];
      document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
    } else {
      if (selectedSeverities.includes(sev)) {
        selectedSeverities = selectedSeverities.filter(s => s !== sev);
        card.classList.remove('active');
      } else {
        selectedSeverities.push(sev);
        card.classList.add('active');
      }
    }
    renderAll();
  });
});

document.getElementById('themeToggle').addEventListener('click', () => {
  const html = document.documentElement;
  const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
  html.dataset.theme = next;
  localStorage.setItem('securadar-theme', next);
});

const savedTheme = localStorage.getItem('securadar-theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;

loadAdvisories();
