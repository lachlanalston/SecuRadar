let advisories = [];
let selectedSeverities = [];

function isNewAdvisory(advisoryDateStr) {
  const advisoryDate = new Date(advisoryDateStr);
  const now = new Date();
  const diffTime = now - advisoryDate;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= 1.5; // approx last 24–36 hours
}

async function loadAdvisories() {
  try {
    const res = await fetch('data/advisories.json');
    advisories = await res.json();
    renderDashboard();
  } catch (err) {
    console.error('Failed to load advisories:', err);
  }
}

function renderDashboard() {
  const grid = document.getElementById('advisoriesGrid');
  grid.innerHTML = '';

  const searchValue = document.getElementById('search').value.toLowerCase();
  const vendorFilter = document.getElementById('vendorFilter').value.toLowerCase();
  const cveFilter = document.getElementById('cveFilter').value.toLowerCase();

  const filtered = advisories.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchValue) || a.summary.toLowerCase().includes(searchValue);
    const matchesVendor = vendorFilter ? (a.vendor || '').toLowerCase().includes(vendorFilter) : true;
    const matchesCVE = cveFilter ? (a.cve || '').toLowerCase().includes(cveFilter) : true;

    let matchesSeverity = true;
    if (selectedSeverities.length > 0) {
      matchesSeverity = selectedSeverities.some(s =>
        s === 'New' ? isNewAdvisory(a.date) : a.severity === s
      );
    }

    return matchesSearch && matchesVendor && matchesCVE && matchesSeverity;
  });

  filtered.forEach(a => {
    const card = document.createElement('div');
    card.classList.add('card-item');
    if (isNewAdvisory(a.date)) card.classList.add('new');

    const newBadge = isNewAdvisory(a.date) ? `<span class="new-badge">NEW</span>` : '';
    card.innerHTML = `
      <h3>${a.title} ${newBadge}</h3>
      <p><strong>Vendor:</strong> ${a.vendor}</p>
      <p><strong>CVE:</strong> ${a.cve}</p>
      <p><strong>Severity:</strong> ${a.severity}</p>
      <p><strong>Date:</strong> ${a.date}</p>
      <p>${a.summary}</p>
      <a href="${a.link}" target="_blank">View Advisory</a>
    `;
    grid.appendChild(card);
  });

  // Update summary counts
  document.querySelector('.card.total').textContent = `Total: ${advisories.length}`;
  document.querySelector('.card.critical').textContent = `Critical: ${advisories.filter(a => a.severity === 'Critical').length}`;
  document.querySelector('.card.high').textContent = `High: ${advisories.filter(a => a.severity === 'High').length}`;
  document.querySelector('.card.medium').textContent = `Medium: ${advisories.filter(a => a.severity === 'Medium').length}`;
  document.querySelector('.card.low').textContent = `Low: ${advisories.filter(a => a.severity === 'Low').length}`;
  document.querySelector('.card.new').textContent = `New: ${advisories.filter(a => isNewAdvisory(a.date)).length}`;
}

// Event listeners
document.getElementById('search').addEventListener('input', renderDashboard);
document.getElementById('vendorFilter').addEventListener('input', renderDashboard);
document.getElementById('cveFilter').addEventListener('input', renderDashboard);

document.getElementById('darkModeToggle').addEventListener('change', (e) => {
  document.body.classList.toggle('dark', e.target.checked);
});

document.querySelectorAll('#severityCards .card[data-severity]').forEach(card => {
  card.addEventListener('click', () => {
    const severity = card.dataset.severity;
    if (severity === 'All') return;

    if (selectedSeverities.includes(severity)) {
      selectedSeverities = selectedSeverities.filter(s => s !== severity);
      card.classList.remove('selected');
    } else {
      selectedSeverities.push(severity);
      card.classList.add('selected');
    }
    renderDashboard();
  });
});

document.getElementById('clearSeverity').addEventListener('click', () => {
  selectedSeverities = [];
  document.querySelectorAll('#severityCards .card').forEach(c => c.classList.remove('selected'));
  renderDashboard();
});

// Load data on page load
loadAdvisories();
