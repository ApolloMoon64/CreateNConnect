document.addEventListener("DOMContentLoaded", async () => {
    const conversationList = document.getElementById("conversation-list");
    const messageThread = document.getElementById("message-thread");
    const messageForm = document.getElementById("conversation-message-form");
    const newMessageForm = document.getElementById("new-message-form");
    const newMessageStatus = document.getElementById("new-message-status");
    const tradePanel = document.getElementById("trade-panel");
    const pageParams = new URLSearchParams(window.location.search);
    const initialConversationId = pageParams.get("conversationId");
    const initialRecipientUserId = pageParams.get("userId");

    let currentUser = null;
    let conversations = [];
    let activeConversationId = initialConversationId || "";
    let pollTimer = null;

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

    const renderConversationList = () => {
        if (!conversationList) return;

        conversationList.innerHTML = conversations.length
            ? conversations.map((conversation) => `
                <button class="conversation-list-item${String(conversation.id) === String(activeConversationId) ? " active" : ""}" type="button" data-conversation-id="${conversation.id}">
                    <strong>${escapeHtml(conversation.otherUserName || "Conversation")}</strong>
                    <span>${conversation.kind === "trade" ? `Trade: ${escapeHtml(conversation.tradeStatus || "pending")}` : "Direct message"}</span>
                    <small>${escapeHtml(conversation.lastMessage || "No messages yet")}</small>
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
            messageThread.innerHTML = '<p class="muted-copy">Choose a conversation to view messages.</p>';
            renderTradePanel(null);
            return;
        }

        const data = await apiFetchJSON(`/api/messages/conversations/${encodeURIComponent(activeConversationId)}/messages`);
        const conversation = data.conversation;
        const messages = data.messages || [];

        renderTradePanel(conversation);
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
        const message = String(formData.get("message") || "").trim();

        if (!recipientUserId || !message) {
            newMessageStatus.textContent = "Enter a user ID and message.";
            return;
        }

        try {
            const data = await apiFetchJSON("/api/messages/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipientUserId, message })
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

    currentUser = await loadCurrentUser();
    if (!currentUser) return;

    if (initialRecipientUserId && newMessageForm?.elements.recipientUserId) {
        newMessageForm.elements.recipientUserId.value = initialRecipientUserId;
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
