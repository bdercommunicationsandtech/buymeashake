-- Imágenes propias de agenda y meta deportiva (no reutilizar el banner del hero).

ALTER TABLE athlete_profiles
  ADD COLUMN agenda_image_url VARCHAR(255) NULL AFTER agenda_description;

ALTER TABLE goals
  ADD COLUMN cover_image_url VARCHAR(255) NULL AFTER title;
