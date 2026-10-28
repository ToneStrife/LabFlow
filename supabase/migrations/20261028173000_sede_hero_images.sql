-- Las fotos de CIBM y Farmacia viven en public/sedes. Sin esta ruta el
-- banner solo muestra el degradado.
UPDATE public.sedes
SET hero_image_url = '/sedes/cibm-hero.jpg'
WHERE id = 'cibm' AND (hero_image_url IS NULL OR hero_image_url = '');

UPDATE public.sedes
SET hero_image_url = '/sedes/farmacia-hero.jpg'
WHERE id = 'farmacia' AND (hero_image_url IS NULL OR hero_image_url = '');
