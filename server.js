require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");
const {
    createCommunity,
    createCommunityMessage,
    createNotification,
    createPortfolioItem,
    createCommission,
    createPost,
    createPurchase,
    createTutorial,
    createUser,
    deleteCommissionById,
    deletePortfolioItemById,
    deletePostById,
    deleteTutorialById,
    deleteUserById,
    findUserByEmail,
    getCommunityById,
    getPurchasableItem,
    getUserById,
    healthCheck,
    initializeDatabase,
    listAllCommissions,
    listCommunitiesForUser,
    listCommunityMessages,
    listNotificationsForUser,
    listCommissionsByUserId,
    listPortfolioItemsByUserId,
    listPostsByUserId,
    listTutorialsByUserId,
    joinCommunity,
    markAllNotificationsRead,
    markNotificationRead,
    updateUserPasswordHash,
    updateUserProfile
} = require("./db");

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;
const SESSION_COOKIE_NAME = "cnc_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const SESSION_SECRET = process.env.SESSION_SECRET || "replace-this-session-secret-before-production";

let emailTransporterPromise;

const MIME_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue) {
    if (!storedValue || !storedValue.includes(":")) {
        return false;
    }

    const [salt, hash] = storedValue.split(":");
    const passwordHash = crypto.scryptSync(password, salt, 64);
    const storedHash = Buffer.from(hash, "hex");

    if (passwordHash.length !== storedHash.length) {
        return false;
    }

    return crypto.timingSafeEqual(passwordHash, storedHash);
}

function isLegacyPlaintextPasswordMatch(password, storedValue) {
    return typeof storedValue === "string" && !storedValue.includes(":") && storedValue === password;
}

function sanitizeUser(user) {
    if (!user) {
        return null;
    }

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        specialties: Array.isArray(user.specialties) ? user.specialties : [],
        joinedAt: user.joinedAt
    };
}

function sendJSON(res, statusCode, payload) {
    res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
    res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(text);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        req.on("data", (chunk) => {
            body += chunk;

            if (body.length > 20_000_000) {
                reject(new Error("Request body too large."));
                req.destroy();
            }
        });

        req.on("end", () => {
            if (!body) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(new Error("Invalid JSON body."));
            }
        });

        req.on("error", reject);
    });
}

function serveFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    fs.readFile(filePath, (error, content) => {
        if (error) {
            sendText(
                res,
                error.code === "ENOENT" ? 404 : 500,
                error.code === "ENOENT" ? "Not found" : "Server error"
            );
            return;
        }

        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
    });
}

function serveStatic(req, res, pathname) {
    const requestedPath = pathname === "/" ? "/index.html" : pathname;
    const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(ROOT_DIR, normalizedPath);

    if (!filePath.startsWith(ROOT_DIR)) {
        sendText(res, 403, "Forbidden");
        return;
    }

    fs.stat(filePath, (error, stats) => {
        if (error || !stats.isFile()) {
            sendText(res, 404, "Not found");
            return;
        }

        serveFile(res, filePath);
    });
}

function isDuplicateEmailError(error) {
    return error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062);
}

