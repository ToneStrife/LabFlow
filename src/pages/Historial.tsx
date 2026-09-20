"use client";

import React from "react";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  Search,
  Loader2,
  History,
  PackageCheck,
  ArrowRightLeft,
  FilePlus,
  Receipt,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { pageContainerClass } from "@/lib/layout";
import { useActivityEvents } from "@/hooks/use-request-events";
import { useClientPagination } from "@/hooks/use-client-pagination";
import ListPagination from "@/components/ListPagination";
import ActivityEventRow from "@/components/ActivityEventRow";
import type { RequestEventType } from "@/lib/activity";

type FiltroTipo = "todos" | "packing_slip" | "status_changed" | "created" | "documentos" | "invoice";

const FILTROS: { id: FiltroTipo; etiqueta: string; icono: typeof History }[] = [
  { id: "todos", etiqueta: "Todos", icono: History },
  { id: "packing_slip", etiqueta: "Llegadas", icono: PackageCheck },
  { id: "status_changed", etiqueta: "Estados", icono: ArrowRightLeft },
  { id: "created", etiqueta: "Solicitudes", icono: FilePlus },
  { id: "documentos", etiqueta: "Documentos", icono: FileText },
  { id: "invoice", etiqueta: "Facturas", icono: Receipt },
];

function coincideTipo(tipo: RequestEventType, filtro: FiltroTipo): boolean {
  if (filtro === "todos") return true;
  if (filtro === "documentos") return tipo === "quote_attached" || tipo === "po_updated";
  return tipo === filtro;
}

function etiquetaDia(iso: string): string {
  const fecha = new Date(iso);
  if (isToday(fecha)) return "Hoy";
  if (isYesterday(fecha)) return "Ayer";
  return format(startOfDay(fecha), "d MMM yyyy", { locale: es });
}

const Historial = () => {
  const { actividad, isLoading, error } = useActivityEvents();
  const [busqueda, setBusqueda] = React.useState("");
  const [tipo, setTipo] = React.useState<FiltroTipo>("todos");

  const filtrados = React.useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return actividad.filter((e) => {
      if (!coincideTipo(e.event_type, tipo)) return false;
      if (!texto) return true;
      return e.busqueda.includes(texto);
    });
  }, [actividad, busqueda, tipo]);

  const pagination = useClientPagination(filtrados, {
    initialPageSize: 25,
    resetKey: `${busqueda}|${tipo}`,
  });

  const grupos = React.useMemo(() => {
    const map = new Map<string, typeof pagination.pageItems>();
    for (const evento of pagination.pageItems) {
      const clave = startOfDay(new Date(evento.created_at)).toISOString();
      const lista = map.get(clave) ?? [];
      lista.push(evento);
      map.set(clave, lista);
    }
    return [...map.entries()];
  }, [pagination.pageItems]);

  const conteos = React.useMemo(() => {
    const c: Record<string, number> = { todos: actividad.length };
    for (const f of FILTROS) {
      if (f.id === "todos") continue;
      c[f.id] = actividad.filter((e) => coincideTipo(e.event_type, f.id)).length;
    }
    return c;
  }, [actividad]);

  return (
    <div className={pageContainerClass}>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Registro</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Qué ha pasado y qué ha llegado: busca por producto, albarán o solicitud.
        </p>
      </div>

      <div className="sticky top-14 z-30 space-y-2 rounded-md border bg-card/95 p-2.5 shadow-sm backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto, catálogo, albarán, solicitud o proveedor…"
            className="h-9 pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {FILTROS.map((f) => {
            const Icono = f.icono;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setTipo(f.id)}
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  tipo === f.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icono className="mr-1 h-3 w-3" />
                {f.etiqueta}
                <span className="ml-1.5 font-mono tabular-nums opacity-70">
                  {conteos[f.id] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" /> Cargando registro…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          No se pudo cargar el registro. Si acabas de desplegar, aplica la migración{" "}
          <code className="font-mono">request_events</code>. {error.message}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-16 text-center">
          <History className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            {actividad.length === 0
              ? "Todavía no hay actividad registrada en esta sede."
              : "Nada coincide con la búsqueda."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border bg-card">
          {grupos.map(([dia, eventos]) => (
            <section key={dia}>
              <h3 className="border-b bg-muted/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {etiquetaDia(eventos[0].created_at)}
              </h3>
              <ul className="divide-y">
                {eventos.map((evento) => (
                  <ActivityEventRow key={evento.id} event={evento} />
                ))}
              </ul>
            </section>
          ))}
          <ListPagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            from={pagination.from}
            to={pagination.to}
            total={pagination.total}
            noun={pagination.total === 1 ? "evento" : "eventos"}
          />
        </div>
      )}
    </div>
  );
};

export default Historial;
