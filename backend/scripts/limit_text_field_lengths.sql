-- ==============================================================================
-- Limitar longitudes de campos TEXT → VARCHAR (DBs ya creadas).
-- Ejecutar una vez. MySQL 8.0+ / utf8mb4.
--
-- Antes de ALTER se truncan filas que excedan el nuevo máximo, para que el
-- cambio de tipo no falle. Revisar el SELECT de auditoría si quieres auditar.
-- ==============================================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------------------------
-- 0. (Opcional) Auditoría: filas que se van a truncar
-- ------------------------------------------------------------------------------
-- SELECT 'athlete_profiles.bio' AS field, id AS row_id, CHAR_LENGTH(bio) AS len
-- FROM athlete_profiles WHERE bio IS NOT NULL AND CHAR_LENGTH(bio) > 600
-- UNION ALL
-- SELECT 'athlete_page_settings.page_description', athlete_id, CHAR_LENGTH(page_description)
-- FROM athlete_page_settings WHERE page_description IS NOT NULL AND CHAR_LENGTH(page_description) > 400
-- UNION ALL
-- SELECT 'athlete_page_settings.agenda_description', athlete_id, CHAR_LENGTH(agenda_description)
-- FROM athlete_page_settings WHERE agenda_description IS NOT NULL AND CHAR_LENGTH(agenda_description) > 300
-- UNION ALL
-- SELECT 'athlete_page_settings.thank_you_message', athlete_id, CHAR_LENGTH(thank_you_message)
-- FROM athlete_page_settings WHERE thank_you_message IS NOT NULL AND CHAR_LENGTH(thank_you_message) > 200
-- UNION ALL
-- SELECT 'membership_tiers.description', id, CHAR_LENGTH(description)
-- FROM membership_tiers WHERE description IS NOT NULL AND CHAR_LENGTH(description) > 200
-- UNION ALL
-- SELECT 'digital_products.description', id, CHAR_LENGTH(description)
-- FROM digital_products WHERE description IS NOT NULL AND CHAR_LENGTH(description) > 200
-- UNION ALL
-- SELECT 'booking_services.description', id, CHAR_LENGTH(description)
-- FROM booking_services WHERE description IS NOT NULL AND CHAR_LENGTH(description) > 200
-- UNION ALL
-- SELECT 'post_comments.content', id, CHAR_LENGTH(content)
-- FROM post_comments WHERE CHAR_LENGTH(content) > 200;

-- ------------------------------------------------------------------------------
-- 1. Truncar valores existentes que exceden el nuevo límite
-- ------------------------------------------------------------------------------

UPDATE athlete_profiles
SET bio = LEFT(bio, 600)
WHERE bio IS NOT NULL AND CHAR_LENGTH(bio) > 600;

UPDATE athlete_page_settings
SET page_description = LEFT(page_description, 400)
WHERE page_description IS NOT NULL AND CHAR_LENGTH(page_description) > 400;

UPDATE athlete_page_settings
SET agenda_description = LEFT(agenda_description, 300)
WHERE agenda_description IS NOT NULL AND CHAR_LENGTH(agenda_description) > 300;

UPDATE athlete_page_settings
SET thank_you_message = LEFT(thank_you_message, 200)
WHERE thank_you_message IS NOT NULL AND CHAR_LENGTH(thank_you_message) > 200;

UPDATE membership_tiers
SET description = LEFT(description, 200)
WHERE description IS NOT NULL AND CHAR_LENGTH(description) > 200;

UPDATE digital_products
SET description = LEFT(description, 200)
WHERE description IS NOT NULL AND CHAR_LENGTH(description) > 200;

UPDATE booking_services
SET description = LEFT(description, 200)
WHERE description IS NOT NULL AND CHAR_LENGTH(description) > 200;

UPDATE post_comments
SET content = LEFT(content, 200)
WHERE CHAR_LENGTH(content) > 200;

-- ------------------------------------------------------------------------------
-- 2. Aplicar límites a nivel de columna (TEXT → VARCHAR)
-- ------------------------------------------------------------------------------

ALTER TABLE athlete_profiles
  MODIFY COLUMN bio VARCHAR(600) NULL;

ALTER TABLE athlete_page_settings
  MODIFY COLUMN page_description VARCHAR(400) NULL,
  MODIFY COLUMN agenda_description VARCHAR(300) NULL,
  MODIFY COLUMN thank_you_message VARCHAR(200) NULL;

ALTER TABLE membership_tiers
  MODIFY COLUMN description VARCHAR(200) NULL;

ALTER TABLE digital_products
  MODIFY COLUMN description VARCHAR(200) NULL;

ALTER TABLE booking_services
  MODIFY COLUMN description VARCHAR(200) NULL;

ALTER TABLE post_comments
  MODIFY COLUMN content VARCHAR(200) NOT NULL;
