-- Drop legacy business `code`; disciplines are identified by `id` only.
-- Safe if already dropped.

SET @has_code := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'disciplines'
    AND COLUMN_NAME = 'code'
);

SET @sql := IF(
  @has_code > 0,
  'ALTER TABLE `disciplines` DROP COLUMN `code`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
