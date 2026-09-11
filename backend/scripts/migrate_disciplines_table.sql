-- Canonical disciplines catalog (replaces lookup group 100 for athlete sports).
-- Idempotent / resume-safe after partial runs.
-- Both sides of athlete_disciplines_discipline_fk must be BIGINT UNSIGNED.

CREATE TABLE IF NOT EXISTS `disciplines` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(150) NULL,
  `image_url` VARCHAR(512) NULL,
  `icon_url` VARCHAR(512) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `show_in_home` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_disciplines_code` (`code`),
  KEY `idx_disciplines_active_sort` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Force unsigned PK even if table was auto-created earlier as signed BIGINT.
ALTER TABLE `disciplines`
  MODIFY COLUMN `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;

-- Seed from lookup group 100 (skip codes already present).
INSERT INTO `disciplines` (`code`, `name`, `sort_order`, `is_active`, `show_in_home`)
SELECT li.`code`, li.`label`, li.`sort_order`, IFNULL(li.`is_active`, 1), 0
FROM `lookup_items` li
INNER JOIN `lookup_groups` lg ON lg.`id` = li.`lookup_group_id`
WHERE lg.`code` = 100
  AND NOT EXISTS (
    SELECT 1 FROM `disciplines` d WHERE d.`code` = li.`code`
  );

INSERT INTO `disciplines` (`code`, `name`, `description`, `image_url`, `sort_order`, `show_in_home`, `is_active`)
SELECT 146, 'Esports & Gaming', 'COMPETITIVO & SIM',
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
  46, 1, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `disciplines` WHERE `code` = 146);

UPDATE `disciplines` SET
  `name` = 'Fuerza & Gym',
  `description` = 'ENTRENAMIENTO',
  `image_url` = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop',
  `show_in_home` = 1,
  `sort_order` = 1
WHERE `code` = 101;

UPDATE `disciplines` SET
  `name` = 'Cross Training',
  `description` = 'DISCIPLINA & RESULTADOS',
  `image_url` = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop',
  `show_in_home` = 1,
  `sort_order` = 2
WHERE `code` = 102;

UPDATE `disciplines` SET
  `name` = 'Running',
  `description` = 'PISTA & MARATÓN',
  `image_url` = 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=800&auto=format&fit=crop',
  `show_in_home` = 1,
  `sort_order` = 3
WHERE `code` = 103;

UPDATE `disciplines` SET
  `name` = 'Ciclismo',
  `description` = 'RUTA & GRAVEL',
  `image_url` = '/images/carousel-cycling.jpg',
  `show_in_home` = 1,
  `sort_order` = 4
WHERE `code` = 104;

UPDATE `disciplines` SET
  `name` = 'Deportes Acuáticos',
  `description` = 'NATACIÓN & SURF',
  `image_url` = 'https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=800&auto=format&fit=crop',
  `show_in_home` = 1,
  `sort_order` = 5
WHERE `code` = 106;

UPDATE `disciplines` SET
  `name` = 'Bienestar',
  `description` = 'MENTE & CUERPO',
  `image_url` = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop',
  `show_in_home` = 1,
  `sort_order` = 6
WHERE `code` = 108;

UPDATE `disciplines` SET
  `name` = 'Esports & Gaming',
  `description` = 'COMPETITIVO & SIM',
  `image_url` = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
  `show_in_home` = 1,
  `sort_order` = 7
WHERE `code` = 146;

-- ---------------------------------------------------------------------------
-- athlete_disciplines remap
-- ---------------------------------------------------------------------------

-- Drop any FK pointing at disciplines (partial previous run).
SET @fk_new := (
  SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'athlete_disciplines'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    AND CONSTRAINT_NAME = 'athlete_disciplines_discipline_fk'
  LIMIT 1
);
SET @sql := IF(
  @fk_new IS NOT NULL,
  'ALTER TABLE `athlete_disciplines` DROP FOREIGN KEY `athlete_disciplines_discipline_fk`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop legacy FK to lookup_items if present.
SET @fk_legacy := (
  SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'athlete_disciplines'
    AND COLUMN_NAME = 'discipline_item_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);
SET @sql := IF(
  @fk_legacy IS NOT NULL,
  CONCAT('ALTER TABLE `athlete_disciplines` DROP FOREIGN KEY `', @fk_legacy, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop PRIMARY KEY so we can modify / nullable-fill discipline_id (Error 1171 otherwise).
ALTER TABLE `athlete_disciplines` DROP PRIMARY KEY;

-- Ensure discipline_id exists.
SET @has_discipline_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'athlete_disciplines'
    AND COLUMN_NAME = 'discipline_id'
);
SET @sql := IF(
  @has_discipline_id = 0,
  'ALTER TABLE `athlete_disciplines` ADD COLUMN `discipline_id` BIGINT UNSIGNED NULL AFTER `athlete_id`',
  'ALTER TABLE `athlete_disciplines` MODIFY COLUMN `discipline_id` BIGINT UNSIGNED NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill from legacy lookup column when present.
SET @has_legacy := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'athlete_disciplines'
    AND COLUMN_NAME = 'discipline_item_id'
);
SET @sql := IF(
  @has_legacy > 0,
  'UPDATE `athlete_disciplines` ad
   INNER JOIN `lookup_items` li ON li.`id` = ad.`discipline_item_id`
   INNER JOIN `disciplines` d ON d.`code` = li.`code`
   SET ad.`discipline_id` = d.`id`
   WHERE ad.`discipline_id` IS NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

DELETE FROM `athlete_disciplines` WHERE `discipline_id` IS NULL;

-- Drop legacy column.
SET @sql := IF(
  @has_legacy > 0,
  'ALTER TABLE `athlete_disciplines` DROP COLUMN `discipline_item_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Align types + recreate PK + FK.
ALTER TABLE `disciplines`
  MODIFY COLUMN `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `athlete_disciplines`
  MODIFY COLUMN `discipline_id` BIGINT UNSIGNED NOT NULL,
  ADD PRIMARY KEY (`athlete_id`, `discipline_id`);

ALTER TABLE `athlete_disciplines`
  ADD CONSTRAINT `athlete_disciplines_discipline_fk`
    FOREIGN KEY (`discipline_id`) REFERENCES `disciplines` (`id`) ON DELETE CASCADE;
