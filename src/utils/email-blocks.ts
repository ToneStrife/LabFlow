import { SupabaseRequestItem } from "@/data/types";

/**
 * Bloques visuales de los correos.
 *
 * Viven en código (no en el cuerpo de la plantilla) para que el Admin pueda
 * editar el texto con marcadores simples ({{items_table}}, etc.) y el HTML
 * con tablas/estilos se genere al montar el correo. Cada bloque es exactamente
 * UNA <table> con atributo data-bloque (ver email-dialog-blocks.ts).
 *
 * Estilos siempre en línea: Gmail y Outlook descartan <style> y las clases.
 */

export type VarianteTabla = "claro" | "oscuro";

export type TipoBloque =
  | "items"
  | "billing"
  | "billing_address"
  | "shipping"
  | "project"
  | "warning";

const BORDE = "#d4d4d4";
const TIPO = "Arial, Helvetica, sans-serif";
/** Separación vertical entre un bloque y el texto que tiene alrededor. */
const MARGEN = "margin:14px 0 18px 0;";

const escapar = (valor: string | number | null | undefined): string =>
  String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Abre la <table> de un bloque con su tipo y los atributos comunes. */
const abrirBloque = (tipo: TipoBloque, estilo: string): string =>
  `<table data-bloque="${tipo}" role="presentation" cellspacing="0" cellpadding="0" ` +
  `style="${estilo}">`;

/**
 * Tabla de artículos. La variante oscura (cabecera negra) es la del CÓMPRAME
 * interno; la clara, la del presupuesto que ve el proveedor.
 */
export const buildItemsTableHtml = (
  items: SupabaseRequestItem[] | null | undefined,
  variante: VarianteTabla = "claro"
): string => {
  const fondoCabecera = variante === "oscuro" ? "#2b2b2b" : "#f2f2f2";
  const textoCabecera = variante === "oscuro" ? "#ffffff" : "#1a1a1a";

  const th = (texto: string, alineacion: "left" | "center", ancho?: string) =>
    `<th style="padding:10px 14px;border:1px solid ${BORDE};background:${fondoCabecera};` +
    `color:${textoCabecera};font-size:13px;font-weight:bold;letter-spacing:.04em;` +
    `text-align:${alineacion};${ancho ? `width:${ancho};` : ""}">${texto}</th>`;

  const td = (texto: string, alineacion: "left" | "center") =>
    `<td style="padding:10px 14px;border:1px solid ${BORDE};font-size:14px;` +
    `color:#1a1a1a;text-align:${alineacion};">${texto}</td>`;

  const filas =
    !items || items.length === 0
      ? `<tr>${td("No hay artículos.", "left").replace("<td ", '<td colspan="3" ')}</tr>`
      : items
          .map(
            (item) =>
              "<tr>" +
              td(escapar(item.product_name), "left") +
              td(escapar(item.catalog_number), "center") +
              td(escapar(item.quantity), "center") +
              "</tr>"
          )
          .join("");

  return (
    abrirBloque(
      "items",
      `width:100%;border-collapse:collapse;${MARGEN}font-family:${TIPO};`
    ) +
    `<thead><tr>${th("PRODUCTO", "left")}${th("REFERENCIA", "center", "32%")}${th("CANT.", "center", "10%")}</tr></thead>` +
    `<tbody>${filas}</tbody>` +
    "</table>"
  );
};

const linea = (etiqueta: string, valor: string | null | undefined) =>
  `<p style="margin:0 0 6px 0;font-size:14px;color:#1a1a1a;">` +
  `<strong>${etiqueta}:</strong> ${escapar(valor && valor.trim() ? valor : "N/A")}</p>`;

/** Caja de datos de facturación del correo de presupuesto. */
export const buildBillingBoxHtml = (datos: {
  investigador?: string | null;
  proyecto?: string | null;
  entidad?: string | null;
  cif?: string | null;
}): string =>
  abrirBloque("billing", `width:100%;${MARGEN}`) +
  `<tr><td style="border:1px solid ${BORDE};padding:16px 18px;font-family:${TIPO};">` +
  '<p style="margin:0 0 12px 0;font-size:13px;font-weight:bold;letter-spacing:.04em;' +
  'color:#c0392b;">DATOS DE FACTURACIÓN:</p>' +
  '<hr style="border:0;border-top:1px solid #e8e8e8;margin:0 0 12px 0;">' +
  linea("Investigador", datos.investigador) +
  linea("Proyecto/Ref", datos.proyecto) +
  linea("Entidad", datos.entidad) +
  linea("CIF", datos.cif) +
  "</td></tr></table>";

