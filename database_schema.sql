-- ==============================================================================
-- SCHEMA DE BASE DE DATOS: buymeashake (MySQL 8.0+)
-- Arquitectura relacional normalizada para plataforma de monetización deportiva
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ==============================================================================
-- MÓDULO 0: LOOKUPS & SISTEMA / CATÁLOGOS DINÁMICOS (CON CÓDIGOS ENTEROS)
-- ==============================================================================

-- 1. TABLA: lookup_groups (Grupos de Catálogos con código numérico entero)
DROP TABLE IF EXISTS lookup_groups;
CREATE TABLE lookup_groups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code INT UNSIGNED NOT NULL UNIQUE,       -- Ej: 100=Deportes, 200=Transacciones, 300=Estados, 400=Notificaciones
    name VARCHAR(100) NOT NULL,             -- Ej: 'Disciplinas Deportivas'
    description VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABLA: lookup_items (Elementos con código numérico entero)
DROP TABLE IF EXISTS lookup_items;
CREATE TABLE lookup_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lookup_group_id BIGINT UNSIGNED NOT NULL,
    code INT UNSIGNED NOT NULL,             -- Ej: 101=Powerlifting, 102=CrossFit, 103=Running
    label VARCHAR(100) NOT NULL,            -- Ej: 'Fuerza & Levantamiento'
    icon VARCHAR(100) NULL,                 -- Ej: 'dumbbell', 'running'
    sort_order INT UNSIGNED DEFAULT 0,
    metadata JSON NULL,                     -- Configuraciones adicionales
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lookup_group_id) REFERENCES lookup_groups(id) ON DELETE CASCADE,
    UNIQUE KEY uq_group_code (lookup_group_id, code),
    INDEX idx_item_code (code),
    INDEX idx_group_active (lookup_group_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLA: app_versions (Control de versiones para App Móvil iOS / Android / Web)
DROP TABLE IF EXISTS app_versions;
CREATE TABLE app_versions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    platform ENUM('ios', 'android', 'web') NOT NULL,
    version_name VARCHAR(20) NOT NULL,       -- Ej: '1.2.0'
    version_code INT UNSIGNED NOT NULL,      -- Ej: 120 (número de compilación)
    min_supported_version_code INT UNSIGNED NOT NULL, -- Versión mínima permitida
    force_update BOOLEAN DEFAULT FALSE,      -- Si es TRUE, exige actualizar en la Store
    update_url VARCHAR(255) NULL,            -- Enlace a Google Play Store / App Store
    release_notes TEXT NULL,                 -- Mensaje de novedades
    is_active BOOLEAN DEFAULT TRUE,
    released_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_platform_code (platform, version_code),
    INDEX idx_platform_active (platform, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- MÓDULO 1: USUARIOS Y PERFILES DE ATLETAS
-- ==============================================================================

-- 4. TABLA: users (Autenticación y perfil global)
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    avatar_url VARCHAR(255) NULL,
    role ENUM('supporter', 'athlete', 'admin') DEFAULT 'supporter',
    is_email_verified BOOLEAN DEFAULT FALSE,
    stripe_customer_id VARCHAR(100) NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABLA: athlete_profiles (Perfil público y creador)
DROP TABLE IF EXISTS athlete_profiles;
CREATE TABLE athlete_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    handle VARCHAR(50) NOT NULL UNIQUE,
    bio TEXT NULL,
    primary_sport_code INT UNSIGNED NULL,   -- Código entero referenciado (Ej: 101)
    city VARCHAR(100) NULL,
    cover_image_url VARCHAR(255) NULL,
    shake_price DECIMAL(8,2) DEFAULT 3.00,
    currency ENUM('USD', 'MXN') DEFAULT 'USD',
    is_verified BOOLEAN DEFAULT FALSE,
    is_nsfw BOOLEAN DEFAULT FALSE,
    google_analytics_id VARCHAR(50) NULL,
    stripe_connect_account_id VARCHAR(100) NULL UNIQUE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    referred_by_id BIGINT UNSIGNED NULL,
    referral_code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_by_id) REFERENCES athlete_profiles(id) ON DELETE SET NULL,
    INDEX idx_handle (handle),
    INDEX idx_sport_code (primary_sport_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABLA: athlete_tags (Disciplinas secundarias ligadas por código numérico)
DROP TABLE IF EXISTS athlete_tags;
CREATE TABLE athlete_tags (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    athlete_id BIGINT UNSIGNED NOT NULL,
    sport_code INT UNSIGNED NOT NULL,       -- Código entero del deporte (Ej: 102, 103)
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    UNIQUE KEY uq_athlete_sport (athlete_id, sport_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- MÓDULO 2: METAS Y MEMBRESÍAS
-- ==============================================================================

-- 7. TABLA: goals (Metas de recaudación deportiva)
DROP TABLE IF EXISTS goals;
CREATE TABLE goals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    athlete_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL,
    raised_amount DECIMAL(10,2) DEFAULT 0.00,
    currency ENUM('USD', 'MXN') DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    achieved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABLA: membership_tiers (Niveles de membresía mensual)
DROP TABLE IF EXISTS membership_tiers;
CREATE TABLE membership_tiers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    athlete_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    monthly_price DECIMAL(8,2) NOT NULL,
    currency ENUM('USD', 'MXN') DEFAULT 'USD',
    stripe_price_id VARCHAR(100) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TABLA: tier_benefits (Beneficios de cada nivel)
DROP TABLE IF EXISTS tier_benefits;
CREATE TABLE tier_benefits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tier_id BIGINT UNSIGNED NOT NULL,
    benefit_text VARCHAR(255) NOT NULL,
    FOREIGN KEY (tier_id) REFERENCES membership_tiers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TABLA: subscriptions (Suscripciones activas de miembros)
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

-- 11. TABLA: digital_products (Tienda de guías, PDFs y recursos)
DROP TABLE IF EXISTS digital_products;
CREATE TABLE digital_products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    athlete_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    price DECIMAL(8,2) NOT NULL,
    currency ENUM('USD', 'MXN') DEFAULT 'USD',
    file_type ENUM('PDF', 'Video_Link', 'Template_Notion', 'Zip') NOT NULL,
    file_url VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TABLA: booking_services (Servicios de asesoría 1-a-1)
DROP TABLE IF EXISTS booking_services;
CREATE TABLE booking_services (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    athlete_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    duration_minutes INT UNSIGNED DEFAULT 45,
    price DECIMAL(8,2) NOT NULL,
    currency ENUM('USD', 'MXN') DEFAULT 'USD',
    platform ENUM('google_meet', 'zoom', 'whatsapp_video') DEFAULT 'google_meet',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. TABLA: booking_availabilities (Disponibilidad horaria semanal)
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
-- MÓDULO 4: TRANSACCIONES Y PAGOS (STRIPE)
-- ==============================================================================

-- 14. TABLA: transactions (Registro maestro de cobros)
DROP TABLE IF EXISTS transactions;
CREATE TABLE transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_uuid CHAR(36) NOT NULL UNIQUE,
    supporter_id BIGINT UNSIGNED NOT NULL,
    athlete_id BIGINT UNSIGNED NOT NULL,
    goal_id BIGINT UNSIGNED NULL,
    transaction_type_code INT UNSIGNED NOT NULL DEFAULT 201, -- 201=Shake, 202=Membresía, 203=Tienda, 204=Booking
    shakes_count INT UNSIGNED DEFAULT 1,
    gross_amount DECIMAL(10,2) NOT NULL,
    currency ENUM('USD', 'MXN') DEFAULT 'USD',
    platform_fee DECIMAL(8,2) NOT NULL,
    stripe_fee DECIMAL(8,2) NOT NULL,
    net_athlete_amount DECIMAL(10,2) NOT NULL,
    stripe_payment_intent_id VARCHAR(150) NULL UNIQUE,
    stripe_transfer_id VARCHAR(150) NULL UNIQUE,
    status_code INT UNSIGNED NOT NULL DEFAULT 301,           -- 301=Pending, 302=Succeeded, 303=Failed, 304=Refunded
    supporter_message VARCHAR(500) NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supporter_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE RESTRICT,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL,
    INDEX idx_athlete_created (athlete_id, created_at),
    INDEX idx_type_code (transaction_type_code),
    INDEX idx_status_code (status_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. TABLA: booking_appointments (Citas de videollamada agendadas)
DROP TABLE IF EXISTS booking_appointments;
CREATE TABLE booking_appointments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_service_id BIGINT UNSIGNED NOT NULL,
    supporter_id BIGINT UNSIGNED NOT NULL,
    transaction_id BIGINT UNSIGNED NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    meeting_link VARCHAR(255) NULL,
    status_code INT UNSIGNED NOT NULL DEFAULT 302,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_service_id) REFERENCES booking_services(id) ON DELETE RESTRICT,
    FOREIGN KEY (supporter_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
    INDEX idx_schedule (booking_service_id, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- MÓDULO 5: PUBLICACIONES, REFERIDOS Y NOTIFICACIONES
-- ==============================================================================

-- 16. TABLA: posts (Publicaciones del atleta)
DROP TABLE IF EXISTS posts;
CREATE TABLE posts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    athlete_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_html LONGTEXT NOT NULL,
    access_type ENUM('public', 'members_only') DEFAULT 'public',
    minimum_tier_id BIGINT UNSIGNED NULL,
    likes_count INT UNSIGNED DEFAULT 0,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (minimum_tier_id) REFERENCES membership_tiers(id) ON DELETE SET NULL,
    INDEX idx_athlete_published (athlete_id, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. TABLA: post_likes (Likes únicos por usuario)
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

-- 18. TABLA: referral_payouts (Comisiones del programa de referidos)
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

-- 19. TABLA: notifications (Notificaciones globales)
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    message VARCHAR(255) NOT NULL,
    type_code INT UNSIGNED NOT NULL DEFAULT 401, -- 401=Shake, 402=Member, 403=Booking, 404=Goal
    action_url VARCHAR(255) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- VISTA OPTIMIZADA: Top 10 Atletas del Mes
-- ==============================================================================
CREATE OR REPLACE VIEW view_monthly_athlete_leaderboard AS
SELECT 
    ap.id AS athlete_id,
    ap.handle,
    COALESCE(li.label, 'Deporte General') AS primary_sport,
    u.full_name AS athlete_name,
    u.avatar_url,
    COALESCE(SUM(t.shakes_count), 0) AS total_shakes_this_month,
    COALESCE(SUM(t.gross_amount), 0) AS total_raised_this_month,
    RANK() OVER (ORDER BY SUM(t.shakes_count) DESC) AS ranking_position
FROM athlete_profiles ap
JOIN users u ON ap.user_id = u.id
LEFT JOIN lookup_items li ON ap.primary_sport_code = li.code
LEFT JOIN transactions t ON ap.id = t.athlete_id 
    AND t.status_code = 302 -- 302 = Transacción exitosa
    AND t.transaction_type_code = 201 -- 201 = Shake de apoyo
    AND t.created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
GROUP BY ap.id, u.id, li.label
ORDER BY total_shakes_this_month DESC
LIMIT 10;

-- ==============================================================================
-- SEEDS / CATÁLOGOS CON CÓDIGOS NUMÉRICOS (INT)
-- ==============================================================================

-- 1. GRUPO 100: Disciplinas Deportivas
INSERT INTO lookup_groups (code, name, description) 
VALUES (100, 'Disciplinas Deportivas', 'Catálogo de deportes para perfiles y filtros');

SET @sports_group_id = LAST_INSERT_ID();

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

-- 2. GRUPO 200: Tipos de Transacción
INSERT INTO lookup_groups (code, name, description) 
VALUES (200, 'Tipos de Transacción', 'Clasificación de los ingresos');

SET @trans_group_id = LAST_INSERT_ID();

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order) VALUES
(@trans_group_id, 201, 'Shake Único', 'shake', 1),
(@trans_group_id, 202, 'Suscripción Membresía', 'card', 2),
(@trans_group_id, 203, 'Producto Digital (Tienda)', 'book', 3),
(@trans_group_id, 204, 'Asesoría 1-a-1 / Videollamada', 'video', 4);

-- 3. GRUPO 300: Estados de Transacciones y Citas
INSERT INTO lookup_groups (code, name, description) 
VALUES (300, 'Estados de Transacción', 'Estado del procesamiento de pago');

SET @status_group_id = LAST_INSERT_ID();

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order) VALUES
(@status_group_id, 301, 'Pendiente', 'clock', 1),
(@status_group_id, 302, 'Exitosa / Completada', 'check', 2),
(@status_group_id, 303, 'Fallida', 'x', 3),
(@status_group_id, 304, 'Reembolsada', 'refresh', 4);

-- 4. GRUPO 400: Tipos de Notificación
INSERT INTO lookup_groups (code, name, description) 
VALUES (400, 'Tipos de Notificación', 'Alertas y eventos de la plataforma');

SET @notif_group_id = LAST_INSERT_ID();

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order) VALUES
(@notif_group_id, 401, 'Shake Recibido', 'bell', 1),
(@notif_group_id, 402, 'Nuevo Miembro en Nivel', 'star', 2),
(@notif_group_id, 403, 'Cita 1-a-1 Agendada', 'calendar', 3),
(@notif_group_id, 404, 'Meta de Recaudación Alcanzada', 'trophy', 4),
(@notif_group_id, 405, 'Comisión de Referido Ganada', 'gift', 5);

-- 5. Versiones de la App Móvil
INSERT INTO app_versions (platform, version_name, version_code, min_supported_version_code, force_update, update_url, release_notes) VALUES
('ios', '1.0.0', 100, 100, FALSE, 'https://apps.apple.com/app/buymeashake/id0000000', 'Versión inicial oficial'),
('android', '1.0.0', 100, 100, FALSE, 'https://play.google.com/store/apps/details?id=com.buymeashake.app', 'Versión inicial oficial');

SET FOREIGN_KEY_CHECKS = 1;
