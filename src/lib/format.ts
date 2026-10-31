import { format } from "date-fns";

const euros = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const eurosRedondos = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** 1234.5 -> "1234,50 €". Vacío o no numérico -> "—". */
export const formatEuros = (valor: number | string | null | undefined): string => {
  const n = typeof valor === "string" ? Number(valor) : valor;
  return n == null || Number.isNaN(n) ? "—" : euros.format(n);
};

/** Para ejes de gráficas, donde los céntimos solo estorban. */
export const formatEurosRedondos = (valor: number): string => eurosRedondos.format(valor);

/** "30/10/2026" */
export const formatFecha = (fecha: string | Date): string => format(new Date(fecha), "dd/MM/yyyy");

/** "30/10/2026 14:05" */
export const formatFechaHora = (fecha: string | Date): string =>
  format(new Date(fecha), "dd/MM/yyyy HH:mm");
