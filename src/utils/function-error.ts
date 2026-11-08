/**
 * Saca el mensaje de error de una función Edge. Cuando la función responde con
 * un error HTTP, supabase-js deja `data` en null y guarda la respuesta en
 * `error.context`: sin leerla, quien usa la app solo ve «Edge Function returned
 * a non-2xx status code» y nunca el motivo real (contraseña de aplicación de
 * Google, falta de cuenta SMTP, permiso denegado...).
 */
export async function mensajeDeErrorDeFuncion(
  error: { message?: string; context?: unknown },
  data: unknown,
  porDefecto: string
): Promise<string> {
  if (data && typeof data === "object" && "error" in data) {
    const mensaje = (data as { error?: unknown }).error;
    if (typeof mensaje === "string" && mensaje.trim()) return mensaje;
  }

  const contexto = error.context;
  if (contexto instanceof Response) {
    try {
      const cuerpo = await contexto.clone().json();
      if (cuerpo?.error) return String(cuerpo.error);
    } catch {
      // La respuesta no era JSON: nos quedamos con el mensaje por defecto.
    }
  }

  return porDefecto;
}
