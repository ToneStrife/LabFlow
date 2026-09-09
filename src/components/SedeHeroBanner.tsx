"use client";

import React from "react";
import { useSedeActiva } from "@/components/SedeContextProvider";
import { GRUPO, getSedeById } from "@/lib/sedes";
import { cn } from "@/lib/utils";

interface SedeHeroBannerProps {
  className?: string;
}

const SedeHeroBanner: React.FC<SedeHeroBannerProps> = ({ className }) => {
  const { sedeActiva } = useSedeActiva();
  const sede = sedeActiva ? getSedeById(sedeActiva) : undefined;

  const fondoStyle = sede?.heroImageUrl
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(15,10,40,0.72) 0%, rgba(15,10,40,0.45) 100%), url(${sede.heroImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : sede
      ? { background: sede.heroGradient }
      : {
          background:
            "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 70%, #7e22ce 100%)",
        };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border shadow-sm",
        className
      )}
      style={fondoStyle}
    >
      <div className="absolute inset-0 bg-white/10 dark:bg-black/15" aria-hidden />

      {!sede?.heroImageUrl && (
        <>
          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-fuchsia-300/25 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute right-1/4 top-1/2 h-24 w-24 rounded-full bg-amber-300/15 blur-2xl" aria-hidden />
        </>
      )}

      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div className="shrink-0 rounded-xl bg-white/95 p-3 shadow-md ring-1 ring-black/5 dark:bg-white">
          <img
            src={GRUPO.logoUrl}
            alt={`Logo ${GRUPO.nombre}`}
            className="h-14 w-auto max-w-[220px] object-contain sm:h-16"
          />
        </div>

        <div className="min-w-0 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/75">
            {sede ? `Sede activa · ${GRUPO.nombre}` : GRUPO.nombre}
          </p>
          <h2 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
            {sede ? sede.name : "Todas las sedes"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-snug text-white/90 sm:text-base">
            {sede?.descripcion ?? GRUPO.descripcion}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SedeHeroBanner;
