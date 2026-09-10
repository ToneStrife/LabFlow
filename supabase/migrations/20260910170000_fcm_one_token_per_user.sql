-- Dejar un solo token FCM por usuario (el más reciente).
-- Los tokens viejos provocaban la misma alerta dos veces en el mismo dispositivo.

DELETE FROM public.fcm_tokens a
USING public.fcm_tokens b
WHERE a.user_id = b.user_id
  AND a.token <> b.token
  AND COALESCE(a.last_used, a.created_at) < COALESCE(b.last_used, b.created_at);
