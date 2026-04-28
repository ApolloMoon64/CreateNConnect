document.addEventListener('DOMContentLoaded', () => {
    const currentUserRaw = localStorage.getItem('currentUser');
    const navAvatarImages = document.querySelectorAll('.profile-avatar img');

    if (currentUserRaw && navAvatarImages.length) {
        try {
            const currentUser = JSON.parse(currentUserRaw);
            const savedProfileImage = localStorage.getItem(`profileImage_${currentUser.id}`);
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=2563eb&color=fff`;
            const avatarSrc = savedProfileImage || fallbackAvatar;

            navAvatarImages.forEach((image) => {
                image.src = avatarSrc;
            });
        } catch (error) {}
    }

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

    // Interactive Top Navigation highlights
    const navItems = document.querySelectorAll('.top-nav .nav-item');
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
