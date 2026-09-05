"use client";

import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Search,
  FileText,
  CreditCard,
  PackageCheck,
  Receipt,
  Loader2,
  ExternalLink,
  FileSearch,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { pageContainerClass } from "@/lib/layout";
import { generateSignedUrl } from "@/utils/supabase-storage";
import {
  useDocumentos,
  ETIQUETA_TIPO,
  type Documento,
  type TipoDocumento,
} from "@/hooks/use-documents";

const ESTILO_TIPO: Record<TipoDocumento, { icono: LucideIcon; caja: string; texto: string }> = {
  cotizacion: {
    icono: FileText,
    caja: "bg-sky-100 dark:bg-sky-950",
    texto: "text-sky-700 dark:text-sky-300",
  },
  orden: {
    icono: CreditCard,
    caja: "bg-indigo-100 dark:bg-indigo-950",
    texto: "text-indigo-700 dark:text-indigo-300",
  },
  albaran: {
    icono: PackageCheck,
    caja: "bg-violet-100 dark:bg-violet-950",
    texto: "text-violet-700 dark:text-violet-300",
  },
  factura: {
    icono: Receipt,
    caja: "bg-rose-100 dark:bg-rose-950",
    texto: "text-rose-700 dark:text-rose-300",
  },
};

const ORDEN_TIPOS: TipoDocumento[] = ["cotizacion", "orden", "albaran", "factura"];

