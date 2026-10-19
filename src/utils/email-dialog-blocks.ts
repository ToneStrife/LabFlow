import type { TipoBloque } from "@/utils/email-blocks";

/**
 * El diálogo de envío edita el cuerpo con ReactQuill, que no conoce <table> ni
 * estilos en línea: al cargar el HTML los aplasta (la tabla se convierte en
 * "PRODUCTOREFERENCIACANT.") y además reescribe el valor aunque nadie toque nada.
 *
 * Para que el diseño llegue intacto al destinatario, los bloques de
 * email-blocks.ts no pasan por Quill: se sustituyen por una marca de texto
 * ("[[tabla de artículos]]"), el usuario edita el texto de alrededor y, al
 * enviar, cada marca vuelve a ser su bloque original.
 */

const ETIQUETAS: Record<TipoBloque, string> = {
  items: "tabla de artículos",
  billing: "datos de facturación",
  shipping: "dirección de envío",
  project: "datos del proyecto",
  warning: "aviso",
};

export type BloquesCorreo = Partial<Record<TipoBloque, string>>;

export const marcaDeBloque = (tipo: TipoBloque): string => `[[${ETIQUETAS[tipo]}]]`;

/** Cada bloque es exactamente una <table> con data-bloque (ver email-blocks.ts). */
const REGEX_BLOQUE =
  /<table\b[^>]*\sdata-bloque="(items|billing|shipping|project|warning)"[^>]*>[\s\S]*?<\/table>/g;

const escaparRegExp = (texto: string): string => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Saca los bloques del HTML y deja en su lugar una marca de texto en su propio párrafo. */
export const extraerBloques = (html: string): { html: string; bloques: BloquesCorreo } => {
  const bloques: BloquesCorreo = {};
  const sinBloques = html.replace(REGEX_BLOQUE, (completo, tipo: TipoBloque) => {
    if (bloques[tipo] === undefined) bloques[tipo] = completo;
    return `<p>${marcaDeBloque(tipo)}</p>`;
  });
  return { html: sinBloques, bloques };
};

/**
 * Devuelve cada marca a su bloque. Si el usuario borró una marca, ese bloque no
 * se envía. Si hubo bloques, además se ajusta el espaciado: Quill produce <p>
 * sin estilo y párrafos vacíos, y los clientes de correo les ponen un margen
 * grande que abre huecos entre líneas.
 */
export const restaurarBloques = (html: string, bloques: BloquesCorreo): string => {
  const tipos = Object.keys(bloques) as TipoBloque[];
  if (tipos.length === 0) return html;

  let resultado = html;
  for (const tipo of tipos) {
    const bloque = bloques[tipo] as string;
    const marca = escaparRegExp(marcaDeBloque(tipo));
    // La marca suele venir sola en un <p>; si el usuario la movió dentro de otro
    // elemento, se sustituye solo el texto.
    const enParrafo = new RegExp(`<p[^>]*>\\s*(?:<[^>]+>)*${marca}(?:</[^>]+>)*\\s*</p>`, "g");
    resultado = resultado
      .replace(enParrafo, () => bloque)
      .replace(new RegExp(marca, "g"), () => bloque);
  }

  resultado = resultado
    .replace(/<p><br\s*\/?><\/p>/g, "")
    .replace(/<p>/g, '<p style="margin:0 0 12px 0;">');

  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a;">' +
    resultado +
    "</div>"
  );
};
