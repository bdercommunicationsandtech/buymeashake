-- Copy de página pública y sección de agenda (DBs ya creadas).
-- Ejecutar una vez.

ALTER TABLE athlete_profiles
  ADD COLUMN page_title VARCHAR(200) NULL AFTER bio,
  ADD COLUMN page_description TEXT NULL AFTER page_title,
  ADD COLUMN agenda_title VARCHAR(200) NULL AFTER page_description,
  ADD COLUMN agenda_description TEXT NULL AFTER agenda_title;
