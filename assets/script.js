let advisories = [];

// Map severity to badge colors
const severityColors = {
  Critical: "bg-red-500 text-white",
  High: "bg-orange-500 text-white",
  Medium: "bg-yellow-400 text-gray-800",
  Low: "bg-green-400 text-gray-800",
  Unknown: "bg-gray-300 text-gray-800"
};

// Fetch advisories JSON
async function loadAdvisories() {
  try {
    const res = await fetch("data/advisories.json");
    advisories = await res.json();
    updateDashboard();
  } catch (err) {
    console.error("Failed to load advisories:", err);
    document.getElementById("advisories").innerHTML =
      "<p class='text-red-500 col-span-full'>Failed to load advisories.</p>";
  }
}

// Render advisories to the page
function renderAdvisories(advisoriesList) {
  const container = document.getElementById("advisories");
  container.innerHTML = "";

  if (advisoriesList.length === 0) {
    container.innerHTML = "<p class='text-gray-500 col-span-full'>No advisories found.</p>";
    return;
  }

  advisoriesList.forEach(a => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition flex flex-col justify-between";

    card.innerHTML = `
      <div>
        <h2 class="text-xl font-semibold mb-2">
          <a href="${a.link}" target="_blank" class="text-indigo-700 hover:underline">${a.title}</a>
        </h2>
        <div class="flex items-center mb-3 space-x-2">
          <span class="text-gray-500 text-sm">${new Date(a.date).toLocaleString()}</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${severityColors[a.severity || 'Unknown']}">${a.severity || 'Unknown'}</span>
        </div>
        <p class="text-gray-700">${a.summary}</p>
      </div>
    `;

    container.appendChild(card);
  });
}

// Apply search and date filters
function applyFilters(advisoriesList) {
  const query = document.getElementById("search").value.toLowerCase();
  const fromDate = new Date(document.getElementById("fromDate").value);
  const toDate = new Date(document.getElementById("toDate").value);

  return advisoriesList.filter(a => {
    const matchesQuery =
      a.title.toLowerCase().includes(query) ||
      a.summary.toLowerCase().includes(query);

    const advisoryDate = new Date(a.date);
    const afterFrom = isNaN(fromDate) || advisoryDate >= fromDate;
    const beforeTo = isNaN(toDate) || advisoryDate <= toDate;

    return matchesQuery && afterFrom && beforeTo;
  });
}

// Update the dashboard
function updateDashboard() {
  const filtered = applyFilters(advisories);
  renderAdvisories(filtered);
}

// Set up event listeners for filters
document.getElementById("search").addEventListener("input", updateDashboard);
document.getElementById("fromDate").addEventListener("change", updateDashboard);
document.getElementById("toDate").addEventListener("change", updateDashboard);

// Initial load
loadAdvisories();
