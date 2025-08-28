const jsonUrl = "data/advisories.json";
const container = document.getElementById("advisories-container");

async function fetchAdvisories() {
  try {
    const res = await fetch(`${jsonUrl}?t=${new Date().getTime()}`);
    const advisories = await res.json();

    container.innerHTML = "";

    advisories.forEach(a => {
      const card = document.createElement("div");
      card.classList.add("advisory-card");
      card.innerHTML = `
        <h3>${a.title}</h3>
        <p><strong>Date:</strong> ${a.date}</p>
        <p>${a.summary}</p>
        <p><strong>Severity:</strong> ${a.severity}</p>
        <a href="${a.link}" target="_blank">Read more</a>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load advisories:", err);
    container.innerHTML = "<p>Failed to load advisories.</p>";
  }
}

// Fetch every minute
fetchAdvisories();
setInterval(fetchAdvisories, 60000);
