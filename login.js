console.log("login.js loaded ✅");
window.addEventListener("error", (e) => {
    console.error("Global Error:", e.message);
});

function isValidToken(token) {
    if (!token) return false;
    const parts = token.split('.');
    return parts.length === 3 && parts.every(Boolean);
}


document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Form submitted 🚀");
    
    try {
        const user = document.getElementById("user").value;
        const pass = document.getElementById("pass").value;
        const error = document.getElementById("error");
        
        console.log("User:", user);
        console.log("Pass:", pass ? "*****" : "(empty)");

        // Clear previous error
        error.textContent = "";
        error.style.display = "none";

        // Create Base64 credentials
        const credentials = btoa(`${user}:${pass}`);
        console.log("Credentials (Base64):", credentials);

        console.log("Attempting login...");

        const response = await fetch("https://01.gritlab.ax/api/auth/signin", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${credentials}`
            }
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
            throw new Error("Invalid username or password");
        }

        let token = (await response.text()).trim();
        console.log("Raw token:", token);

        if (token.startsWith('"') && token.endsWith('"')) {
            token = token.slice(1, -1);
            console.log("Stripped token:", token);
        }
        localStorage.setItem("jwt", token);

        // Validate token
        if (isValidToken(token)) {
            localStorage.setItem("jwt", token);
            console.log("Token saved in localStorage:", localStorage.getItem("jwt"));
            console.log("Redirecting to index.html...");
            window.location.href = "index.html";
        } else {
            throw new Error("Invalid token received");
        }

    } catch (err) {
        console.error("Login error:", err);
        const error = document.getElementById("error");
        error.textContent = err.message;
        error.style.display = "block";
    }
});


// Check if already logged in
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem("jwt");
    if (isValidToken(token)) {
        window.location.replace("index.html");
    }
});

window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
});
