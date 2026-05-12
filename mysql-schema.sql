CREATE DATABASE IF NOT EXISTS createnconnect
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE createnconnect;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  contact_email VARCHAR(190) NULL,
  profile_image LONGTEXT NULL,
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
  description TEXT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'digital',
  price DECIMAL(10,2) NOT NULL,
  image LONGTEXT NOT NULL,
  availability_status VARCHAR(24) NOT NULL DEFAULT 'available',
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
  availability_status VARCHAR(24) NOT NULL DEFAULT 'available',
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
  availability_status VARCHAR(24) NOT NULL DEFAULT 'available',
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
  availability_status VARCHAR(24) NOT NULL DEFAULT 'available',
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

CREATE TABLE IF NOT EXISTS purchases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  buyer_user_id BIGINT UNSIGNED NOT NULL,
  seller_user_id BIGINT UNSIGNED NOT NULL,
  item_type VARCHAR(40) NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  item_title VARCHAR(160) NOT NULL,
  amount DECIMAL(10,2) NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meetings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  host_user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  meeting_type VARCHAR(80) NOT NULL,
  region VARCHAR(80) NOT NULL,
  capacity INT UNSIGNED NOT NULL,
  attendees_json JSON NOT NULL,
  date_time VARCHAR(40) NOT NULL,
  location VARCHAR(180) NOT NULL,
  host_email VARCHAR(190) NOT NULL,
  description TEXT NOT NULL,
  theme VARCHAR(40) NOT NULL DEFAULT 'sunrise',
  zoom_link VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY meetings_date_time_index (date_time),
  KEY meetings_region_index (region),
  KEY meetings_host_user_id_index (host_user_id),
  CONSTRAINT meetings_host_user_id_fk
    FOREIGN KEY (host_user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  message TEXT NOT NULL,
  delivered TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY contact_messages_created_at_index (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_a_id BIGINT UNSIGNED NOT NULL,
  user_b_id BIGINT UNSIGNED NOT NULL,
  kind VARCHAR(24) NOT NULL DEFAULT 'direct',
  trade_status VARCHAR(24) NULL,
  requested_item_type VARCHAR(40) NULL,
  requested_item_id BIGINT UNSIGNED NULL,
  requested_item_title VARCHAR(160) NULL,
  requested_owner_user_id BIGINT UNSIGNED NULL,
  offered_item_type VARCHAR(40) NULL,
  offered_item_id BIGINT UNSIGNED NULL,
  offered_item_title VARCHAR(160) NULL,
  offered_owner_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY conversations_user_a_id_index (user_a_id),
  KEY conversations_user_b_id_index (user_b_id),
  KEY conversations_updated_at_index (updated_at),
  CONSTRAINT conversations_user_a_id_fk
    FOREIGN KEY (user_a_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT conversations_user_b_id_fk
    FOREIGN KEY (user_b_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT conversations_requested_owner_user_id_fk
    FOREIGN KEY (requested_owner_user_id) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT conversations_offered_owner_user_id_fk
    FOREIGN KEY (offered_owner_user_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversation_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY conversation_messages_conversation_id_index (conversation_id, id),
  KEY conversation_messages_user_id_index (user_id),
  CONSTRAINT conversation_messages_conversation_id_fk
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    ON DELETE CASCADE,
  CONSTRAINT conversation_messages_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
