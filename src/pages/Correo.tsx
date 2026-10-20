import React from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/components/SessionContextProvider";
import SmtpAccountsSection from "@/components/SmtpAccountsSection";
import { useCan } from "@/hooks/use-permissions";

/**
 * Cualquier usuario guarda la contraseña de su propio correo.
 * Quien gestiona usuarios ve además el listado de todos los buzones.
 * No depende de un permiso nuevo ni de otra migración.
 */
const Correo: React.FC = () => {
  const { profile, loading } = useSession();
  const { can, cargandoPermisos } = useCan();

  if (loading || cargandoPermisos) {
    return (
      <div className="p-4 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (can("users.manage")) {
    return (
      <div className="p-4 sm:p-6 max-w-full mx-auto">
        <SmtpAccountsSection adminMode />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <SmtpAccountsSection
        profileEmail={profile?.email}
        title="Correo de envío"
        description="La contraseña del correo con el que entras (tu cuenta go.ugr.es, si es esa). Cualquier usuario puede guardarla; no hace falta ser administrador. No se vuelve a mostrar."
      />
    </div>
  );
};

export default Correo;
