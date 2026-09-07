-- ==============================================================================
-- GEO CATALOG — countries / states / cities (slim, no currency)
-- + athlete_profiles.city_id
-- Ejecutar sobre buymeashake existente. Idempotente con IF NOT EXISTS donde aplica.
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `countries` (
  `id` mediumint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `iso3` char(3) DEFAULT NULL,
  `numeric_code` char(3) DEFAULT NULL,
  `iso2` char(2) DEFAULT NULL,
  `phonecode` varchar(255) DEFAULT NULL,
  `capital` varchar(255) DEFAULT NULL,
  `tld` varchar(255) DEFAULT NULL,
  `native` varchar(255) DEFAULT NULL,
  `nationality` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `emoji` varchar(191) DEFAULT NULL,
  `flag` tinyint(1) NOT NULL DEFAULT 1,
  `wikiDataId` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_countries_iso2` (`iso2`),
  KEY `idx_countries_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `states` (
  `id` mediumint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `country_id` mediumint unsigned NOT NULL,
  `country_code` char(2) NOT NULL,
  `iso2` varchar(255) DEFAULT NULL,
  `type` varchar(191) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `flag` tinyint(1) NOT NULL DEFAULT 1,
  `wikiDataId` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_states_country_id` (`country_id`),
  KEY `idx_states_country_code` (`country_code`),
  KEY `idx_states_name` (`name`),
  CONSTRAINT `states_ibfk_country` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cities` (
  `id` mediumint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `state_id` mediumint unsigned NOT NULL,
  `state_code` varchar(255) NOT NULL,
  `country_id` mediumint unsigned NOT NULL,
  `country_code` char(2) NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `flag` tinyint(1) NOT NULL DEFAULT 1,
  `wikiDataId` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT '2014-01-01 06:31:01',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cities_state_id` (`state_id`),
  KEY `idx_cities_country_id` (`country_id`),
  KEY `idx_cities_country_code` (`country_code`),
  KEY `idx_cities_state_name` (`state_id`, `name`),
  KEY `idx_cities_country_name` (`country_id`, `name`),
  CONSTRAINT `cities_ibfk_state` FOREIGN KEY (`state_id`) REFERENCES `states` (`id`),
  CONSTRAINT `cities_ibfk_country` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- athlete_profiles.city_id (safe if column already exists: ignore error or check)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'athlete_profiles'
    AND COLUMN_NAME = 'city_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `athlete_profiles`
     ADD COLUMN `city_id` mediumint unsigned NULL AFTER `city`,
     ADD KEY `idx_athlete_city_id` (`city_id`),
     ADD CONSTRAINT `athlete_profiles_ibfk_city`
       FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Widen city label cache for "City, State, CC"
ALTER TABLE `athlete_profiles`
  MODIFY COLUMN `city` varchar(255) NULL;

SET FOREIGN_KEY_CHECKS = 1;
