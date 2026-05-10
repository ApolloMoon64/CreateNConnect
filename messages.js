document.addEventListener("DOMContentLoaded", async () => {
    const conversationList = document.getElementById("conversation-list");
    const conversationHeader = document.getElementById("conversation-header");
    const messageThread = document.getElementById("message-thread");
    const messageForm = document.getElementById("conversation-message-form");
    const newMessageForm = document.getElementById("new-message-form");
    const newMessageStatus = document.getElementById("new-message-status");
    const userSuggestions = document.getElementById("message-user-suggestions");
    const tradePanel = document.getElementById("trade-panel");
    const pageParams = new URLSearchParams(window.location.search);
    const initialConversationId = pageParams.get("conversationId");
    const initialRecipientUserId = pageParams.get("userId");

    let currentUser = null;
    let conversations = [];
    let suggestedUsers = [];
    let activeConversationId = initialConversationId || "";
    let pollTimer = null;
    let searchTimer = null;

    const readResponsePayload = async (response) => {
        const raw = await response.text();
        if (!raw) return {};

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

    const formatDateTime = (value) => {
        if (!value) return "";
        return new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(new Date(value));
    };

    const getInitials = (name) => String(name || "Creator")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("") || "CN";

    const saveCurrentUser = (user) => {
        const { profileImage, ...storageUser } = user || {};
        localStorage.setItem("currentUser", JSON.stringify(storageUser));
    };

    const loadCurrentUser = async () => {
        try {
            const data = await apiFetchJSON("/api/auth/me");
            saveCurrentUser(data.user);
            return data.user;
        } catch (error) {
            localStorage.removeItem("currentUser");
            window.location.href = "auth.html";
            return null;
        }
    };

    const loadConversations = async () => {
        const data = await apiFetchJSON("/api/messages/conversations");
        conversations = data.conversations || [];

        if (!activeConversationId && conversations[0]) {
            activeConversationId = String(conversations[0].id);
        }

        renderConversationList();
    };

    const loadUserById = async (userId) => {
        const data = await apiFetchJSON(`/api/users/${encodeURIComponent(userId)}`);
        return data.user;
    };

    const searchUsers = async (query) => {
        const cleanQuery = String(query || "").trim();

        if (cleanQuery.length < 2) {
            suggestedUsers = [];
            if (userSuggestions) userSuggestions.innerHTML = "";
            return;
        }

        const data = await apiFetchJSON(`/api/messages/users?q=${encodeURIComponent(cleanQuery)}`);
        suggestedUsers = data.users || [];

        if (userSuggestions) {
            userSuggestions.innerHTML = suggestedUsers.map((user) => `
                <option value="${escapeHtml(user.name)}"></option>
            `).join("");
        }
    };

    const syncSelectedRecipient = () => {
        if (!newMessageForm) return;

        const nameInput = newMessageForm.elements.recipientName;
        const idInput = newMessageForm.elements.recipientUserId;
        const selectedName = String(nameInput.value || "").trim().toLowerCase();
        const selectedUser = suggestedUsers.find((user) => user.name.toLowerCase() === selectedName);

        idInput.value = selectedUser ? selectedUser.id : "";
    };

    const renderConversationList = () => {
        if (!conversationList) return;

        conversationList.innerHTML = conversations.length
            ? conversations.map((conversation) => `
                <button class="conversation-list-item${String(conversation.id) === String(activeConversationId) ? " active" : ""}" type="button" data-conversation-id="${conversation.id}">
                    <span class="conversation-avatar">${escapeHtml(getInitials(conversation.otherUserName))}</span>
                    <span class="conversation-list-copy">
                        <strong>${escapeHtml(conversation.otherUserName || "Conversation")}</strong>
                        <span>${conversation.kind === "trade" ? `Trade: ${escapeHtml(conversation.tradeStatus || "pending")}` : "Direct message"}</span>
                        <small>${escapeHtml(conversation.lastMessage || "No messages yet")}</small>
                    </span>
                </button>
            `).join("")
            : '<p class="muted-copy">No conversations yet.</p>';

        conversationList.querySelectorAll("[data-conversation-id]").forEach((button) => {
            button.addEventListener("click", async () => {
                activeConversationId = button.dataset.conversationId;
                renderConversationList();
                await loadActiveConversation();
            });
        });
    };

    const renderConversationHeader = (conversation) => {
        if (!conversationHeader) return;

        if (!conversation) {
            conversationHeader.innerHTML = `
                <div class="conversation-header-avatar">
                    <i class="ph ph-chat-circle-text"></i>
                </div>
                <div>
                    <p class="content-card-kicker">Conversation</p>
                    <h2>Choose a creator</h2>
                </div>
            `;
            return;
        }

        conversationHeader.innerHTML = `
            <div class="conversation-header-avatar">${escapeHtml(getInitials(conversation.otherUserName))}</div>
            <div>
                <p class="content-card-kicker">${conversation.kind === "trade" ? "Trade conversation" : "Direct message"}</p>
                <h2>${escapeHtml(conversation.otherUserName || "Conversation")}</h2>
                <a href="profile.html?userId=${encodeURIComponent(conversation.otherUserId)}">View profile</a>
            </div>
        `;
    };

    const setComposerEnabled = (enabled) => {
        if (!messageForm) return;

        messageForm.elements.body.disabled = !enabled;
        messageForm.querySelector('button[type="submit"]').disabled = !enabled;
    };

    const renderTradePanel = (conversation) => {
        if (!tradePanel) return;

        if (!conversation || conversation.kind !== "trade") {
            tradePanel.classList.add("is-hidden");
            tradePanel.innerHTML = "";
            return;
        }

        const isDecisionOwner = String(conversation.requestedOwnerUserId) === String(currentUser.id);
        const isPending = conversation.tradeStatus === "pending";
        tradePanel.classList.remove("is-hidden");
        tradePanel.innerHTML = `
            <div>
                <p class="content-card-kicker">Trade Request</p>
                <h2>${escapeHtml(conversation.offeredItemTitle)} for ${escapeHtml(conversation.requestedItemTitle)}</h2>
                <p class="muted-copy">Status: ${escapeHtml(conversation.tradeStatus || "pending")}</p>
            </div>
            ${isDecisionOwner && isPending ? `
                <div class="trade-actions">
                    <button class="btn btn-primary" type="button" data-trade-action="accept">Accept Trade</button>
                    <button class="btn btn-secondary" type="button" data-trade-action="decline">Decline</button>
                </div>
            ` : ""}
        `;

        tradePanel.querySelectorAll("[data-trade-action]").forEach((button) => {
            button.addEventListener("click", async () => {
                button.disabled = true;
                try {
                    await apiFetchJSON(`/api/trades/${encodeURIComponent(conversation.id)}/${button.dataset.tradeAction}`, {
                        method: "POST"
                    });
                    await loadConversations();
                    await loadActiveConversation();
                } catch (error) {
                    window.alert(error.message);
                    button.disabled = false;
                }
            });
        });
    };

    const loadActiveConversation = async () => {
        if (!activeConversationId) {
            renderConversationHeader(null);
            messageThread.innerHTML = `
                <div class="message-empty-state">
                    <i class="ph ph-chat-circle-text"></i>
                    <p>Choose a conversation to view messages.</p>
                </div>
            `;
            renderTradePanel(null);
            setComposerEnabled(false);
            return;
        }

        const data = await apiFetchJSON(`/api/messages/conversations/${encodeURIComponent(activeConversationId)}/messages`);
        const conversation = data.conversation;
        const messages = data.messages || [];

        renderConversationHeader(conversation);
        renderTradePanel(conversation);
        setComposerEnabled(true);
        messageThread.innerHTML = messages.length
            ? messages.map((message) => `
                <article class="direct-message${String(message.userId) === String(currentUser.id) ? " self" : ""}">
                    <div>
                        <strong>${escapeHtml(message.authorName || "Creator")}</strong>
                        <span>${formatDateTime(message.createdAt)}</span>
                    </div>
                    <p>${escapeHtml(message.body)}</p>
                </article>
            `).join("")
            : '<p class="muted-copy">No messages yet.</p>';
        messageThread.scrollTop = messageThread.scrollHeight;
    };

    messageForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!activeConversationId) return;

        const input = messageForm.elements.body;
        const body = input.value.trim();
        if (!body) return;

        await apiFetchJSON(`/api/messages/conversations/${encodeURIComponent(activeConversationId)}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body })
        });

        input.value = "";
        await loadConversations();
        await loadActiveConversation();
    });

    newMessageForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(newMessageForm);
        const recipientUserId = String(formData.get("recipientUserId") || "").trim();
        const recipientName = String(formData.get("recipientName") || "").trim();
        const message = String(formData.get("message") || "").trim();

        if ((!recipientUserId && !recipientName) || !message) {
            newMessageStatus.textContent = "Choose a creator and enter a message.";
            return;
        }

        try {
            const data = await apiFetchJSON("/api/messages/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipientUserId, recipientName, message })
            });
            activeConversationId = String(data.conversation.id);
            newMessageForm.reset();
            newMessageStatus.textContent = "";
            await loadConversations();
            await loadActiveConversation();
        } catch (error) {
            newMessageStatus.textContent = error.message;
        }
    });

    newMessageForm?.elements.recipientName?.addEventListener("input", () => {
        const query = newMessageForm.elements.recipientName.value;
        newMessageForm.elements.recipientUserId.value = "";

        if (searchTimer) {
            window.clearTimeout(searchTimer);
        }

        searchTimer = window.setTimeout(async () => {
            try {
                await searchUsers(query);
                syncSelectedRecipient();
            } catch (error) {
                newMessageStatus.textContent = error.message;
            }
        }, 250);
    });

    newMessageForm?.elements.recipientName?.addEventListener("change", syncSelectedRecipient);

    currentUser = await loadCurrentUser();
    if (!currentUser) return;

    if (initialRecipientUserId && newMessageForm?.elements.recipientUserId) {
        newMessageForm.elements.recipientUserId.value = initialRecipientUserId;
        try {
            const user = await loadUserById(initialRecipientUserId);
            suggestedUsers = [user];
            if (newMessageForm.elements.recipientName) {
                newMessageForm.elements.recipientName.value = user.name || "";
            }
        } catch (error) {
            newMessageStatus.textContent = error.message;
        }
        newMessageForm.elements.message.focus();
    }

    await loadConversations();
    await loadActiveConversation();
    pollTimer = window.setInterval(async () => {
        if (document.visibilityState === "hidden") return;
        await loadConversations();
        await loadActiveConversation();
    }, 5000);

    window.addEventListener("beforeunload", () => {
        if (pollTimer) window.clearInterval(pollTimer);
    });
});
