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

// Check if token is a valid JWT
function isValidToken(token) {
    if (!token) return false;
    const parts = token.split('.');
    return parts.length === 3 && parts.every(Boolean);
}

// Main data fetch
async function fetchProfile() {
    const query = `
        query {
            user {
                id
                login
            }
            transaction(
                where: {
                _and: [
                    { event: { path: { _eq: "/gritlab/school-curriculum" }}},
                    { type: { _eq: "xp" } }
                ]
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
            object(where: {type: {_eq: "project"}, name: {_ilike: "%javascript%"}}) {
                name
                type
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

        const completedProjects = progress
            .filter(p => p.grade > 0 && p.object && p.object.name && p.object.name.includes(""))
            .map(p => p.object.name);

        document.getElementById("skills").textContent =
            completedProjects.length > 0
                ? "Completed projects: " + completedProjects.join(", ")
                : "No completed projects yet.";

        const xpProgressData = transactions.map((tx, index) => ({
            date: new Date(tx.createdAt),
            amount: tx.amount,
            total: transactions.slice(0, index + 1).reduce((sum, t) => sum + t.amount, 0)
        }));

        if (typeof renderXPProgressChart === "function") {
            renderXPProgressChart(xpProgressData);
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
