document.addEventListener("DOMContentLoaded", () => {
    const changePasswordButton = document.getElementById("change-password-btn");
    const passwordMessage = document.getElementById("password-confirmation");
    const passwordMessageText = document.getElementById("password-confirmation-text");
    const saveBtn = document.getElementById("noti-settings");
    const checkboxes = document.querySelectorAll('.notification-settings input[type="checkbox"]');

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

    const showPasswordMessage = (text, type = "info") => {
        if (!passwordMessage || !passwordMessageText) {
            return;
        }

        passwordMessageText.textContent = text;
        passwordMessage.hidden = false;
        passwordMessage.className = `settings-message ${type}`.trim();
    };

    changePasswordButton?.addEventListener("click", async () => {
        const originalText = changePasswordButton.textContent;
        changePasswordButton.textContent = "Sending...";
        changePasswordButton.disabled = true;

        try {
            const result = await apiFetchJSON("/api/auth/password-reset-request", {
                method: "POST"
            });

            if (result.delivered) {
                changePasswordButton.textContent = "Email Sent";
                showPasswordMessage(
                    `Password reset instructions were sent to ${result.email}.`,
                    "success"
                );
                return;
            }

            changePasswordButton.textContent = originalText;
            changePasswordButton.disabled = false;
            showPasswordMessage(
                "Email delivery is not configured on this server yet. Add SMTP settings in Render/Railway, then try again.",
                "error"
            );
        } catch (error) {
            changePasswordButton.textContent = originalText;
            changePasswordButton.disabled = false;

            if (error.message.toLowerCase().includes("log in")) {
                showPasswordMessage("Please log in before requesting a password reset email.", "error");
                return;
            }

            showPasswordMessage(error.message, "error");
        }
    });

    checkboxes.forEach((checkbox) => {
        const savedValue = localStorage.getItem(checkbox.id);
        if (savedValue !== null) {
            checkbox.checked = savedValue === "true";
        }
    });

    saveBtn?.addEventListener("click", () => {
        checkboxes.forEach((checkbox) => {
            localStorage.setItem(checkbox.id, checkbox.checked);
        });

        const originalText = saveBtn.innerText;
        saveBtn.innerText = "Settings Saved!";
        saveBtn.style.backgroundColor = "#10b981";

        setTimeout(() => {
            saveBtn.innerText = originalText;
            saveBtn.style.backgroundColor = "";
        }, 2000);
    });
});
