"use client";

import React from "react";
import { Building2 } from "lucide-react";
import { useSedeActiva } from "@/components/SedeContextProvider";
import { getSedeById } from "@/lib/sedes";
import { cn } from "@/lib/utils";

interface SedeHeroBannerProps {
  className?: string;
}

const SedeHeroBanner: React.FC<SedeHeroBannerProps> = ({ className }) => {
  const { sedeActiva } = useSedeActiva();
  const sede = sedeActiva ? getSedeById(sedeActiva) : undefined;

  if (!sede) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border shadow-sm",
        className
      )}
      style={{ background: sede.heroGradient }}
    >
      {/* Velo suave para que el texto respire sobre el gradiente */}
      <div className="absolute inset-0 bg-white/10 dark:bg-black/15" aria-hidden />

      {/* Destellos decorativos (inspirados en el logo FarBioQ) */}
      {sede.id === "farmacia" && (
        <>
          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-fuchsia-300/30 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-cyan-300/25 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute right-1/4 top-1/2 h-24 w-24 rounded-full bg-amber-300/20 blur-2xl" aria-hidden />
        </>
      )}

      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        {sede.logoUrl ? (
          <div className="shrink-0 rounded-xl bg-white/95 p-3 shadow-md ring-1 ring-black/5 dark:bg-white">
            <img
              src={sede.logoUrl}
              alt={`Logo ${sede.name}`}
              className="h-14 w-auto max-w-[220px] object-contain sm:h-16"
            />
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white shadow-inner ring-1 ring-white/30 backdrop-blur-sm">
            <Building2 className="h-8 w-8" />
          </div>
        )}

        <div className="min-w-0 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/75">
            Sede activa
          </p>
          <h2 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
            {sede.name}
          </h2>
          {sede.grupo && (
            <p className="mt-1 max-w-2xl text-sm leading-snug text-white/90 sm:text-base">
              {sede.grupo}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SedeHeroBanner;
