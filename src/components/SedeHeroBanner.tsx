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
        "relative min-h-[5.5rem] overflow-hidden rounded-2xl border shadow-sm sm:min-h-[11rem]",
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

      {/* En el móvil el banner era media pantalla antes del trabajo: aquí se queda
          en una franja con el nombre de la sede y el logo pequeño. */}
      <div className="relative flex h-full min-h-[5.5rem] flex-row items-end justify-between gap-3 p-4 sm:min-h-[11rem] sm:gap-6 sm:p-6">
        <div className="min-w-0 text-white drop-shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
            {sede ? `Sede activa · ${labNombre}` : labNombre}
          </p>
          <h2 className="mt-0.5 text-xl font-bold tracking-tight sm:text-3xl">
            {sede ? sede.name : "Todas las sedes"}
          </h2>
          <p className="mt-1 hidden max-w-xl text-sm leading-snug text-white/90 sm:block sm:text-base">
            {sede?.descripcion ?? labDesc}
          </p>
        </div>

        <div className="shrink-0 self-end rounded-lg bg-white/95 p-2 shadow-md ring-1 ring-black/5 backdrop-blur-sm dark:bg-white sm:rounded-xl sm:p-3">
          <img
            src={labLogo}
            alt={`Logo ${labNombre}`}
            className="h-8 w-auto max-w-[120px] object-contain sm:h-14 sm:max-w-[200px]"
          />
        </div>
      </div>
    </div>
  );
};

export default SedeHeroBanner;
