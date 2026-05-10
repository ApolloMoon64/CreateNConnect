document.addEventListener("DOMContentLoaded", async () => {
    const currentUserRaw = localStorage.getItem("currentUser");
    const message = document.getElementById("commission-message");
    const categorySections = document.querySelectorAll(".category-section");
    const formPanel = document.getElementById("commission-form-panel");
    const form = document.getElementById("commission-form");
    const categoryInput = document.getElementById("commission-category");
    const titleInput = document.getElementById("commission-title");
    const artistInput = document.getElementById("commission-artist");
    const priceInput = document.getElementById("commission-price");
    const imageInput = document.getElementById("commission-image-input");
    const imagePreview = document.getElementById("commission-image-preview");
    const imageEmptyState = document.getElementById("commission-upload-empty");
    const formTitle = document.getElementById("commission-form-title");
    const categoryBadge = document.getElementById("commission-form-category-badge");
    const resetButton = document.getElementById("commission-form-reset");
    const closeButton = document.getElementById("commission-form-close");

    if (!currentUserRaw) {
        window.location.href = "auth.html";
        return;
    }

    const currentUser = JSON.parse(currentUserRaw);
    let selectedImageData = "";

    const setMessage = (text, type = "") => {
        if (!message) {
            return;
        }

        message.textContent = text;
        message.className = `commission-message ${type}`.trim();
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

    try {
        const sessionData = await apiFetchJSON("/api/auth/me");

        if (String(sessionData.user.id) !== String(currentUser.id)) {
            throw new Error("Signed in account changed.");
        }

        saveCurrentUser(sessionData.user);
    } catch (error) {
        localStorage.removeItem("currentUser");
        window.location.href = "auth.html";
        return;
    }

    const categories = {
        digital: document.getElementById("digital-grid"),
        pottery: document.getElementById("pottery-grid"),
        jewelry: document.getElementById("jewelry-grid"),
        music: document.getElementById("music-grid"),
        crochet: document.getElementById("crochet-grid")
    };

    const categoryLabels = {
        digital: "Digital Art",
        pottery: "Pottery",
        jewelry: "Jewelry",
        music: "Music",
        crochet: "Crochet"
    };

    const renderCommission = (commission) => {
        const isOwner = String(commission.userId) === String(currentUser.id);
        const isAvailable = commission.availabilityStatus === "available";
        const buyerActions = isAvailable
            ? `<div class="commission-card-actions">
                <button
                    class="btn btn-primary purchase-art-btn"
                    type="button"
                    data-purchase-item-type="commission"
                    data-purchase-item-id="${encodeURIComponent(commission.id)}"
                    data-purchase-title="${encodeURIComponent(commission.title)}"
                    data-purchase-artist="${encodeURIComponent(commission.artist)}"
                    data-purchase-price="${encodeURIComponent(`$${Number(commission.price).toFixed(2)}`)}"
                >
                    Purchase
                </button>
                <button
                    class="btn btn-secondary trade-art-btn"
                    type="button"
                    data-trade-item-type="commission"
                    data-trade-item-id="${encodeURIComponent(commission.id)}"
                    data-trade-title="${encodeURIComponent(commission.title)}"
                    data-trade-artist="${encodeURIComponent(commission.artist)}"
                >
                    Trade
                </button>
            </div>`
            : `<span class="content-card-status">${commission.availabilityStatus === "traded" ? "Traded" : "Unavailable"}</span>`;

        return `
            <article class="commission-card glass-panel" data-commission-id="${commission.id}">
                <img src="${commission.image}" alt="${commission.title}">
                <h3>${commission.title}</h3>
                <p>
                    Artist:
                    <a class="content-card-author" href="profile.html?userId=${encodeURIComponent(commission.userId)}">
                        ${commission.artist}
                    </a>
                </p>
                <p>$${Number(commission.price).toFixed(2)}</p>
                ${isOwner
                    ? `<button class="btn btn-secondary commission-delete-btn" data-commission-id="${commission.id}" type="button">Remove</button>`
                    : buyerActions}
            </article>
        `;
    };

    const renderEmptyState = (label) => `
        <div class="glass-panel commission-empty-state">
            No ${label} commissions yet. Add your first one.
        </div>
    `;

    const resetImageSelection = () => {
        selectedImageData = "";
        if (imageInput) {
            imageInput.value = "";
        }

        if (imagePreview) {
            imagePreview.hidden = true;
            imagePreview.removeAttribute("src");
        }

        if (imageEmptyState) {
            imageEmptyState.hidden = false;
        }
    };

    const closeFormPanel = () => {
        formPanel.classList.add("is-hidden");
        formPanel.setAttribute("aria-hidden", "true");
    };

    const openFormPanel = () => {
        formPanel.classList.remove("is-hidden");
        formPanel.setAttribute("aria-hidden", "false");
    };

    const setActiveCategory = (category) => {
        const label = categoryLabels[category] || "Commission";
        categoryInput.value = category;

        if (formTitle) {
            formTitle.textContent = `Add ${label}`;
        }

        if (categoryBadge) {
            categoryBadge.textContent = category;
        }
    };

    const renderGroupedCommissions = (commissions) => {
        Object.entries(categories).forEach(([category, grid]) => {
            if (!grid) {
                return;
            }

            const categoryCommissions = commissions.filter(
                (commission) => (commission.category || "digital") === category
            );

            grid.innerHTML = categoryCommissions.length
                ? categoryCommissions.map(renderCommission).join("")
                : renderEmptyState(category);
        });
    };

    const loadCommissions = async () => {
        try {
            const data = await apiFetchJSON("/api/commissions");
            renderGroupedCommissions(data.commissions || []);
        } catch (error) {
            setMessage(error.message, "error");
        }
    };

    const deleteCommission = async (commissionId) => {
        try {
            await apiFetchJSON(`/api/commissions/${commissionId}?userId=${encodeURIComponent(currentUser.id)}`, {
                method: "DELETE"
            });

            setMessage("Commission removed.", "success");
            await loadCommissions();
        } catch (error) {
            setMessage(error.message, "error");
        }
    };

    document.querySelectorAll("[data-add-commission]").forEach((button) => {
        button.addEventListener("click", () => {
            const category = button.dataset.addCommission;
            setActiveCategory(category);
            openFormPanel();
            form?.scrollIntoView({ behavior: "smooth", block: "start" });
            titleInput?.focus();
        });
    });

    imageInput?.addEventListener("change", () => {
        const [file] = imageInput.files || [];

        if (!file) {
            resetImageSelection();
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            selectedImageData = typeof reader.result === "string" ? reader.result : "";

            if (!selectedImageData) {
                setMessage("Could not read the selected image.", "error");
                resetImageSelection();
                return;
            }

            if (imagePreview) {
                imagePreview.src = selectedImageData;
                imagePreview.hidden = false;
            }

            if (imageEmptyState) {
                imageEmptyState.hidden = true;
            }
        };
        reader.onerror = () => {
            setMessage("Could not read the selected image.", "error");
            resetImageSelection();
        };
        reader.readAsDataURL(file);
    });

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!selectedImageData) {
            setMessage("Please choose an image of your artwork to create the commission.", "error");
            return;
        }

        setMessage("Saving commission...", "info");

        try {
            await apiFetchJSON("/api/commissions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    title: titleInput.value.trim(),
                    artist: artistInput.value.trim() || currentUser.name || "",
                    category: categoryInput.value,
                    price: priceInput.value,
                    image: selectedImageData
                })
            });

            setMessage("Commission added.", "success");
            form.reset();
            artistInput.value = currentUser.name || "";
            resetImageSelection();
            closeFormPanel();
            await loadCommissions();
        } catch (error) {
            setMessage(error.message, "error");
        }
    });

    resetButton?.addEventListener("click", () => {
        form?.reset();
        artistInput.value = currentUser.name || "";
        resetImageSelection();
        setMessage("");
    });

    closeButton?.addEventListener("click", () => {
        form?.reset();
        artistInput.value = currentUser.name || "";
        resetImageSelection();
        setMessage("");
        closeFormPanel();
    });

    categorySections.forEach((section) => {
        section.addEventListener("click", (event) => {
            const deleteButton = event.target.closest(".commission-delete-btn");
            if (!deleteButton) return;

            deleteCommission(deleteButton.dataset.commissionId);
        });
    });

    artistInput.value = currentUser.name || "";
    setActiveCategory("digital");
    resetImageSelection();
    closeFormPanel();
    loadCommissions();
});

function showCategory(categoryId, element) {
    document.querySelectorAll(".category-section").forEach((section) => {
        section.classList.remove("active");
    });

    const selectedSection = document.getElementById(categoryId);
    if (selectedSection) {
        selectedSection.classList.add("active");
    }

    document.querySelectorAll(".side-nav-item").forEach((item) => {
        item.classList.remove("active");
    });

    if (element) {
        element.classList.add("active");
    }
}
