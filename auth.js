document.addEventListener("DOMContentLoaded", async () => {
    const tabs = document.querySelectorAll(".auth-tab");
    const forms = {
        login: document.getElementById("login-form"),
        signup: document.getElementById("signup-form")
    };
    const message = document.getElementById("auth-message");
    const authPanel = document.getElementById("auth-panel");
    const sessionPanel = document.getElementById("auth-session-panel");
    const sessionName = document.getElementById("auth-session-name");
    const logoutButton = document.getElementById("auth-logout-btn");

    if (!tabs.length || !forms.login || !forms.signup) return;

    const getCurrentUser = () => {
        const raw = localStorage.getItem("currentUser");

        if (!raw) {
            return null;
        }

        try {
            const user = JSON.parse(raw);
            return user && user.id && user.name ? user : null;
        } catch (error) {
            return null;
        }
    };

    const setMessage = (text, type = "") => {
        if (!message) return;
        message.textContent = text;
        message.className = `auth-message ${type}`.trim();
    };

    const setActiveTab = (tabName) => {
        tabs.forEach((tab) => {
            const isActive = tab.dataset.authTab === tabName;
            tab.classList.toggle("active", isActive);
            tab.setAttribute("aria-selected", String(isActive));
        });

        Object.entries(forms).forEach(([name, form]) => {
            form.classList.toggle("active", name === tabName);
        });

        setMessage("");
    };

    const saveUser = (user) => {
        localStorage.setItem("currentUser", JSON.stringify(user));
    };

    const clearUser = () => {
        localStorage.removeItem("currentUser");
    };

    const readResponsePayload = async (response) => {
        const raw = await response.text();

        if (!raw) {
            return {};
        }

        try {
            return JSON.parse(raw);
        } catch (error) {
            throw new Error("The server returned an unexpected response.");
        }
    };

    const setSignedInState = (user) => {
        const isSignedIn = Boolean(user);

        if (sessionPanel) {
            sessionPanel.hidden = !isSignedIn;
        }

        if (authPanel) {
            authPanel.hidden = isSignedIn;
        }

        if (sessionName && user) {
            sessionName.textContent = user.name;
        }

        if (isSignedIn) {
            setMessage("You are signed in. Continue to your profile or log out to use another account.", "info");
        } else {
            setMessage("");
        }
    };

    setSignedInState(null);

    const submitAuth = async (event, endpoint, payload) => {
        event.preventDefault();
        setMessage("Working...", "info");

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await readResponsePayload(response);

            if (!response.ok) {
                const fallbackMessage = endpoint === "/api/auth/login"
                    ? "Unable to log in with those details."
                    : "Unable to create your account right now.";
                throw new Error(data.error || fallbackMessage);
            }

            saveUser(data.user);
            window.location.href = "profile.html";
        } catch (error) {
            setMessage(error.message, "error");
        }
    };

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            setActiveTab(tab.dataset.authTab);
        });
    });

    forms.login.addEventListener("submit", (event) => {
        submitAuth(event, "/api/auth/login", {
            email: document.getElementById("login-email").value.trim(),
            password: document.getElementById("login-password").value
        });
    });

    forms.signup.addEventListener("submit", (event) => {
        submitAuth(event, "/api/auth/signup", {
            name: document.getElementById("signup-name").value.trim(),
            email: document.getElementById("signup-email").value.trim(),
            password: document.getElementById("signup-password").value
        });
    });

    logoutButton?.addEventListener("click", async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch (error) {
            // Local cleanup still signs the browser out visually.
        }

        clearUser();
        setSignedInState(null);
        setActiveTab("login");
    });

    const currentUser = getCurrentUser();

    if (!currentUser) {
        clearUser();
        return;
    }

    try {
        const response = await fetch("/api/auth/me");
        const data = await readResponsePayload(response);

        if (!response.ok) {
            throw new Error(data.error || "Session expired.");
        }

        saveUser(data.user);
        setSignedInState(data.user);
    } catch (error) {
        clearUser();
        setSignedInState(null);
    }
});
