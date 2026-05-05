const mysql = require("mysql2/promise");

const databaseName = process.env.MYSQL_DATABASE || "createnconnect";

const basePoolConfig = {
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

if (process.env.MYSQL_SOCKET_PATH) {
    basePoolConfig.socketPath = process.env.MYSQL_SOCKET_PATH;
} else {
    basePoolConfig.host = process.env.MYSQL_HOST || "127.0.0.1";
    basePoolConfig.port = Number(process.env.MYSQL_PORT) || 3306;
}

const pool = mysql.createPool({
    ...basePoolConfig,
    database: databaseName
});

function parseSpecialties(value) {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value;
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function mapUser(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        name: row.name,
        email: row.email,
        contactEmail: row.contact_email === null || row.contact_email === undefined ? row.email : row.contact_email,
        bio: row.bio,
        social: row.social_handle,
        portfolio: row.portfolio_label,
        specialties: parseSpecialties(row.specialties),
        joinedAt: row.joined_at instanceof Date ? row.joined_at.toISOString() : row.joined_at
    };
}

function mapCommission(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        artist: row.artist,
        category: row.category,
        price: Number(row.price),
        image: row.image,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    };
}

function mapPost(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        caption: row.caption,
        mediaUrl: row.media_url,
        artistName: row.artist_name,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    };
}

function mapPortfolioItem(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        summary: row.summary,
        imageUrl: row.image_url,
        artistName: row.artist_name,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    };
}

function mapTutorial(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        description: row.description,
        imageUrl: row.image_url,
        mediaType: row.media_type,
        artistName: row.artist_name,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    };
}

function mapCommunity(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        name: row.name,
        category: row.category,
        region: row.region,
        description: row.description,
        joined: Boolean(row.joined),
        messageCount: Number(row.message_count || 0),
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    };
}

function mapCommunityMessage(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        communityId: row.community_id,
        userId: row.user_id,
        authorName: row.author_name,
        text: row.body,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    };
}

function mapNotification(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        userId: row.user_id,
        actorUserId: row.actor_user_id,
        title: row.title,
        body: row.body,
        linkUrl: row.link_url,
        readAt: row.read_at instanceof Date ? row.read_at.toISOString() : row.read_at,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    };
}

function mapFollowUser(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        name: row.name,
        email: row.email,
        bio: row.bio,
        joinedAt: row.joined_at instanceof Date ? row.joined_at.toISOString() : row.joined_at
    };
}

function mapContactMessage(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        name: row.name,
        email: row.email,
        message: row.message,
        delivered: Boolean(row.delivered),
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    };
}

