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
            image TEXT NOT NULL,
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
            media_url TEXT NOT NULL,
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
            image_url TEXT NOT NULL,
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
            image_url TEXT NOT NULL,
            media_type VARCHAR(16) NOT NULL DEFAULT 'image',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY tutorials_user_id_index (user_id),
            CONSTRAINT tutorials_user_id_fk
                FOREIGN KEY (user_id) REFERENCES users(id)
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
}

async function healthCheck() {
    await pool.query("SELECT 1");
}

async function findUserByEmail(email) {
    const [rows] = await pool.query(
        `SELECT id, name, email, password_hash, bio, social_handle, portfolio_label, specialties, joined_at
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
        `INSERT INTO users (name, email, password_hash, bio, social_handle, portfolio_label, specialties)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, email, passwordHash, bio, social, portfolio, specialties]
    );

    return getUserById(result.insertId);
}

async function getUserById(id) {
    const [rows] = await pool.query(
        `SELECT id, name, email, bio, social_handle, portfolio_label, specialties, joined_at
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return mapUser(rows[0]);
}

async function updateUserProfile(id, { bio, social, portfolio }) {
    await pool.query(
        `UPDATE users
         SET bio = ?, social_handle = ?, portfolio_label = ?
         WHERE id = ?`,
        [bio, social, portfolio, id]
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

async function listPostsByUserId(userId) {
    const [rows] = await pool.query(
        `SELECT id, user_id, title, caption, media_url, created_at
         FROM posts
         WHERE user_id = ?
         ORDER BY id DESC`,
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
        `SELECT id, user_id, title, caption, media_url, created_at
         FROM posts
         WHERE id = ?
         LIMIT 1`,
        [result.insertId]
    );

    return mapPost(rows[0]);
}

async function listPortfolioItemsByUserId(userId) {
    const [rows] = await pool.query(
        `SELECT id, user_id, title, summary, image_url, created_at
         FROM portfolio_items
         WHERE user_id = ?
         ORDER BY id DESC`,
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
        `SELECT id, user_id, title, summary, image_url, created_at
         FROM portfolio_items
         WHERE id = ?
         LIMIT 1`,
        [result.insertId]
    );

    return mapPortfolioItem(rows[0]);
}

async function listTutorialsByUserId(userId) {
    const [rows] = await pool.query(
        `SELECT id, user_id, title, description, image_url, media_type, created_at
         FROM tutorials
         WHERE user_id = ?
         ORDER BY id DESC`,
        [userId]
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
        `SELECT id, user_id, title, description, image_url, media_type, created_at
         FROM tutorials
         WHERE id = ?
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

module.exports = {
    createPortfolioItem,
    createCommission,
    createPost,
    createTutorial,
    createUser,
    deleteCommissionById,
    deleteUserById,
    findUserByEmail,
    getUserById,
    healthCheck,
    initializeDatabase,
    listCommissionsByUserId,
    listPortfolioItemsByUserId,
    listPostsByUserId,
    listTutorialsByUserId,
    pool,
    updateUserPasswordHash,
    updateUserProfile
};
