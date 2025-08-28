const advisoriesUrl = 'data/advisories.json';
let advisories = [];

// Fetch advisories JSON
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
  const severityFilter = document.getElementById('severityFilter').value;
  const vendorFilter = document.getElementById('vendorFilter').value.toLowerCase();
  const cveFilter = document.getElementById('cveFilter').value.toLowerCase();

  const filtered = advisories.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchValue) || a.summary.toLowerCase().includes(searchValue);
    const matchesSeverity = severityFilter ? a.severity === severityFilter : true;
    const matchesVendor = vendorFilter ? (a.vendor || '').toLowerCase().includes(vendorFilter) : true;
    const matchesCVE = cveFilter ? (a.cve || '').toLowerCase().includes(cveFilter) : true;
    return matchesSearch && matchesSeverity && matchesVendor && matchesCVE;
  });

  filtered.forEach(a => {
    const card = document.createElement('div');
    card.classList.add('card-item');
    card.innerHTML = `
      <h3>${a.title}</h3>
      <p><strong>Vendor:</strong> ${a.vendor}</p>
      <p><strong>CVE:</strong> ${a.cve}</p>
      <p class="severity"><strong>Severity:</strong> ${a.severity}</p>
      <p><strong>Date:</strong> ${a.date}</p>
      <p>${a.summary}</p>
      <a href="${a.link}" target="_blank">View Advisory</a>
    `;
    grid.appendChild(card);
  });

  // Update summary cards
  document.querySelector('.card.total').textContent = `Total: ${advisories.length}`;
  document.querySelector('.card.critical').textContent = `Critical: ${advisories.filter(a => a.severity === 'Critical').length}`;
  document.querySelector('.card.high').textContent = `High: ${advisories.filter(a => a.severity === 'High').length}`;
  document.querySelector('.card.medium').textContent = `Medium: ${advisories.filter(a => a.severity === 'Medium').length}`;
  document.querySelector('.card.low').textContent = `Low: ${advisories.filter(a => a.severity === 'Low').length}`;
}

// Render severity chart
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

// Filter inputs
document.getElementById('search').addEventListener('input', renderDashboard);
document.getElementById('severityFilter').addEventListener('change', renderDashboard);
document.getElementById('vendorFilter').addEventListener('input', renderDashboard);
document.getElementById('cveFilter').addEventListener('input', renderDashboard);

// Dark mode toggle
document.getElementById('darkModeToggle').addEventListener('change', (e) => {
  document.body.classList.toggle('dark', e.target.checked);
});

// Initial load
loadAdvisories();
