-- ==============================================================================
-- MIGRACIÓN DE PRODUCCIÓN: SOPORTE MULTI-DISCIPLINA Y NUEVO CATÁLOGO DE DEPORTES
-- ==============================================================================

-- 1. Crear la nueva tabla pivot (athlete_disciplines) para permitir múltiples deportes por atleta
CREATE TABLE IF NOT EXISTS athlete_disciplines (
    athlete_id INT NOT NULL,
    discipline_item_id INT NOT NULL,
    PRIMARY KEY (athlete_id, discipline_item_id),
    CONSTRAINT athlete_disciplines_athlete_fk FOREIGN KEY (athlete_id) REFERENCES athlete_profiles (id) ON DELETE CASCADE,
    CONSTRAINT athlete_disciplines_sport_fk FOREIGN KEY (discipline_item_id) REFERENCES lookup_items (id) ON DELETE CASCADE
);

-- 2. Migrar los datos existentes (Crucial en producción para no borrar el deporte actual de los atletas)
-- Esto copia el 'primary_sport_item_id' de athlete_profiles y lo inserta en la nueva tabla athlete_disciplines.
INSERT IGNORE INTO athlete_disciplines (athlete_id, discipline_item_id)
SELECT id, primary_sport_item_id
FROM athlete_profiles
WHERE primary_sport_item_id IS NOT NULL;

-- 3. Eliminar la llave foránea antigua de athlete_profiles
ALTER TABLE athlete_profiles DROP FOREIGN KEY athlete_profiles_sport_fk;

-- 4. Eliminar la columna antigua de athlete_profiles
ALTER TABLE athlete_profiles DROP COLUMN primary_sport_item_id;


-- 5. Insertar las nuevas disciplinas deportivas al catálogo global
SET @sports_group_id = (SELECT id FROM lookup_groups WHERE code = 100);

INSERT IGNORE INTO lookup_items (lookup_group_id, code, label, sort_order) VALUES
(@sports_group_id, 110, 'Fútbol', 10),
(@sports_group_id, 111, 'Baloncesto', 11),
(@sports_group_id, 112, 'Tenis', 12),
(@sports_group_id, 113, 'Pádel', 13),
(@sports_group_id, 114, 'Voleibol', 14),
(@sports_group_id, 115, 'Atletismo', 15),
(@sports_group_id, 116, 'Natación', 16),
(@sports_group_id, 117, 'Ciclismo', 17),
(@sports_group_id, 118, 'Gimnasia', 18),
(@sports_group_id, 119, 'Boxeo', 19),
(@sports_group_id, 120, 'MMA', 20),
(@sports_group_id, 121, 'Jiu-Jitsu Brasileño', 21),
(@sports_group_id, 122, 'Judo', 22),
(@sports_group_id, 123, 'Karate', 23),
(@sports_group_id, 124, 'Taekwondo', 24),
(@sports_group_id, 125, 'Halterofilia', 25),
(@sports_group_id, 126, 'Powerlifting', 26),
(@sports_group_id, 127, 'Fisicoculturismo', 27),
(@sports_group_id, 128, 'CrossFit', 28),
(@sports_group_id, 129, 'Triatlón', 29),
(@sports_group_id, 130, 'Yoga', 30),
(@sports_group_id, 131, 'Calistenia', 31),
(@sports_group_id, 132, 'Surf', 32),
(@sports_group_id, 133, 'Skateboarding', 33),
(@sports_group_id, 134, 'Escalada', 34),
(@sports_group_id, 135, 'Rugby', 35),
(@sports_group_id, 136, 'Fútbol Americano', 36),
(@sports_group_id, 137, 'Béisbol', 37),
(@sports_group_id, 138, 'Golf', 38),
(@sports_group_id, 139, 'Automovilismo', 39),
(@sports_group_id, 140, 'Esgrima', 40),
(@sports_group_id, 141, 'Remo', 41),
(@sports_group_id, 142, 'Esquí', 42),
(@sports_group_id, 143, 'Snowboard', 43),
(@sports_group_id, 144, 'Tenis de Mesa', 44),
(@sports_group_id, 145, 'Waterpolo', 45),
(@sports_group_id, 146, 'Esports', 46);
