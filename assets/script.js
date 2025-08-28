// Sample JSON data (replace with real JSON later)
const sampleAdvisories = [
  {
    title: "Critical Vulnerability in Fortinet Devices",
    link: "#",
    date: "Thu, 28 Aug 2025 10:00:00 GMT",
    severity: "Critical",
    summary: "ASD advises immediate patching of Fortinet appliances due to active exploitation."
  },
  {
    title: "Microsoft Exchange Zero-Day Exploited",
    link: "#",
    date: "Wed, 27 Aug 2025 09:30:00 GMT",
    severity: "High",
    summary: "State-sponsored actors are exploiting a new Exchange vulnerability. Apply patches urgently."
  },
  {
    title: "Phishing Campaigns Using AI",
    link: "#",
    date: "Tue, 26 Aug 2025 14:15:00 GMT",
    severity: "Medium",
    summary: "New phishing tactics leveraging AI have been observed. Users should remain vigilant."
  }
];

// Map severity to colors
const severityColors = {
  Critical: "bg-red-500 text-white",
  High: "bg-orange-500 text-white",
  Medium: "bg-yellow-400 text-gray-800",
  Low: "bg-green-400 text-gray-800"
};

function renderAdvisories(advisories) {
  const container = document.getElementById("advisories");
  container.innerHTML = "";

  if (advisories.length === 0) {
    container.innerHTML = "<p class='text-gray-500 col-span-full'>No advisories found.</p>";
    return;
  }

  advisories.forEach(a => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition flex flex-col justify-between";

    card.innerHTML = `
      <div>
        <h2 class="text-xl font-semibold mb-2">
          <a href="${a.link}" target="_blank" class="text-indigo-700 hover:underline">${a.title}</a>
        </h2>
        <div class="flex items-center mb-3 space-x-2">
          <span class="text-gray-500 text-sm">${new Date(a.date).toLocaleString()}</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${severityColors[a.severity] || 'bg-gray-300 text-gray-800'}">${a.severity || 'Unknown'}</span>
        </div>
        <p class="text-gray-700">${a.summary}</p>
      </div>
    `;

    container.appendChild(card);
  });
}

function applyFilters(advisories) {
  const query = document.getElementById("search").value.toLowerCase();
  const fromDate = new Date(document.getElementById("fromDate").value);
  const toDate = new Date(document.getElementById("toDate").value);

  return advisories.filter(a => {
    const matchesQuery =
      a.title.toLowerCase().includes(query) ||
      a.summary.toLowerCase().includes(query);

    const advisoryDate = new Date(a.date);
    const afterFrom = isNaN(fromDate) || advisoryDate >= fromDate;
    const beforeTo = isNaN(toDate) || advisoryDate <= toDate;

    return matchesQuery && afterFrom && beforeTo;
  });
}

function init() {
  function update() {
    const filtered = applyFilters(sampleAdvisories);
    renderAdvisories(filtered);
  }

  document.getElementById("search").addEventListener("input", update);
  document.getElementById("fromDate").addEventListener("change", update);
  document.getElementById("toDate").addEventListener("change", update);

  update();
}

init();
