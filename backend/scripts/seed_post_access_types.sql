-- Post access types: expand ENUM, migrate legacy followers_only, seed lookup group 800.
-- Idempotent. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Expand ENUM (keep followers_only temporarily so UPDATE works)
-- ---------------------------------------------------------------------------

ALTER TABLE `posts`
  MODIFY `access_type` ENUM(
    'public',
    'followers_only',
    'members_only',
    'draft',
    'shake_supporters'
  ) COLLATE utf8mb4_unicode_ci DEFAULT 'public';

UPDATE `posts`
SET `access_type` = 'public'
WHERE `access_type` = 'followers_only';

ALTER TABLE `posts`
  MODIFY `access_type` ENUM(
    'public',
    'draft',
    'shake_supporters',
    'members_only'
  ) COLLATE utf8mb4_unicode_ci DEFAULT 'public';

-- ---------------------------------------------------------------------------
-- 2. Lookup group 800 — Post Access Types (catalog for UI; ENUM remains source of truth)
-- ---------------------------------------------------------------------------

INSERT INTO lookup_groups (code, name, description)
SELECT 800, 'Post Access Types', 'Categorías de visibilidad de publicaciones'
WHERE NOT EXISTS (SELECT 1 FROM lookup_groups WHERE code = 800);

SET @post_access_group_id = (SELECT id FROM lookup_groups WHERE code = 800 LIMIT 1);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order, metadata)
SELECT @post_access_group_id, 801, 'Public', 'globe', 1, CAST('{"access_type":"public"}' AS JSON)
WHERE NOT EXISTS (
  SELECT 1 FROM lookup_items WHERE lookup_group_id = @post_access_group_id AND code = 801
);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order, metadata)
SELECT @post_access_group_id, 802, 'Draft', 'file', 2, CAST('{"access_type":"draft"}' AS JSON)
WHERE NOT EXISTS (
  SELECT 1 FROM lookup_items WHERE lookup_group_id = @post_access_group_id AND code = 802
);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order, metadata)
SELECT @post_access_group_id, 803, 'Shake supporters', 'shake', 3, CAST('{"access_type":"shake_supporters"}' AS JSON)
WHERE NOT EXISTS (
  SELECT 1 FROM lookup_items WHERE lookup_group_id = @post_access_group_id AND code = 803
);

INSERT INTO lookup_items (lookup_group_id, code, label, icon, sort_order, metadata)
SELECT @post_access_group_id, 804, 'Members only', 'lock', 4, CAST('{"access_type":"members_only"}' AS JSON)
WHERE NOT EXISTS (
  SELECT 1 FROM lookup_items WHERE lookup_group_id = @post_access_group_id AND code = 804
);
