-- ==============================================================================
-- NORMALIZE SCHEMA V2 — corte sobre BD existente (dump Dump20260904+)
-- Ejecutar UNA vez sobre buymeashake. No es idempotente.
-- Orden: CREATE nuevas → backfill → ALTER/DROP → view → seeds booking statuses
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. TABLAS NUEVAS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `athlete_page_settings` (
  `athlete_id` bigint unsigned NOT NULL,
  `page_title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `page_description` text COLLATE utf8mb4_unicode_ci,
  `agenda_title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agenda_description` text COLLATE utf8mb4_unicode_ci,
  `agenda_image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thank_you_message` text COLLATE utf8mb4_unicode_ci,
  `cover_image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `google_analytics_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`athlete_id`),
  CONSTRAINT `athlete_page_settings_ibfk_1` FOREIGN KEY (`athlete_id`) REFERENCES `athlete_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `athlete_social_links` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `athlete_id` bigint unsigned NOT NULL,
  `platform` enum('instagram','tiktok','facebook','twitter') COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_athlete_platform` (`athlete_id`,`platform`),
  CONSTRAINT `athlete_social_links_ibfk_1` FOREIGN KEY (`athlete_id`) REFERENCES `athlete_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `athlete_monetization` (
  `athlete_id` bigint unsigned NOT NULL,
  `shake_price` decimal(8,2) NOT NULL DEFAULT '3.00',
  `currency` enum('USD','MXN') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`athlete_id`),
  CONSTRAINT `athlete_monetization_ibfk_1` FOREIGN KEY (`athlete_id`) REFERENCES `athlete_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `athlete_payouts` (
  `athlete_id` bigint unsigned NOT NULL,
  `stripe_connect_account_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payouts_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`athlete_id`),
  UNIQUE KEY `stripe_connect_account_id` (`stripe_connect_account_id`),
  CONSTRAINT `athlete_payouts_ibfk_1` FOREIGN KEY (`athlete_id`) REFERENCES `athlete_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `athlete_referrals` (
  `athlete_id` bigint unsigned NOT NULL,
  `referral_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `referred_by_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`athlete_id`),
  UNIQUE KEY `referral_code` (`referral_code`),
  KEY `referred_by_id` (`referred_by_id`),
  CONSTRAINT `athlete_referrals_ibfk_1` FOREIGN KEY (`athlete_id`) REFERENCES `athlete_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `athlete_referrals_ibfk_2` FOREIGN KEY (`referred_by_id`) REFERENCES `athlete_profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shake_details` (
  `transaction_id` bigint unsigned NOT NULL,
  `shakes_count` int unsigned NOT NULL DEFAULT '1',
  `supporter_message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_anonymous` tinyint(1) NOT NULL DEFAULT '0',
  `creator_reply` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creator_reply_at` datetime DEFAULT NULL,
  `is_liked_by_creator` tinyint(1) NOT NULL DEFAULT '0',
  `goal_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`transaction_id`),
  KEY `goal_id` (`goal_id`),
  CONSTRAINT `shake_details_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shake_details_ibfk_2` FOREIGN KEY (`goal_id`) REFERENCES `goals` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `comment_likes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `comment_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_comment_like` (`user_id`,`comment_id`),
  KEY `comment_id` (`comment_id`),
  CONSTRAINT `comment_likes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comment_likes_ibfk_2` FOREIGN KEY (`comment_id`) REFERENCES `post_comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. BACKFILL desde athlete_profiles / transactions
-- ------------------------------------------------------------------------------

INSERT INTO `athlete_page_settings` (
  `athlete_id`, `page_title`, `page_description`, `agenda_title`, `agenda_description`,
  `agenda_image_url`, `thank_you_message`, `cover_image_url`, `google_analytics_id`
)
SELECT
  `id`, `page_title`, `page_description`, `agenda_title`, `agenda_description`,
  `agenda_image_url`, `thank_you_message`, `cover_image_url`, `google_analytics_id`
FROM `athlete_profiles`
WHERE NOT EXISTS (SELECT 1 FROM `athlete_page_settings` s WHERE s.`athlete_id` = `athlete_profiles`.`id`);

