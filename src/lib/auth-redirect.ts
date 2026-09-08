/**
 * URL de retorno para los correos de Supabase Auth.
 *
 * Ojo: no se puede meter la ruta en el fragmento. Supabase reescribe el
 * fragmento de esta URL para colocar ahi sus parametros (access_token, type,
 * error), asi que cualquier "#/reset-password" que pongamos aqui se pierde
 * por el camino. Devolvemos la raiz de la app y el encaminamiento lo hace
 * SessionContextProvider con lo que lee en @/lib/auth-hash.
 */
export function buildAuthReturnUrl(): string {
  const origin = window.location.origin;
  const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
  const basePath =
    firstSegment && firstSegment.toLowerCase() === "labflow"
      ? `/${firstSegment}`
      : "";
  return `${origin}${basePath}/`;
}
