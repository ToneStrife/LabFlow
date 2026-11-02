import React from "react";
import { useSedeActiva } from "@/components/SedeContextProvider";
import { useLabsCatalog } from "@/components/LabsCatalogProvider";
import { GRUPO, getSedeById } from "@/lib/sedes";
import { sedeAssetUrl } from "@/lib/sede-theme";
import { cn } from "@/lib/utils";

interface SedeHeroBannerProps {
  className?: string;
}

const SedeHeroBanner: React.FC<SedeHeroBannerProps> = ({ className }) => {
  const { sedeActiva } = useSedeActiva();
  const { labs } = useLabsCatalog();
  const sede = sedeActiva ? getSedeById(sedeActiva) : undefined;
  const lab = sede?.lab_id ? labs.find((l) => l.id === sede.lab_id) : labs[0];
  const labNombre = lab?.name ?? GRUPO.nombre;
  const labDesc = lab?.description ?? GRUPO.descripcion;
  const labLogo = lab?.logo_url || GRUPO.logoUrl || sedeAssetUrl("sedes/farbioq-logo.png");

  const overlay = sede
    ? `linear-gradient(105deg, ${sede.color}dd 0%, ${sede.color}99 38%, rgba(15,10,30,0.45) 100%)`
    : "linear-gradient(105deg, #1e3a5fee 0%, #2563eb99 40%, rgba(15,23,42,0.45) 100%)";

  const fondoStyle = sede?.heroImageUrl
    ? {
        backgroundImage: `${overlay}, url(${sede.heroImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : sede
      ? { background: sede.heroGradient }
      : {
          // Neutro del grupo (no morado de Farmacia) cuando se ven Todas
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e3a5f 45%, #2563eb 100%)",
        };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border shadow-sm",
        className
      )}
      style={fondoStyle}
    >
      {!sede?.heroImageUrl && (
        <>
          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-indigo-300/15 blur-3xl" aria-hidden />
        </>
      )}

      {/* Una franja que dice en qué sede estás. No lleva a ninguna acción, así
          que no debe quitarle el sitio al saludo ni a las fases que van debajo. */}
      <div className="relative flex flex-row items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-5">
        <div className="min-w-0 text-white drop-shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
            {sede ? `Sede activa · ${labNombre}` : labNombre}
          </p>
          <p className="mt-0.5 text-lg font-bold tracking-tight sm:text-xl">
            {sede ? sede.name : "Todas las sedes"}
          </p>
          <p className="mt-0.5 hidden max-w-xl truncate text-sm text-white/90 md:block">
            {sede?.descripcion ?? labDesc}
          </p>
        </div>

        <div className="shrink-0 rounded-md bg-white/95 p-1.5 shadow-sm ring-1 ring-black/5 backdrop-blur-sm dark:bg-white sm:p-2">
          <img
            src={labLogo}
            alt={`Logo ${labNombre}`}
            className="h-7 w-auto max-w-[110px] object-contain sm:h-10 sm:max-w-[160px]"
          />
        </div>
      </div>
    </div>
  );
};

export default SedeHeroBanner;
