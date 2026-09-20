"use client";

import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  FilePlus,
  ArrowRightLeft,
  FileText,
  CreditCard,
  PackageCheck,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ETIQUETA_EVENTO, type RequestEventType } from "@/lib/activity";
import type { ActivityEvent } from "@/hooks/use-request-events";

const ESTILO: Record<RequestEventType, { icono: LucideIcon; caja: string; texto: string }> = {
  created: {
    icono: FilePlus,
    caja: "bg-amber-100 dark:bg-amber-950",
    texto: "text-amber-700 dark:text-amber-300",
  },
  status_changed: {
    icono: ArrowRightLeft,
    caja: "bg-slate-100 dark:bg-slate-800",
    texto: "text-slate-700 dark:text-slate-300",
  },
  quote_attached: {
    icono: FileText,
    caja: "bg-sky-100 dark:bg-sky-950",
    texto: "text-sky-700 dark:text-sky-300",
  },
  po_updated: {
    icono: CreditCard,
    caja: "bg-indigo-100 dark:bg-indigo-950",
    texto: "text-indigo-700 dark:text-indigo-300",
  },
  packing_slip: {
    icono: PackageCheck,
    caja: "bg-emerald-100 dark:bg-emerald-950",
    texto: "text-emerald-700 dark:text-emerald-300",
  },
  invoice: {
    icono: Receipt,
    caja: "bg-rose-100 dark:bg-rose-950",
    texto: "text-rose-700 dark:text-rose-300",
  },
};

interface ActivityEventRowProps {
  event: ActivityEvent;
  /** En el detalle de la solicitud no hace falta repetir el número. */
  mostrarSolicitud?: boolean;
}

const ActivityEventRow: React.FC<ActivityEventRowProps> = ({
  event,
  mostrarSolicitud = true,
}) => {
  const estilo = ESTILO[event.event_type];
  const Icono = estilo.icono;
  const cuando = format(new Date(event.created_at), "yyyy-MM-dd HH:mm");

  return (
    <li className="flex items-start gap-2.5 px-3 py-2 hover:bg-muted/40">
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          estilo.caja
        )}
      >
        <Icono className={cn("h-3.5 w-3.5", estilo.texto)} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium">{event.titulo}</p>
          <time
            dateTime={event.created_at}
            className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground"
            title={cuando}
          >
            {cuando}
          </time>
        </div>
        {event.detalle && (
          <p className="mt-0.5 text-sm leading-snug text-foreground/90">{event.detalle}</p>
        )}
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {mostrarSolicitud && (
            <>
              <Link
                to={`/requests/${event.request_id}`}
                className="font-mono font-medium text-primary hover:underline"
              >
                #{event.requestNumber}
              </Link>
              {event.vendorName ? ` · ${event.vendorName}` : ""}
              {event.actorName ? ` · ${event.actorName}` : ""}
            </>
          )}
          {!mostrarSolicitud && (event.actorName || ETIQUETA_EVENTO[event.event_type])}
        </p>
      </div>
    </li>
  );
};

export default ActivityEventRow;
