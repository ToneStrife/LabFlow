/**
 * Captura los parametros que Supabase Auth deja en el fragmento de la URL
 * al volver de un correo (invitacion, restablecer contrasena, magic link).
 *
 * Por que existe este modulo: Supabase reescribe el fragmento de la URL de
 * retorno para meter ahi sus propios parametros, asi que la ruta no puede
 * viajar en el hash (se pierde) y HashRouter acaba recibiendo
 * "access_token=..." como ruta, que no casa con nada y pinta el 404 de la
 * app. La URL de retorno apunta ahora a la raiz y el encaminamiento lo
 * decide la app leyendo estos parametros.
 *
 * El cuerpo del modulo se ejecuta al importarlo. main.tsx lo importa el
 * primero para leer el hash antes de que supabase-js lo consuma y lo limpie.
 */

export interface AuthHashInfo {
  /** recovery, invite, signup, magiclink... */
  type: string | null;
  error: string | null;
  errorDescription: string | null;
  hasAccessToken: boolean;
}

function parseAuthHash(): AuthHashInfo {
  if (typeof window === "undefined") {
    return { type: null, error: null, errorDescription: null, hasAccessToken: false };
  }

  const raw = window.location.hash.replace(/^#/, "");
  // Una navegacion normal trae "/dashboard" y aqui no hay nada que leer.
  if (!raw || !raw.includes("=")) {
    return { type: null, error: null, errorDescription: null, hasAccessToken: false };
  }

  const params = new URLSearchParams(raw);
  return {
    type: params.get("type"),
    error: params.get("error") ?? params.get("error_code"),
    errorDescription: params.get("error_description"),
    hasAccessToken: params.has("access_token"),
  };
}

export const initialAuthHash: AuthHashInfo = parseAuthHash();

/** El enlace traia sesion y pedia establecer o cambiar la contrasena. */
export const isPasswordSetupLink =
  initialAuthHash.hasAccessToken &&
  (initialAuthHash.type === "recovery" || initialAuthHash.type === "invite");

/** El enlace venia de una invitacion, no de un olvido de contrasena. */
export const isInviteLink = initialAuthHash.type === "invite";
