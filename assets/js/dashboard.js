let allAdvisories = [];
let selectedSeverities = [];

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function isNew(dateStr) {
  if (!dateStr) return false;
  return (Date.now() - new Date(dateStr).getTime()) <= 36 * 60 * 60 * 1000;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

async function loadAdvisories() {
  try {
    const res  = await fetch('data/advisories.json');
    const data = await res.json();

    // Support both old array format and new { last_updated, advisories } format
    if (Array.isArray(data)) {
      allAdvisories = data;
    } else {
      allAdvisories = data.advisories || [];
      if (data.last_updated) {
        document.getElementById('lastUpdated').textContent =
          `Updated ${timeAgo(data.last_updated)}`;
      }
    }

    renderAll();
  } catch (err) {
    document.getElementById('advisoriesGrid').innerHTML =
      `<div class="error-state">Failed to load advisories. ${err.message}</div>`;
  }
}

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
    return matchSearch && matchVendor && matchCVE && matchSeverity;
  });

  list.sort((a, b) => {
    if (sort === 'date-asc')  return new Date(a.date) - new Date(b.date);
    if (sort === 'severity')  return (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    return new Date(b.date) - new Date(a.date); // date-desc default
  });

  return list;
}

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
    const newBadge = isNew(a.date) ? `<span class="badge-new">New</span>` : '';
    const cveText  = a.cve && a.cve !== 'N/A' ? a.cve : null;
    const vendor   = a.vendor && a.vendor !== 'N/A' ? a.vendor : null;
    const sourceKey = (a.source || '').replace(/\s+/g, '-').toLowerCase();

    return `
      <article class="advisory-card" data-severity="${a.severity || ''}">
        <div class="card-top">
          <div class="card-badges">
            <span class="badge-severity ${a.severity || ''}">${a.severity || 'Unknown'}</span>
            ${newBadge}
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
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Event listeners ──────────────────────────────────────────

document.getElementById('search').addEventListener('input', renderAll);
document.getElementById('vendorFilter').addEventListener('input', renderAll);
document.getElementById('cveFilter').addEventListener('input', renderAll);
document.getElementById('sortBy').addEventListener('change', renderAll);

document.getElementById('clearAll').addEventListener('click', () => {
  document.getElementById('search').value      = '';
  document.getElementById('vendorFilter').value = '';
  document.getElementById('cveFilter').value    = '';
  document.getElementById('sortBy').value       = 'date-desc';
  selectedSeverities = [];
  document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
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

// Restore saved theme preference
const savedTheme = localStorage.getItem('securadar-theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;

loadAdvisories();
