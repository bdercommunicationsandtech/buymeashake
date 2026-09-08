-- Fase 2: elimina users.role tras migrar a user_roles.
-- Precondición: add_user_roles.sql aplicada y cada usuario con al menos un rol de producto.
-- Idempotente.

SET @role_supporter_id := (
  SELECT i.id FROM lookup_items i
  INNER JOIN lookup_groups g ON g.id = i.lookup_group_id
  WHERE g.code = 600 AND i.code = 601
  LIMIT 1
);
SET @role_athlete_id := (
  SELECT i.id FROM lookup_items i
  INNER JOIN lookup_groups g ON g.id = i.lookup_group_id
  WHERE g.code = 600 AND i.code = 602
  LIMIT 1
);
SET @status_active_id := (
  SELECT i.id FROM lookup_items i
  INNER JOIN lookup_groups g ON g.id = i.lookup_group_id
  WHERE g.code = 700 AND i.code = 701
  LIMIT 1
);

SET @missing_roles := (
  SELECT COUNT(*)
  FROM users u
  WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.id
      AND ur.status_id = @status_active_id
      AND ur.role_id IN (@role_supporter_id, @role_athlete_id)
  )
);

SET @sql := IF(
  @missing_roles > 0,
  'SIGNAL SQLSTATE ''45000'' SET MESSAGE_TEXT = ''ABORT: users sin rol de producto ACTIVE en user_roles''',
  'SELECT ''precheck OK'' AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'role'
);

SET @sql := IF(
  @col_exists > 0,
  'ALTER TABLE `users` DROP COLUMN `role`',
  'SELECT ''column role already dropped'' AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