function base64UrlEncode(value) {
    return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
    return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value) {
    return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function createSessionToken(userId) {
    const payload = base64UrlEncode(JSON.stringify({
        userId: String(userId),
        expiresAt: Date.now() + SESSION_DURATION_MS
    }));
    const signature = signValue(payload);

    return `${payload}.${signature}`;
}

function verifySessionToken(token) {
    if (!token || !token.includes(".")) {
        return null;
    }

    const [payload, signature] = token.split(".");
    const expectedSignature = signValue(payload);
    const providedSignature = Buffer.from(signature || "");
    const validSignature = Buffer.from(expectedSignature);

    if (
        providedSignature.length !== validSignature.length ||
        !crypto.timingSafeEqual(providedSignature, validSignature)
    ) {
        return null;
    }

    try {
        const session = JSON.parse(base64UrlDecode(payload));
        if (!session.userId || !session.expiresAt || Number(session.expiresAt) < Date.now()) {
            return null;
        }

        return session;
    } catch (error) {
        return null;
    }
}

function parseCookies(cookieHeader) {
    return String(cookieHeader || "")
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((cookies, part) => {
            const separatorIndex = part.indexOf("=");
            if (separatorIndex === -1) {
                return cookies;
            }

            const key = part.slice(0, separatorIndex);
            const value = part.slice(separatorIndex + 1);
            cookies[key] = decodeURIComponent(value);
            return cookies;
        }, {});
}

function buildCookie(name, value, maxAgeSeconds) {
    const cookieParts = [
        `${name}=${encodeURIComponent(value)}`,
        "HttpOnly",
        "SameSite=Lax",
        "Path=/",
        `Max-Age=${maxAgeSeconds}`
    ];

    if (process.env.NODE_ENV === "production") {
        cookieParts.push("Secure");
    }

    return cookieParts.join("; ");
}

function setAuthCookie(res, userId) {
    res.setHeader(
        "Set-Cookie",
        buildCookie(SESSION_COOKIE_NAME, createSessionToken(userId), Math.floor(SESSION_DURATION_MS / 1000))
    );
}

function clearAuthCookie(res) {
    res.setHeader("Set-Cookie", buildCookie(SESSION_COOKIE_NAME, "", 0));
}

async function getAuthenticatedUser(req) {
    const cookies = parseCookies(req.headers.cookie);
    const session = verifySessionToken(cookies[SESSION_COOKIE_NAME]);

    if (!session) {
        return null;
    }

    return getUserById(session.userId);
}

async function requireAuthenticatedUser(req, res) {
    const user = await getAuthenticatedUser(req);

    if (!user) {
        sendJSON(res, 401, { error: "Please log in to continue." });
        return null;
    }

    return user;
}

async function requireResourceOwner(req, res, userId) {
    const user = await requireAuthenticatedUser(req, res);

    if (!user) {
        return null;
    }

    if (String(user.id) !== String(userId)) {
        sendJSON(res, 403, { error: "You can only change your own content." });
        return null;
    }

    return user;
}

function isEmailConfigured() {
    return Boolean(
        process.env.SMTP_HOST &&
        process.env.SMTP_PORT &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        process.env.MEETING_EMAIL_FROM
    );
}

function getEmailTransporter() {
    if (!isEmailConfigured()) {
        return null;
    }

    if (!emailTransporterPromise) {
        let nodemailer;

        try {
            nodemailer = require("nodemailer");
        } catch (error) {
            return null;
        }

        emailTransporterPromise = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true" ||
                Number(process.env.SMTP_PORT) === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    return emailTransporterPromise;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function isValidEmailAddress(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isDemoEmailAddress(value) {
    const email = String(value || "").trim().toLowerCase();
    return email === "user@example.com" || email.endsWith("@example.com");
}

function isSenderAddress(value) {
    const email = String(value || "").trim().toLowerCase();
    const senderEmail = String(process.env.MEETING_EMAIL_FROM || "").trim().toLowerCase();
    return Boolean(email && senderEmail && email === senderEmail);
}

async function sendMeetingInviteEmail({ recipientEmail, recipientName, meeting }) {
    const transporter = getEmailTransporter();

    if (!transporter) {
        return { delivered: false, reason: "email_not_configured" };
    }

    const subject = `CreateNConnect meeting invite: ${meeting.title}`;
    const safeRecipientName = escapeHtml(recipientName || "Creator");
    const safeTitle = escapeHtml(meeting.title);
    const safeType = escapeHtml(meeting.type);
    const safeRegion = escapeHtml(meeting.region);
    const safeDateTime = escapeHtml(meeting.dateTimeLabel);
    const safeLocation = escapeHtml(meeting.location);
    const safeDescription = escapeHtml(meeting.description);
    const safeLink = escapeHtml(meeting.zoomLink);

    const text = [
        `Hi ${recipientName || "Creator"},`,
        "",
        "You have successfully joined a CreateNConnect meeting.",
        "",
        `Title: ${meeting.title}`,
        `Type: ${meeting.type}`,
        `Region: ${meeting.region}`,
        `Date & time: ${meeting.dateTimeLabel}`,
        `Location: ${meeting.location}`,
        `Zoom link: ${meeting.zoomLink}`,
        "",
        "Description:",
        meeting.description,
        "",
        "See you there!"
    ].join("\n");

    const html = `
        <div style="font-family: Outfit, Arial, sans-serif; color: #1e1e24; line-height: 1.6;">
            <h2 style="margin-bottom: 0.5rem;">You're in for ${safeTitle}</h2>
            <p>Hi ${safeRecipientName},</p>
            <p>You have successfully joined a CreateNConnect meeting. Here are your Zoom details:</p>
            <div style="padding: 1rem; border-radius: 16px; background: #f8fafc; border: 1px solid #dbeafe;">
                <p><strong>Type:</strong> ${safeType}</p>
                <p><strong>Region:</strong> ${safeRegion}</p>
                <p><strong>Date & time:</strong> ${safeDateTime}</p>
                <p><strong>Location:</strong> ${safeLocation}</p>
                <p><strong>Zoom link:</strong> <a href="${safeLink}">${safeLink}</a></p>
            </div>
            <p style="margin-top: 1rem;"><strong>Description:</strong><br>${safeDescription}</p>
            <p>See you there!</p>
        </div>
    `;

    await transporter.sendMail({
        from: process.env.MEETING_EMAIL_FROM,
        to: recipientEmail,
        subject,
        text,
        html
    });

    return { delivered: true };
}

async function handleRequest(req, res) {
    const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const { pathname } = requestUrl;

    try {
        if (req.method === "GET" && pathname === "/api/health") {
            await healthCheck();
            sendJSON(res, 200, { ok: true });
            return;
        }

        if (req.method === "GET" && pathname === "/api/auth/me") {
            const user = await requireAuthenticatedUser(req, res);

            if (!user) {
                return;
            }

            sendJSON(res, 200, { user: sanitizeUser(user) });
            return;
        }

        if (req.method === "POST" && pathname === "/api/auth/logout") {
            clearAuthCookie(res);
            sendJSON(res, 200, { success: true });
            return;
        }

        if (req.method === "POST" && pathname === "/api/meetings/email-invite") {
            const authenticatedUser = await requireAuthenticatedUser(req, res);

            if (!authenticatedUser) {
                return;
            }

            const {
                recipientEmail,
                recipientName,
                meetingTitle,
                meetingType,
                meetingRegion,
                meetingDateTimeLabel,
                meetingLocation,
                meetingDescription,
                zoomLink
            } = await readBody(req);

            if (
                !recipientEmail ||
                !meetingTitle ||
                !meetingType ||
                !meetingRegion ||
                !meetingDateTimeLabel ||
                !meetingLocation ||
                !meetingDescription ||
                !zoomLink
            ) {
                sendJSON(res, 400, { error: "Missing meeting invite details." });
                return;
            }

            const normalizedRecipientEmail = String(recipientEmail).trim().toLowerCase();
            const authenticatedEmail = String(authenticatedUser.email || "").trim().toLowerCase();

            if (
                !isValidEmailAddress(normalizedRecipientEmail) ||
                isDemoEmailAddress(normalizedRecipientEmail) ||
                isSenderAddress(normalizedRecipientEmail)
            ) {
                sendJSON(res, 400, { error: "Please log in with a real account email before joining a meeting." });
                return;
            }

            if (normalizedRecipientEmail !== authenticatedEmail) {
                sendJSON(res, 403, { error: "Meeting invites can only be sent to your signed-in account email." });
                return;
            }

            const result = await sendMeetingInviteEmail({
                recipientEmail: normalizedRecipientEmail,
                recipientName: String(recipientName || "").trim(),
                meeting: {
                    title: String(meetingTitle).trim(),
                    type: String(meetingType).trim(),
                    region: String(meetingRegion).trim(),
                    dateTimeLabel: String(meetingDateTimeLabel).trim(),
                    location: String(meetingLocation).trim(),
                    description: String(meetingDescription).trim(),
                    zoomLink: String(zoomLink).trim()
                }
            });

            sendJSON(res, 200, result);
            return;
        }

        if (req.method === "GET" && pathname === "/api/notifications") {
            const authenticatedUser = await requireAuthenticatedUser(req, res);

            if (!authenticatedUser) {
                return;
            }

            const notifications = await listNotificationsForUser(authenticatedUser.id);
            const unreadCount = notifications.filter((notification) => !notification.readAt).length;
            sendJSON(res, 200, { notifications, unreadCount });
            return;
        }

        if (req.method === "POST" && pathname === "/api/notifications/read-all") {
            const authenticatedUser = await requireAuthenticatedUser(req, res);

            if (!authenticatedUser) {
                return;
            }

            await markAllNotificationsRead(authenticatedUser.id);
            sendJSON(res, 200, { success: true });
            return;
        }

        if (req.method === "POST" && pathname.match(/^\/api\/notifications\/[^/]+\/read$/)) {
            const authenticatedUser = await requireAuthenticatedUser(req, res);

            if (!authenticatedUser) {
                return;
            }

            const notificationId = pathname.split("/")[3];
            const marked = await markNotificationRead({
                userId: authenticatedUser.id,
                notificationId
            });

            if (!marked) {
                sendJSON(res, 404, { error: "Notification not found." });
                return;
            }

            sendJSON(res, 200, { success: true });
            return;
        }

        if (req.method === "POST" && pathname === "/api/purchases") {
            const authenticatedUser = await requireAuthenticatedUser(req, res);

            if (!authenticatedUser) {
                return;
            }

            const { itemType, itemId, buyerName, buyerEmail, note } = await readBody(req);
            const item = await getPurchasableItem(itemType, itemId);

            if (!item) {
                sendJSON(res, 404, { error: "Artwork not found." });
                return;
            }

            if (String(item.userId) === String(authenticatedUser.id)) {
                sendJSON(res, 400, { error: "You cannot purchase your own artwork." });
                return;
            }

            const cleanBuyerName = String(buyerName || authenticatedUser.name || "").trim();
            const cleanBuyerEmail = String(buyerEmail || authenticatedUser.email || "").trim().toLowerCase();

            if (!cleanBuyerName || !isValidEmailAddress(cleanBuyerEmail)) {
                sendJSON(res, 400, { error: "Buyer name and a valid email are required." });
                return;
            }

            const purchase = await createPurchase({
                buyerUserId: authenticatedUser.id,
                sellerUserId: item.userId,
                itemType: item.itemType,
                itemId: item.id,
                itemTitle: item.title,
                amount: item.price,
                buyerName: cleanBuyerName,
                buyerEmail: cleanBuyerEmail,
                note: String(note || "").trim()
            });

            await createNotification({
                userId: item.userId,
                actorUserId: authenticatedUser.id,
                title: "New artwork purchase",
                body: `${cleanBuyerName} purchased "${item.title}". Follow up at ${cleanBuyerEmail}.`,
                linkUrl: `profile.html?userId=${encodeURIComponent(item.userId)}`
            });

            sendJSON(res, 201, { purchase });
            return;
        }

        if (req.method === "GET" && pathname === "/api/communities") {
            const authenticatedUser = await requireAuthenticatedUser(req, res);

            if (!authenticatedUser) {
                return;
            }

            const communities = await listCommunitiesForUser(authenticatedUser.id);
            sendJSON(res, 200, { communities });
            return;
        }

        if (req.method === "POST" && pathname === "/api/communities") {
            const authenticatedUser = await requireAuthenticatedUser(req, res);

            if (!authenticatedUser) {
                return;
            }

            const { name, category, region, description } = await readBody(req);
            const trimmedName = String(name || "").trim();
            const trimmedCategory = String(category || "").trim();
            const trimmedRegion = String(region || "").trim();
            const trimmedDescription = String(description || "").trim();

            if (!trimmedName || !trimmedCategory || !trimmedRegion || !trimmedDescription) {
                sendJSON(res, 400, { error: "Community name, category, region, and intro are required." });
                return;
            }

            const community = await createCommunity({
                userId: authenticatedUser.id,
                name: trimmedName,
                category: trimmedCategory,
                region: trimmedRegion,
                description: trimmedDescription
            });

            sendJSON(res, 201, { community });
            return;
        }

        if (req.method === "POST" && pathname.match(/^\/api\/communities\/[^/]+\/join$/)) {
            const authenticatedUser = await requireAuthenticatedUser(req, res);

            if (!authenticatedUser) {
                return;
            }

            const communityId = pathname.split("/")[3];
            const community = await getCommunityById(communityId);

            if (!community) {
                sendJSON(res, 404, { error: "Community not found." });
                return;
            }

            await joinCommunity({ userId: authenticatedUser.id, communityId });
            const communities = await listCommunitiesForUser(authenticatedUser.id);
            const joinedCommunity = communities.find((item) => String(item.id) === String(communityId));

            sendJSON(res, 200, { community: joinedCommunity });
            return;
        }

        if (req.method === "GET" && pathname.match(/^\/api\/communities\/[^/]+\/messages$/)) {
            const authenticatedUser = await requireAuthenticatedUser(req, res);

            if (!authenticatedUser) {
                return;
            }

            const communityId = pathname.split("/")[3];
            const community = await getCommunityById(communityId);

            if (!community) {
                sendJSON(res, 404, { error: "Community not found." });
                return;
            }

            const messages = await listCommunityMessages({
                userId: authenticatedUser.id,
                communityId
            });

            sendJSON(res, 200, { messages });
            return;
        }

        if (req.method === "POST" && pathname.match(/^\/api\/communities\/[^/]+\/messages$/)) {
            const authenticatedUser = await requireAuthenticatedUser(req, res);

            if (!authenticatedUser) {
                return;
            }

            const communityId = pathname.split("/")[3];
            const community = await getCommunityById(communityId);

            if (!community) {
                sendJSON(res, 404, { error: "Community not found." });
                return;
            }

            const { text } = await readBody(req);
            const body = String(text || "").trim();

            if (!body) {
                sendJSON(res, 400, { error: "Message text is required." });
                return;
            }

            const message = await createCommunityMessage({
                userId: authenticatedUser.id,
                communityId,
                body
            });

            sendJSON(res, 201, { message });
            return;
        }

        if (req.method === "POST" && pathname === "/api/auth/signup") {
            const { name, email, password } = await readBody(req);

            if (!name || !email || !password) {
                sendJSON(res, 400, { error: "Name, email, and password are required." });
                return;
            }

            const normalizedEmail = String(email).trim().toLowerCase();
            const trimmedName = String(name).trim();
            const passwordText = String(password);

            if (!trimmedName) {
                sendJSON(res, 400, { error: "Name is required." });
                return;
            }

            if (passwordText.length < 8) {
                sendJSON(res, 400, { error: "Password must be at least 8 characters." });
                return;
            }

            const user = await createUser({
                name: trimmedName,
                email: normalizedEmail,
                passwordHash: hashPassword(passwordText)
            });

            setAuthCookie(res, user.id);
            sendJSON(res, 201, { user: sanitizeUser(user) });
            return;
        }

        if (req.method === "POST" && pathname === "/api/auth/login") {
            const { email, password } = await readBody(req);

            if (!email || !password) {
                sendJSON(res, 400, { error: "Email and password are required." });
                return;
            }

            const normalizedEmail = String(email).trim().toLowerCase();
            const user = await findUserByEmail(normalizedEmail);

            if (!user) {
                sendJSON(res, 401, { error: "Invalid email or password." });
                return;
            }

            const passwordText = String(password);
            const passwordMatches =
                verifyPassword(passwordText, user.passwordHash) ||
                isLegacyPlaintextPasswordMatch(passwordText, user.passwordHash);

            if (!passwordMatches) {
                sendJSON(res, 401, { error: "Invalid email or password." });
                return;
            }

            if (isLegacyPlaintextPasswordMatch(passwordText, user.passwordHash)) {
                await updateUserPasswordHash(user.id, hashPassword(passwordText));
            }

            setAuthCookie(res, user.id);
            sendJSON(res, 200, { user: sanitizeUser(user) });
            return;
        }

        if (req.method === "GET" && pathname.match(/^\/api\/users\/[^/]+\/posts$/)) {
            const userId = pathname.split("/")[3];
            const user = await getUserById(userId);

            if (!user) {
                sendJSON(res, 404, { error: "User not found." });
                return;
            }

            const posts = await listPostsByUserId(userId);
            sendJSON(res, 200, { posts });
            return;
        }

        if (req.method === "POST" && pathname.match(/^\/api\/users\/[^/]+\/posts$/)) {
            const userId = pathname.split("/")[3];
            const user = await requireResourceOwner(req, res, userId);

            if (!user) {
                return;
            }

            const { title, caption, mediaUrl } = await readBody(req);

            if (!title || !caption) {
                sendJSON(res, 400, { error: "Title and caption are required." });
                return;
            }

            const post = await createPost({
                userId,
                title: String(title).trim(),
                caption: String(caption).trim(),
                mediaUrl: mediaUrl && String(mediaUrl).trim()
                    ? String(mediaUrl).trim()
                    : `https://picsum.photos/seed/post-${Date.now()}/900/700`
            });

            sendJSON(res, 201, { post });
            return;
        }

        if (req.method === "DELETE" && pathname.match(/^\/api\/users\/[^/]+\/posts\/[^/]+$/)) {
            const [, , , userId, , postId] = pathname.split("/");
            const user = await requireResourceOwner(req, res, userId);

            if (!user) {
                return;
            }

            const deleted = await deletePostById(postId, userId);

            if (!deleted) {
                sendJSON(res, 404, { error: "Post not found for this user." });
                return;
            }

            sendJSON(res, 200, { success: true });
            return;
        }

        if (req.method === "GET" && pathname.match(/^\/api\/users\/[^/]+\/portfolio$/)) {
            const userId = pathname.split("/")[3];
            const user = await getUserById(userId);

            if (!user) {
                sendJSON(res, 404, { error: "User not found." });
                return;
            }

            const items = await listPortfolioItemsByUserId(userId);
            sendJSON(res, 200, { items });
            return;
        }

        if (req.method === "POST" && pathname.match(/^\/api\/users\/[^/]+\/portfolio$/)) {
            const userId = pathname.split("/")[3];
            const user = await requireResourceOwner(req, res, userId);

            if (!user) {
                return;
            }

            const { title, summary, imageUrl } = await readBody(req);

            if (!title || !summary) {
                sendJSON(res, 400, { error: "Title and summary are required." });
                return;
            }

            const item = await createPortfolioItem({
                userId,
                title: String(title).trim(),
                summary: String(summary).trim(),
                imageUrl: imageUrl && String(imageUrl).trim()
                    ? String(imageUrl).trim()
                    : `https://picsum.photos/seed/portfolio-${Date.now()}/900/700`
            });

            sendJSON(res, 201, { item });
            return;
        }

        if (req.method === "DELETE" && pathname.match(/^\/api\/users\/[^/]+\/portfolio\/[^/]+$/)) {
            const [, , , userId, , itemId] = pathname.split("/");
            const user = await requireResourceOwner(req, res, userId);

            if (!user) {
                return;
            }

            const deleted = await deletePortfolioItemById(itemId, userId);

            if (!deleted) {
                sendJSON(res, 404, { error: "Portfolio item not found for this user." });
                return;
            }

            sendJSON(res, 200, { success: true });
            return;
        }

        if (req.method === "GET" && pathname.match(/^\/api\/users\/[^/]+\/tutorials$/)) {
            const userId = pathname.split("/")[3];
            const user = await getUserById(userId);

            if (!user) {
                sendJSON(res, 404, { error: "User not found." });
                return;
            }

            const tutorials = await listTutorialsByUserId(userId);
            sendJSON(res, 200, { tutorials });
            return;
        }

        if (req.method === "POST" && pathname.match(/^\/api\/users\/[^/]+\/tutorials$/)) {
            const userId = pathname.split("/")[3];
            const user = await requireResourceOwner(req, res, userId);

            if (!user) {
                return;
            }

            const { title, description, imageUrl, mediaType } = await readBody(req);

            if (!title || !description || !imageUrl) {
                sendJSON(res, 400, { error: "Title, description, and tutorial media are required." });
                return;
            }

            const tutorial = await createTutorial({
                userId,
                title: String(title).trim(),
                description: String(description).trim(),
                imageUrl: String(imageUrl).trim(),
                mediaType: String(mediaType || "image").trim().toLowerCase()
            });

            sendJSON(res, 201, { tutorial });
            return;
        }

        if (req.method === "DELETE" && pathname.match(/^\/api\/users\/[^/]+\/tutorials\/[^/]+$/)) {
            const [, , , userId, , tutorialId] = pathname.split("/");
            const user = await requireResourceOwner(req, res, userId);

            if (!user) {
                return;
            }

            const deleted = await deleteTutorialById(tutorialId, userId);

            if (!deleted) {
                sendJSON(res, 404, { error: "Tutorial not found for this user." });
                return;
            }

            sendJSON(res, 200, { success: true });
            return;
        }

        if (req.method === "GET" && pathname.startsWith("/api/users/")) {
            const userId = pathname.split("/").pop();
            const user = await getUserById(userId);

            if (!user) {
                sendJSON(res, 404, { error: "User not found." });
                return;
            }

            sendJSON(res, 200, { user: sanitizeUser(user) });
            return;
        }

        if (req.method === "PUT" && pathname.startsWith("/api/users/")) {
            const userId = pathname.split("/").pop();
            const { bio, social, portfolio } = await readBody(req);
            const authUser = await requireResourceOwner(req, res, userId);

            if (!authUser) {
                return;
            }

            const existingUser = await getUserById(userId);
            if (!existingUser) {
                sendJSON(res, 404, { error: "User not found." });
                return;
            }

            const user = await updateUserProfile(userId, {
                bio: String(bio || "").trim() || existingUser.bio,
                social: String(social || "").trim() || existingUser.social || "@artist_handle",
                portfolio: String(portfolio || "").trim() || existingUser.portfolio || "Portfolio link"
            });

            sendJSON(res, 200, { user: sanitizeUser(user) });
            return;
        }

        if (req.method === "DELETE" && pathname.startsWith("/api/users/")) {
            const userId = pathname.split("/").pop();
            const authUser = await requireResourceOwner(req, res, userId);

            if (!authUser) {
                return;
            }

            const deleted = await deleteUserById(userId);

            if (!deleted) {
                sendJSON(res, 404, { error: "User not found." });
                return;
            }

            clearAuthCookie(res);
            sendJSON(res, 200, { success: true });
            return;
        }

        if (req.method === "GET" && pathname === "/api/commissions") {
            const userId = requestUrl.searchParams.get("userId");

            if (!userId) {
                const commissions = await listAllCommissions();
                sendJSON(res, 200, { commissions });
                return;
            }

            const user = await getUserById(userId);
            if (!user) {
                sendJSON(res, 404, { error: "User not found." });
                return;
            }

            const commissions = await listCommissionsByUserId(userId);
            sendJSON(res, 200, { commissions });
            return;
        }

        if (req.method === "POST" && pathname === "/api/commissions") {
            const { userId, title, artist, category, price, image } = await readBody(req);

            if (!userId || !title || !artist || !price || !image) {
                sendJSON(res, 400, { error: "User, title, artist, price, and artwork image are required." });
                return;
            }

            const user = await requireResourceOwner(req, res, userId);
            if (!user) {
                return;
            }

            const numericPrice = Number(price);
            if (Number.isNaN(numericPrice) || numericPrice < 0) {
                sendJSON(res, 400, { error: "Price must be a valid positive number." });
                return;
            }

            const commission = await createCommission({
                userId,
                title: String(title).trim(),
                artist: String(artist).trim(),
                category: String(category || "digital").trim().toLowerCase(),
                price: numericPrice,
                image: String(image).trim()
            });

            sendJSON(res, 201, { commission });
            return;
        }

        if (req.method === "DELETE" && pathname.startsWith("/api/commissions/")) {
            const commissionId = pathname.split("/").pop();
            const userId = requestUrl.searchParams.get("userId");

            if (!userId) {
                sendJSON(res, 400, { error: "userId is required." });
                return;
            }

            const user = await requireResourceOwner(req, res, userId);
            if (!user) {
                return;
            }

            const deleted = await deleteCommissionById(commissionId, userId);

            if (!deleted) {
                sendJSON(res, 404, { error: "Commission not found for this user." });
                return;
            }

            sendJSON(res, 200, { success: true });
            return;
        }

        if (req.method === "GET") {
            serveStatic(req, res, pathname);
            return;
        }

        sendText(res, 405, "Method not allowed");
    } catch (error) {
        console.error(`Request failed for ${req.method} ${pathname}:`, error);

        if (isDuplicateEmailError(error)) {
            sendJSON(res, 409, { error: "An account with that email already exists." });
            return;
        }

        const isAuthRoute = pathname.startsWith("/api/auth/");
        const defaultMessage =
            pathname === "/api/auth/login"
                ? "Unable to log in right now."
                : pathname === "/api/auth/signup"
                    ? "Unable to create account right now."
                    : isAuthRoute
                        ? "Authentication request failed."
                        : "Request failed.";

        const statusCode = error && error.statusCode
            ? error.statusCode
            : error && error.code === "ER_BAD_DB_ERROR"
                ? 500
                : 400;
        sendJSON(res, statusCode, { error: error.message || defaultMessage });
    }
}

async function createServer() {
    await initializeDatabase();

    return http.createServer((req, res) => {
        handleRequest(req, res);
    });
}

if (require.main === module) {
    createServer()
        .then((server) => {
            server.listen(PORT, () => {
                console.log(`Server running on http://localhost:${PORT}`);
            });
        })
        .catch((error) => {
            console.error("Unable to start CreateNConnect:", error);
            process.exit(1);
        });
}

module.exports = {
    PORT,
    createServer,
    handleRequest,
    sanitizeUser
};
