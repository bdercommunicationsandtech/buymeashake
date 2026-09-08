-- Multi-rol estilo buyer1: catálogo Account Roles + user_roles + backfill desde users.role
-- Idempotente. Ejecutar ANTES de drop_users_role.sql

-- ---------------------------------------------------------------------------
-- 1. Lookup groups 600 (roles) / 700 (estados de asignación)
-- ---------------------------------------------------------------------------

INSERT INTO lookup_groups (code, name, description)
SELECT 600, 'Account Roles', 'Roles de cuenta de la plataforma'
WHERE NOT EXISTS (SELECT 1 FROM lookup_groups WHERE code = 600);

INSERT INTO lookup_groups (code, name, description)
SELECT 700, 'Account Role Statuses', 'Estado de una asignación en user_roles'
WHERE NOT EXISTS (SELECT 1 FROM lookup_groups WHERE code = 700);

SET @roles_group_id = (SELECT id FROM lookup_groups WHERE code = 600 LIMIT 1);
SET @status_group_id = (SELECT id FROM lookup_groups WHERE code = 700 LIMIT 1);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order)
SELECT @roles_group_id, 601, 'supporter', 'user', 1
WHERE NOT EXISTS (
  SELECT 1 FROM lookup_items WHERE lookup_group_id = @roles_group_id AND code = 601
);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order)
SELECT @roles_group_id, 602, 'athlete', 'athlete', 2
WHERE NOT EXISTS (
  SELECT 1 FROM lookup_items WHERE lookup_group_id = @roles_group_id AND code = 602
);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order)
SELECT @roles_group_id, 603, 'admin', 'shield', 3
WHERE NOT EXISTS (
  SELECT 1 FROM lookup_items WHERE lookup_group_id = @roles_group_id AND code = 603
);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order)
SELECT @status_group_id, 701, 'ACTIVE', 'check', 1
WHERE NOT EXISTS (
  SELECT 1 FROM lookup_items WHERE lookup_group_id = @status_group_id AND code = 701
);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order)
SELECT @status_group_id, 702, 'INACTIVE', 'x', 2
WHERE NOT EXISTS (
  SELECT 1 FROM lookup_items WHERE lookup_group_id = @status_group_id AND code = 702
);

SET @role_supporter_id = (
  SELECT id FROM lookup_items
  WHERE lookup_group_id = @roles_group_id AND code = 601 LIMIT 1
);
SET @role_athlete_id = (
  SELECT id FROM lookup_items
  WHERE lookup_group_id = @roles_group_id AND code = 602 LIMIT 1
);
SET @role_admin_id = (
  SELECT id FROM lookup_items
  WHERE lookup_group_id = @roles_group_id AND code = 603 LIMIT 1
);
SET @status_active_id = (
  SELECT id FROM lookup_items
  WHERE lookup_group_id = @status_group_id AND code = 701 LIMIT 1
);

-- ---------------------------------------------------------------------------
-- 2. Tabla user_roles
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_role` (`user_id`, `role_id`),
  KEY `idx_user_roles_user_id` (`user_id`),
  KEY `idx_user_roles_role_id` (`role_id`),
  KEY `idx_user_roles_status_id` (`status_id`),
  CONSTRAINT `fk_user_roles_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_user_roles_role`
    FOREIGN KEY (`role_id`) REFERENCES `lookup_items` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_user_roles_status`
    FOREIGN KEY (`status_id`) REFERENCES `lookup_items` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. Backfill: rol de producto desde users.role (+ admin si aplica)
-- ---------------------------------------------------------------------------

-- Producto: athlete si role=athlete O tiene athlete_profiles; si no, supporter.
-- Si role=admin sin perfil atleta → supporter + admin.
INSERT INTO `user_roles` (
  `user_id`, `role_id`, `created_by`, `created_at`, `updated_at`, `status_id`
)
SELECT
  u.id,
  CASE
    WHEN u.role = 'athlete' OR EXISTS (
      SELECT 1 FROM athlete_profiles ap WHERE ap.user_id = u.id
    ) THEN @role_athlete_id
    ELSE @role_supporter_id
  END,
  u.id,
  UTC_TIMESTAMP(),
  UTC_TIMESTAMP(),
  @status_active_id
FROM `users` u
WHERE @role_supporter_id IS NOT NULL
  AND @role_athlete_id IS NOT NULL
  AND @status_active_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `user_roles` ur
    WHERE ur.user_id = u.id
      AND ur.role_id IN (@role_supporter_id, @role_athlete_id)
  );

-- Admin apilable
INSERT INTO `user_roles` (
  `user_id`, `role_id`, `created_by`, `created_at`, `updated_at`, `status_id`
)
SELECT
  u.id,
  @role_admin_id,
  u.id,
  UTC_TIMESTAMP(),
  UTC_TIMESTAMP(),
  @status_active_id
FROM `users` u
WHERE u.role = 'admin'
  AND @role_admin_id IS NOT NULL
  AND @status_active_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `user_roles` ur
    WHERE ur.user_id = u.id AND ur.role_id = @role_admin_id
  );
