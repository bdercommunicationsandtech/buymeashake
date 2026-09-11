-- ==============================================================================
-- SCHEMA DE BASE DE DATOS: buymeashake (MySQL 8.0+) — NORMALIZED V2
-- Arquitectura relacional normalizada para plataforma de monetización deportiva
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ==============================================================================
-- MÓDULO 0: LOOKUPS & SISTEMA
-- ==============================================================================

DROP TABLE IF EXISTS lookup_groups;
CREATE TABLE lookup_groups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code INT UNSIGNED NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS lookup_items;
CREATE TABLE lookup_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lookup_group_id BIGINT UNSIGNED NOT NULL,
    code INT UNSIGNED NOT NULL,
    label VARCHAR(100) NOT NULL,
    icon VARCHAR(100) NULL,
    sort_order INT UNSIGNED DEFAULT 0,
    metadata JSON NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lookup_group_id) REFERENCES lookup_groups(id) ON DELETE CASCADE,
    UNIQUE KEY uq_group_code (lookup_group_id, code),
    INDEX idx_item_code (code),
    INDEX idx_group_active (lookup_group_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS app_versions;
CREATE TABLE app_versions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    platform ENUM('ios', 'android', 'web') NOT NULL,
    version_name VARCHAR(20) NOT NULL,
    version_code INT UNSIGNED NOT NULL,
    min_supported_version_code INT UNSIGNED NOT NULL,
    force_update BOOLEAN DEFAULT FALSE,
    update_url VARCHAR(255) NULL,
    release_notes TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    released_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_platform_code (platform, version_code),
    INDEX idx_platform_active (platform, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- MÓDULO 0b: CATÁLOGO GEO (countries / states / cities) — sin currency
-- ==============================================================================

DROP TABLE IF EXISTS cities;
DROP TABLE IF EXISTS states;
DROP TABLE IF EXISTS countries;

CREATE TABLE countries (
    id MEDIUMINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    iso3 CHAR(3) NULL,
    numeric_code CHAR(3) NULL,
    iso2 CHAR(2) NULL,
    phonecode VARCHAR(255) NULL,
    capital VARCHAR(255) NULL,
    tld VARCHAR(255) NULL,
    native VARCHAR(255) NULL,
    nationality VARCHAR(255) NULL,
    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,
    emoji VARCHAR(191) NULL,
    flag TINYINT(1) NOT NULL DEFAULT 1,
    wikiDataId VARCHAR(255) NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_countries_iso2 (iso2),
    INDEX idx_countries_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE states (
    id MEDIUMINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country_id MEDIUMINT UNSIGNED NOT NULL,
    country_code CHAR(2) NOT NULL,
    iso2 VARCHAR(255) NULL,
    type VARCHAR(191) NULL,
    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,
    flag TINYINT(1) NOT NULL DEFAULT 1,
    wikiDataId VARCHAR(255) NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(id),
    INDEX idx_states_country_id (country_id),
    INDEX idx_states_country_code (country_code),
    INDEX idx_states_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cities (
    id MEDIUMINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state_id MEDIUMINT UNSIGNED NOT NULL,
    state_code VARCHAR(255) NOT NULL,
    country_id MEDIUMINT UNSIGNED NOT NULL,
    country_code CHAR(2) NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    flag TINYINT(1) NOT NULL DEFAULT 1,
    wikiDataId VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT '2014-01-01 06:31:01',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (state_id) REFERENCES states(id),
    FOREIGN KEY (country_id) REFERENCES countries(id),
    INDEX idx_cities_state_id (state_id),
    INDEX idx_cities_country_id (country_id),
    INDEX idx_cities_country_code (country_code),
    INDEX idx_cities_state_name (state_id, name),
    INDEX idx_cities_country_name (country_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- MÓDULO 1: USUARIOS Y PERFILES DE ATLETAS (NORMALIZADO)
-- ==============================================================================

DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    firebase_uid VARCHAR(128) NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    full_name VARCHAR(150) NOT NULL,
    avatar_url VARCHAR(255) NULL,
    is_email_verified BOOLEAN DEFAULT FALSE,
    stripe_customer_id VARCHAR(100) NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status_id BIGINT UNSIGNED NOT NULL,
    UNIQUE KEY uq_user_role (user_id, role_id),
    KEY idx_user_roles_user_id (user_id),
    KEY idx_user_roles_role_id (role_id),
    KEY idx_user_roles_status_id (status_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES lookup_items(id) ON DELETE RESTRICT,
    FOREIGN KEY (status_id) REFERENCES lookup_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS athlete_profiles;
CREATE TABLE athlete_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    handle VARCHAR(50) NOT NULL UNIQUE,
    bio VARCHAR(600) NULL,
    city VARCHAR(255) NULL,
    city_id MEDIUMINT UNSIGNED NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_nsfw BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL,
    INDEX idx_handle (handle),
    INDEX idx_athlete_city_id (city_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS athlete_disciplines;
DROP TABLE IF EXISTS disciplines;
CREATE TABLE disciplines (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(150) NULL,
    image_url VARCHAR(512) NULL,
    icon_url VARCHAR(512) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    show_in_home BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_disciplines_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE athlete_disciplines (
    athlete_id BIGINT UNSIGNED NOT NULL,
    discipline_id BIGINT UNSIGNED NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (athlete_id, discipline_id),
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (discipline_id) REFERENCES disciplines(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS athlete_page_settings;
CREATE TABLE athlete_page_settings (
    athlete_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    page_title VARCHAR(200) NULL,
    page_description VARCHAR(400) NULL,
    agenda_title VARCHAR(200) NULL,
    agenda_description VARCHAR(300) NULL,
    agenda_image_url VARCHAR(255) NULL,
    thank_you_message VARCHAR(200) NULL,
    cover_image_url VARCHAR(255) NULL,
    google_analytics_id VARCHAR(50) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS athlete_social_links;
CREATE TABLE athlete_social_links (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    athlete_id BIGINT UNSIGNED NOT NULL,
    platform ENUM('instagram', 'tiktok', 'facebook', 'twitter') NOT NULL,
    url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    UNIQUE KEY uq_athlete_platform (athlete_id, platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS athlete_monetization;
CREATE TABLE athlete_monetization (
    athlete_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    shake_price DECIMAL(8,2) NOT NULL DEFAULT 3.00,
    currency ENUM('USD', 'MXN') NOT NULL DEFAULT 'USD',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS athlete_payouts;
CREATE TABLE athlete_payouts (
    athlete_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL DEFAULT 'MX',
    stripe_connect_account_id VARCHAR(100) NULL UNIQUE,
    stripe_details_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS athlete_referrals;
CREATE TABLE athlete_referrals (
    athlete_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    referral_code VARCHAR(50) NOT NULL UNIQUE,
    referred_by_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_by_id) REFERENCES athlete_profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS athlete_tags;
CREATE TABLE athlete_tags (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    athlete_id BIGINT UNSIGNED NOT NULL,
    sport_item_id BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (sport_item_id) REFERENCES lookup_items(id) ON DELETE CASCADE,
    UNIQUE KEY uq_athlete_sport (athlete_id, sport_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS athlete_follows;
CREATE TABLE athlete_follows (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supporter_id BIGINT UNSIGNED NOT NULL,
    athlete_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    FOREIGN KEY (supporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    UNIQUE KEY uq_supporter_athlete (supporter_id, athlete_id),
    INDEX ix_athlete_follows_athlete_id (athlete_id),
    INDEX ix_athlete_follows_supporter_id (supporter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS email_verifications;
CREATE TABLE email_verifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL,
    code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    metadata JSON NULL,
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    INDEX ix_email_verifications_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- MÓDULO 2: METAS Y MEMBRESÍAS
-- ==============================================================================

DROP TABLE IF EXISTS goals;
CREATE TABLE goals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    athlete_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    cover_image_url VARCHAR(255) NULL,
    target_amount DECIMAL(10,2) NOT NULL,
    raised_amount DECIMAL(10,2) DEFAULT 0.00,
    currency ENUM('USD', 'MXN') DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    achieved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS membership_tiers;
CREATE TABLE membership_tiers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    athlete_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(200) NULL,
    monthly_price DECIMAL(8,2) NOT NULL,
    currency ENUM('USD', 'MXN') DEFAULT 'USD',
    stripe_price_id VARCHAR(100) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS tier_benefits;
CREATE TABLE tier_benefits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tier_id BIGINT UNSIGNED NOT NULL,
    benefit_text VARCHAR(255) NOT NULL,
    FOREIGN KEY (tier_id) REFERENCES membership_tiers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS subscriptions;
CREATE TABLE subscriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    tier_id BIGINT UNSIGNED NOT NULL,
    stripe_subscription_id VARCHAR(100) NOT NULL UNIQUE,
    status ENUM('active', 'past_due', 'canceled', 'unpaid') DEFAULT 'active',
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    canceled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (tier_id) REFERENCES membership_tiers(id) ON DELETE RESTRICT,
    INDEX idx_user_tier (user_id, tier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- MÓDULO 3: TIENDA DIGITAL Y ASESORÍAS 1-A-1
-- ==============================================================================

DROP TABLE IF EXISTS digital_products;
CREATE TABLE digital_products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    athlete_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(200) NULL,
    price DECIMAL(8,2) NOT NULL,
    currency ENUM('USD', 'MXN') DEFAULT 'USD',
    file_type ENUM('PDF', 'Video_Link', 'Template_Notion', 'Zip') NOT NULL,
    file_url VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS booking_services;
CREATE TABLE booking_services (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    athlete_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(200) NULL,
    duration_minutes INT UNSIGNED DEFAULT 45,
    price DECIMAL(8,2) NOT NULL,
    currency ENUM('USD', 'MXN') DEFAULT 'USD',
    platform ENUM('google_meet', 'zoom', 'whatsapp_video') DEFAULT 'google_meet',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS booking_availabilities;
CREATE TABLE booking_availabilities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_service_id BIGINT UNSIGNED NOT NULL,
    day_of_week TINYINT UNSIGNED NOT NULL COMMENT '0=Domingo, 1=Lunes, ..., 6=Sabado',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    FOREIGN KEY (booking_service_id) REFERENCES booking_services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- MÓDULO 4: TRANSACCIONES Y PAGOS (STRIPE) + SHAKE DETAILS
-- ==============================================================================

DROP TABLE IF EXISTS transactions;
CREATE TABLE transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_uuid CHAR(36) NOT NULL UNIQUE,
    supporter_id BIGINT UNSIGNED NULL,
    supporter_name VARCHAR(150) NULL,
    supporter_email VARCHAR(191) NULL,
    athlete_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NULL,
    subscription_id BIGINT UNSIGNED NULL,
    booking_appointment_id BIGINT UNSIGNED NULL,
    transaction_type_code INT UNSIGNED NOT NULL DEFAULT 201,
    gross_amount DECIMAL(10,2) NOT NULL,
    currency ENUM('USD', 'MXN') DEFAULT 'USD',
    platform_fee DECIMAL(8,2) NOT NULL,
    stripe_fee DECIMAL(8,2) NOT NULL,
    net_athlete_amount DECIMAL(10,2) NOT NULL,
    stripe_payment_intent_id VARCHAR(150) NULL UNIQUE,
    stripe_transfer_id VARCHAR(150) NULL UNIQUE,
    status_code INT UNSIGNED NOT NULL DEFAULT 301,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supporter_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE RESTRICT,
    FOREIGN KEY (product_id) REFERENCES digital_products(id) ON DELETE SET NULL,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    -- booking_appointment_id FK added after booking_appointments exists (see below)
    INDEX idx_athlete_created (athlete_id, created_at),
    INDEX idx_type_code (transaction_type_code),
    INDEX idx_status_code (status_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS shake_details;
CREATE TABLE shake_details (
    transaction_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    shakes_count INT UNSIGNED NOT NULL DEFAULT 1,
    supporter_message VARCHAR(500) NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    creator_reply VARCHAR(500) NULL,
    creator_reply_at DATETIME NULL,
    is_liked_by_creator BOOLEAN NOT NULL DEFAULT FALSE,
    goal_id BIGINT UNSIGNED NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS booking_appointments;
CREATE TABLE booking_appointments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_service_id BIGINT UNSIGNED NOT NULL,
    supporter_id BIGINT UNSIGNED NOT NULL,
    transaction_id BIGINT UNSIGNED NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    meeting_link VARCHAR(255) NULL,
    status_code INT UNSIGNED NOT NULL DEFAULT 501,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_service_id) REFERENCES booking_services(id) ON DELETE RESTRICT,
    FOREIGN KEY (supporter_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
    INDEX idx_schedule (booking_service_id, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_booking_appt_fk
  FOREIGN KEY (booking_appointment_id) REFERENCES booking_appointments(id) ON DELETE SET NULL;

DROP TABLE IF EXISTS referral_payouts;
CREATE TABLE referral_payouts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    referrer_athlete_id BIGINT UNSIGNED NOT NULL,
    referred_athlete_id BIGINT UNSIGNED NOT NULL,
    transaction_id BIGINT UNSIGNED NOT NULL,
    commission_amount DECIMAL(8,2) NOT NULL,
    currency ENUM('USD', 'MXN') DEFAULT 'USD',
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_athlete_id) REFERENCES athlete_profiles(id) ON DELETE RESTRICT,
    FOREIGN KEY (referred_athlete_id) REFERENCES athlete_profiles(id) ON DELETE RESTRICT,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- MÓDULO 5: PUBLICACIONES Y NOTIFICACIONES
-- ==============================================================================

DROP TABLE IF EXISTS posts;
CREATE TABLE posts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    athlete_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_html LONGTEXT NOT NULL,
    excerpt VARCHAR(200) NULL,
    access_type ENUM('public', 'draft', 'shake_supporters', 'members_only') DEFAULT 'public',
    minimum_tier_id BIGINT UNSIGNED NULL,
    likes_count INT UNSIGNED DEFAULT 0,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (minimum_tier_id) REFERENCES membership_tiers(id) ON DELETE SET NULL,
    INDEX idx_athlete_published (athlete_id, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS post_likes;
CREATE TABLE post_likes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    post_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_post_like (user_id, post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS post_comments;
CREATE TABLE post_comments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    content VARCHAR(200) NOT NULL,
    likes_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX ix_post_comments_post_id (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS comment_likes;
CREATE TABLE comment_likes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    comment_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_comment_like (user_id, comment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    message VARCHAR(255) NOT NULL,
    type_code INT UNSIGNED NOT NULL DEFAULT 401,
    action_url VARCHAR(255) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- TABLA: withdrawal_requests (Arquitectura BDER de Retiros a Cuentas Connect)
-- ==============================================================================
DROP TABLE IF EXISTS withdrawal_requests;
CREATE TABLE withdrawal_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    athlete_id BIGINT UNSIGNED NOT NULL,
    amount_usd DECIMAL(10,2) NOT NULL,
    amount_cents BIGINT UNSIGNED NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    destination_country VARCHAR(2) NOT NULL DEFAULT 'MX',
    status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    stripe_transfer_id VARCHAR(150) NULL UNIQUE,
    failure_reason VARCHAR(255) NULL,
    admin_notes TEXT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    processed_by_admin_id BIGINT UNSIGNED NULL,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE RESTRICT,
    FOREIGN KEY (processed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_athlete_status (athlete_id, status),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- TABLA: compliance_reports (Trust & Safety / Denuncias y Moderación FSM)
-- ==============================================================================
DROP TABLE IF EXISTS compliance_reports;
CREATE TABLE compliance_reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(50) NOT NULL UNIQUE,
    creator_target VARCHAR(255) NOT NULL,
    athlete_id BIGINT UNSIGNED NULL,
    reporter_email VARCHAR(191) NOT NULL,
    reason_code VARCHAR(50) NOT NULL,
    reason_title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    evidence_links JSON NULL,
    attached_file VARCHAR(255) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    assigned_moderator_id BIGINT UNSIGNED NULL,
    verdict VARCHAR(50) NULL,
    verdict_title VARCHAR(200) NULL,
    admin_notes TEXT NULL,
    action_details VARCHAR(1000) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_moderator_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_compliance_status (status),
    INDEX idx_compliance_priority (priority),
    INDEX idx_compliance_reporter (reporter_email),
    INDEX idx_compliance_creator (creator_target)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- TABLA: support_tickets (Mesa de Ayuda, Contacto y Soporte al Atleta)
-- ==============================================================================
DROP TABLE IF EXISTS support_tickets;
CREATE TABLE support_tickets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(191) NOT NULL,
    user_role VARCHAR(50) NOT NULL DEFAULT 'athlete',
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    category_title VARCHAR(150) NOT NULL DEFAULT 'Consulta General',
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    related_folio_or_handle VARCHAR(100) NULL,
    attached_file VARCHAR(255) NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    assigned_admin_id BIGINT UNSIGNED NULL,
    admin_notes TEXT NULL,
    reply_message TEXT NULL,
    replied_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_support_tickets_status (status),
    INDEX idx_support_tickets_is_read (is_read),
    INDEX idx_support_tickets_email (email),
    INDEX idx_support_tickets_category (category),
    INDEX idx_support_tickets_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- TABLA: email_blacklist (Lista Negra de Correos Vetados Permanentemente)
-- ==============================================================================
DROP TABLE IF EXISTS email_blacklist;
CREATE TABLE email_blacklist (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    reason VARCHAR(255) NULL,
    user_id BIGINT UNSIGNED NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_email_blacklist_email (email),
    INDEX idx_email_blacklist_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- TABLA: disciplinary_sanctions (Sanciones Disciplinarias, Strikes y Amonestaciones)
-- ==============================================================================
DROP TABLE IF EXISTS disciplinary_sanctions;
CREATE TABLE disciplinary_sanctions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    action_type VARCHAR(30) NOT NULL, -- 'strike', 'suspension', 'ban'
    points INT NOT NULL DEFAULT 1,
    reason VARCHAR(500) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'conduct', -- 'conduct', 'fraud', 'doping', 'harassment', 'unfulfilled_rewards', 'other'
    created_by BIGINT UNSIGNED NULL,
    expires_at TIMESTAMP NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_sanctions_user (user_id),
    INDEX idx_sanctions_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- VISTA: Top 10 Atletas del Mes
-- ==============================================================================
CREATE OR REPLACE VIEW view_monthly_athlete_leaderboard AS
SELECT
    ap.id AS athlete_id,
    ap.handle,
    COALESCE(li.label, 'Deporte General') AS primary_sport,
    u.full_name AS athlete_name,
    u.avatar_url,
    COALESCE(SUM(sd.shakes_count), 0) AS total_shakes_this_month,
    COALESCE(SUM(t.gross_amount), 0) AS total_raised_this_month,
    RANK() OVER (ORDER BY SUM(sd.shakes_count) DESC) AS ranking_position
FROM athlete_profiles ap
JOIN users u ON ap.user_id = u.id
LEFT JOIN lookup_items li ON ap.primary_sport_item_id = li.id
LEFT JOIN transactions t ON ap.id = t.athlete_id
    AND t.status_code = 302
    AND t.transaction_type_code = 201
    AND t.created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
LEFT JOIN shake_details sd ON sd.transaction_id = t.id
GROUP BY ap.id, u.id, li.label
ORDER BY total_shakes_this_month DESC
LIMIT 10;

-- ==============================================================================
-- SEEDS / CATÁLOGOS
-- ==============================================================================

INSERT INTO lookup_groups (code, name, description) VALUES
(100, 'Disciplinas Deportivas', 'Catálogo de deportes para perfiles y filtros'),
(200, 'Tipos de Transacción', 'Clasificación de los ingresos'),
(300, 'Estados de Transacción', 'Estado del procesamiento de pago'),
(400, 'Tipos de Notificación', 'Alertas y eventos de la plataforma'),
(500, 'Estados de Cita / Booking', 'Estados de citas 1-a-1'),
(600, 'Account Roles', 'Roles de cuenta de la plataforma'),
(700, 'Account Role Statuses', 'Estado de una asignación en user_roles'),
(800, 'Post Access Types', 'Categorías de visibilidad de publicaciones');

SET @sports_group_id = (SELECT id FROM lookup_groups WHERE code = 100);
SET @trans_group_id = (SELECT id FROM lookup_groups WHERE code = 200);
SET @status_group_id = (SELECT id FROM lookup_groups WHERE code = 300);
SET @notif_group_id = (SELECT id FROM lookup_groups WHERE code = 400);
SET @booking_group_id = (SELECT id FROM lookup_groups WHERE code = 500);
SET @roles_group_id = (SELECT id FROM lookup_groups WHERE code = 600);
SET @role_status_group_id = (SELECT id FROM lookup_groups WHERE code = 700);
SET @post_access_group_id = (SELECT id FROM lookup_groups WHERE code = 800);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order) VALUES
(@sports_group_id, 101, 'Fuerza & Levantamiento', 'dumbbell', 1),
(@sports_group_id, 102, 'CrossFit & Funcional', 'fire', 2),
(@sports_group_id, 103, 'Running & Atletismo', 'running', 3),
(@sports_group_id, 104, 'Ciclismo & Ruta', 'bicycle', 4),
(@sports_group_id, 105, 'Artes Marciales & Boxeo', 'boxing-glove', 5),
(@sports_group_id, 106, 'Deportes Acuáticos & Natación', 'swimmer', 6),
(@sports_group_id, 107, 'Fútbol & Colectivos', 'football', 7),
(@sports_group_id, 108, 'Movilidad & Yoga', 'spa', 8),
(@sports_group_id, 109, 'Calistenia & Freestyle', 'body', 9);

-- Canonical disciplines (source of truth for athletes / home / explore)
INSERT INTO disciplines (name, description, image_url, sort_order, show_in_home, is_active) VALUES
('Fuerza & Gym', 'ENTRENAMIENTO', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop', 1, 1, 1),
('Cross Training', 'DISCIPLINA & RESULTADOS', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop', 2, 1, 1),
('Running', 'PISTA & MARATÓN', 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=800&auto=format&fit=crop', 3, 1, 1),
('Ciclismo', 'RUTA & GRAVEL', '/images/carousel-cycling.jpg', 4, 1, 1),
('Artes Marciales & Boxeo', NULL, NULL, 8, 0, 1),
('Deportes Acuáticos', 'NATACIÓN & SURF', 'https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=800&auto=format&fit=crop', 5, 1, 1),
('Fútbol & Colectivos', NULL, NULL, 9, 0, 1),
('Bienestar', 'MENTE & CUERPO', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop', 6, 1, 1),
('Calistenia & Freestyle', NULL, NULL, 10, 0, 1),
('Esports & Gaming', 'COMPETITIVO & SIM', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop', 7, 1, 1);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order) VALUES
(@trans_group_id, 201, 'Shake Único', 'shake', 1),
(@trans_group_id, 202, 'Suscripción Membresía', 'card', 2),
(@trans_group_id, 203, 'Producto Digital (Tienda)', 'book', 3),
(@trans_group_id, 204, 'Asesoría 1-a-1 / Videollamada', 'video', 4);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order) VALUES
(@status_group_id, 301, 'Pendiente', 'clock', 1),
(@status_group_id, 302, 'Exitosa / Completada', 'check', 2),
(@status_group_id, 303, 'Fallida', 'x', 3),
(@status_group_id, 304, 'Reembolsada', 'refresh', 4);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order) VALUES
(@notif_group_id, 401, 'Shake Recibido', 'bell', 1),
(@notif_group_id, 402, 'Nuevo Miembro en Nivel', 'star', 2),
(@notif_group_id, 403, 'Cita 1-a-1 Agendada', 'calendar', 3),
(@notif_group_id, 404, 'Meta de Recaudación Alcanzada', 'trophy', 4),
(@notif_group_id, 405, 'Comisión de Referido Ganada', 'gift', 5);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order) VALUES
(@booking_group_id, 501, 'Agendada', 'calendar', 1),
(@booking_group_id, 502, 'Completada', 'check', 2),
(@booking_group_id, 503, 'Cancelada', 'x', 3),
(@booking_group_id, 504, 'No-show', 'clock', 4);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order) VALUES
(@roles_group_id, 601, 'supporter', 'user', 1),
(@roles_group_id, 602, 'athlete', 'athlete', 2),
(@roles_group_id, 603, 'admin', 'shield', 3);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order) VALUES
(@role_status_group_id, 701, 'ACTIVE', 'check', 1),
(@role_status_group_id, 702, 'INACTIVE', 'x', 2);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order, metadata) VALUES
(@post_access_group_id, 801, 'Public', 'globe', 1, CAST('{"access_type":"public"}' AS JSON)),
(@post_access_group_id, 802, 'Draft', 'file', 2, CAST('{"access_type":"draft"}' AS JSON)),
(@post_access_group_id, 803, 'Shake supporters', 'shake', 3, CAST('{"access_type":"shake_supporters"}' AS JSON)),
(@post_access_group_id, 804, 'Members only', 'lock', 4, CAST('{"access_type":"members_only"}' AS JSON));

INSERT INTO app_versions (platform, version_name, version_code, min_supported_version_code, force_update, update_url, release_notes) VALUES
('ios', '1.0.0', 100, 100, FALSE, 'https://apps.apple.com/app/buymeashake/id0000000', 'Versión inicial oficial'),
('android', '1.0.0', 100, 100, FALSE, 'https://play.google.com/store/apps/details?id=com.buymeashake.app', 'Versión inicial oficial');

SET FOREIGN_KEY_CHECKS = 1;
