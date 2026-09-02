-- Añade columnas de redes sociales a athlete_profiles (DBs ya creadas).
-- Seguro de re-ejecutar: ignora si la columna ya existe (MySQL 8.0+ no soporta IF NOT EXISTS en ADD COLUMN de forma portable; ejecutar una vez).

ALTER TABLE athlete_profiles
  ADD COLUMN instagram_url VARCHAR(255) NULL AFTER cover_image_url,
  ADD COLUMN tiktok_url VARCHAR(255) NULL AFTER instagram_url,
  ADD COLUMN facebook_url VARCHAR(255) NULL AFTER tiktok_url,
  ADD COLUMN twitter_url VARCHAR(255) NULL AFTER facebook_url;
