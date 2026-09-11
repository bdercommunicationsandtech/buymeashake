-- Enable Home coverflow disciplines (need image_url). Target: 10 cards.

UPDATE `disciplines`
SET
  `description` = COALESCE(NULLIF(`description`, ''), 'COMBATE'),
  `image_url` = COALESCE(
    NULLIF(`image_url`, ''),
    'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=800&auto=format&fit=crop'
  ),
  `show_in_home` = 1,
  `sort_order` = 5
WHERE `name` LIKE 'Artes Marciales%';

UPDATE `disciplines`
SET
  `description` = COALESCE(NULLIF(`description`, ''), 'EQUIPO'),
  `image_url` = COALESCE(
    NULLIF(`image_url`, ''),
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop'
  ),
  `show_in_home` = 1,
  `sort_order` = 8
WHERE `name` LIKE N'%tbol & Colectivos' OR `name` LIKE 'Futbol%';

UPDATE `disciplines`
SET
  `description` = COALESCE(NULLIF(`description`, ''), 'CANCHA'),
  `image_url` = COALESCE(
    NULLIF(`image_url`, ''),
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=800&auto=format&fit=crop'
  ),
  `show_in_home` = 1,
  `sort_order` = 9
WHERE `name` LIKE 'Baloncesto%';

UPDATE `disciplines`
SET
  `description` = COALESCE(NULLIF(`description`, ''), 'CALISTENIA'),
  `image_url` = COALESCE(
    NULLIF(`image_url`, ''),
    'https://images.unsplash.com/photo-1599058945522-28d584b6f14f?q=80&w=800&auto=format&fit=crop'
  ),
  `show_in_home` = 1,
  `sort_order` = 10
WHERE `name` LIKE 'Calistenia%';

UPDATE `disciplines` SET `sort_order` = 6 WHERE `name` LIKE 'Deportes Acu%';
UPDATE `disciplines` SET `sort_order` = 7 WHERE `name` LIKE 'Bienestar%';
UPDATE `disciplines` SET `sort_order` = 11 WHERE `name` LIKE 'Esports%';
