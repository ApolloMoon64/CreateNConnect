document.addEventListener('DOMContentLoaded', () => {
    const currentUserRaw = localStorage.getItem('currentUser');
    const navAvatarImages = document.querySelectorAll('.profile-avatar img');
    const anonymousAvatarSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"%3E%3Crect width="80" height="80" rx="40" fill="%23e5e7eb"/%3E%3Ccircle cx="40" cy="32" r="14" fill="%236b7280"/%3E%3Cpath d="M18 68c3.8-14 13-22 22-22s18.2 8 22 22" fill="%236b7280"/%3E%3C/svg%3E';
    let currentUser = null;

    const showAnonymousAvatar = () => {
        navAvatarImages.forEach((image) => {
            image.src = anonymousAvatarSrc;
            image.alt = 'Guest profile icon';
        });
    };

    if (currentUserRaw && navAvatarImages.length) {
        try {
            currentUser = JSON.parse(currentUserRaw);
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=2563eb&color=fff`;
            const avatarSrc = currentUser.profileImage || fallbackAvatar;

            navAvatarImages.forEach((image) => {
                image.src = avatarSrc;
                image.alt = `${currentUser.name || 'Profile'} avatar`;
            });
        } catch (error) {
            showAnonymousAvatar();
        }
    } else if (currentUserRaw) {
        try {
            currentUser = JSON.parse(currentUserRaw);
        } catch (error) {
            showAnonymousAvatar();
        }
    } else {
        showAnonymousAvatar();
    }

    const readResponsePayload = async (response) => {
        const raw = await response.text();

        if (!raw) {
            return {};
        }

        try {
            return JSON.parse(raw);
        } catch (error) {
            throw new Error('The server returned an unexpected response.');
        }
    };

    const apiFetchJSON = async (url, options = {}) => {
        const response = await fetch(url, options);
        const data = await readResponsePayload(response);

        if (!response.ok) {
            throw new Error(data.error || 'Request failed.');
        }

        return data;
    };

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

    const decodeDataValue = (value) => {
        try {
            return decodeURIComponent(value || '');
        } catch (error) {
            return value || '';
        }
    };

    const ensurePurchaseModal = () => {
        let modal = document.getElementById('purchase-modal');
        if (modal) {
            return modal;
        }

        modal = document.createElement('div');
        modal.id = 'purchase-modal';
        modal.className = 'purchase-modal hidden';
        modal.innerHTML = `
            <div class="purchase-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="purchase-modal-title">
                <button class="purchase-close" type="button" data-purchase-close aria-label="Close purchase form">
                    <i class="ph ph-x"></i>
                </button>
                <p class="content-card-kicker">Demo checkout</p>
                <h2 id="purchase-modal-title">Purchase artwork</h2>
                <p class="purchase-summary" data-purchase-summary></p>
                <form id="purchase-form" class="purchase-form">
                    <input type="hidden" name="itemType">
                    <input type="hidden" name="itemId">
                    <label class="commission-form-field">
                        <span>Name</span>
                        <input class="auth-input" name="buyerName" type="text" required>
                    </label>
                    <label class="commission-form-field">
                        <span>Email</span>
                        <input class="auth-input" name="buyerEmail" type="email" required>
                    </label>
                    <label class="commission-form-field">
                        <span>Payment method</span>
                        <select class="auth-input" name="paymentMethod" required>
                            <option value="demo-card">Demo card ending in 4242</option>
                            <option value="demo-paypal">Demo PayPal</option>
                            <option value="artist-followup">Artist follow-up</option>
                        </select>
                    </label>
                    <label class="commission-form-field purchase-form-span">
                        <span>Delivery note</span>
                        <textarea class="auth-input profile-content-textarea" name="note" placeholder="Sizing, shipping, or customization notes"></textarea>
                    </label>
                    <p class="purchase-disclaimer">This is a project demo checkout. No real payment is collected.</p>
                    <div class="commission-form-actions">
                        <button class="btn btn-primary" type="submit">Complete Purchase</button>
                        <button class="btn btn-secondary" type="button" data-purchase-close>Cancel</button>
                    </div>
                    <p class="purchase-status" data-purchase-status aria-live="polite"></p>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelectorAll('[data-purchase-close]').forEach((button) => {
            button.addEventListener('click', () => modal.classList.add('hidden'));
        });

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.add('hidden');
            }
        });

        modal.querySelector('#purchase-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();

            const form = event.currentTarget;
            const status = modal.querySelector('[data-purchase-status]');
            const submitButton = form.querySelector('button[type="submit"]');
            const formData = new FormData(form);

            if (!currentUser?.id) {
                window.location.href = 'auth.html';
                return;
            }

            status.textContent = 'Completing demo purchase...';
            submitButton.disabled = true;

            try {
                await apiFetchJSON('/api/purchases', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        itemType: formData.get('itemType'),
                        itemId: formData.get('itemId'),
                        buyerName: formData.get('buyerName'),
                        buyerEmail: formData.get('buyerEmail'),
                        note: formData.get('note')
                    })
                });

                status.textContent = 'Purchase complete. The artist has been notified.';
                setTimeout(() => {
                    modal.classList.add('hidden');
                    status.textContent = '';
                    submitButton.disabled = false;
                }, 1200);
            } catch (error) {
                status.textContent = error.message;
                submitButton.disabled = false;
            }
        });

        return modal;
    };

    const ensureTradeModal = () => {
        let modal = document.getElementById('trade-modal');
        if (modal) {
            return modal;
        }

        modal = document.createElement('div');
        modal.id = 'trade-modal';
        modal.className = 'purchase-modal hidden';
        modal.innerHTML = `
            <div class="purchase-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="trade-modal-title">
                <button class="purchase-close" type="button" data-trade-close aria-label="Close trade form">
                    <i class="ph ph-x"></i>
                </button>
                <p class="content-card-kicker">Artwork trade</p>
                <h2 id="trade-modal-title">Offer a trade</h2>
                <p class="purchase-summary" data-trade-summary></p>
                <form id="trade-form" class="purchase-form">
                    <input type="hidden" name="requestedItemType">
                    <input type="hidden" name="requestedItemId">
                    <label class="commission-form-field purchase-form-span">
                        <span>Your artwork to offer</span>
                        <select class="auth-input" name="offeredArtwork" required></select>
                    </label>
                    <label class="commission-form-field purchase-form-span">
                        <span>Message</span>
                        <textarea class="auth-input profile-content-textarea" name="message" maxlength="1200" required>Would you be interested in trading?</textarea>
                    </label>
                    <p class="purchase-disclaimer">The artist who owns this artwork makes the final accept or decline decision. If accepted, both artworks are marked traded.</p>
                    <div class="commission-form-actions">
                        <button class="btn btn-primary" type="submit">Send Trade Offer</button>
                        <button class="btn btn-secondary" type="button" data-trade-close>Cancel</button>
                    </div>
                    <p class="purchase-status" data-trade-status aria-live="polite"></p>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelectorAll('[data-trade-close]').forEach((button) => {
            button.addEventListener('click', () => modal.classList.add('hidden'));
        });

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.add('hidden');
            }
        });

        modal.querySelector('#trade-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();

            const form = event.currentTarget;
            const status = modal.querySelector('[data-trade-status]');
            const submitButton = form.querySelector('button[type="submit"]');
            const formData = new FormData(form);
            const [offeredItemType, offeredItemId] = String(formData.get('offeredArtwork') || '').split(':');

            status.textContent = 'Sending trade offer...';
            submitButton.disabled = true;

            try {
                const data = await apiFetchJSON('/api/trades', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        requestedItemType: formData.get('requestedItemType'),
                        requestedItemId: formData.get('requestedItemId'),
                        offeredItemType,
                        offeredItemId,
                        message: formData.get('message')
                    })
                });

                status.textContent = 'Trade offer sent. Opening Messages...';
                window.setTimeout(() => {
                    window.location.href = `messages.html?conversationId=${encodeURIComponent(data.conversation.id)}`;
                }, 700);
            } catch (error) {
                status.textContent = error.message;
                submitButton.disabled = false;
            }
        });

        return modal;
    };

    const ensureContactModal = () => {
        let modal = document.getElementById('contact-modal');
        if (modal) {
            return modal;
        }

        modal = document.createElement('div');
        modal.id = 'contact-modal';
        modal.className = 'purchase-modal hidden';
        modal.innerHTML = `
            <div class="purchase-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
                <button class="purchase-close" type="button" data-contact-close aria-label="Close contact form">
                    <i class="ph ph-x"></i>
                </button>
                <p class="content-card-kicker">CreateNConnect</p>
                <h2 id="contact-modal-title">Contact Us</h2>
                <form id="contact-form" class="purchase-form">
                    <label class="commission-form-field">
                        <span>Name</span>
                        <input class="auth-input" name="name" type="text" required>
                    </label>
                    <label class="commission-form-field">
                        <span>Email</span>
                        <input class="auth-input" name="email" type="email" required>
                    </label>
                    <label class="commission-form-field purchase-form-span">
                        <span>Message</span>
                        <textarea class="auth-input profile-content-textarea" name="message" maxlength="3000" required></textarea>
                    </label>
                    <div class="commission-form-actions">
                        <button class="btn btn-primary" type="submit">Send Message</button>
                        <button class="btn btn-secondary" type="button" data-contact-close>Cancel</button>
                    </div>
                    <p class="purchase-status" data-contact-status aria-live="polite"></p>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelectorAll('[data-contact-close]').forEach((button) => {
            button.addEventListener('click', () => modal.classList.add('hidden'));
        });

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.add('hidden');
            }
        });

        modal.querySelector('#contact-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();

            const form = event.currentTarget;
            const status = modal.querySelector('[data-contact-status]');
            const submitButton = form.querySelector('button[type="submit"]');
            const formData = new FormData(form);

            status.textContent = 'Sending message...';
            submitButton.disabled = true;

            try {
                await apiFetchJSON('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: formData.get('name'),
                        email: formData.get('email'),
                        message: formData.get('message')
                    })
                });

                status.textContent = 'Message sent. Thank you for reaching out.';
                form.reset();
                setTimeout(() => {
                    modal.classList.add('hidden');
                    status.textContent = '';
                    submitButton.disabled = false;
                }, 1400);
            } catch (error) {
                status.textContent = error.message;
                submitButton.disabled = false;
            }
        });

        return modal;
    };

    const openContactModal = () => {
        const modal = ensureContactModal();
        const form = modal.querySelector('#contact-form');
        const status = modal.querySelector('[data-contact-status]');

        form.reset();
        form.elements.name.value = currentUser?.name || '';
        form.elements.email.value = currentUser?.email || '';
        status.textContent = '';
        form.querySelector('button[type="submit"]').disabled = false;
        modal.classList.remove('hidden');
        form.elements.name.focus();
    };

    const openPurchaseModal = (button) => {
        if (!currentUser?.id) {
            window.location.href = 'auth.html';
            return;
        }

        const modal = ensurePurchaseModal();
        const form = modal.querySelector('#purchase-form');
        const summary = modal.querySelector('[data-purchase-summary]');
        const status = modal.querySelector('[data-purchase-status]');
        const title = decodeDataValue(button.dataset.purchaseTitle) || 'Artwork';
        const artist = decodeDataValue(button.dataset.purchaseArtist) || 'Artist';
        const price = decodeDataValue(button.dataset.purchasePrice) || 'Price to be arranged';

        form.reset();
        form.elements.itemType.value = button.dataset.purchaseItemType || '';
        form.elements.itemId.value = decodeDataValue(button.dataset.purchaseItemId);
        form.elements.buyerName.value = currentUser.name || '';
        form.elements.buyerEmail.value = currentUser.email || '';
        summary.textContent = `${title} by ${artist} · ${price}`;
        status.textContent = '';
        form.querySelector('button[type="submit"]').disabled = false;
        modal.classList.remove('hidden');
        form.elements.buyerName.focus();
    };

    const openTradeModal = async (button) => {
        if (!currentUser?.id) {
            window.location.href = 'auth.html';
            return;
        }

        const modal = ensureTradeModal();
        const form = modal.querySelector('#trade-form');
        const summary = modal.querySelector('[data-trade-summary]');
        const status = modal.querySelector('[data-trade-status]');
        const artworkSelect = form.elements.offeredArtwork;
        const submitButton = form.querySelector('button[type="submit"]');
        const title = decodeDataValue(button.dataset.tradeTitle) || 'Artwork';
        const artist = decodeDataValue(button.dataset.tradeArtist) || 'Artist';

        form.reset();
        form.elements.requestedItemType.value = button.dataset.tradeItemType || '';
        form.elements.requestedItemId.value = decodeDataValue(button.dataset.tradeItemId);
        summary.textContent = `You are offering one of your artworks for ${title} by ${artist}.`;
        status.textContent = 'Loading your available artworks...';
        artworkSelect.innerHTML = '<option value="">Loading...</option>';
        submitButton.disabled = true;
        modal.classList.remove('hidden');

        try {
            const data = await apiFetchJSON('/api/my-artworks');
            const artworks = data.artworks || [];

            if (!artworks.length) {
                artworkSelect.innerHTML = '<option value="">No available artwork yet</option>';
                status.textContent = 'Add an artwork to your profile before offering a trade.';
                return;
            }

            artworkSelect.innerHTML = artworks.map((artwork) => `
                <option value="${artwork.itemType}:${artwork.id}">
                    ${escapeHtml(artwork.title)} (${escapeHtml(artwork.itemType)})
                </option>
            `).join('');
            form.elements.message.value = 'Would you be interested in trading?';
            status.textContent = '';
            submitButton.disabled = false;
        } catch (error) {
            status.textContent = error.message;
        }
    };

    document.addEventListener('click', (event) => {
        const authRequiredLink = event.target.closest('[data-auth-required="true"]');

        if (authRequiredLink && !currentUser?.id) {
            event.preventDefault();
            window.location.href = 'auth.html';
            return;
        }

        const purchaseButton = event.target.closest('.purchase-art-btn');

        if (purchaseButton) {
            event.preventDefault();
            openPurchaseModal(purchaseButton);
            return;
        }

        const tradeButton = event.target.closest('.trade-art-btn');
        if (tradeButton) {
            event.preventDefault();
            openTradeModal(tradeButton);
        }
    });

    document.getElementById('contact-us-btn')?.addEventListener('click', openContactModal);

    const setupNotifications = () => {
        const bellButton = document.querySelector('.profile-section .icon-btn[aria-label="Notifications"]');
        if (!bellButton || !currentUser?.id) {
            document.querySelectorAll('.notification-dot').forEach((dot) => {
                dot.hidden = true;
            });
            return;
        }

        let panel = document.getElementById('notification-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'notification-panel';
            panel.className = 'notification-panel glass-panel hidden';
            panel.innerHTML = `
                <div class="notification-panel-header">
                    <h2>Notifications</h2>
                    <button class="ghost-button" type="button" data-notifications-read>Mark read</button>
                </div>
                <div class="notification-list" data-notification-list>
                    <p class="muted-copy">No notifications yet.</p>
                </div>
            `;
            bellButton.insertAdjacentElement('afterend', panel);
        }

        const renderNotifications = ({ notifications = [], unreadCount = 0 }) => {
            const list = panel.querySelector('[data-notification-list]');
            const dots = document.querySelectorAll('.notification-dot');

            dots.forEach((dot) => {
                dot.hidden = unreadCount === 0;
            });

            if (!notifications.length) {
                list.innerHTML = '<p class="muted-copy">No notifications yet.</p>';
                return;
            }

            list.innerHTML = notifications.map((notification) => {
                const tagName = notification.linkUrl ? 'a' : 'article';
                const href = notification.linkUrl ? ` href="${escapeHtml(notification.linkUrl)}"` : '';

                return `
                <${tagName} class="notification-item${notification.readAt ? '' : ' unread'}"${href}>
                    <strong>${escapeHtml(notification.title)}</strong>
                    <p>${escapeHtml(notification.body)}</p>
                    <span>${formatNotificationTime(notification.createdAt)}</span>
                </${tagName}>
            `;
            }).join('');
        };

        const loadNotifications = async () => {
            try {
                const data = await apiFetchJSON('/api/notifications');
                renderNotifications(data);
            } catch (error) {
                panel.querySelector('[data-notification-list]').innerHTML =
                    `<p class="muted-copy">${escapeHtml(error.message)}</p>`;
            }
        };

        bellButton.addEventListener('click', async (event) => {
            event.preventDefault();
            panel.classList.toggle('hidden');
            if (!panel.classList.contains('hidden')) {
                await loadNotifications();
            }
        });

        panel.querySelector('[data-notifications-read]')?.addEventListener('click', async () => {
            await apiFetchJSON('/api/notifications/read-all', {
                method: 'POST'
            });
            await loadNotifications();
        });

        document.addEventListener('click', (event) => {
            if (panel.classList.contains('hidden')) {
                return;
            }

            if (panel.contains(event.target) || bellButton.contains(event.target)) {
                return;
            }

            panel.classList.add('hidden');
        });

        loadNotifications();
    };

    const formatNotificationTime = (value) => {
        if (!value) {
            return '';
        }

        return new Intl.DateTimeFormat('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(value));
    };

    setupNotifications();

    // Left Sidebar Toggle Functionality
    const toggleBtn = document.getElementById('toggle-sidebar');
    const sidebar = document.getElementById('sidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            
            // Optional: Save state to localStorage so it persists across page loads
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebar-collapsed', isCollapsed);
        });

        // Initialize state from localStorage if it exists
        const savedState = localStorage.getItem('sidebar-collapsed');
        if (savedState === 'true') {
            sidebar.classList.add('collapsed');
        }
    }

    const navLinks = document.querySelector('.top-nav .nav-links');
    if (navLinks && !navLinks.querySelector('a[href="messages.html"]')) {
        const messagesLink = document.createElement('a');
        messagesLink.href = 'messages.html';
        messagesLink.className = 'nav-item';
        messagesLink.innerHTML = '<i class="ph ph-chat-circle-text"></i> Messages';

        const authLink = navLinks.querySelector('a[href="auth.html"]');
        navLinks.insertBefore(messagesLink, authLink || null);
    }

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navItems = document.querySelectorAll('.top-nav .nav-item');
    navItems.forEach((item) => {
        const href = item.getAttribute('href');
        if (href && href !== '#' && href === currentPage) {
            item.classList.add('active');
        }
    });

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const href = item.getAttribute('href');

            if (!href || href === '#') {
                e.preventDefault();
            }

            // Remove active class from all
            navItems.forEach(nav => nav.classList.remove('active'));

            // Add active class to clicked
            item.classList.add('active');
        });
    });

    // Add subtle entrance animation to the content
    const sideNavItems = document.querySelectorAll('.side-nav-item');
    sideNavItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(10px)';
        item.style.transitionDelay = `${index * 0.05}s`;
        
        setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
            // Reset transition delay after entrance animation
            setTimeout(() => {
                item.style.transitionDelay = '0s';
            }, 300);
        }, 100);
    });

    // Tutorial Grid Interactivity (only on tutorial.html)
    if (document.querySelector('.tutorial-grid')) {
        // Like Button Functionality
        const likeButtons = document.querySelectorAll('.like-btn');
        likeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click when liking
                btn.classList.toggle('liked');
                
                // Update button text/icon (simple toggle)
                if (btn.classList.contains('liked')) {
                    btn.textContent = '&#9829;';
                    btn.style.color = '#ef4444';
                } else {
                    btn.textContent = '&#9825;';
                    btn.style.color = '';
                }
            });
        });

        // Post Card Click to open video popup or show tutorial message
        const postCards = document.querySelectorAll('.post-card');
        const modal = document.getElementById('video-modal');
        const modalIframe = document.getElementById('modal-video-iframe');
        const modalClose = document.getElementById('modal-close');
        const modalTitle = document.querySelector('.modal-video-title');
        const videoData = {
            'Creative1': 'https://www.tiktok.com/@h.mesc/video/7222938197976763675',
            'DigArt2': 'https://www.tiktok.com/@quankm.art/video/7309562307720334598',
            'ArtLover': 'https://www.tiktok.com/@ab_miniart/video/7491680732155317534',
            'SketchMaster': 'https://www.tiktok.com/@yartista/video/7148154944544099590'
        };

        const loadCommentsForVideo = (videoUrl) => {
            let comments = JSON.parse(localStorage.getItem(`comments_${videoUrl}`) || '[]');
            
            // Initialize with default comments if none exist
            if (comments.length === 0) {
                const defaultComments = {
                    'https://www.tiktok.com/@h.mesc/video/7222938197976763675': [
                        { name: 'StreetArtFan', text: 'Love the urban style! Great techniques.' },
                        { name: 'GraffitiKing', text: 'Amazing spray work, very inspiring!' }
                    ],
                    'https://www.tiktok.com/@quankm.art/video/7309562307720334598': [
                        { name: 'DigitalDreamer', text: 'Your digital workflow is incredible!' },
                        { name: 'ArtStudent', text: 'Thanks for sharing your process.' }
                    ],
                    'https://www.tiktok.com/@ab_miniart/video/7491680732155317534': [
                        { name: 'PaintLover', text: 'Beautiful acrylic techniques!' },
                        { name: 'MiniatureArt', text: 'Love the detail work on small canvases.' }
                    ],
                    'https://www.tiktok.com/@yartista/video/7148154944544099590': [
                        { name: 'AliceSketcher', text: 'Amazing tutorial, thanks for sharing!' },
                        { name: 'SketchingBruh', text: 'Great pacing and visuals. Learned a lot.' }
                    ]
                };
                
                comments = defaultComments[videoUrl] || [];
                if (comments.length > 0) {
                    localStorage.setItem(`comments_${videoUrl}`, JSON.stringify(comments));
                }
            }
            
            popupCommentsList.innerHTML = '';
            comments.forEach(comment => {
                const commentDiv = document.createElement('div');
                commentDiv.className = 'comment-item';
                commentDiv.innerHTML = `<strong>${comment.name}</strong>: ${comment.text}`;
                popupCommentsList.appendChild(commentDiv);
            });
        };

        const saveCommentForVideo = (videoUrl, name, text) => {
            const comments = JSON.parse(localStorage.getItem(`comments_${videoUrl}`) || '[]');
            comments.push({ name, text });
            localStorage.setItem(`comments_${videoUrl}`, JSON.stringify(comments));
        };

        const popupCommentForm = document.getElementById('popup-comment-form');
        const popupCommentsList = document.getElementById('popup-comments-list');

        const getTikTokEmbedUrl = (tiktokUrl) => {
            const match = tiktokUrl.match(/video\/(\d+)/);
            if (!match) return '';
            const videoId = match[1];
            return `https://www.tiktok.com/embed/v2/${videoId}`;
        };

        const closeModal = () => {
            modal.classList.add('hidden');
            if (modalIframe) {
                modalIframe.src = '';
            }
        };

        postCards.forEach((card) => {
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('like-btn')) {
                    return; // ignore card click when liking
                }

                const username = card.querySelector('.username').textContent;
                const tiktokUrl = videoData[username];
                if (tiktokUrl) {
                    const embedUrl = getTikTokEmbedUrl(tiktokUrl);
                    if (embedUrl && modalIframe && modalTitle) {
                        modalTitle.textContent = `${username} TikTok Tutorial`;
                        modalIframe.src = embedUrl;
                        currentVideoUrl = tiktokUrl;
                        loadCommentsForVideo(tiktokUrl);
                        modal.classList.remove('hidden');
                    }
                    return;
                }

                const usernameFallback = card.querySelector('.username').textContent;
                alert(`Opening tutorial by ${usernameFallback}`);
            });
        });

        if (modalClose) {
            modalClose.addEventListener('click', closeModal);
        }

        if (modal) {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });
        }

        // Add hover effect for post images (enhance existing CSS)
        const imagePlaceholders = document.querySelectorAll('.post-image-placeholder, .video-preview');
        imagePlaceholders.forEach(placeholder => {
            placeholder.addEventListener('mouseenter', () => {
                placeholder.style.transform = 'scale(1.05)';
                placeholder.style.transition = 'transform 0.3s ease';
            });

            placeholder.addEventListener('mouseleave', () => {
                placeholder.style.transform = 'scale(1)';
            });
        });

        if (popupCommentForm && popupCommentsList) {
            popupCommentForm.addEventListener('submit', (event) => {
                event.preventDefault();

                const nameInput = document.getElementById('popup-commenter-name');
                const textInput = document.getElementById('popup-comment-text');

                const name = nameInput.value.trim();
                const text = textInput.value.trim();

                if (!name || !text || !currentVideoUrl) return;

                saveCommentForVideo(currentVideoUrl, name, text);
                loadCommentsForVideo(currentVideoUrl);

                nameInput.value = '';
                textInput.value = '';
            });
        }
    }

    // Submenu Enhancement: Add click-to-toggle for better mobile experience
    const submenuItems = document.querySelectorAll('.submenu-item');
    submenuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Remove active from all submenu items
            submenuItems.forEach(sub => sub.classList.remove('active'));
            // Add active to clicked
            item.classList.add('active');
            
            // Optional: Close submenu after selection on mobile
            if (window.innerWidth < 768) {
                const container = item.closest('.side-nav-item-container');
                // Could add logic to hide submenu here if needed
            }
        });
    });
});
