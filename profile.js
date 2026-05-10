document.addEventListener("DOMContentLoaded", async () => {
    const currentUserRaw = localStorage.getItem("currentUser");
    const profileUserId = new URLSearchParams(window.location.search).get("userId");
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
    const followButton = document.getElementById("profile-follow-btn");
    const followersCountTarget = document.querySelector("[data-followers-count]");
    const followingCountTarget = document.querySelector("[data-following-count]");
    const followListPanel = document.getElementById("follow-list-panel");
    const followListTitle = document.getElementById("follow-list-title");
    const followList = document.getElementById("follow-list");
    const followListClose = document.getElementById("follow-list-close");
    const followListButtons = document.querySelectorAll("[data-follow-list]");
    const profileHeadlineActions = document.querySelector(".profile-headline-actions");
    const profileInlineEditForm = document.getElementById("profile-inline-edit-form");
    const profileInlineEditCancel = document.getElementById("profile-inline-edit-cancel");
    const profileBioInput = document.getElementById("profile-edit-bio-input");
    const profileSocialInput = document.getElementById("profile-edit-social-input");
    const profilePortfolioInput = document.getElementById("profile-edit-portfolio-input");
    const profileEmailInput = document.getElementById("profile-edit-email-input");
    const profileLinksView = document.querySelector("[data-profile-links-view]");

    if (!currentUserRaw && !profileUserId) {
        window.location.href = "auth.html";
        return;
    }

    let currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
    let signedInUser = null;
    const targetUserId = profileUserId || currentUser?.id;
    let isOwnProfile = false;

    const saveCurrentUser = (user) => {
        const { profileImage, ...storageUser } = user || {};
        localStorage.setItem("currentUser", JSON.stringify(storageUser));
    };

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

    const escapeHtml = (value) => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

    const createWebsiteHref = (value) => {
        const trimmedValue = String(value || "").trim();

        if (!trimmedValue) {
            return "#";
        }

        if (/^https?:\/\//i.test(trimmedValue)) {
            return trimmedValue;
        }

        if (/^[^\s]+\.[^\s]+$/.test(trimmedValue)) {
            return `https://${trimmedValue}`;
        }

        return "#";
    };

    if (currentUser) {
        try {
            const sessionData = await apiFetchJSON("/api/auth/me");

            if (String(sessionData.user.id) !== String(currentUser.id)) {
                throw new Error("Signed in account changed.");
            }

            signedInUser = sessionData.user;
            currentUser = sessionData.user;
            isOwnProfile = String(signedInUser.id) === String(targetUserId);
            saveCurrentUser(sessionData.user);
        } catch (error) {
            localStorage.removeItem("currentUser");

            if (!profileUserId) {
                window.location.href = "auth.html";
                return;
            }
        }
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

    const hideOwnerControls = () => {
        if (isOwnProfile) {
            return;
        }

        [postFormPanel, commissionFormPanel, tutorialFormPanel, portfolioFormPanel].forEach(hidePanel);
        [logoutButton, deleteButton, editButton].forEach((element) => {
            if (element) {
                element.hidden = true;
                element.setAttribute("aria-hidden", "true");
            }
        });

        if (profileAvatarEditor) {
            profileAvatarEditor.classList.add("is-readonly");
            profileAvatarEditor.removeAttribute("tabindex");
            profileAvatarEditor.setAttribute("aria-label", "Profile picture");
        }

        const avatarNote = document.querySelector(".profile-avatar-note");
        if (avatarNote) {
            avatarNote.hidden = true;
            avatarNote.setAttribute("aria-hidden", "true");
        }

        if (profileImageInput) {
            profileImageInput.disabled = true;
        }
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

    const renderEmptySection = (title, copy) => {
        if (!isOwnProfile) {
            return "";
        }

        return renderEmptyCard(title, copy);
    };

    const createDeleteButtonMarkup = (section, id, label) => {
        if (!isOwnProfile) {
            return "";
        }

        return `
            <button
                class="content-card-delete"
                type="button"
                data-delete-content="${section}"
                data-delete-id="${encodeURIComponent(id)}"
                aria-label="Delete ${label}"
                title="Delete"
            >
                <i class="ph ph-trash"></i>
            </button>
        `;
    };

    const createAvailabilityMarkup = (status) => {
        if (!status || status === "available") {
            return "";
        }

        return `<span class="content-card-status">${status === "traded" ? "Traded" : "Unavailable"}</span>`;
    };

    const createPurchaseButtonMarkup = ({ itemType, id, title, artistName, price, availabilityStatus }) => {
        if (isOwnProfile || !signedInUser || availabilityStatus !== "available") {
            return "";
        }

        const priceLabel = price === null || price === undefined || price === ""
            ? "Price to be arranged"
            : `$${Number(price).toFixed(2)}`;

        return `
            <button
                class="btn btn-primary content-card-purchase purchase-art-btn"
                type="button"
                data-purchase-item-type="${itemType}"
                data-purchase-item-id="${encodeURIComponent(id)}"
                data-purchase-title="${encodeURIComponent(title || "Artwork")}"
                data-purchase-artist="${encodeURIComponent(artistName || "Artist")}"
                data-purchase-price="${encodeURIComponent(priceLabel)}"
            >
                Purchase
            </button>
        `;
    };

    const createTradeButtonMarkup = ({ itemType, id, title, artistName, availabilityStatus }) => {
        if (isOwnProfile || !signedInUser || availabilityStatus !== "available") {
            return "";
        }

        return `
            <button
                class="btn btn-secondary content-card-trade trade-art-btn"
                type="button"
                data-trade-item-type="${itemType}"
                data-trade-item-id="${encodeURIComponent(id)}"
                data-trade-title="${encodeURIComponent(title || "Artwork")}"
                data-trade-artist="${encodeURIComponent(artistName || "Artist")}"
            >
                Trade
            </button>
        `;
    };

    const createCardActionsMarkup = (options) => {
        const purchaseButton = createPurchaseButtonMarkup(options);
        const tradeButton = createTradeButtonMarkup(options);
        const status = createAvailabilityMarkup(options.availabilityStatus);

        if (!purchaseButton && !tradeButton && !status) {
            return "";
        }

        return `<div class="content-card-actions">${status}${purchaseButton}${tradeButton}</div>`;
    };

    const renderPostCard = (post) => `
        <article class="post-card post-content-card glass-panel-lite">
            ${createDeleteButtonMarkup("posts", post.id, "post")}
            <img class="content-card-image" src="${post.mediaUrl}" alt="${post.title}">
            <div class="content-card-body">
                <span class="content-card-kicker">Post</span>
                <h3 class="content-card-title">${post.title}</h3>
                <a class="content-card-author" href="profile.html?userId=${encodeURIComponent(post.userId)}">
                    ${post.artistName || "View artist profile"}
                </a>
                <p class="content-card-copy">${post.caption}</p>
                ${createCardActionsMarkup({
                    itemType: "post",
                    id: post.id,
                    title: post.title,
                    artistName: post.artistName,
                    price: null,
                    availabilityStatus: post.availabilityStatus
                })}
            </div>
        </article>
    `;

    const renderCommissionCard = (commission) => `
        <article class="post-card post-content-card glass-panel-lite">
            ${createDeleteButtonMarkup("commissions", commission.id, "commission")}
            <img class="content-card-image" src="${commission.image}" alt="${commission.title}">
            <div class="content-card-body">
                <span class="content-card-kicker">Commission</span>
                <h3 class="content-card-title">${commission.title}</h3>
                <a class="content-card-author" href="profile.html?userId=${encodeURIComponent(commission.userId)}">
                    ${commission.artist || "View artist profile"}
                </a>
                <p class="content-card-copy">$${Number(commission.price).toFixed(2)} · ${commission.category}</p>
                ${createCardActionsMarkup({
                    itemType: "commission",
                    id: commission.id,
                    title: commission.title,
                    artistName: commission.artist,
                    price: commission.price,
                    availabilityStatus: commission.availabilityStatus
                })}
            </div>
        </article>
    `;


    const renderPortfolioCard = (item) => `
        <article class="post-card post-content-card glass-panel-lite">
            ${createDeleteButtonMarkup("portfolio", item.id, "portfolio piece")}
            <img class="content-card-image" src="${item.imageUrl}" alt="${item.title}">
            <div class="content-card-body">
                <span class="content-card-kicker">Portfolio</span>
                <h3 class="content-card-title">${item.title}</h3>
                <a class="content-card-author" href="profile.html?userId=${encodeURIComponent(item.userId)}">
                    ${item.artistName || "View artist profile"}
                </a>
                <p class="content-card-copy">${item.summary}</p>
                ${createCardActionsMarkup({
                    itemType: "portfolio",
                    id: item.id,
                    title: item.title,
                    artistName: item.artistName,
                    price: null,
                    availabilityStatus: item.availabilityStatus
                })}
            </div>
        </article>
    `;

    const renderTutorialCard = (tutorial) => `
        <article class="post-card post-content-card glass-panel-lite">
            ${createDeleteButtonMarkup("tutorials", tutorial.id, "tutorial")}
            ${tutorial.mediaType === "video"
                ? `<video class="content-card-image" src="${tutorial.imageUrl}" controls preload="metadata"></video>`
                : `<img class="content-card-image" src="${tutorial.imageUrl}" alt="${tutorial.title}">`}
            <div class="content-card-body">
                <span class="content-card-kicker">Tutorial</span>
                <h3 class="content-card-title">${tutorial.title}</h3>
                <a class="content-card-author" href="profile.html?userId=${encodeURIComponent(tutorial.userId)}">
                    ${tutorial.artistName || "View artist profile"}
                </a>
                <p class="content-card-copy">${tutorial.description}</p>
                ${createCardActionsMarkup({
                    itemType: "tutorial",
                    id: tutorial.id,
                    title: tutorial.title,
                    artistName: tutorial.artistName,
                    price: null,
                    availabilityStatus: tutorial.availabilityStatus
                })}
            </div>
        </article>
    `;

    const createAddCardMarkup = (section) => {
        if (!isOwnProfile) {
            return "";
        }

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

    const getDeleteEndpoint = (section, id) => {
        const encodedUserId = encodeURIComponent(currentUser.id);
        const encodedId = encodeURIComponent(id);

        if (section === "posts") {
            return `/api/users/${encodedUserId}/posts/${encodedId}`;
        }

        if (section === "commissions") {
            return `/api/commissions/${encodedId}?userId=${encodedUserId}`;
        }

        if (section === "portfolio") {
            return `/api/users/${encodedUserId}/portfolio/${encodedId}`;
        }

        if (section === "tutorials") {
            return `/api/users/${encodedUserId}/tutorials/${encodedId}`;
        }

        return "";
    };

    const reloadSection = async (section) => {
        if (section === "posts") {
            await loadPosts();
            return;
        }

        if (section === "commissions") {
            await loadCommissions();
            return;
        }

        if (section === "portfolio") {
            await loadPortfolio();
            return;
        }

        if (section === "tutorials") {
            await loadTutorials();
        }
    };

    const bindDynamicDeleteButtons = () => {
        if (!isOwnProfile) {
            return;
        }

        document.querySelectorAll("[data-delete-content]").forEach((button) => {
            if (button.dataset.bound === "true") {
                return;
            }

            button.dataset.bound = "true";
            button.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();

                const section = button.dataset.deleteContent;
                const id = button.dataset.deleteId;
                const endpoint = getDeleteEndpoint(section, id);

                if (!endpoint) {
                    return;
                }

                const confirmed = window.confirm("Delete this item? This cannot be undone.");
                if (!confirmed) {
                    return;
                }

                button.disabled = true;

                try {
                    await apiFetchJSON(endpoint, {
                        method: "DELETE"
                    });
                    await reloadSection(section);
                } catch (error) {
                    button.disabled = false;
                    window.alert(error.message);
                }
            });
        });
    };

    const renderPosts = (posts) => {
        if (!postsGrid) {
            return;
        }

        const content = posts.length
            ? posts.map(renderPostCard).join("")
            : renderEmptySection("No posts yet", "Your posts will show up here after you publish one.");

        postsGrid.innerHTML = `${createAddCardMarkup("posts")}${content}`;
        bindDynamicAddButtons();
        bindDynamicDeleteButtons();
    };

    const renderCommissions = (commissions) => {
        if (!commissionsGrid) {
            return;
        }

        const content = commissions.length
            ? commissions.map(renderCommissionCard).join("")
            : renderEmptySection(
                "No commissions yet",
                "Your commissions will appear here after you add one."
            );

        commissionsGrid.innerHTML = `${createAddCardMarkup("commissions")}${content}`;
        bindDynamicAddButtons();
        bindDynamicDeleteButtons();
    };

    const renderPortfolio = (items) => {
        if (!portfolioGrid) {
            return;
        }

        const content = items.length
            ? items.map(renderPortfolioCard).join("")
            : renderEmptySection(
                "No portfolio pieces yet",
                "Add a featured piece to start building your portfolio showcase."
            );

        portfolioGrid.innerHTML = `${createAddCardMarkup("portfolio")}${content}`;
        bindDynamicAddButtons();
        bindDynamicDeleteButtons();
    };

    const renderTutorials = (tutorials) => {
        if (!tutorialsGrid) {
            return;
        }

        const content = tutorials.length
            ? tutorials.map(renderTutorialCard).join("")
            : renderEmptySection(
                "No tutorials yet",
                "Your tutorials will appear here after you publish one."
            );

        tutorialsGrid.innerHTML = `${createAddCardMarkup("tutorials")}${content}`;
        bindDynamicAddButtons();
        bindDynamicDeleteButtons();
    };

    const loadPosts = async () => {
        const data = await apiFetchJSON(`/api/users/${targetUserId}/posts`);
        renderPosts(data.posts || []);
    };

    const loadCommissions = async () => {
        const data = await apiFetchJSON(`/api/commissions?userId=${encodeURIComponent(targetUserId)}`);
        renderCommissions(data.commissions || []);
    };

    const loadPortfolio = async () => {
        const data = await apiFetchJSON(`/api/users/${targetUserId}/portfolio`);
        renderPortfolio(data.items || []);
    };

    const loadTutorials = async () => {
        const data = await apiFetchJSON(`/api/users/${targetUserId}/tutorials`);
        renderTutorials(data.tutorials || []);
    };

    const renderFollowSummary = (summary) => {
        if (followersCountTarget) {
            followersCountTarget.textContent = summary.followersCount;
        }

        if (followingCountTarget) {
            followingCountTarget.textContent = summary.followingCount;
        }

        if (!followButton) {
            return;
        }

        const canFollow = Boolean(signedInUser) && !isOwnProfile;
        followButton.hidden = !canFollow;
        followButton.disabled = false;

        if (!canFollow) {
            return;
        }

        followButton.textContent = summary.isFollowing ? "Following" : "Follow";
        followButton.classList.toggle("is-following", summary.isFollowing);
        followButton.dataset.following = String(summary.isFollowing);
    };

    const loadFollowSummary = async () => {
        const data = await apiFetchJSON(`/api/users/${targetUserId}/follow-summary`);
        renderFollowSummary(data.summary);
        return data.summary;
    };

    const renderFollowList = (users, emptyCopy) => {
        if (!followList) {
            return;
        }

        if (!users.length) {
            followList.innerHTML = `<p class="muted-copy">${emptyCopy}</p>`;
            return;
        }

        followList.innerHTML = users.map((user) => `
            <a class="follow-list-item" href="profile.html?userId=${encodeURIComponent(user.id)}">
                <span class="follow-list-avatar">${escapeHtml(
                    user.name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0].toUpperCase())
                        .join("")
                )}</span>
                <span>
                    <strong>${escapeHtml(user.name)}</strong>
                    <small>${escapeHtml(user.email)}</small>
                </span>
            </a>
        `).join("");
    };

    const openFollowList = async (type) => {
        if (!followListPanel || !followListTitle || !followList) {
            return;
        }

        const isFollowers = type === "followers";
        followListTitle.textContent = isFollowers ? "Followers" : "Following";
        followList.innerHTML = '<p class="muted-copy">Loading...</p>';
        followListPanel.classList.remove("is-hidden");

        try {
            const data = await apiFetchJSON(`/api/users/${targetUserId}/${isFollowers ? "followers" : "following"}`);
            renderFollowList(
                isFollowers ? data.followers || [] : data.following || [],
                isFollowers ? "No followers yet." : "Not following anyone yet."
            );
        } catch (error) {
            followList.innerHTML = `<p class="muted-copy">${escapeHtml(error.message)}</p>`;
        }
    };

    tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            setActiveTab(button.dataset.profileTab);
        });
    });

    followButton?.addEventListener("click", async () => {
        if (!signedInUser) {
            window.location.href = "auth.html";
            return;
        }

        const isFollowing = followButton.dataset.following === "true";
        followButton.disabled = true;

        try {
            const data = await apiFetchJSON(`/api/users/${targetUserId}/follow`, {
                method: isFollowing ? "DELETE" : "POST"
            });
            renderFollowSummary(data.summary);
        } catch (error) {
            followButton.disabled = false;
            window.alert(error.message);
        }
    });

    followListButtons.forEach((button) => {
        button.addEventListener("click", () => {
            openFollowList(button.dataset.followList);
        });
    });

    followListClose?.addEventListener("click", () => {
        hidePanel(followListPanel);
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
        const data = await apiFetchJSON(`/api/users/${targetUserId}`);
        const user = data.user;
        const profileDetails = {
            bio: user.bio || "",
            social: user.social || "",
            portfolio: user.portfolio || "",
            email: user.contactEmail ?? user.email ?? ""
        };

        if (profileHeadlineActions && signedInUser && !isOwnProfile && !document.getElementById("profile-message-btn")) {
            const messageButton = document.createElement("button");
            messageButton.id = "profile-message-btn";
            messageButton.className = "profile-edit-btn profile-message-btn";
            messageButton.type = "button";
            messageButton.textContent = "Message";
            messageButton.addEventListener("click", () => {
                window.location.href = `messages.html?userId=${encodeURIComponent(targetUserId)}`;
            });
            profileHeadlineActions.insertBefore(messageButton, followButton || editButton || null);
        }

        const nameTargets = document.querySelectorAll("[data-profile-name]");
        const emailTargets = document.querySelectorAll("[data-profile-email]");
        const bioTargets = document.querySelectorAll("[data-profile-bio]");
        const initialsTargets = document.querySelectorAll("[data-profile-initials]");
        const specialtyList = document.getElementById("profile-specialties");
        const topAvatar = document.getElementById("top-profile-avatar");
        const socialTargets = document.querySelectorAll("[data-profile-social]");
        const portfolioTargets = document.querySelectorAll("[data-profile-portfolio]");
        const emailLink = document.querySelector("[data-profile-email-link]");
        const portfolioLink = document.querySelector("[data-profile-portfolio-link]");
        const fallbackAvatarUrl = (name) =>
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`;
        const setHeroAvatarImage = (imageUrl) => {
            const hasImage = Boolean(imageUrl);

            profileAvatarEditor?.classList.toggle("has-image", hasImage);
            initialsTargets.forEach((element) => {
                if (hasImage) {
                    element.style.backgroundImage = `url("${imageUrl}")`;
                    element.style.backgroundSize = "cover";
                    element.style.backgroundPosition = "center";
                    element.style.color = "transparent";
                    return;
                }

                element.style.backgroundImage = "";
                element.style.backgroundSize = "";
                element.style.backgroundPosition = "";
                element.style.color = "";
            });
        };

        const renderProfileDetails = () => {
            emailTargets.forEach((element) => {
                element.textContent = profileDetails.email;
            });

            bioTargets.forEach((element) => {
                element.textContent = profileDetails.bio;
            });

            socialTargets.forEach((element) => {
                element.textContent = profileDetails.social;
            });

            portfolioTargets.forEach((element) => {
                element.textContent = profileDetails.portfolio;
            });

            if (emailLink) {
                emailLink.href = profileDetails.email ? `mailto:${profileDetails.email}` : "#";
            }

            if (portfolioLink) {
                const websiteHref = createWebsiteHref(profileDetails.portfolio);
                portfolioLink.href = websiteHref;
                portfolioLink.target = websiteHref === "#" ? "" : "_blank";
                portfolioLink.rel = websiteHref === "#" ? "" : "noopener noreferrer";
            }
        };

        const setProfileEditMode = (isEditing) => {
            if (!profileInlineEditForm) {
                return;
            }

            profileInlineEditForm.classList.toggle("is-hidden", !isEditing);
            profileInlineEditForm.setAttribute("aria-hidden", String(!isEditing));
            profileLinksView?.classList.toggle("is-hidden", isEditing);
            bioTargets.forEach((element) => {
                element.classList.toggle("is-hidden", isEditing);
            });

            if (editButton) {
                editButton.textContent = isEditing ? "Editing Profile" : "Edit Profile";
                editButton.disabled = isEditing;
            }

            if (isEditing) {
                if (profileBioInput) {
                    profileBioInput.value = profileDetails.bio;
                    profileBioInput.focus();
                }
                if (profileSocialInput) {
                    profileSocialInput.value = profileDetails.social;
                }
                if (profilePortfolioInput) {
                    profilePortfolioInput.value = profileDetails.portfolio;
                }
                if (profileEmailInput) {
                    profileEmailInput.value = profileDetails.email;
                }
            }
        };

        nameTargets.forEach((element) => {
            element.textContent = user.name;
        });

        renderProfileDetails();

        initialsTargets.forEach((element) => {
            element.textContent = user.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0].toUpperCase())
                .join("");
        });

        if (specialtyList) {
            specialtyList.innerHTML = user.specialties
                .map((specialty) => `<span class="tag-pill">${specialty}</span>`)
                .join("");
        }

        let profileImageUrl = user.profileImage || "";

        if (isOwnProfile && !profileImageUrl) {
            const oldLocalImage = localStorage.getItem(`profileImage_${targetUserId}`);
            if (oldLocalImage) {
                profileImageUrl = oldLocalImage;
                try {
                    const saveData = await apiFetchJSON(`/api/users/${currentUser.id}`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            profileImage: oldLocalImage
                        })
                    });

                    profileImageUrl = saveData.user.profileImage || oldLocalImage;
                    currentUser = saveData.user;
                    signedInUser = saveData.user;
                    saveCurrentUser(saveData.user);
                    localStorage.removeItem(`profileImage_${targetUserId}`);
                } catch (error) {
                    // Keep showing the local image if the migration cannot save yet.
                }
            }
        }

        if (topAvatar && signedInUser) {
            const signedInAvatar = signedInUser.profileImage || fallbackAvatarUrl(signedInUser.name);
            topAvatar.src = signedInAvatar;
            topAvatar.alt = `${signedInUser.name} avatar`;
        }

        if (profileImageInput && isOwnProfile) {
            profileAvatarEditor?.setAttribute("tabindex", "0");
            profileAvatarEditor?.setAttribute("aria-label", "Change profile picture");
            profileAvatarEditor?.addEventListener("click", () => {
                profileImageInput.click();
            });
            profileAvatarEditor?.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    profileImageInput.click();
                }
            });

            profileImageInput.addEventListener("change", () => {
                const [file] = profileImageInput.files || [];

                if (!file) {
                    return;
                }

                const reader = new FileReader();
                reader.onload = async () => {
                    const result = typeof reader.result === "string" ? reader.result : "";
                    if (!result) {
                        return;
                    }

                    try {
                        const saveData = await apiFetchJSON(`/api/users/${currentUser.id}`, {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                profileImage: result
                            })
                        });

                        profileImageUrl = saveData.user.profileImage || result;
                        currentUser = saveData.user;
                        signedInUser = saveData.user;
                        saveCurrentUser(saveData.user);
                        localStorage.removeItem(`profileImage_${currentUser.id}`);

                        if (topAvatar) {
                            topAvatar.src = profileImageUrl;
                        }

                        setHeroAvatarImage(profileImageUrl);
                    } catch (error) {
                        window.alert(error.message);
                    }
                };
                reader.readAsDataURL(file);
            });
        }

        if (editButton && isOwnProfile) {
            editButton.addEventListener("click", () => setProfileEditMode(true));
        }

        profileInlineEditCancel?.addEventListener("click", () => {
            setProfileEditMode(false);
        });

        profileInlineEditForm?.addEventListener("submit", async (event) => {
            event.preventDefault();

            const nextBio = profileBioInput?.value.trim() ?? profileDetails.bio;
            const nextSocial = profileSocialInput?.value.trim() ?? profileDetails.social;
            const nextPortfolio = profilePortfolioInput?.value.trim() ?? profileDetails.portfolio;
            const nextEmail = profileEmailInput?.value.trim().toLowerCase() ?? profileDetails.email;
            const saveButton = profileInlineEditForm.querySelector('button[type="submit"]');
            const previousSaveText = saveButton?.textContent || "Save Profile";

            try {
                if (saveButton) {
                    saveButton.disabled = true;
                    saveButton.textContent = "Saving...";
                }

                const saveData = await apiFetchJSON(`/api/users/${currentUser.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        bio: nextBio,
                        social: nextSocial,
                        portfolio: nextPortfolio,
                        email: nextEmail
                    })
                });

                profileDetails.bio = saveData.user.bio;
                profileDetails.social = saveData.user.social ?? nextSocial;
                profileDetails.portfolio = saveData.user.portfolio ?? nextPortfolio;
                profileDetails.email = saveData.user.contactEmail ?? nextEmail;
                currentUser = saveData.user;
                signedInUser = saveData.user;
                saveCurrentUser(saveData.user);

                renderProfileDetails();
                setProfileEditMode(false);
            } catch (error) {
                window.alert(error.message);
            } finally {
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = previousSaveText;
                }
            }
        });

        setHeroAvatarImage(profileImageUrl);

        hidePanel(postFormPanel);
        hidePanel(commissionFormPanel);
        hidePanel(tutorialFormPanel);
        hidePanel(portfolioFormPanel);
        hideOwnerControls();
        await Promise.all([loadFollowSummary(), loadPosts(), loadCommissions(), loadTutorials(), loadPortfolio()]);
    } catch (error) {
        if (!profileUserId) {
            localStorage.removeItem("currentUser");
            window.location.href = "auth.html";
            return;
        }

        window.alert(error.message);
    }
});
