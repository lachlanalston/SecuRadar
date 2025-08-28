const advisoriesUrl = 'data/advisories.json';
let advisories = [];
let selectedSeverities = [];

// Check if advisory is within last business day
function isNewAdvisory(advisoryDateStr) {
  const advisoryDate = new Date(advisoryDateStr);
  const now = new Date();
  let lastBusinessDay = new Date(now);
  const day = now.getDay();

  if (day === 0) lastBusinessDay.setDate(now.getDate() - 2); // Sunday -> Friday
  else if (day === 1) lastBusinessDay.setDate(now.getDate() - 3); // Monday -> Friday
  else lastBusinessDay.setDate(now.getDate() - 1); // Other weekdays

  lastBusinessDay.setHours(0,0,0,0);
  advisoryDate.setHours(0,0,0,0);
  return advisoryDate >= lastBusinessDay;
}

// Load advisories JSON
async function loadAdvisories() {
  const response = await fetch(advisoriesUrl);
  advisories = await response.json();
  renderDashboard();
  renderCharts();
}

// Render dashboard cards
function renderDashboard() {
  const grid = document.getElementById('advisoriesGrid');
  grid.innerHTML = '';

  const searchValue = document.getElementById('search').value.toLowerCase();
  const vendorFilter = document.getElementById('vendorFilter').value.toLowerCase();
  const cveFilter = document.getElementById('cveFilter').value.toLowerCase();

  const filtered = advisories.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchValue) || a.summary.toLowerCase().includes(searchValue);
    const matchesSeverity = selectedSeverities.length > 0 ? selectedSeverities.includes(a.severity) : true;
    const matchesVendor = vendorFilter ? (a.vendor || '').toLowerCase().includes(vendorFilter) : true;
    const matchesCVE = cveFilter ? (a.cve || '').toLowerCase().includes(cveFilter) : true;
    return matchesSearch && matchesSeverity && matchesVendor && matchesCVE;
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
      <p class="severity"><strong>Severity:</strong> ${a.severity}</p>
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

// Render chart
function renderCharts() {
  const ctx = document.getElementById('severityChart').getContext('2d');
  const data = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [{
      label: 'Severity Distribution',
      data: [
        advisories.filter(a => a.severity === 'Critical').length,
        advisories.filter(a => a.severity === 'High').length,
        advisories.filter(a => a.severity === 'Medium').length,
        advisories.filter(a => a.severity === 'Low').length,
      ],
      backgroundColor: ['#ef4444','#f59e0b','#facc15','#22c55e']
    }]
  };
  new Chart(ctx, {
    type: 'pie',
    data: data
  });
}

// Search and filter events
document.getElementById('search').addEventListener('input', renderDashboard);
document.getElementById('vendorFilter').addEventListener('input', renderDashboard);
document.getElementById('cveFilter').addEventListener('input', renderDashboard);

// Dark mode toggle
document.getElementById('darkModeToggle').addEventListener('change', (e) => {
  document.body.classList.toggle('dark', e.target.checked);
});

// Severity card filter logic
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

// Clear selection
document.getElementById('clearSeverity').addEventListener('click', () => {
  selectedSeverities = [];
  document.querySelectorAll('#severityCards .card').forEach(c => c.classList.remove('selected'));
  renderDashboard();
});

// Initial load
loadAdvisories();
