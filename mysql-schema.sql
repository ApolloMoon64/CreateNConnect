CREATE DATABASE IF NOT EXISTS createnconnect
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE createnconnect;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(160) NOT NULL,
  artist VARCHAR(160) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'digital',
  price DECIMAL(10,2) NOT NULL,
  image LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY commissions_user_id_index (user_id),
  CONSTRAINT commissions_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
