console.log("✅ profile.js loaded");

window.addEventListener("error", function (e) {
  console.error("Runtime error on index.html:", e.message, e);
});

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ DOM fully loaded");

    const token = localStorage.getItem("jwt");
    console.log("📦 Retrieved token:", token);

    // Check if token looks like a valid JWT
    if (!token || !isValidToken(token)) {
        console.warn("❌ Invalid or missing token, redirecting to login.");
        localStorage.removeItem("jwt");
        window.location.href = "login.html";
        return;
    }

    console.log("✅ Valid token found, fetching profile...");
    fetchProfile();
});

// Logout function
function logout() {
    localStorage.removeItem("jwt");
    window.location.href = "login.html";
}

// Show error message on page
function showError(message) {
    const errorMsg = document.getElementById("error");
    errorMsg.textContent = message;
    errorMsg.style.display = "block";
}

// Validate JWT format
function isValidToken(token) {
    if (!token) return false;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        return parts.every(part => {
            try {
                return btoa(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) === 
                       part.replace(/-/g, '+').replace(/_/g, '/');
            } catch (e) {
                return false;
            }
        });
    } catch (e) {
        return false;
    }
}

// Render XP bar chart
function renderProjectXPBars(transactions) {
    const projectMap = {};
    transactions.forEach(tx => {
        const name = tx.object?.name || "Unknown";
        if (!projectMap[name]) {
            projectMap[name] = 0;
        }
        projectMap[name] += tx.amount;
    });

    const entries = Object.entries(projectMap);
    const maxXP = Math.max(...entries.map(([_, xp]) => xp));
    const barHeight = 25;
    const barSpacing = 10;
    const width = 600;

    const svgHeight = entries.length * (barHeight + barSpacing);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", svgHeight);

    entries.forEach(([name, xp], i) => {
        const y = i * (barHeight + barSpacing);
        const barWidth = (xp / maxXP) * (width - 150);

        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", 0);
        rect.setAttribute("y", y);
        rect.setAttribute("width", barWidth);
        rect.setAttribute("height", barHeight);
        rect.setAttribute("fill", "#4CAF50");
        svg.appendChild(rect);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", barWidth + 10);
        text.setAttribute("y", y + barHeight / 1.5);
        text.setAttribute("font-size", "14");
        text.textContent = `${name}: ${xp.toLocaleString()} XP`;
        svg.appendChild(text);
    });

    const container = document.getElementById("xpBars");
    container.innerHTML = "";
    container.appendChild(svg);
}

// Main data fetch
async function fetchProfile() {
    const query = `
        query {
            user {
                id
                login
            }
            transaction(where: { 
                type: { _eq: "xp" }
            }, order_by: {createdAt: asc}) {
                amount
                createdAt
                object {
                    name
                }
            }
            progress(where: { 
                object: { type: { _eq: "project" } }
            }) {
                grade
                createdAt
                object {
                    name
                }
            }
        }`;

    try {
        const token = localStorage.getItem("jwt");

        const response = await fetch("https://01.gritlab.ax/api/graphql-engine/v1/graphql", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ query })
        });

        const result = await response.json();

        if (result.errors) {
            throw new Error(result.errors[0].message);
        }

        const data = result.data;

        if (!data.user || !data.user[0]) {
            throw new Error("User data not found");
        }

        document.getElementById("username").textContent = data.user[0].login;

        const transactions = data.transaction || [];
        const totalXp = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        document.getElementById("xp").textContent = `${totalXp.toLocaleString()} XP`;

        const progress = data.progress || [];
        const skillMap = progress.reduce((acc, p) => {
            if (p.grade > 0) {
                const skillName = p.object.name.split('/')[0];
                if (!acc[skillName]) acc[skillName] = { completed: 0 };
                acc[skillName].completed++;
            }
            return acc;
        }, {});

        const skillsText = Object.entries(skillMap)
            .map(([name, stats]) => `${name}: ${stats.completed} completed`)
            .join(', ');
        document.getElementById("skills").textContent = skillsText;

        const xpProgressData = transactions.map((tx, index) => ({
            date: new Date(tx.createdAt),
            amount: tx.amount,
            total: transactions.slice(0, index + 1).reduce((sum, t) => sum + t.amount, 0)
        }));

        if (typeof renderXPProgressChart === "function") {
            renderXPProgressChart(xpProgressData);
        }
        if (typeof renderProjectStats === "function") {
            renderProjectStats({
                pass: progress.filter(p => p.grade >= 1).length,
                fail: progress.filter(p => p.grade < 1).length
            });
        }

        renderProjectXPBars(transactions);

    } catch (err) {
        showError(err.message);
        console.error('❌ Fetch Error:', err);
        if (err.message.includes("JWT")) {
            localStorage.removeItem("jwt");
            setTimeout(() => {
                window.location.href = "./login.html";
            }, 2000);
        }
    }
}
