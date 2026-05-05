document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("reset-password-form");
    const passwordInput = document.getElementById("reset-password");
    const confirmInput = document.getElementById("reset-password-confirm");
    const message = document.getElementById("reset-password-message");
    const token = new URLSearchParams(window.location.search).get("token") || "";

    const setMessage = (text, type = "") => {
        if (!message) {
            return;
        }

        message.textContent = text;
        message.className = `auth-message ${type}`.trim();
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

    const apiFetchJSON = async (url, options = {}) => {
        const response = await fetch(url, options);
        const data = await readResponsePayload(response);

        if (!response.ok) {
            throw new Error(data.error || "Request failed.");
        }

        return data;
    };

    if (!token) {
        setMessage("This password reset link is missing a token.", "error");
        form?.querySelectorAll("input, button").forEach((control) => {
            control.disabled = true;
        });
        return;
    }

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const password = passwordInput.value;
        const confirmPassword = confirmInput.value;

        if (password !== confirmPassword) {
            setMessage("Passwords do not match.", "error");
            return;
        }

        setMessage("Updating password...", "info");

        try {
            await apiFetchJSON("/api/auth/password-reset-complete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token,
                    password
                })
            });

            localStorage.removeItem("currentUser");
            setMessage("Password updated. You can now log in with your new password.", "success");
            form.reset();
            form.querySelectorAll("input, button").forEach((control) => {
                control.disabled = true;
            });
        } catch (error) {
            setMessage(error.message, "error");
        }
    });
});
