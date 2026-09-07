-- Firebase / social login support for users (safe to run once on existing DBs).

ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NULL;

ALTER TABLE users
  ADD COLUMN firebase_uid VARCHAR(128) NULL UNIQUE AFTER email;

