-- Sofía: seis avatares (0 robot, 1 manga, 2 criatura, 3 naruto, 4 nami, 5 pikachu).
-- El límite original era 0 a 3.
ALTER TABLE public.sofia_devices DROP CONSTRAINT IF EXISTS sofia_devices_avatar_check;
ALTER TABLE public.sofia_devices ADD CONSTRAINT sofia_devices_avatar_check CHECK (avatar BETWEEN 0 AND 5);