async function initializeDatabase() {
    const bootstrapPool = mysql.createPool(basePoolConfig);

    await bootstrapPool.query(
        `CREATE DATABASE IF NOT EXISTS \`${databaseName}\`
         CHARACTER SET utf8mb4
         COLLATE utf8mb4_unicode_ci`
    );

    await bootstrapPool.end();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(190) NOT NULL,
            contact_email VARCHAR(190) NULL,
            password_hash VARCHAR(255) NOT NULL,
            bio TEXT NOT NULL,
            social_handle VARCHAR(120) NOT NULL DEFAULT '@artist_handle',
            portfolio_label VARCHAR(160) NOT NULL DEFAULT 'Portfolio link',
            specialties JSON NOT NULL,
            joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY users_email_unique (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [userColumns] = await pool.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'users'
    `, [databaseName]);

    const existingColumns = new Set(userColumns.map((column) => column.COLUMN_NAME));

    if (!existingColumns.has("social_handle")) {
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN social_handle VARCHAR(120) NOT NULL DEFAULT '@artist_handle'
        `);
    }

    if (!existingColumns.has("portfolio_label")) {
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN portfolio_label VARCHAR(160) NOT NULL DEFAULT 'Portfolio link'
        `);
    }

    if (!existingColumns.has("contact_email")) {
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN contact_email VARCHAR(190) NULL AFTER email
        `);
        await pool.query(`
            UPDATE users
            SET contact_email = email
            WHERE contact_email IS NULL
        `);
    }

    const [commissionTables] = await pool.query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'commissions'
    `, [databaseName]);

    if (commissionTables.length) {
        const [commissionColumns] = await pool.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
              AND TABLE_NAME = 'commissions'
        `, [databaseName]);

        const existingCommissionColumns = new Set(
            commissionColumns.map((column) => column.COLUMN_NAME)
        );

        if (
            !existingCommissionColumns.has("user_id") ||
            !existingCommissionColumns.has("category")
        ) {
            await pool.query("DROP TABLE IF EXISTS commissions_legacy");
            await pool.query("RENAME TABLE commissions TO commissions_legacy");
        }
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS commissions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            title VARCHAR(160) NOT NULL,
            artist VARCHAR(160) NOT NULL,
            category VARCHAR(80) NOT NULL DEFAULT 'digital',
            price DECIMAL(10, 2) NOT NULL,
            image LONGTEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY commissions_user_id_index (user_id),
            CONSTRAINT commissions_user_id_fk
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS posts (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            title VARCHAR(160) NOT NULL,
            caption TEXT NOT NULL,
            media_url LONGTEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY posts_user_id_index (user_id),
            CONSTRAINT posts_user_id_fk
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS portfolio_items (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            title VARCHAR(160) NOT NULL,
            summary TEXT NOT NULL,
            image_url LONGTEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY portfolio_items_user_id_index (user_id),
            CONSTRAINT portfolio_items_user_id_fk
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS tutorials (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            title VARCHAR(160) NOT NULL,
            description TEXT NOT NULL,
            image_url LONGTEXT NOT NULL,
            media_type VARCHAR(16) NOT NULL DEFAULT 'image',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY tutorials_user_id_index (user_id),
            CONSTRAINT tutorials_user_id_fk
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS communities (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            owner_user_id BIGINT UNSIGNED NULL,
            name VARCHAR(160) NOT NULL,
            category VARCHAR(80) NOT NULL,
            region VARCHAR(80) NOT NULL,
            description TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY communities_owner_user_id_index (owner_user_id),
            CONSTRAINT communities_owner_user_id_fk
                FOREIGN KEY (owner_user_id) REFERENCES users(id)
                ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS community_members (
            community_id BIGINT UNSIGNED NOT NULL,
            user_id BIGINT UNSIGNED NOT NULL,
            joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (community_id, user_id),
            KEY community_members_user_id_index (user_id),
            CONSTRAINT community_members_community_id_fk
                FOREIGN KEY (community_id) REFERENCES communities(id)
                ON DELETE CASCADE,
            CONSTRAINT community_members_user_id_fk
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS community_messages (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            community_id BIGINT UNSIGNED NOT NULL,
            user_id BIGINT UNSIGNED NOT NULL,
            body TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY community_messages_community_id_index (community_id, id),
            KEY community_messages_user_id_index (user_id),
            CONSTRAINT community_messages_community_id_fk
                FOREIGN KEY (community_id) REFERENCES communities(id)
                ON DELETE CASCADE,
            CONSTRAINT community_messages_user_id_fk
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS purchases (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            buyer_user_id BIGINT UNSIGNED NOT NULL,
            seller_user_id BIGINT UNSIGNED NOT NULL,
            item_type VARCHAR(40) NOT NULL,
            item_id BIGINT UNSIGNED NOT NULL,
            item_title VARCHAR(160) NOT NULL,
            amount DECIMAL(10, 2) NULL,
            buyer_name VARCHAR(160) NOT NULL,
            buyer_email VARCHAR(190) NOT NULL,
            note TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY purchases_buyer_user_id_index (buyer_user_id),
            KEY purchases_seller_user_id_index (seller_user_id),
            CONSTRAINT purchases_buyer_user_id_fk
                FOREIGN KEY (buyer_user_id) REFERENCES users(id)
                ON DELETE CASCADE,
            CONSTRAINT purchases_seller_user_id_fk
                FOREIGN KEY (seller_user_id) REFERENCES users(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            actor_user_id BIGINT UNSIGNED NULL,
            title VARCHAR(180) NOT NULL,
            body TEXT NOT NULL,
            link_url VARCHAR(255) NOT NULL DEFAULT '',
            read_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY notifications_user_id_index (user_id, read_at, id),
            KEY notifications_actor_user_id_index (actor_user_id),
            CONSTRAINT notifications_user_id_fk
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE CASCADE,
            CONSTRAINT notifications_actor_user_id_fk
                FOREIGN KEY (actor_user_id) REFERENCES users(id)
                ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            token_hash CHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY password_reset_tokens_token_hash_unique (token_hash),
            KEY password_reset_tokens_user_id_index (user_id),
            CONSTRAINT password_reset_tokens_user_id_fk
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS contact_messages (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(160) NOT NULL,
            email VARCHAR(190) NOT NULL,
            message TEXT NOT NULL,
            delivered TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY contact_messages_created_at_index (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_follows (
            follower_user_id BIGINT UNSIGNED NOT NULL,
            following_user_id BIGINT UNSIGNED NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (follower_user_id, following_user_id),
            KEY user_follows_following_user_id_index (following_user_id),
            CONSTRAINT user_follows_follower_user_id_fk
                FOREIGN KEY (follower_user_id) REFERENCES users(id)
                ON DELETE CASCADE,
            CONSTRAINT user_follows_following_user_id_fk
                FOREIGN KEY (following_user_id) REFERENCES users(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [tutorialColumns] = await pool.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'tutorials'
    `, [databaseName]);

    const existingTutorialColumns = new Set(
        tutorialColumns.map((column) => column.COLUMN_NAME)
    );

    if (!existingTutorialColumns.has("media_type")) {
        await pool.query(`
            ALTER TABLE tutorials
            ADD COLUMN media_type VARCHAR(16) NOT NULL DEFAULT 'image'
        `);
    }

    await pool.query("ALTER TABLE commissions MODIFY image LONGTEXT NOT NULL");
    await pool.query("ALTER TABLE posts MODIFY media_url LONGTEXT NOT NULL");
    await pool.query("ALTER TABLE portfolio_items MODIFY image_url LONGTEXT NOT NULL");
    await pool.query("ALTER TABLE tutorials MODIFY image_url LONGTEXT NOT NULL");

    await seedDefaultCommunities();
}

async function healthCheck() {
    await pool.query("SELECT 1");
}

async function findUserByEmail(email) {
    const [rows] = await pool.query(
        `SELECT id, name, email, contact_email, password_hash, bio, social_handle, portfolio_label, specialties, joined_at
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email]
    );

    const row = rows[0];
    if (!row) {
        return null;
    }

    return {
        ...mapUser(row),
        passwordHash: row.password_hash
    };
}

async function createUser({ name, email, passwordHash }) {
    const specialties = JSON.stringify(["Digital Illustration", "Commissions"]);
    const bio = "New artist on CreateNConnect.";
    const social = "@artist_handle";
    const portfolio = "Portfolio link";

    const [result] = await pool.query(
        `INSERT INTO users (name, email, contact_email, password_hash, bio, social_handle, portfolio_label, specialties)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, email, email, passwordHash, bio, social, portfolio, specialties]
    );

    return getUserById(result.insertId);
}

async function getUserById(id) {
    const [rows] = await pool.query(
        `SELECT id, name, email, contact_email, bio, social_handle, portfolio_label, specialties, joined_at
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return mapUser(rows[0]);
}

async function updateUserProfile(id, { bio, social, portfolio, contactEmail }) {
    await pool.query(
        `UPDATE users
         SET bio = ?, social_handle = ?, portfolio_label = ?, contact_email = ?
         WHERE id = ?`,
        [bio, social, portfolio, contactEmail, id]
    );

    return getUserById(id);
}

async function updateUserPasswordHash(id, passwordHash) {
    await pool.query(
        `UPDATE users
         SET password_hash = ?
         WHERE id = ?`,
        [passwordHash, id]
    );
}

async function createContactMessage({ name, email, message, delivered }) {
    const [result] = await pool.query(
        `INSERT INTO contact_messages (name, email, message, delivered)
         VALUES (?, ?, ?, ?)`,
        [name, email, message, delivered ? 1 : 0]
    );

    const [rows] = await pool.query(
        `SELECT id, name, email, message, delivered, created_at
         FROM contact_messages
         WHERE id = ?
         LIMIT 1`,
        [result.insertId]
    );

    return mapContactMessage(rows[0]);
}

async function deleteUserById(id) {
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
    return result.affectedRows > 0;
}

async function listCommissionsByUserId(userId) {
    const [rows] = await pool.query(
        `SELECT id, user_id, title, artist, category, price, image, created_at
         FROM commissions
         WHERE user_id = ?
         ORDER BY id DESC`,
        [userId]
    );

    return rows.map(mapCommission);
}

async function listAllCommissions() {
    const [rows] = await pool.query(
        `SELECT id, user_id, title, artist, category, price, image, created_at
         FROM commissions
         ORDER BY id DESC`
    );

    return rows.map(mapCommission);
}

async function getPurchasableItem(itemType, itemId) {
    const normalizedType = String(itemType || "").trim().toLowerCase();
    const tableConfig = {
        commission: {
            sql: `SELECT id, user_id, title, price, 'commission' AS item_type FROM commissions WHERE id = ? LIMIT 1`
        },
        post: {
            sql: `SELECT id, user_id, title, NULL AS price, 'post' AS item_type FROM posts WHERE id = ? LIMIT 1`
        },
        portfolio: {
            sql: `SELECT id, user_id, title, NULL AS price, 'portfolio' AS item_type FROM portfolio_items WHERE id = ? LIMIT 1`
        },
        tutorial: {
            sql: `SELECT id, user_id, title, NULL AS price, 'tutorial' AS item_type FROM tutorials WHERE id = ? LIMIT 1`
        }
    };

    const config = tableConfig[normalizedType];
    if (!config) {
        return null;
    }

    const [rows] = await pool.query(config.sql, [itemId]);
    const row = rows[0];

    if (!row) {
        return null;
    }

    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        price: row.price === null || row.price === undefined ? null : Number(row.price),
        itemType: row.item_type
    };
}

async function createPurchase({ buyerUserId, sellerUserId, itemType, itemId, itemTitle, amount, buyerName, buyerEmail, note }) {
    const [result] = await pool.query(
        `INSERT INTO purchases
            (buyer_user_id, seller_user_id, item_type, item_id, item_title, amount, buyer_name, buyer_email, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [buyerUserId, sellerUserId, itemType, itemId, itemTitle, amount, buyerName, buyerEmail, note]
    );

    return {
        id: result.insertId,
        buyerUserId,
        sellerUserId,
        itemType,
        itemId,
        itemTitle,
        amount,
        buyerName,
        buyerEmail,
        note
    };
}

async function createNotification({ userId, actorUserId, title, body, linkUrl = "" }) {
    const [result] = await pool.query(
        `INSERT INTO notifications (user_id, actor_user_id, title, body, link_url)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, actorUserId || null, title, body, linkUrl]
    );

    const [rows] = await pool.query(
        `SELECT id, user_id, actor_user_id, title, body, link_url, read_at, created_at
         FROM notifications
         WHERE id = ?
         LIMIT 1`,
        [result.insertId]
    );

    return mapNotification(rows[0]);
}

async function listNotificationsForUser(userId) {
    const [rows] = await pool.query(
        `SELECT id, user_id, actor_user_id, title, body, link_url, read_at, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY id DESC
         LIMIT 30`,
        [userId]
    );

    return rows.map(mapNotification);
}

async function markNotificationRead({ userId, notificationId }) {
    const [result] = await pool.query(
        `UPDATE notifications
         SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
         WHERE id = ?
           AND user_id = ?`,
        [notificationId, userId]
    );

    return result.affectedRows > 0;
}

async function markAllNotificationsRead(userId) {
    await pool.query(
        `UPDATE notifications
         SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
         WHERE user_id = ?
           AND read_at IS NULL`,
        [userId]
    );
}

async function createPasswordResetToken({ userId, tokenHash, expiresInSeconds = 60 * 60 }) {
    await pool.query(
        `UPDATE password_reset_tokens
         SET used_at = COALESCE(used_at, CURRENT_TIMESTAMP)
         WHERE user_id = ?
           AND used_at IS NULL`,
        [userId]
    );

    const [result] = await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND))`,
        [userId, tokenHash, expiresInSeconds]
    );

    return result.insertId;
}

async function getValidPasswordResetToken(tokenHash) {
    const [rows] = await pool.query(
        `SELECT password_reset_tokens.id,
                password_reset_tokens.user_id,
                password_reset_tokens.expires_at,
                password_reset_tokens.used_at,
                users.email,
                users.name
         FROM password_reset_tokens
         INNER JOIN users ON users.id = password_reset_tokens.user_id
         WHERE password_reset_tokens.token_hash = ?
           AND password_reset_tokens.used_at IS NULL
           AND password_reset_tokens.expires_at > CURRENT_TIMESTAMP
         LIMIT 1`,
        [tokenHash]
    );

    return rows[0] || null;
}

async function markPasswordResetTokenUsed(id) {
    await pool.query(
        `UPDATE password_reset_tokens
         SET used_at = COALESCE(used_at, CURRENT_TIMESTAMP)
         WHERE id = ?`,
        [id]
    );
}

async function getFollowSummary({ userId, viewerUserId = null }) {
    const [followersResult, followingResult, viewerResult] = await Promise.all([
        pool.query(
            `SELECT COUNT(*) AS count
             FROM user_follows
             WHERE following_user_id = ?`,
            [userId]
        ),
        pool.query(
            `SELECT COUNT(*) AS count
             FROM user_follows
             WHERE follower_user_id = ?`,
            [userId]
        ),
        viewerUserId
            ? pool.query(
                `SELECT 1
                 FROM user_follows
                 WHERE follower_user_id = ?
                   AND following_user_id = ?
                 LIMIT 1`,
                [viewerUserId, userId]
            )
            : Promise.resolve([[]])
    ]);
    const [followersRows] = followersResult;
    const [followingRows] = followingResult;
    const [viewerRows] = viewerResult;

    return {
        followersCount: Number(followersRows[0]?.count || 0),
        followingCount: Number(followingRows[0]?.count || 0),
        isFollowing: viewerRows.length > 0
    };
}

async function followUser({ followerUserId, followingUserId }) {
    const [result] = await pool.query(
        `INSERT IGNORE INTO user_follows (follower_user_id, following_user_id)
         VALUES (?, ?)`,
        [followerUserId, followingUserId]
    );

    return result.affectedRows > 0;
}

async function unfollowUser({ followerUserId, followingUserId }) {
    const [result] = await pool.query(
        `DELETE FROM user_follows
         WHERE follower_user_id = ?
           AND following_user_id = ?`,
        [followerUserId, followingUserId]
    );

    return result.affectedRows > 0;
}

async function listFollowers(userId) {
    const [rows] = await pool.query(
        `SELECT users.id, users.name, users.email, users.bio, users.joined_at
         FROM user_follows
         INNER JOIN users ON users.id = user_follows.follower_user_id
         WHERE user_follows.following_user_id = ?
         ORDER BY user_follows.created_at DESC`,
        [userId]
    );

    return rows.map(mapFollowUser);
}

async function listFollowing(userId) {
    const [rows] = await pool.query(
        `SELECT users.id, users.name, users.email, users.bio, users.joined_at
         FROM user_follows
         INNER JOIN users ON users.id = user_follows.following_user_id
         WHERE user_follows.follower_user_id = ?
         ORDER BY user_follows.created_at DESC`,
        [userId]
    );

    return rows.map(mapFollowUser);
}


async function listPostsByUserId(userId) {
    const [rows] = await pool.query(
        `SELECT posts.id, posts.user_id, posts.title, posts.caption, posts.media_url, posts.created_at, users.name AS artist_name
         FROM posts
         INNER JOIN users ON users.id = posts.user_id
         WHERE posts.user_id = ?
         ORDER BY posts.id DESC`,
        [userId]
    );

    return rows.map(mapPost);
}

async function createPost({ userId, title, caption, mediaUrl }) {
    const [result] = await pool.query(
        `INSERT INTO posts (user_id, title, caption, media_url)
         VALUES (?, ?, ?, ?)`,
        [userId, title, caption, mediaUrl]
    );

    const [rows] = await pool.query(
        `SELECT posts.id, posts.user_id, posts.title, posts.caption, posts.media_url, posts.created_at, users.name AS artist_name
         FROM posts
         INNER JOIN users ON users.id = posts.user_id
         WHERE posts.id = ?
         LIMIT 1`,
        [result.insertId]
    );

    return mapPost(rows[0]);
}

async function listPortfolioItemsByUserId(userId) {
    const [rows] = await pool.query(
        `SELECT portfolio_items.id, portfolio_items.user_id, portfolio_items.title, portfolio_items.summary, portfolio_items.image_url, portfolio_items.created_at, users.name AS artist_name
         FROM portfolio_items
         INNER JOIN users ON users.id = portfolio_items.user_id
         WHERE portfolio_items.user_id = ?
         ORDER BY portfolio_items.id DESC`,
        [userId]
    );

    return rows.map(mapPortfolioItem);
}

async function createPortfolioItem({ userId, title, summary, imageUrl }) {
    const [result] = await pool.query(
        `INSERT INTO portfolio_items (user_id, title, summary, image_url)
         VALUES (?, ?, ?, ?)`,
        [userId, title, summary, imageUrl]
    );

    const [rows] = await pool.query(
        `SELECT portfolio_items.id, portfolio_items.user_id, portfolio_items.title, portfolio_items.summary, portfolio_items.image_url, portfolio_items.created_at, users.name AS artist_name
         FROM portfolio_items
         INNER JOIN users ON users.id = portfolio_items.user_id
         WHERE portfolio_items.id = ?
         LIMIT 1`,
        [result.insertId]
    );

    return mapPortfolioItem(rows[0]);
}

async function listTutorialsByUserId(userId) {
    const [rows] = await pool.query(
        `SELECT tutorials.id, tutorials.user_id, tutorials.title, tutorials.description, tutorials.image_url, tutorials.media_type, tutorials.created_at, users.name AS artist_name
         FROM tutorials
         INNER JOIN users ON users.id = tutorials.user_id
         WHERE tutorials.user_id = ?
         ORDER BY tutorials.id DESC`,
        [userId]
    );

    return rows.map(mapTutorial);
}

async function listAllTutorials() {
    const [rows] = await pool.query(
        `SELECT tutorials.id, tutorials.user_id, tutorials.title, tutorials.description, tutorials.image_url, tutorials.media_type, tutorials.created_at, users.name AS artist_name
         FROM tutorials
         INNER JOIN users ON users.id = tutorials.user_id
         ORDER BY tutorials.id DESC`
    );

    return rows.map(mapTutorial);
}

async function createTutorial({ userId, title, description, imageUrl, mediaType }) {
    const [result] = await pool.query(
        `INSERT INTO tutorials (user_id, title, description, image_url, media_type)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, title, description, imageUrl, mediaType]
    );

    const [rows] = await pool.query(
        `SELECT tutorials.id, tutorials.user_id, tutorials.title, tutorials.description, tutorials.image_url, tutorials.media_type, tutorials.created_at, users.name AS artist_name
         FROM tutorials
         INNER JOIN users ON users.id = tutorials.user_id
         WHERE tutorials.id = ?
         LIMIT 1`,
        [result.insertId]
    );

    return mapTutorial(rows[0]);
}

async function createCommission({ userId, title, artist, category, price, image }) {
    const [result] = await pool.query(
        `INSERT INTO commissions (user_id, title, artist, category, price, image)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, title, artist, category, price, image]
    );

    const [rows] = await pool.query(
        `SELECT id, user_id, title, artist, category, price, image, created_at
         FROM commissions
         WHERE id = ?
         LIMIT 1`,
        [result.insertId]
    );

    return mapCommission(rows[0]);
}

async function deleteCommissionById(id, userId) {
    const [result] = await pool.query(
        "DELETE FROM commissions WHERE id = ? AND user_id = ?",
        [id, userId]
    );
    return result.affectedRows > 0;
}

async function deletePostById(id, userId) {
    const [result] = await pool.query(
        "DELETE FROM posts WHERE id = ? AND user_id = ?",
        [id, userId]
    );
    return result.affectedRows > 0;
}

async function deletePortfolioItemById(id, userId) {
    const [result] = await pool.query(
        "DELETE FROM portfolio_items WHERE id = ? AND user_id = ?",
        [id, userId]
    );
    return result.affectedRows > 0;
}

async function deleteTutorialById(id, userId) {
    const [result] = await pool.query(
        "DELETE FROM tutorials WHERE id = ? AND user_id = ?",
        [id, userId]
    );
    return result.affectedRows > 0;
}

async function seedDefaultCommunities() {
    const [rows] = await pool.query("SELECT COUNT(*) AS community_count FROM communities");
    if (Number(rows[0]?.community_count || 0) > 0) {
        return;
    }

    const defaults = [
        {
            name: "Makers Lounge",
            category: "Digital Art",
            region: "North America",
            description: "A daily chat for digital creators sharing works in progress, critique requests, and resource drops."
        },
        {
            name: "Poetry Circle",
            category: "Poetry",
            region: "Europe",
            description: "Weekly writing sprints, open mic planning, and feedback swaps for poets at any level."
        },
        {
            name: "Crochet Commons",
            category: "Crochet",
            region: "Asia",
            description: "Pattern help, yarn sourcing tips, and virtual stitch sessions across time zones."
        }
    ];

    for (const community of defaults) {
        await pool.query(
            `INSERT INTO communities (name, category, region, description)
             VALUES (?, ?, ?, ?)`,
            [community.name, community.category, community.region, community.description]
        );
    }
}

async function listCommunitiesForUser(userId) {
    const [rows] = await pool.query(
        `SELECT communities.id,
                communities.name,
                communities.category,
                communities.region,
                communities.description,
                communities.created_at,
                community_members.user_id IS NOT NULL AS joined,
                COUNT(community_messages.id) AS message_count
         FROM communities
         LEFT JOIN community_members
           ON community_members.community_id = communities.id
          AND community_members.user_id = ?
         LEFT JOIN community_messages
           ON community_messages.community_id = communities.id
         GROUP BY communities.id,
                  communities.name,
                  communities.category,
                  communities.region,
                  communities.description,
                  communities.created_at,
                  community_members.user_id
         ORDER BY communities.id DESC`,
        [userId]
    );

    return rows.map(mapCommunity);
}

async function createCommunity({ userId, name, category, region, description }) {
    const [result] = await pool.query(
        `INSERT INTO communities (owner_user_id, name, category, region, description)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, name, category, region, description]
    );

    await joinCommunity({ userId, communityId: result.insertId });

    const [rows] = await pool.query(
        `SELECT communities.id,
                communities.name,
                communities.category,
                communities.region,
                communities.description,
                communities.created_at,
                1 AS joined,
                0 AS message_count
         FROM communities
         WHERE communities.id = ?
         LIMIT 1`,
        [result.insertId]
    );

    return mapCommunity(rows[0]);
}

async function getCommunityById(id) {
    const [rows] = await pool.query(
        `SELECT id, name, category, region, description, created_at
         FROM communities
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
}

async function isCommunityMember({ userId, communityId }) {
    const [rows] = await pool.query(
        `SELECT 1
         FROM community_members
         WHERE community_id = ?
           AND user_id = ?
         LIMIT 1`,
        [communityId, userId]
    );

    return rows.length > 0;
}

async function joinCommunity({ userId, communityId }) {
    await pool.query(
        `INSERT IGNORE INTO community_members (community_id, user_id)
         VALUES (?, ?)`,
        [communityId, userId]
    );
}

async function listCommunityMessages({ userId, communityId }) {
    const member = await isCommunityMember({ userId, communityId });
    if (!member) {
        const error = new Error("Join this community before viewing its messages.");
        error.statusCode = 403;
        throw error;
    }

    const [rows] = await pool.query(
        `SELECT community_messages.id,
                community_messages.community_id,
                community_messages.user_id,
                community_messages.body,
                community_messages.created_at,
                users.name AS author_name
         FROM community_messages
         INNER JOIN users ON users.id = community_messages.user_id
         WHERE community_messages.community_id = ?
         ORDER BY community_messages.id ASC`,
        [communityId]
    );

    return rows.map(mapCommunityMessage);
}

async function createCommunityMessage({ userId, communityId, body }) {
    const member = await isCommunityMember({ userId, communityId });
    if (!member) {
        const error = new Error("Join this community before sending messages.");
        error.statusCode = 403;
        throw error;
    }

    const [result] = await pool.query(
        `INSERT INTO community_messages (community_id, user_id, body)
         VALUES (?, ?, ?)`,
        [communityId, userId, body]
    );

    const [rows] = await pool.query(
        `SELECT community_messages.id,
                community_messages.community_id,
                community_messages.user_id,
                community_messages.body,
                community_messages.created_at,
                users.name AS author_name
         FROM community_messages
         INNER JOIN users ON users.id = community_messages.user_id
         WHERE community_messages.id = ?
         LIMIT 1`,
        [result.insertId]
    );

    return mapCommunityMessage(rows[0]);
}

module.exports = {
    createCommunity,
    createCommunityMessage,
    createContactMessage,
    createNotification,
    createPasswordResetToken,
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
    followUser,
    getFollowSummary,
    getValidPasswordResetToken,
    getUserById,
    getPurchasableItem,
    getCommunityById,
    healthCheck,
    initializeDatabase,
    listAllCommissions,
    listAllTutorials,
    listCommunitiesForUser,
    listCommunityMessages,
    listNotificationsForUser,
    listCommissionsByUserId,
    listFollowers,
    listFollowing,
    listPortfolioItemsByUserId,
    listPostsByUserId,
    listTutorialsByUserId,
    joinCommunity,
    markAllNotificationsRead,
    markNotificationRead,
    markPasswordResetTokenUsed,
    pool,
    unfollowUser,
    updateUserPasswordHash,
    updateUserProfile
};