INSERT INTO `athlete_monetization` (`athlete_id`, `shake_price`, `currency`)
SELECT `id`, COALESCE(`shake_price`, 3.00), COALESCE(`currency`, 'USD')
FROM `athlete_profiles`
WHERE NOT EXISTS (SELECT 1 FROM `athlete_monetization` m WHERE m.`athlete_id` = `athlete_profiles`.`id`);

INSERT INTO `athlete_payouts` (`athlete_id`, `stripe_connect_account_id`, `payouts_enabled`)
SELECT `id`, `stripe_connect_account_id`, COALESCE(`payouts_enabled`, 0)
FROM `athlete_profiles`
WHERE NOT EXISTS (SELECT 1 FROM `athlete_payouts` p WHERE p.`athlete_id` = `athlete_profiles`.`id`);

INSERT INTO `athlete_referrals` (`athlete_id`, `referral_code`, `referred_by_id`)
SELECT `id`, `referral_code`, `referred_by_id`
FROM `athlete_profiles`
WHERE `referral_code` IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `athlete_referrals` r WHERE r.`athlete_id` = `athlete_profiles`.`id`);

INSERT IGNORE INTO `athlete_social_links` (`athlete_id`, `platform`, `url`)
SELECT `id`, 'instagram', `instagram_url` FROM `athlete_profiles` WHERE `instagram_url` IS NOT NULL AND `instagram_url` <> '';

INSERT IGNORE INTO `athlete_social_links` (`athlete_id`, `platform`, `url`)
SELECT `id`, 'tiktok', `tiktok_url` FROM `athlete_profiles` WHERE `tiktok_url` IS NOT NULL AND `tiktok_url` <> '';

INSERT IGNORE INTO `athlete_social_links` (`athlete_id`, `platform`, `url`)
SELECT `id`, 'facebook', `facebook_url` FROM `athlete_profiles` WHERE `facebook_url` IS NOT NULL AND `facebook_url` <> '';

INSERT IGNORE INTO `athlete_social_links` (`athlete_id`, `platform`, `url`)
SELECT `id`, 'twitter', `twitter_url` FROM `athlete_profiles` WHERE `twitter_url` IS NOT NULL AND `twitter_url` <> '';

INSERT INTO `shake_details` (
  `transaction_id`, `shakes_count`, `supporter_message`, `is_anonymous`,
  `creator_reply`, `creator_reply_at`, `is_liked_by_creator`, `goal_id`
)
SELECT
  `id`,
  COALESCE(`shakes_count`, 1),
  `supporter_message`,
  COALESCE(`is_anonymous`, 0),
  `creator_reply`,
  `creator_reply_at`,
  COALESCE(`is_liked_by_creator`, 0),
  `goal_id`
FROM `transactions`
WHERE (`transaction_type_code` = 201 OR `transaction_type_code` IS NULL)
  AND NOT EXISTS (SELECT 1 FROM `shake_details` sd WHERE sd.`transaction_id` = `transactions`.`id`);

-- ------------------------------------------------------------------------------
-- 3. SPORT CODE → lookup_items.id
-- ------------------------------------------------------------------------------

-- ADD COLUMN solo si no existe (re-ejecutable tras fallo parcial)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'athlete_profiles'
    AND COLUMN_NAME = 'primary_sport_item_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `athlete_profiles` ADD COLUMN `primary_sport_item_id` bigint unsigned DEFAULT NULL AFTER `city`',
  'SELECT ''primary_sport_item_id already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `athlete_profiles` ap
