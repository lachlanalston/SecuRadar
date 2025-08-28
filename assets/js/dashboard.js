const tableBody = document.querySelector("#advisories-table tbody");
const searchTitle = document.getElementById("search-title");
const searchVendor = document.getElementById("search-vendor");
const searchCVE = document.getElementById("search-cve");
const severityFilter = document.getElementById("severity-filter");
const totalEl = document.getElementById("total");
const criticalEl = document.getElementById("critical");
const lastUpdatedEl = document.getElementById("last-updated");

let advisories = [];

// Load JSON manually
async function loadAdvisories() {
  try {
    const res = await fetch("data/advisories.json");
    advisories = await res.json();
    updateStats();
    displayAdvisories(advisories);
  } catch (err) {
    console.error("Failed to load advisories:", err);
    tableBody.innerHTML = "<tr><td colspan='6'>Failed to load advisories.</td></tr>";
  }
}

// Display in table
function displayAdvisories(list) {
  tableBody.innerHTML = "";

  if (list.length === 0) {
    tableBody.innerHTML = "<tr><td colspan='6'>No advisories found.</td></tr>";
    return;
  }

  list.forEach(a => {
    const tr = document.createElement("tr");

    let severityClass = "";
    switch(a.severity.toLowerCase()) {
      case "critical": severityClass="severity-critical"; break;
      case "high": severityClass="severity-high"; break;
      case "medium": severityClass="severity-medium"; break;
      case "low": severityClass="severity-low"; break;
      default: severityClass="";
    }

    tr.innerHTML = `
      <td>${a.title}</td>
      <td>${a.vendor || "-"}</td>
      <td>${a.cve || "-"}</td>
      <td>${a.date}</td>
      <td><span class="${severityClass}">${a.severity}</span></td>
      <td><a href="${a.link}" target="_blank">Read</a></td>
    `;
    tableBody.appendChild(tr);
  });
}

// Update top stats
function updateStats() {
  totalEl.textContent = `Total: ${advisories.length}`;
  const criticalCount = advisories.filter(a => a.severity.toLowerCase() === "critical").length;
  criticalEl.textContent = `Critical: ${criticalCount}`;
  lastUpdatedEl.textContent = `Last Updated: ${new Date().toLocaleString()}`;
}

// Filter by search and severity
function filterAdvisories() {
  const titleQuery = searchTitle.value.toLowerCase();
  const vendorQuery = searchVendor.value.toLowerCase();
  const cveQuery = searchCVE.value.toLowerCase();
  const severity = severityFilter.value.toLowerCase();

  const filtered = advisories.filter(a => {
    const matchesTitle = a.title.toLowerCase().includes(titleQuery) || (a.summary && a.summary.toLowerCase().includes(titleQuery));
    const matchesVendor = vendorQuery ? (a.vendor && a.vendor.toLowerCase().includes(vendorQuery)) : true;
    const matchesCVE = cveQuery ? (a.cve && a.cve.toLowerCase().includes(cveQuery)) : true;
    const matchesSeverity = severity ? a.severity.toLowerCase() === severity : true;
    return matchesTitle && matchesVendor && matchesCVE && matchesSeverity;
  });

  displayAdvisories(filtered);
}

// Event listeners
searchTitle.addEventListener("input", filterAdvisories);
searchVendor.addEventListener("input", filterAdvisories);
searchCVE.addEventListener("input", filterAdvisories);
severityFilter.addEventListener("change", filterAdvisories);

// Initial load
loadAdvisories();