const cuerpoDireccionHtml = (direccion: string | null | undefined): string => {
  const lineas = String(direccion ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lineas.length) {
    return '<p style="margin:0;font-size:14px;color:#1a1a1a;">N/A</p>';
  }
  return lineas
    .map(
      (l, i) =>
        `<p style="margin:0 0 ${i === lineas.length - 1 ? 0 : 4}px 0;` +
        `font-size:14px;color:#1a1a1a;">${escapar(l)}</p>`
    )
    .join("");
};

/** Dirección de envío, con el filete azul a la izquierda. El título va dentro de la tabla. */
export const buildShippingBoxHtml = (direccion: string | null | undefined): string =>
  abrirBloque("shipping", `${MARGEN}font-family:${TIPO};`) +
  '<tr><td style="padding:0 0 10px 0;font-size:13px;font-weight:bold;letter-spacing:.04em;' +
  'color:#1a1a1a;">DIRECCIÓN DE ENVÍO:</td></tr>' +
  '<tr><td style="border-left:3px solid #9bb4cc;padding:2px 0 2px 14px;">' +
  cuerpoDireccionHtml(direccion) +
  "</td></tr></table>";

/**
 * Dirección de facturación (calle/ciudad). Sin data-bloque: en el mismo correo
 * ya puede ir {{billing_box}} (datos fiscales) y no deben chocar.
 */
export const buildBillingAddressBoxHtml = (direccion: string | null | undefined): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${MARGEN}font-family:${TIPO};">` +
  '<tr><td style="padding:0 0 10px 0;font-size:13px;font-weight:bold;letter-spacing:.04em;' +
  'color:#1a1a1a;">DIRECCIÓN DE FACTURACIÓN:</td></tr>' +
  '<tr><td style="border-left:3px solid #c0392b;padding:2px 0 2px 14px;">' +
  cuerpoDireccionHtml(direccion) +
  "</td></tr></table>";

/** Caja de investigador, proyecto y entidad del CÓMPRAME. */
export const buildProjectBoxHtml = (datos: {
  investigador?: string | null;
  proyecto?: string | null;
  entidad?: string | null;
}): string =>
  abrirBloque("project", `width:100%;${MARGEN}`) +
  '<tr><td style="border-left:4px solid #2f5f98;background:#f1f5fa;padding:16px 18px;' +
  `font-family:${TIPO};">` +
  linea("Investigador", datos.investigador) +
  linea("Proyecto", datos.proyecto) +
  linea("Entidad", datos.entidad) +
  "</td></tr></table>";

/** Aviso de no escribir al proveedor. */
export const buildWarningBoxHtml = (): string =>
  abrirBloque("warning", `width:100%;${MARGEN}`) +
  '<tr><td style="background:#fdf6e3;border:1px solid #f0e2b6;padding:14px 18px;' +
  `font-family:${TIPO};font-size:14px;color:#7a5c00;">` +
  "<strong>⚠️ NOTA IMPORTANTE:</strong> No se debe enviar correo a la empresa proveedora, " +
  "para evitar pedidos duplicados." +
  "</td></tr></table>";

// El envío genera una versión sin HTML; si no sustituimos aquí, los marcadores
// saldrían literales en los clientes que leen solo texto.

export const buildBillingBoxPlainText = (datos: {
  investigador?: string | null;
  proyecto?: string | null;
  entidad?: string | null;
  cif?: string | null;
}): string =>
  [
    "DATOS DE FACTURACIÓN:",
    "",
    `Investigador: ${datos.investigador?.trim() || "N/A"}`,
    `Proyecto/Ref: ${datos.proyecto?.trim() || "N/A"}`,
    `Entidad: ${datos.entidad?.trim() || "N/A"}`,
    `CIF: ${datos.cif?.trim() || "N/A"}`,
  ].join("\n");

export const buildShippingBoxPlainText = (direccion: string | null | undefined): string =>
  ["DIRECCIÓN DE ENVÍO:", "", String(direccion ?? "").trim() || "N/A"].join("\n");

export const buildBillingAddressBoxPlainText = (direccion: string | null | undefined): string =>
  ["DIRECCIÓN DE FACTURACIÓN:", "", String(direccion ?? "").trim() || "N/A"].join("\n");

export const buildProjectBoxPlainText = (datos: {
  investigador?: string | null;
  proyecto?: string | null;
  entidad?: string | null;
}): string =>
  [
    `Investigador: ${datos.investigador?.trim() || "N/A"}`,
    `Proyecto: ${datos.proyecto?.trim() || "N/A"}`,
    `Entidad: ${datos.entidad?.trim() || "N/A"}`,
  ].join("\n");

export const buildWarningBoxPlainText = (): string =>
  "NOTA IMPORTANTE: No se debe enviar correo a la empresa proveedora, para evitar pedidos duplicados.";
