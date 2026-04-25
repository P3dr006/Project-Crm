// Base URL of our FastAPI backend
const API_URL = "http://localhost:8000";

// Select DOM elements
const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");

// Listen for the form submission event
loginForm.addEventListener("submit", async (event) => {
    // Prevent the default browser behavior (which reloads the page)
    event.preventDefault();

    // Hide any previous errors
    errorMessage.classList.add("hidden");
    errorMessage.textContent = "";

    // Extract values from the input fields
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        // Send a POST request to the backend API
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: email, password: password }),
        });

        // Check if the status code is an error (like 401 Unauthorized)
        if (!response.ok) {
            // If the backend says unauthorized, we show the standard secure message
            if (response.status === 401) {
                throw new Error("E-mail ou senha incorretos."); 
            }
            // For any other server errors
            throw new Error("Erro no servidor. Tente novamente mais tarde.");
        }

        // Parse the JSON response only if the request was successful
        const data = await response.json();

        // --- SUCCESS ---
        console.log("✅ User logged in:", data);

        // SAVE THE TOKEN AND USER DATA IN THE BROWSER
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        alert(`Welcome back, ${data.user.full_name}!`);
        // Redirect to the Dashboard (We will build this next)
        // window.location.href = "dashboard.html";

    } catch (error) {
        // --- ERROR HANDLING ---
        console.error("❌ Login error:", error);
        
        // This injects the text into our HTML and makes the red box visible
        errorMessage.textContent = error.message;
        errorMessage.classList.remove("hidden");
        
        // Optional touch: shake animation or clear the password field
        document.getElementById("password").value = "";
    }
});