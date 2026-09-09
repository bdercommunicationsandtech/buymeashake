-- Add posts.excerpt for athlete-written teasers on profile/feed paywalls.
-- Idempotent.

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'excerpt'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `posts` ADD COLUMN `excerpt` VARCHAR(200) NULL AFTER `content_html`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
