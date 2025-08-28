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
      <p class="severity"><strong>Severity:</strong> ${a.severity}</p>
      <p><strong>Date:</strong> ${a.date}</p>
      <p>${a.summary}</p>
      <a href="${a.link}" target="_blank">View Advisory</a>
    `;
    grid
