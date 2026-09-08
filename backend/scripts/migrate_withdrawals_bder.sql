-- ==============================================================================
-- MIGRACIÓN: ARQUITECTURA DE RETIROS (BDER STYLE) Y STRIPE ONBOARDING
-- ==============================================================================

-- 1. Actualizar athlete_payouts con country_code y stripe_details_submitted si no existen
SET @col_country := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'athlete_payouts' AND COLUMN_NAME = 'country_code'
);
SET @sql := IF(@col_country = 0,
  'ALTER TABLE `athlete_payouts` ADD COLUMN `country_code` VARCHAR(2) NOT NULL DEFAULT \'MX\' AFTER `athlete_id`',
  'SELECT \'column country_code already exists\' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_details := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'athlete_payouts' AND COLUMN_NAME = 'stripe_details_submitted'
);
SET @sql := IF(@col_details = 0,
  'ALTER TABLE `athlete_payouts` ADD COLUMN `stripe_details_submitted` BOOLEAN NOT NULL DEFAULT FALSE AFTER `stripe_connect_account_id`',
  'SELECT \'column stripe_details_submitted already exists\' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Crear tabla withdrawal_requests si no existe
CREATE TABLE IF NOT EXISTS `withdrawal_requests` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `athlete_id` BIGINT UNSIGNED NOT NULL,
    `amount_usd` DECIMAL(10,2) NOT NULL,
    `amount_cents` BIGINT UNSIGNED NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `destination_country` VARCHAR(2) NOT NULL DEFAULT 'MX',
    `status` ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    `stripe_transfer_id` VARCHAR(150) NULL UNIQUE,
    `failure_reason` VARCHAR(255) NULL,
    `admin_notes` TEXT NULL,
    `requested_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `processed_at` TIMESTAMP NULL,
    `processed_by_admin_id` BIGINT UNSIGNED NULL,
    CONSTRAINT `fk_withdrawal_athlete` FOREIGN KEY (`athlete_id`) REFERENCES `athlete_profiles`(`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_withdrawal_admin` FOREIGN KEY (`processed_by_admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_athlete_status` (`athlete_id`, `status`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
