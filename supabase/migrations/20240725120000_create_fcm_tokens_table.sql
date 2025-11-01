-- Crear la tabla para almacenar los tokens de Firebase Cloud Messaging
CREATE TABLE fcm_tokens (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    token text NOT NULL UNIQUE,
    last_used timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Crear un índice para búsquedas rápidas por user_id
CREATE INDEX idx_fcm_tokens_user_id ON fcm_tokens (user_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- 1. Política para que los usuarios puedan ver y actualizar sus propios tokens
CREATE POLICY "Users can manage their own fcm_tokens."
ON fcm_tokens FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Política para que la función Edge pueda leer cualquier token (usando el service_role_key)
-- Nota: Las funciones Edge que usan el service_role_key ignoran RLS, pero es buena práctica tener políticas claras.
-- Para este caso, la función Edge usa el token del usuario autenticado, por lo que la política 1 es suficiente para la lectura del token.
-- Sin embargo, el código de registro del token (en el cliente) necesita la política 1.

-- 3. Crear una función para actualizar el timestamp 'last_used'
CREATE OR REPLACE FUNCTION update_last_used_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Crear un trigger para actualizar 'last_used' en cada actualización
CREATE TRIGGER update_fcm_tokens_last_used
BEFORE UPDATE ON fcm_tokens
FOR EACH ROW
EXECUTE FUNCTION update_last_used_timestamp();