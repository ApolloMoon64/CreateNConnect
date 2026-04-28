document.addEventListener("DOMContentLoaded", async () => {
    const currentUserRaw = localStorage.getItem("currentUser");
    const logoutButton = document.getElementById("profile-logout-btn");
    const deleteButton = document.getElementById("profile-delete-btn");
    const editButton = document.getElementById("profile-edit-btn");
    const profileImageInput = document.getElementById("profile-image-input");
    const profileAvatarEditor = document.querySelector(".profile-avatar-editor");
    const tabButtons = document.querySelectorAll("[data-profile-tab]");
    const tabPanels = document.querySelectorAll("[data-profile-panel]");
    const addContentButtons = document.querySelectorAll("[data-add-content]");
    const postsGrid = document.getElementById("profile-posts-grid");
    const commissionsGrid = document.getElementById("profile-commissions-grid");
    const tutorialsGrid = document.getElementById("profile-tutorials-grid");
    const portfolioGrid = document.getElementById("profile-portfolio-grid");
    const postFormPanel = document.getElementById("post-form-panel");
    const commissionFormPanel = document.getElementById("commission-profile-form-panel");
    const portfolioFormPanel = document.getElementById("portfolio-form-panel");
    const tutorialFormPanel = document.getElementById("tutorial-form-panel");
    const postForm = document.getElementById("post-form");
    const commissionForm = document.getElementById("commission-profile-form");
    const tutorialForm = document.getElementById("tutorial-form");
    const portfolioForm = document.getElementById("portfolio-form");
    const postTitleInput = document.getElementById("post-title");
    const postCaptionInput = document.getElementById("post-caption");
    const commissionTitleInput = document.getElementById("commission-profile-title");
    const commissionPriceInput = document.getElementById("commission-profile-price");
    const commissionCategoryInput = document.getElementById("commission-profile-category");
    const commissionImageInput = document.getElementById("commission-profile-image-input");
    const commissionImagePreview = document.getElementById("commission-profile-image-preview");
    const commissionUploadEmpty = document.getElementById("commission-profile-upload-empty");
    const postImageInput = document.getElementById("post-image-input");
    const postImagePreview = document.getElementById("post-image-preview");
    const postUploadEmpty = document.getElementById("post-upload-empty");
    const postResetButton = document.getElementById("post-form-reset");
    const commissionResetButton = document.getElementById("commission-profile-form-reset");
    const postCloseButton = document.getElementById("post-form-close");
    const commissionCloseButton = document.getElementById("commission-profile-form-close");
    const portfolioTitleInput = document.getElementById("portfolio-title");
    const tutorialTitleInput = document.getElementById("tutorial-title");
    const portfolioSummaryInput = document.getElementById("portfolio-summary");
    const tutorialDescriptionInput = document.getElementById("tutorial-description");
    const portfolioImageInput = document.getElementById("portfolio-image-input");
    const tutorialImageInput = document.getElementById("tutorial-image-input");
    const portfolioImagePreview = document.getElementById("portfolio-image-preview");
    const tutorialImagePreview = document.getElementById("tutorial-image-preview");
    const tutorialVideoPreview = document.getElementById("tutorial-video-preview");
    const portfolioUploadEmpty = document.getElementById("portfolio-upload-empty");
    const tutorialUploadEmpty = document.getElementById("tutorial-upload-empty");
    const portfolioResetButton = document.getElementById("portfolio-form-reset");
    const tutorialResetButton = document.getElementById("tutorial-form-reset");
    const portfolioCloseButton = document.getElementById("portfolio-form-close");
    const tutorialCloseButton = document.getElementById("tutorial-form-close");

    if (!currentUserRaw) {
        window.location.href = "auth.html";
        return;
    }

    const currentUser = JSON.parse(currentUserRaw);
    const profileImageStorageKey = `profileImage_${currentUser.id}`;

    const setActiveTab = (tabName) => {
        tabButtons.forEach((button) => {
            const isActive = button.dataset.profileTab === tabName;
            button.classList.toggle("active", isActive);
            button.setAttribute("aria-selected", String(isActive));
        });

        tabPanels.forEach((panel) => {
            panel.classList.toggle("active", panel.dataset.profilePanel === tabName);
        });
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

    try {
        const sessionData = await apiFetchJSON("/api/auth/me");

        if (String(sessionData.user.id) !== String(currentUser.id)) {
            throw new Error("Signed in account changed.");
        }

        localStorage.setItem("currentUser", JSON.stringify(sessionData.user));
    } catch (error) {
        localStorage.removeItem("currentUser");
        window.location.href = "auth.html";
        return;
    }

    const pickImageFromDevice = () => new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        let settled = false;

        const finish = (value) => {
            if (settled) {
                return;
            }

            settled = true;
            resolve(value);
        };

        input.addEventListener("change", () => {
            const [file] = input.files || [];

            if (!file) {
                finish("");
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const result = typeof reader.result === "string" ? reader.result : "";
                finish(result);
            };
            reader.onerror = () => {
                reject(new Error("Could not read the selected image."));
            };
            reader.readAsDataURL(file);
        });

        input.addEventListener("cancel", () => {
            finish("");
        });

        input.click();
    });

    let selectedPostImageData = "";
    let selectedCommissionImageData = "";
    let selectedTutorialImageData = "";
    let selectedTutorialMediaType = "image";
    let selectedPortfolioImageData = "";

    const hidePanel = (panel) => {
        if (!panel) {
            return;
        }

        panel.classList.add("is-hidden");
        panel.setAttribute("aria-hidden", "true");
    };

    const showPanel = (panel) => {
        if (!panel) {
            return;
        }

        panel.classList.remove("is-hidden");
        panel.setAttribute("aria-hidden", "false");
    };

    const resetUploadPreview = ({ input, preview, emptyState, onReset }) => {
        if (input) {
            input.value = "";
        }

        if (preview) {
            preview.hidden = true;
            preview.removeAttribute("src");
        }

        if (emptyState) {
            emptyState.hidden = false;
        }

        onReset();
    };

    const readDeviceImage = (file, onSuccess, onError) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            onSuccess(result);
        };
        reader.onerror = () => {
            onError();
        };
        reader.readAsDataURL(file);
    };

    const renderEmptyCard = (title, copy) => `
        <article class="post-card post-content-card glass-panel-lite post-empty-card">
            <span class="content-card-kicker">${title}</span>
            <p class="content-card-copy">${copy}</p>
        </article>
    `;

    const renderPostCard = (post) => `
        <article class="post-card post-content-card glass-panel-lite">
            <img class="content-card-image" src="${post.mediaUrl}" alt="${post.title}">
            <div class="content-card-body">
                <span class="content-card-kicker">Post</span>
                <h3 class="content-card-title">${post.title}</h3>
                <p class="content-card-copy">${post.caption}</p>
            </div>
        </article>
    `;

    const renderCommissionCard = (commission) => `
        <article class="post-card post-content-card glass-panel-lite">
            <img class="content-card-image" src="${commission.image}" alt="${commission.title}">
            <div class="content-card-body">
                <span class="content-card-kicker">Commission</span>
                <h3 class="content-card-title">${commission.title}</h3>
                <p class="content-card-copy">$${Number(commission.price).toFixed(2)} · ${commission.category}</p>
            </div>
        </article>
    `;


    const renderPortfolioCard = (item) => `
        <article class="post-card post-content-card glass-panel-lite">
            <img class="content-card-image" src="${item.imageUrl}" alt="${item.title}">
            <div class="content-card-body">
                <span class="content-card-kicker">Portfolio</span>
                <h3 class="content-card-title">${item.title}</h3>
                <p class="content-card-copy">${item.summary}</p>
            </div>
        </article>
    `;

    const renderTutorialCard = (tutorial) => `
        <article class="post-card post-content-card glass-panel-lite">
            ${tutorial.mediaType === "video"
                ? `<video class="content-card-image" src="${tutorial.imageUrl}" controls preload="metadata"></video>`
                : `<img class="content-card-image" src="${tutorial.imageUrl}" alt="${tutorial.title}">`}
            <div class="content-card-body">
                <span class="content-card-kicker">Tutorial</span>
                <h3 class="content-card-title">${tutorial.title}</h3>
                <p class="content-card-copy">${tutorial.description}</p>
            </div>
        </article>
    `;

    const createAddCardMarkup = (section) => {
        const cards = {
            posts: `
                <button class="post-card add-post-card glass-panel-lite" type="button" data-add-content="posts">
                    <span class="add-post-icon"><i class="ph ph-plus"></i></span>
                    <span class="add-post-title">Add Post</span>
                    <span class="add-post-copy">Open the post editor and upload an image from your device.</span>
                </button>
            `,
            commissions: `
                <button class="post-card add-post-card glass-panel-lite" type="button" data-add-content="commissions">
                    <span class="add-post-icon"><i class="ph ph-plus"></i></span>
                    <span class="add-post-title">Add Commission</span>
                    <span class="add-post-copy">Open the commission editor and upload a sample from your device.</span>
                </button>
            `,
            portfolio: `
                <button class="post-card add-post-card glass-panel-lite" type="button" data-add-content="portfolio">
                    <span class="add-post-icon"><i class="ph ph-plus"></i></span>
                    <span class="add-post-title">Add Portfolio Piece</span>
                    <span class="add-post-copy">Open the portfolio editor and upload a featured image from your device.</span>
                </button>
            `,
            tutorials: `
                <button class="post-card add-post-card glass-panel-lite" type="button" data-add-content="tutorials">
                    <span class="add-post-icon"><i class="ph ph-plus"></i></span>
                    <span class="add-post-title">Add Tutorial</span>
                    <span class="add-post-copy">Open the tutorial editor and upload a cover image from your device.</span>
                </button>
            `
        };

        return cards[section] || "";
    };

    const bindDynamicAddButtons = () => {
        document.querySelectorAll("[data-add-content]").forEach((button) => {
            if (button.dataset.bound === "true") {
                return;
            }

            button.dataset.bound = "true";
            button.addEventListener("click", async () => {
                const section = button.dataset.addContent;

                if (section === "posts") {
                    setActiveTab("posts");
                    showPanel(postFormPanel);
                    postForm?.scrollIntoView({ behavior: "smooth", block: "start" });
                    postTitleInput?.focus();
                    return;
                }

                if (section === "portfolio") {
                    setActiveTab("portfolio");
                    showPanel(portfolioFormPanel);
                    portfolioForm?.scrollIntoView({ behavior: "smooth", block: "start" });
                    portfolioTitleInput?.focus();
                    return;
                }

                if (section === "commissions") {
                    setActiveTab("commissions");
                    showPanel(commissionFormPanel);
                    commissionForm?.scrollIntoView({ behavior: "smooth", block: "start" });
                    commissionTitleInput?.focus();
                    return;
                }

                if (section === "tutorials") {
                    setActiveTab("tutorials");
                    showPanel(tutorialFormPanel);
                    tutorialForm?.scrollIntoView({ behavior: "smooth", block: "start" });
                    tutorialTitleInput?.focus();
                    return;
                }

                window.alert(`This is where the ${section || "content"} upload flow can go next.`);
            });
        });
    };

    const renderPosts = (posts) => {
        if (!postsGrid) {
            return;
        }

        const content = posts.length
            ? posts.map(renderPostCard).join("")
            : renderEmptyCard("No posts yet", "Your posts will show up here after you publish one.");

        postsGrid.innerHTML = `${createAddCardMarkup("posts")}${content}`;
        bindDynamicAddButtons();
    };

    const renderCommissions = (commissions) => {
        if (!commissionsGrid) {
            return;
        }

        const content = commissions.length
            ? commissions.map(renderCommissionCard).join("")
            : renderEmptyCard(
                "No commissions yet",
                "Your commissions will appear here after you add one."
            );

        commissionsGrid.innerHTML = `${createAddCardMarkup("commissions")}${content}`;
        bindDynamicAddButtons();
    };

    const renderPortfolio = (items) => {
        if (!portfolioGrid) {
            return;
        }

        const content = items.length
            ? items.map(renderPortfolioCard).join("")
            : renderEmptyCard(
                "No portfolio pieces yet",
                "Add a featured piece to start building your portfolio showcase."
            );

        portfolioGrid.innerHTML = `${createAddCardMarkup("portfolio")}${content}`;
        bindDynamicAddButtons();
    };

    const renderTutorials = (tutorials) => {
        if (!tutorialsGrid) {
            return;
        }

        const content = tutorials.length
            ? tutorials.map(renderTutorialCard).join("")
            : renderEmptyCard(
                "No tutorials yet",
                "Your tutorials will appear here after you publish one."
            );

        tutorialsGrid.innerHTML = `${createAddCardMarkup("tutorials")}${content}`;
        bindDynamicAddButtons();
    };

    const loadPosts = async () => {
        const data = await apiFetchJSON(`/api/users/${currentUser.id}/posts`);
        renderPosts(data.posts || []);
    };

    const loadCommissions = async () => {
        const data = await apiFetchJSON(`/api/commissions?userId=${encodeURIComponent(currentUser.id)}`);
        renderCommissions(data.commissions || []);
    };

    const loadPortfolio = async () => {
        const data = await apiFetchJSON(`/api/users/${currentUser.id}/portfolio`);
        renderPortfolio(data.items || []);
    };

    const loadTutorials = async () => {
        const data = await apiFetchJSON(`/api/users/${currentUser.id}/tutorials`);
        renderTutorials(data.tutorials || []);
    };

    tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            setActiveTab(button.dataset.profileTab);
        });
    });

    bindDynamicAddButtons();

    postImageInput?.addEventListener("change", () => {
        const [file] = postImageInput.files || [];

        if (!file) {
            resetUploadPreview({
                input: postImageInput,
                preview: postImagePreview,
                emptyState: postUploadEmpty,
                onReset: () => {
                    selectedPostImageData = "";
                }
            });
            return;
        }

        readDeviceImage(
            file,
            (result) => {
                selectedPostImageData = result;

                if (postImagePreview) {
                    postImagePreview.src = result;
                    postImagePreview.hidden = false;
                }

                if (postUploadEmpty) {
                    postUploadEmpty.hidden = true;
                }
            },
            () => {
                window.alert("Could not read the selected image.");
                resetUploadPreview({
                    input: postImageInput,
                    preview: postImagePreview,
                    emptyState: postUploadEmpty,
                    onReset: () => {
                        selectedPostImageData = "";
                    }
                });
            }
        );
    });

    commissionImageInput?.addEventListener("change", () => {
        const [file] = commissionImageInput.files || [];

        if (!file) {
            resetUploadPreview({
                input: commissionImageInput,
                preview: commissionImagePreview,
                emptyState: commissionUploadEmpty,
                onReset: () => {
                    selectedCommissionImageData = "";
                }
            });
            return;
        }

        readDeviceImage(
            file,
            (result) => {
                selectedCommissionImageData = result;

                if (commissionImagePreview) {
                    commissionImagePreview.src = result;
                    commissionImagePreview.hidden = false;
                }

                if (commissionUploadEmpty) {
                    commissionUploadEmpty.hidden = true;
                }
            },
            () => {
                window.alert("Could not read the selected image.");
                resetUploadPreview({
                    input: commissionImageInput,
                    preview: commissionImagePreview,
                    emptyState: commissionUploadEmpty,
                    onReset: () => {
                        selectedCommissionImageData = "";
                    }
                });
            }
        );
    });

    portfolioImageInput?.addEventListener("change", () => {
        const [file] = portfolioImageInput.files || [];

        if (!file) {
            resetUploadPreview({
                input: portfolioImageInput,
                preview: portfolioImagePreview,
                emptyState: portfolioUploadEmpty,
                onReset: () => {
                    selectedPortfolioImageData = "";
                }
            });
            return;
        }

        readDeviceImage(
            file,
            (result) => {
                selectedPortfolioImageData = result;

                if (portfolioImagePreview) {
                    portfolioImagePreview.src = result;
                    portfolioImagePreview.hidden = false;
                }

                if (portfolioUploadEmpty) {
                    portfolioUploadEmpty.hidden = true;
                }
            },
            () => {
                window.alert("Could not read the selected image.");
                resetUploadPreview({
                    input: portfolioImageInput,
                    preview: portfolioImagePreview,
                    emptyState: portfolioUploadEmpty,
                    onReset: () => {
                        selectedPortfolioImageData = "";
                    }
                });
            }
        );
    });

    tutorialImageInput?.addEventListener("change", () => {
        const [file] = tutorialImageInput.files || [];

        if (!file) {
            resetUploadPreview({
                input: tutorialImageInput,
                preview: tutorialImagePreview,
                emptyState: tutorialUploadEmpty,
                onReset: () => {
                    selectedTutorialImageData = "";
                    selectedTutorialMediaType = "image";
                }
            });
            if (tutorialVideoPreview) {
                tutorialVideoPreview.hidden = true;
                tutorialVideoPreview.removeAttribute("src");
                tutorialVideoPreview.load();
            }
            return;
        }

        readDeviceImage(
            file,
            (result) => {
                selectedTutorialImageData = result;
                selectedTutorialMediaType = file.type.startsWith("video/") ? "video" : "image";

                if (selectedTutorialMediaType === "video") {
                    if (tutorialImagePreview) {
                        tutorialImagePreview.hidden = true;
                        tutorialImagePreview.removeAttribute("src");
                    }

                    if (tutorialVideoPreview) {
                        tutorialVideoPreview.src = result;
                        tutorialVideoPreview.hidden = false;
                    }
                } else if (tutorialImagePreview) {
                    tutorialImagePreview.src = result;
                    tutorialImagePreview.hidden = false;
                }

                if (tutorialVideoPreview && selectedTutorialMediaType !== "video") {
                    tutorialVideoPreview.hidden = true;
                    tutorialVideoPreview.removeAttribute("src");
                    tutorialVideoPreview.load();
                }

                if (tutorialUploadEmpty) {
                    tutorialUploadEmpty.hidden = true;
                }
            },
            () => {
                window.alert("Could not read the selected image.");
                resetUploadPreview({
                    input: tutorialImageInput,
                    preview: tutorialImagePreview,
                    emptyState: tutorialUploadEmpty,
                    onReset: () => {
                        selectedTutorialImageData = "";
                        selectedTutorialMediaType = "image";
                    }
                });
                if (tutorialVideoPreview) {
                    tutorialVideoPreview.hidden = true;
                    tutorialVideoPreview.removeAttribute("src");
                    tutorialVideoPreview.load();
                }
            }
        );
    });

    postForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!selectedPostImageData) {
            window.alert("Please choose an image for your post.");
            return;
        }

        try {
            await apiFetchJSON(`/api/users/${currentUser.id}/posts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title: postTitleInput.value.trim(),
                    caption: postCaptionInput.value.trim(),
                    mediaUrl: selectedPostImageData
                })
            });

            postForm.reset();
            resetUploadPreview({
                input: postImageInput,
                preview: postImagePreview,
                emptyState: postUploadEmpty,
                onReset: () => {
                    selectedPostImageData = "";
                }
            });
            hidePanel(postFormPanel);
            await loadPosts();
        } catch (error) {
            window.alert(error.message);
        }
    });

    commissionForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!selectedCommissionImageData) {
            window.alert("Please choose an image for your commission.");
            return;
        }

        try {
            await apiFetchJSON("/api/commissions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    title: commissionTitleInput.value.trim(),
                    artist: currentUser.name || "",
                    category: commissionCategoryInput.value,
                    price: commissionPriceInput.value,
                    image: selectedCommissionImageData
                })
            });

            commissionForm.reset();
            resetUploadPreview({
                input: commissionImageInput,
                preview: commissionImagePreview,
                emptyState: commissionUploadEmpty,
                onReset: () => {
                    selectedCommissionImageData = "";
                }
            });
            hidePanel(commissionFormPanel);
            await loadCommissions();
        } catch (error) {
            window.alert(error.message);
        }
    });

    portfolioForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!selectedPortfolioImageData) {
            window.alert("Please choose an image for your portfolio piece.");
            return;
        }

        try {
            await apiFetchJSON(`/api/users/${currentUser.id}/portfolio`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title: portfolioTitleInput.value.trim(),
                    summary: portfolioSummaryInput.value.trim(),
                    imageUrl: selectedPortfolioImageData
                })
            });

            portfolioForm.reset();
            resetUploadPreview({
                input: portfolioImageInput,
                preview: portfolioImagePreview,
                emptyState: portfolioUploadEmpty,
                onReset: () => {
                    selectedPortfolioImageData = "";
                }
            });
            hidePanel(portfolioFormPanel);
            await loadPortfolio();
        } catch (error) {
            window.alert(error.message);
        }
    });

    tutorialForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!selectedTutorialImageData) {
            window.alert("Please choose a cover image for your tutorial.");
            return;
        }

        try {
            await apiFetchJSON(`/api/users/${currentUser.id}/tutorials`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title: tutorialTitleInput.value.trim(),
                    description: tutorialDescriptionInput.value.trim(),
                    imageUrl: selectedTutorialImageData,
                    mediaType: selectedTutorialMediaType
                })
            });

            tutorialForm.reset();
            resetUploadPreview({
                input: tutorialImageInput,
                preview: tutorialImagePreview,
                emptyState: tutorialUploadEmpty,
                onReset: () => {
                    selectedTutorialImageData = "";
                    selectedTutorialMediaType = "image";
                }
            });
            if (tutorialVideoPreview) {
                tutorialVideoPreview.hidden = true;
                tutorialVideoPreview.removeAttribute("src");
                tutorialVideoPreview.load();
            }
            hidePanel(tutorialFormPanel);
            await loadTutorials();
        } catch (error) {
            window.alert(error.message);
        }
    });

    postResetButton?.addEventListener("click", () => {
        postForm?.reset();
        resetUploadPreview({
            input: postImageInput,
            preview: postImagePreview,
            emptyState: postUploadEmpty,
            onReset: () => {
                selectedPostImageData = "";
            }
        });
    });

    commissionResetButton?.addEventListener("click", () => {
        commissionForm?.reset();
        resetUploadPreview({
            input: commissionImageInput,
            preview: commissionImagePreview,
            emptyState: commissionUploadEmpty,
            onReset: () => {
                selectedCommissionImageData = "";
            }
        });
    });

    portfolioResetButton?.addEventListener("click", () => {
        portfolioForm?.reset();
        resetUploadPreview({
            input: portfolioImageInput,
            preview: portfolioImagePreview,
            emptyState: portfolioUploadEmpty,
            onReset: () => {
                selectedPortfolioImageData = "";
            }
        });
    });

    tutorialResetButton?.addEventListener("click", () => {
        tutorialForm?.reset();
        resetUploadPreview({
            input: tutorialImageInput,
            preview: tutorialImagePreview,
            emptyState: tutorialUploadEmpty,
            onReset: () => {
                selectedTutorialImageData = "";
                selectedTutorialMediaType = "image";
            }
        });
        if (tutorialVideoPreview) {
            tutorialVideoPreview.hidden = true;
            tutorialVideoPreview.removeAttribute("src");
            tutorialVideoPreview.load();
        }
    });

    postCloseButton?.addEventListener("click", () => {
        postForm?.reset();
        resetUploadPreview({
            input: postImageInput,
            preview: postImagePreview,
            emptyState: postUploadEmpty,
            onReset: () => {
                selectedPostImageData = "";
            }
        });
        hidePanel(postFormPanel);
    });

    commissionCloseButton?.addEventListener("click", () => {
        commissionForm?.reset();
        resetUploadPreview({
            input: commissionImageInput,
            preview: commissionImagePreview,
            emptyState: commissionUploadEmpty,
            onReset: () => {
                selectedCommissionImageData = "";
            }
        });
        hidePanel(commissionFormPanel);
    });

    portfolioCloseButton?.addEventListener("click", () => {
        portfolioForm?.reset();
        resetUploadPreview({
            input: portfolioImageInput,
            preview: portfolioImagePreview,
            emptyState: portfolioUploadEmpty,
            onReset: () => {
                selectedPortfolioImageData = "";
            }
        });
        hidePanel(portfolioFormPanel);
    });

    tutorialCloseButton?.addEventListener("click", () => {
        tutorialForm?.reset();
        resetUploadPreview({
            input: tutorialImageInput,
            preview: tutorialImagePreview,
            emptyState: tutorialUploadEmpty,
            onReset: () => {
                selectedTutorialImageData = "";
                selectedTutorialMediaType = "image";
            }
        });
        if (tutorialVideoPreview) {
            tutorialVideoPreview.hidden = true;
            tutorialVideoPreview.removeAttribute("src");
            tutorialVideoPreview.load();
        }
        hidePanel(tutorialFormPanel);
    });

    logoutButton?.addEventListener("click", async () => {
        try {
            await apiFetchJSON("/api/auth/logout", {
                method: "POST"
            });
        } catch (error) {
            // Local cleanup still signs the browser out visually.
        }

        localStorage.removeItem("currentUser");
        window.location.href = "auth.html";
    });

    deleteButton?.addEventListener("click", async () => {
        const confirmed = window.confirm(
            "Delete this account's saved data? This removes the account from the MySQL database."
        );

        if (!confirmed) {
            return;
        }

        try {
            await apiFetchJSON(`/api/users/${currentUser.id}`, {
                method: "DELETE"
            });

            localStorage.removeItem("currentUser");
            window.location.href = "auth.html";
        } catch (error) {
            window.alert(error.message);
        }
    });

    try {
        const data = await apiFetchJSON(`/api/users/${currentUser.id}`);
        const user = data.user;
        const profileDetails = {
            bio: user.bio,
            social: user.social || "@artist_handle",
            portfolio: user.portfolio || "Portfolio link"
        };

        const nameTargets = document.querySelectorAll("[data-profile-name]");
        const emailTargets = document.querySelectorAll("[data-profile-email]");
        const bioTargets = document.querySelectorAll("[data-profile-bio]");
        const initialsTargets = document.querySelectorAll("[data-profile-initials]");
        const specialtyList = document.getElementById("profile-specialties");
        const topAvatar = document.getElementById("top-profile-avatar");
        const socialTargets = document.querySelectorAll("[data-profile-social]");
        const portfolioTargets = document.querySelectorAll("[data-profile-portfolio]");
        const emailLink = document.querySelector("[data-profile-email-link]");

        nameTargets.forEach((element) => {
            element.textContent = user.name;
        });

        emailTargets.forEach((element) => {
            element.textContent = user.email;
        });

        bioTargets.forEach((element) => {
            element.textContent = profileDetails.bio;
        });

        initialsTargets.forEach((element) => {
            element.textContent = user.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0].toUpperCase())
                .join("");
        });

        socialTargets.forEach((element) => {
            element.textContent = profileDetails.social;
        });

        portfolioTargets.forEach((element) => {
            element.textContent = profileDetails.portfolio;
        });

        if (specialtyList) {
            specialtyList.innerHTML = user.specialties
                .map((specialty) => `<span class="tag-pill">${specialty}</span>`)
                .join("");
        }

        const avatarUrl =
            localStorage.getItem(profileImageStorageKey) ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563eb&color=fff`;

        if (topAvatar) {
            topAvatar.src = avatarUrl;
        }

        if (emailLink) {
            emailLink.href = `mailto:${user.email}`;
        }

        if (profileImageInput) {
            profileImageInput.addEventListener("change", () => {
                const [file] = profileImageInput.files || [];

                if (!file) {
                    return;
                }

                const reader = new FileReader();
                reader.onload = () => {
                    const result = typeof reader.result === "string" ? reader.result : "";
                    if (!result) {
                        return;
                    }

                    localStorage.setItem(profileImageStorageKey, result);

                    if (topAvatar) {
                        topAvatar.src = result;
                    }

                    profileAvatarEditor?.classList.add("has-image");

                    initialsTargets.forEach((element) => {
                        element.style.backgroundImage = `url("${result}")`;
                        element.style.backgroundSize = "cover";
                        element.style.backgroundPosition = "center";
                        element.style.color = "transparent";
                    });
                };
                reader.readAsDataURL(file);
            });
        }

        if (editButton) {
            editButton.addEventListener("click", async () => {
                const nextBio = window.prompt("Update your profile description:", profileDetails.bio);
                if (nextBio === null) {
                    return;
                }

                const nextSocial = window.prompt("Update your social handle:", profileDetails.social);
                if (nextSocial === null) {
                    return;
                }

                const nextPortfolio = window.prompt("Update your portfolio link label:", profileDetails.portfolio);
                if (nextPortfolio === null) {
                    return;
                }

                try {
                    const saveData = await apiFetchJSON(`/api/users/${currentUser.id}`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            bio: nextBio.trim() || profileDetails.bio,
                            social: nextSocial.trim() || profileDetails.social,
                            portfolio: nextPortfolio.trim() || profileDetails.portfolio
                        })
                    });

                    profileDetails.bio = saveData.user.bio;
                    profileDetails.social = saveData.user.social;
                    profileDetails.portfolio = saveData.user.portfolio;

                    bioTargets.forEach((element) => {
                        element.textContent = profileDetails.bio;
                    });

                    socialTargets.forEach((element) => {
                        element.textContent = profileDetails.social;
                    });

                    portfolioTargets.forEach((element) => {
                        element.textContent = profileDetails.portfolio;
                    });
                } catch (error) {
                    window.alert(error.message);
                }
            });
        }

        initialsTargets.forEach((element) => {
            element.style.backgroundImage = "";
            element.style.backgroundSize = "";
            element.style.backgroundPosition = "";
            element.style.color = "";
        });

        if (localStorage.getItem(profileImageStorageKey)) {
            profileAvatarEditor?.classList.add("has-image");
            initialsTargets.forEach((element) => {
                element.style.backgroundImage = `url("${avatarUrl}")`;
                element.style.backgroundSize = "cover";
                element.style.backgroundPosition = "center";
                element.style.color = "transparent";
            });
        } else {
            profileAvatarEditor?.classList.remove("has-image");
        }

        hidePanel(postFormPanel);
        hidePanel(commissionFormPanel);
        hidePanel(tutorialFormPanel);
        hidePanel(portfolioFormPanel);
        await Promise.all([loadPosts(), loadCommissions(), loadTutorials(), loadPortfolio()]);
    } catch (error) {
        localStorage.removeItem("currentUser");
        window.location.href = "auth.html";
    }
});
