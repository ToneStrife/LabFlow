# Desplegar LabFlow en Vercel (prueba)

## 1) Primer sitio (mismo Supabase que ahora)

1. Entra en [vercel.com](https://vercel.com) con tu GitHub (cuenta Hobby vale).
2. **Add New… → Project** → importa `ToneStrife/LabFlow`.
3. Framework: Vite (lo detecta solo).
4. **Root Directory:** `.`
5. **Build Command:** `npm run build`
6. **Output Directory:** `dist`
7. Variables de entorno: **ninguna** al principio (usa el Supabase FarBioQ embebido).
8. Deploy.

Quedarás con algo como `https://labflow-xxx.vercel.app`.

### Supabase Auth (importante)

En el panel de Supabase → **Authentication → URL Configuration**:

- **Site URL:** la URL de Vercel (o la de Pages si sigues usándola).
- **Redirect URLs:** añade la URL de Vercel, p.ej. `https://labflow-xxx.vercel.app/**`

Sin eso, invitaciones / reset de contraseña pueden fallar al volver del correo.

## 2) Segundo “lab” en Vercel (misma app, otro proyecto)

1. En Vercel: **Add New… → Project** otra vez, mismo repo `LabFlow`.
2. Nombre distinto, p.ej. `labflow-inmuno-demo`.
3. En **Environment Variables**:
   - `VITE_SUPABASE_URL` = URL del **otro** proyecto Supabase (cuando lo crees)
   - `VITE_SUPABASE_ANON_KEY` = anon key de ese proyecto
4. Deploy → otra URL.

Hasta que crees el segundo Supabase, el segundo Vercel puede apuntar al mismo (solo prueba de multi-proyecto Vercel).

## 3) Updates

Un push a `main` redeploya cada proyecto Vercel enganchado al repo. Las migraciones SQL las aplicas tú a cada Supabase.

## GitHub Pages

Sigue funcionando: el build sin `VERCEL` usa `base: /LabFlow/`.

## Variables obligatorias en Vercel

En **Settings → Environment Variables** (Production + Preview):

| Nombre | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` (Supabase → Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | la clave **anon** / **publishable** (misma pantalla) |

No uses la URI `postgresql://…` ni la `service_role`.

Después: Deployments → … → Redeploy (o un push a main).
