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

  const overlay = sede
    ? `linear-gradient(105deg, ${sede.color}dd 0%, ${sede.color}99 38%, rgba(15,10,30,0.45) 100%)`
    : "linear-gradient(105deg, #1e1b4bee 0%, #4c1d95aa 45%, rgba(15,10,30,0.4) 100%)";

  const fondoStyle = sede?.heroImageUrl
    ? {
        backgroundImage: `${overlay}, url(${sede.heroImageUrl})`,
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
        "relative min-h-[9.5rem] overflow-hidden rounded-2xl border shadow-sm sm:min-h-[11rem]",
        className
      )}
      style={fondoStyle}
    >
      {!sede?.heroImageUrl && (
        <>
          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-fuchsia-300/25 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute right-1/4 top-1/2 h-24 w-24 rounded-full bg-amber-300/15 blur-2xl" aria-hidden />
        </>
      )}

      <div className="relative flex h-full min-h-[9.5rem] flex-col justify-end gap-4 p-5 sm:min-h-[11rem] sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:p-6">
        <div className="min-w-0 text-white drop-shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
            {sede ? `Sede activa · ${GRUPO.nombre}` : GRUPO.nombre}
          </p>
          <h2 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
            {sede ? sede.name : "Todas las sedes"}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-snug text-white/90 sm:text-base">
            {sede?.descripcion ?? GRUPO.descripcion}
          </p>
        </div>

        <div className="shrink-0 self-start rounded-xl bg-white/95 p-3 shadow-md ring-1 ring-black/5 backdrop-blur-sm dark:bg-white sm:self-end">
          <img
            src={GRUPO.logoUrl}
            alt={`Logo ${GRUPO.nombre}`}
            className="h-12 w-auto max-w-[200px] object-contain sm:h-14"
          />
        </div>
      </div>
    </div>
  );
};

export default SedeHeroBanner;
