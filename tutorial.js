document.addEventListener("DOMContentLoaded", async () => {
    const currentUserRaw = localStorage.getItem("currentUser");
    const message = document.getElementById("tutorial-message");
    const addButton = document.getElementById("add-tutorial-btn");
    const formPanel = document.getElementById("tutorial-form-panel");
    const form = document.getElementById("tutorial-form");
    const closeButton = document.getElementById("tutorial-form-close");
    const resetButton = document.getElementById("tutorial-form-reset");
    const titleInput = document.getElementById("tutorial-title");
    const descriptionInput = document.getElementById("tutorial-description");
    const mediaTypeInput = document.getElementById("tutorial-media-type");
    const mediaInput = document.getElementById("tutorial-media-input");
    const imagePreview = document.getElementById("tutorial-image-preview");
    const videoPreview = document.getElementById("tutorial-video-preview");
    const uploadEmpty = document.getElementById("tutorial-upload-empty");
    const tutorialGrid = document.querySelector(".tutorial-grid");

    let currentUser = null;
    let selectedMediaData = "";
    let selectedMediaType = "image";

    const setMessage = (text, type = "") => {
        if (!message) {
            return;
        }

        message.textContent = text;
        message.className = `tutorial-message ${type}`.trim();
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

    const saveCurrentUser = (user) => {
        const { profileImage, ...storageUser } = user || {};
        localStorage.setItem("currentUser", JSON.stringify(storageUser));
    };

    const loadCurrentUser = async () => {
        if (!currentUserRaw) {
            return null;
        }

        try {
            const storedUser = JSON.parse(currentUserRaw);
            const sessionData = await apiFetchJSON("/api/auth/me");

            if (String(sessionData.user.id) !== String(storedUser.id)) {
                throw new Error("Signed in account changed.");
            }

            saveCurrentUser(sessionData.user);
            return sessionData.user;
        } catch (error) {
            localStorage.removeItem("currentUser");
            return null;
        }
    };

    const resetMediaSelection = () => {
        selectedMediaData = "";
        selectedMediaType = mediaTypeInput?.value || "image";

        if (mediaInput) {
            mediaInput.value = "";
        }

        if (imagePreview) {
            imagePreview.hidden = true;
            imagePreview.removeAttribute("src");
        }

        if (videoPreview) {
            videoPreview.hidden = true;
            videoPreview.removeAttribute("src");
            videoPreview.load();
        }

        if (uploadEmpty) {
            uploadEmpty.hidden = false;
        }
    };

    const openFormPanel = () => {
        formPanel?.classList.remove("is-hidden");
        formPanel?.setAttribute("aria-hidden", "false");
    };

    const closeFormPanel = () => {
        formPanel?.classList.add("is-hidden");
        formPanel?.setAttribute("aria-hidden", "true");
    };

    const renderTutorialCard = (tutorial) => {
        const isOwner = currentUser && String(tutorial.userId) === String(currentUser.id);
        const author = tutorial.artistName || "View artist profile";
        const media = tutorial.mediaType === "video"
            ? `<video src="${tutorial.imageUrl}" controls preload="metadata"></video>`
            : `<img src="${tutorial.imageUrl}" alt="${tutorial.title}">`;

        return `
            <article class="post-card tutorial-card" data-tutorial-id="${tutorial.id}">
                <div class="post-header">
                    <div class="mini-avatar"></div>
                    <a class="username" href="profile.html?userId=${encodeURIComponent(tutorial.userId)}">${author}</a>
                </div>
                <div class="video-preview">
                    ${media}
                </div>
                <h3 class="tutorial-card-title">${tutorial.title}</h3>
                <p class="tutorial-card-copy">${tutorial.description}</p>
                <div class="post-footer">
                    <a class="btn btn-secondary" href="profile.html?userId=${encodeURIComponent(tutorial.userId)}">View Profile</a>
                    ${isOwner
                        ? `<button class="btn btn-secondary tutorial-delete-btn" type="button" data-tutorial-id="${tutorial.id}">Remove</button>`
                        : ""}
                </div>
            </article>
        `;
    };

    const renderTutorials = (tutorials) => {
        if (!tutorialGrid) {
            return;
        }

        tutorialGrid.innerHTML = tutorials.length
            ? tutorials.map(renderTutorialCard).join("")
            : `<div class="tutorial-empty-state glass-panel">No tutorials have been posted yet.</div>`;
    };

    const loadTutorials = async () => {
        try {
            const data = await apiFetchJSON("/api/tutorials");
            renderTutorials(data.tutorials || []);
        } catch (error) {
            setMessage(error.message, "error");
        }
    };

    const deleteTutorial = async (tutorialId) => {
        if (!currentUser) {
            window.location.href = "auth.html";
            return;
        }

        try {
            await apiFetchJSON(`/api/users/${currentUser.id}/tutorials/${tutorialId}`, {
                method: "DELETE"
            });

            setMessage("Tutorial removed.", "success");
            await loadTutorials();
        } catch (error) {
            setMessage(error.message, "error");
        }
    };

    addButton?.addEventListener("click", async () => {
        if (!currentUser) {
            window.location.href = "auth.html";
            return;
        }

        openFormPanel();
        form?.scrollIntoView({ behavior: "smooth", block: "start" });
        titleInput?.focus();
    });

    closeButton?.addEventListener("click", () => {
        form?.reset();
        resetMediaSelection();
        setMessage("");
        closeFormPanel();
    });

    resetButton?.addEventListener("click", () => {
        form?.reset();
        resetMediaSelection();
        setMessage("");
    });

    mediaTypeInput?.addEventListener("change", resetMediaSelection);

    mediaInput?.addEventListener("change", () => {
        const [file] = mediaInput.files || [];

        if (!file) {
            resetMediaSelection();
            return;
        }

        const fileType = file.type.startsWith("video/") ? "video" : "image";
        selectedMediaType = fileType;

        if (mediaTypeInput) {
            mediaTypeInput.value = fileType;
        }

        const reader = new FileReader();
        reader.onload = () => {
            selectedMediaData = typeof reader.result === "string" ? reader.result : "";

            if (!selectedMediaData) {
                setMessage("Could not read the selected media.", "error");
                resetMediaSelection();
                return;
            }

            if (uploadEmpty) {
                uploadEmpty.hidden = true;
            }

            if (fileType === "video") {
                if (imagePreview) {
                    imagePreview.hidden = true;
                    imagePreview.removeAttribute("src");
                }

                if (videoPreview) {
                    videoPreview.src = selectedMediaData;
                    videoPreview.hidden = false;
                }
            } else if (imagePreview) {
                imagePreview.src = selectedMediaData;
                imagePreview.hidden = false;

                if (videoPreview) {
                    videoPreview.hidden = true;
                    videoPreview.removeAttribute("src");
                    videoPreview.load();
                }
            }
        };
        reader.onerror = () => {
            setMessage("Could not read the selected media.", "error");
            resetMediaSelection();
        };
        reader.readAsDataURL(file);
    });

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!currentUser) {
            window.location.href = "auth.html";
            return;
        }

        if (!selectedMediaData) {
            setMessage("Please choose an image or video for your tutorial.", "error");
            return;
        }

        setMessage("Saving tutorial...", "info");

        try {
            await apiFetchJSON(`/api/users/${currentUser.id}/tutorials`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title: titleInput.value.trim(),
                    description: descriptionInput.value.trim(),
                    imageUrl: selectedMediaData,
                    mediaType: selectedMediaType
                })
            });

            setMessage("Tutorial added.", "success");
            form.reset();
            resetMediaSelection();
            closeFormPanel();
            await loadTutorials();
        } catch (error) {
            setMessage(error.message, "error");
        }
    });

    tutorialGrid?.addEventListener("click", (event) => {
        const deleteButton = event.target.closest(".tutorial-delete-btn");
        if (!deleteButton) {
            return;
        }

        deleteTutorial(deleteButton.dataset.tutorialId);
    });

    currentUser = await loadCurrentUser();
    resetMediaSelection();
    closeFormPanel();
    await loadTutorials();
});