LEFT JOIN `lookup_groups` lg ON lg.`code` = 100
LEFT JOIN `lookup_items` li ON li.`code` = ap.`primary_sport_code` AND li.`lookup_group_id` = lg.`id`
SET ap.`primary_sport_item_id` = li.`id`
WHERE ap.`primary_sport_code` IS NOT NULL
  AND (ap.`primary_sport_item_id` IS NULL OR ap.`primary_sport_item_id` <> li.`id`);

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'athlete_profiles'
    AND INDEX_NAME = 'idx_primary_sport_item'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE `athlete_profiles` ADD KEY `idx_primary_sport_item` (`primary_sport_item_id`)',
  'SELECT ''idx_primary_sport_item already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'athlete_profiles'
    AND CONSTRAINT_NAME = 'athlete_profiles_sport_fk'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `athlete_profiles` ADD CONSTRAINT `athlete_profiles_sport_fk` FOREIGN KEY (`primary_sport_item_id`) REFERENCES `lookup_items` (`id`) ON DELETE SET NULL',
  'SELECT ''athlete_profiles_sport_fk already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tag_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'athlete_tags'
    AND COLUMN_NAME = 'sport_item_id'
);
SET @sql := IF(@tag_col = 0,
  'ALTER TABLE `athlete_tags` ADD COLUMN `sport_item_id` bigint unsigned DEFAULT NULL AFTER `athlete_id`',
  'SELECT ''sport_item_id already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Solo backfill/drop sport_code si la columna vieja aún existe
SET @sport_code_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'athlete_tags'
    AND COLUMN_NAME = 'sport_code'
);
SET @sql := IF(@sport_code_exists > 0,
  'UPDATE `athlete_tags` atag
   LEFT JOIN `lookup_groups` lg ON lg.`code` = 100
   LEFT JOIN `lookup_items` li ON li.`code` = atag.`sport_code` AND li.`lookup_group_id` = lg.`id`
   SET atag.`sport_item_id` = li.`id`',
  'SELECT ''athlete_tags.sport_code already migrated'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@sport_code_exists > 0,
  'DELETE FROM `athlete_tags` WHERE `sport_item_id` IS NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@sport_code_exists > 0,
  'ALTER TABLE `athlete_tags`
     MODIFY `sport_item_id` bigint unsigned NOT NULL,
     DROP INDEX `uq_athlete_sport`,
     DROP COLUMN `sport_code`,
     ADD UNIQUE KEY `uq_athlete_sport` (`athlete_id`,`sport_item_id`),
     ADD CONSTRAINT `athlete_tags_sport_fk` FOREIGN KEY (`sport_item_id`) REFERENCES `lookup_items` (`id`) ON DELETE CASCADE',
  'SELECT ''athlete_tags already normalized'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------------------------
-- 4. TRANSACTIONS: refs producto/sub/booking + DROP shake cols
-- ------------------------------------------------------------------------------

SET @tx_product := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'product_id'
);
SET @sql := IF(@tx_product = 0,
  'ALTER TABLE `transactions`
     ADD COLUMN `product_id` bigint unsigned DEFAULT NULL AFTER `athlete_id`,
     ADD COLUMN `subscription_id` bigint unsigned DEFAULT NULL AFTER `product_id`,
     ADD COLUMN `booking_appointment_id` bigint unsigned DEFAULT NULL AFTER `subscription_id`',
  'SELECT ''transaction product refs already exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop FK goal + shake columns (goal vive en shake_details)
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_ibfk_3`;

ALTER TABLE `transactions`
  DROP COLUMN `goal_id`,
  DROP COLUMN `shakes_count`,
  DROP COLUMN `supporter_message`,
  DROP COLUMN `is_anonymous`,
  DROP COLUMN `creator_reply`,
  DROP COLUMN `creator_reply_at`,
  DROP COLUMN `is_liked_by_creator`;

ALTER TABLE `transactions`
  ADD KEY `product_id` (`product_id`),
  ADD KEY `subscription_id` (`subscription_id`),
  ADD KEY `booking_appointment_id` (`booking_appointment_id`),
  ADD CONSTRAINT `transactions_product_fk` FOREIGN KEY (`product_id`) REFERENCES `digital_products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `transactions_subscription_fk` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `transactions_booking_appt_fk` FOREIGN KEY (`booking_appointment_id`) REFERENCES `booking_appointments` (`id`) ON DELETE SET NULL;

-- supporter ON DELETE SET NULL (guest-friendly)
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_ibfk_1`;
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_supporter_fk` FOREIGN KEY (`supporter_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- 5. ATHLETE_PROFILES: DROP columnas movidas + FKs viejos
-- ------------------------------------------------------------------------------

ALTER TABLE `athlete_profiles` DROP FOREIGN KEY `athlete_profiles_ibfk_2`;

ALTER TABLE `athlete_profiles`
  DROP INDEX `referral_code`,
  DROP INDEX `stripe_connect_account_id`,
  DROP INDEX `idx_sport_code`,
  DROP INDEX `referred_by_id`;

ALTER TABLE `athlete_profiles`
  DROP COLUMN `page_title`,
  DROP COLUMN `page_description`,
  DROP COLUMN `agenda_title`,
  DROP COLUMN `agenda_description`,
  DROP COLUMN `agenda_image_url`,
  DROP COLUMN `primary_sport_code`,
  DROP COLUMN `cover_image_url`,
  DROP COLUMN `instagram_url`,
  DROP COLUMN `tiktok_url`,
  DROP COLUMN `facebook_url`,
  DROP COLUMN `twitter_url`,
  DROP COLUMN `shake_price`,
  DROP COLUMN `currency`,
  DROP COLUMN `google_analytics_id`,
  DROP COLUMN `thank_you_message`,
  DROP COLUMN `stripe_connect_account_id`,
  DROP COLUMN `payouts_enabled`,
  DROP COLUMN `referred_by_id`,
  DROP COLUMN `referral_code`;

-- ------------------------------------------------------------------------------
-- 6. USERS / POSTS / FOLLOWS / BOOKING STATUS
-- ------------------------------------------------------------------------------

ALTER TABLE `users` DROP INDEX `ix_users_role_code`;
ALTER TABLE `users` DROP COLUMN `role_code`;

-- Expand access_type enum, drop access_type_code
ALTER TABLE `posts`
  MODIFY `access_type` enum('public','followers_only','members_only') COLLATE utf8mb4_unicode_ci DEFAULT 'public';

ALTER TABLE `posts` DROP INDEX `ix_posts_access_type_code`;
ALTER TABLE `posts` DROP COLUMN `access_type_code`;

-- Unique follows (dedupe first)
DELETE af1 FROM `athlete_follows` af1
INNER JOIN `athlete_follows` af2
  ON af1.`supporter_id` = af2.`supporter_id`
 AND af1.`athlete_id` = af2.`athlete_id`
 AND af1.`id` > af2.`id`;

ALTER TABLE `athlete_follows`
  ADD UNIQUE KEY `uq_supporter_athlete` (`supporter_id`,`athlete_id`);

-- Booking status lookup group 500 + remapping
INSERT INTO `lookup_groups` (`code`, `name`, `description`)
SELECT 500, 'Estados de Cita / Booking', 'Estados de citas 1-a-1'
WHERE NOT EXISTS (SELECT 1 FROM `lookup_groups` WHERE `code` = 500);

SET @booking_group_id = (SELECT `id` FROM `lookup_groups` WHERE `code` = 500 LIMIT 1);

INSERT INTO `lookup_items` (`lookup_group_id`, `code`, `label`, `icon`, `sort_order`)
SELECT @booking_group_id, 501, 'Agendada', 'calendar', 1
WHERE NOT EXISTS (SELECT 1 FROM `lookup_items` WHERE `code` = 501 AND `lookup_group_id` = @booking_group_id);

INSERT INTO `lookup_items` (`lookup_group_id`, `code`, `label`, `icon`, `sort_order`)
SELECT @booking_group_id, 502, 'Completada', 'check', 2
WHERE NOT EXISTS (SELECT 1 FROM `lookup_items` WHERE `code` = 502 AND `lookup_group_id` = @booking_group_id);

INSERT INTO `lookup_items` (`lookup_group_id`, `code`, `label`, `icon`, `sort_order`)
SELECT @booking_group_id, 503, 'Cancelada', 'x', 3
WHERE NOT EXISTS (SELECT 1 FROM `lookup_items` WHERE `code` = 503 AND `lookup_group_id` = @booking_group_id);

INSERT INTO `lookup_items` (`lookup_group_id`, `code`, `label`, `icon`, `sort_order`)
SELECT @booking_group_id, 504, 'No-show', 'clock', 4
WHERE NOT EXISTS (SELECT 1 FROM `lookup_items` WHERE `code` = 504 AND `lookup_group_id` = @booking_group_id);

-- Remap old payment status 302 used as booking default → 501 (scheduled)
UPDATE `booking_appointments` SET `status_code` = 501 WHERE `status_code` = 302;
ALTER TABLE `booking_appointments` ALTER COLUMN `status_code` SET DEFAULT 501;

-- ------------------------------------------------------------------------------
-- 7. VISTA LEADERBOARD
-- ------------------------------------------------------------------------------

CREATE OR REPLACE VIEW `view_monthly_athlete_leaderboard` AS
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

SET UNIQUE_CHECKS = 1;
SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- Fin normalize_schema_v2.sql
-- ==============================================================================