const Documentos = () => {
  const { documentos, isLoading, error } = useDocumentos();
  const [busqueda, setBusqueda] = React.useState("");
  const [tipo, setTipo] = React.useState<TipoDocumento | "todos">("todos");
  const [proveedorId, setProveedorId] = React.useState("todos");
  const [solicitanteId, setSolicitanteId] = React.useState("todos");
  const [desde, setDesde] = React.useState("");
  const [hasta, setHasta] = React.useState("");
  const [panelAbierto, setPanelAbierto] = React.useState(false);
  const [abriendo, setAbriendo] = React.useState<string | null>(null);

  /** Solo se ofrecen proveedores y personas que de verdad tienen documentos */
  const opciones = React.useMemo(() => {
    const prov = new Map<string, string>();
    const sol = new Map<string, string>();
    for (const d of documentos) {
      if (d.vendorId) prov.set(d.vendorId, d.vendorName);
      if (d.requesterId) sol.set(d.requesterId, d.requesterName);
    }
    const ordenar = (m: Map<string, string>) =>
      [...m].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
    return { proveedores: ordenar(prov), solicitantes: ordenar(sol) };
  }, [documentos]);

  const filtrosActivos =
    (proveedorId !== "todos" ? 1 : 0) +
    (solicitanteId !== "todos" ? 1 : 0) +
    (desde ? 1 : 0) +
    (hasta ? 1 : 0);

  const limpiarFiltros = () => {
    setProveedorId("todos");
    setSolicitanteId("todos");
    setDesde("");
    setHasta("");
  };

  const abrir = async (doc: Documento) => {
    setAbriendo(doc.id);
    const url = await generateSignedUrl(doc.ruta);
    setAbriendo(null);
    if (url) window.open(url, "_blank");
    else toast.error("No se pudo abrir el documento.");
  };

  const conteos = React.useMemo(() => {
    const c: Record<string, number> = { todos: documentos.length };
    for (const t of ORDEN_TIPOS) c[t] = documentos.filter((d) => d.tipo === t).length;
    return c;
  }, [documentos]);

  const filtrados = React.useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    // Las fechas del navegador vienen como yyyy-mm-dd; el "hasta" incluye el día entero
    const desdeMs = desde ? new Date(`${desde}T00:00:00`).getTime() : null;
    const hastaMs = hasta ? new Date(`${hasta}T23:59:59`).getTime() : null;

    return documentos.filter((d) => {
      if (tipo !== "todos" && d.tipo !== tipo) return false;
      if (proveedorId !== "todos" && d.vendorId !== proveedorId) return false;
      if (solicitanteId !== "todos" && d.requesterId !== solicitanteId) return false;

      const momento = new Date(d.fecha).getTime();
      if (desdeMs !== null && momento < desdeMs) return false;
      if (hastaMs !== null && momento > hastaMs) return false;

      if (!texto) return true;
      return [
        d.nombreArchivo,
        d.referencia ?? "",
        d.requestNumber,
        d.vendorName,
        d.requesterName,
        ETIQUETA_TIPO[d.tipo],
      ]
        .join(" ")
        .toLowerCase()
        .includes(texto);
    });
  }, [documentos, busqueda, tipo, proveedorId, solicitanteId, desde, hasta]);

  return (
    <div className={pageContainerClass}>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Documentos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cotizaciones, órdenes de compra, albaranes y facturas de todas las solicitudes.
        </p>
      </div>

      {/* Buscador siempre a la vista: se queda pegado bajo la cabecera al bajar */}
      <div className="sticky top-14 z-30 space-y-3 rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por número, proveedor, solicitud o nombre de archivo…"
            className="h-11 pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {/* Los tipos sin ningún documento no se ofrecen: las facturas, por
              ejemplo, se registran solo con su número y nunca llevan archivo */}
          {(["todos", ...ORDEN_TIPOS] as const)
            .filter((t) => t === "todos" || (conteos[t] ?? 0) > 0)
            .map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  tipo === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {t === "todos" ? "Todos" : ETIQUETA_TIPO[t]}
                <span className="ml-1.5 font-mono tabular-figures opacity-70">
                  {conteos[t] ?? 0}
                </span>
              </button>
            ))}

          <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">
            {filtrosActivos > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground"
                onClick={limpiarFiltros}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Limpiar
              </Button>
            )}
            <Button
              type="button"
              variant={panelAbierto || filtrosActivos > 0 ? "secondary" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setPanelAbierto((v) => !v)}
            >
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              Filtros
              {filtrosActivos > 0 && (
                <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] text-primary-foreground">
                  {filtrosActivos}
                </span>
              )}
            </Button>
          </div>
        </div>

        {panelAbierto && (
          <div className="grid gap-3 border-t pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Proveedor
              </Label>
              <Select value={proveedorId} onValueChange={setProveedorId}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {opciones.proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Solicitante
              </Label>
              <Select value={solicitanteId} onValueChange={setSolicitanteId}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {opciones.solicitantes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="doc-desde"
                className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                Desde
              </Label>
              <Input
                id="doc-desde"
                type="date"
                value={desde}
                max={hasta || undefined}
                onChange={(e) => setDesde(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="doc-hasta"
                className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                Hasta
              </Label>
              <Input
                id="doc-hasta"
                type="date"
                value={hasta}
                min={desde || undefined}
                onChange={(e) => setHasta(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        )}
      </div>

      {!isLoading && !error && (
        <p className="text-xs text-muted-foreground">
          {filtrados.length === documentos.length
            ? `${documentos.length} documentos`
            : `${filtrados.length} de ${documentos.length} documentos`}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" /> Cargando documentos…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          No se pudieron cargar los documentos: {error.message}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
          <FileSearch className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            {documentos.length === 0
              ? "Todavía no hay documentos adjuntos en ninguna solicitud."
              : "Ningún documento coincide con la búsqueda."}
          </p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {filtrados.map((doc) => {
            const estilo = ESTILO_TIPO[doc.tipo];
            const Icono = estilo.icono;
            return (
              <li
                key={doc.id}
                className="flex flex-col gap-3 p-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    estilo.caja
                  )}
                >
                  <Icono className={cn("h-4 w-4", estilo.texto)} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className={cn("text-xs font-semibold", estilo.texto)}>
                      {ETIQUETA_TIPO[doc.tipo]}
                    </span>
                    {doc.referencia && (
                      <span className="font-mono text-sm font-medium">{doc.referencia}</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {doc.nombreArchivo}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3 sm:gap-6">
                  <div className="min-w-0 text-xs">
                    <Link
                      to={`/requests/${doc.requestId}`}
                      className="font-mono font-medium text-primary hover:underline"
                    >
                      #{doc.requestNumber}
                    </Link>
                    <p className="truncate text-muted-foreground">{doc.vendorName}</p>
                  </div>
                  <span className="tabular-figures shrink-0 font-mono text-xs text-muted-foreground">
                    {format(new Date(doc.fecha), "yyyy-MM-dd")}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 shrink-0"
                    onClick={() => abrir(doc)}
                    disabled={abriendo === doc.id}
                  >
                    {abriendo === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Abrir</span>
                      </>
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Documentos;
