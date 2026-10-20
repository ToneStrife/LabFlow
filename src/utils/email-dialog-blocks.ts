import type { TipoBloque } from "@/utils/email-blocks";

export type { TipoBloque };

/**
 * El diálogo de envío edita el cuerpo con ReactQuill, que no conoce <table> ni
 * estilos en línea: al cargar el HTML los aplasta (la tabla se convierte en
 * "PRODUCTOREFERENCIACANT.") y además reescribe el valor aunque nadie toque nada.
 *
 * Los bloques de email-blocks.ts no pasan por Quill: en el diálogo se muestran
 * como vista previa con los datos reales, y el texto libre se edita aparte.
 * Al enviar se vuelve a montar el HTML completo.
 */

const ETIQUETAS: Record<TipoBloque, string> = {
  items: "tabla de artículos",
  billing: "datos de facturación",
  shipping: "dirección de envío",
  project: "datos del proyecto",
  warning: "aviso",
};

export type BloquesCorreo = Partial<Record<TipoBloque, string>>;

export type SegmentoCorreo =
  | { kind: "text"; html: string }
  | { kind: "block"; tipo: TipoBloque; html: string; incluido: boolean };

export const marcaDeBloque = (tipo: TipoBloque): string => `[[${ETIQUETAS[tipo]}]]`;

export const etiquetaDeBloque = (tipo: TipoBloque): string => ETIQUETAS[tipo];

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
 * Parte el cuerpo en texto editable y bloques con diseño (con datos ya
 * rellenados). El orden se conserva para montar el correo al enviar.
 */
export const segmentarCuerpoCorreo = (htmlOriginal: string): SegmentoCorreo[] => {
  const { html: conMarcas, bloques } = extraerBloques(htmlOriginal || "");
  if (Object.keys(bloques).length === 0) {
    return [{ kind: "text", html: htmlOriginal || "" }];
  }

  const segmentos: SegmentoCorreo[] = [];
  const tipos = Object.keys(bloques) as TipoBloque[];
  const marcasAlternadas = tipos.map((tipo) => escaparRegExp(marcaDeBloque(tipo))).join("|");
  const regexMarca = new RegExp(
    `<p[^>]*>\\s*(?:<[^>]+>)*(${marcasAlternadas})(?:</[^>]+>)*\\s*</p>`,
    "gi"
  );

  let ultimoFin = 0;
  let match: RegExpExecArray | null;
  while ((match = regexMarca.exec(conMarcas)) !== null) {
    const textoAntes = conMarcas.slice(ultimoFin, match.index);
    if (textoAntes.trim()) {
      segmentos.push({ kind: "text", html: textoAntes });
    }
    const marca = match[1];
    const tipo = tipos.find((t) => marcaDeBloque(t) === marca);
    if (tipo && bloques[tipo]) {
      segmentos.push({
        kind: "block",
        tipo,
        html: bloques[tipo] as string,
        incluido: true,
      });
    }
    ultimoFin = match.index + match[0].length;
  }

  const textoFinal = conMarcas.slice(ultimoFin);
  if (textoFinal.trim() || segmentos.length === 0) {
    segmentos.push({ kind: "text", html: textoFinal });
  }

  // Si no se encontró ninguna marca en párrafos, mantener un solo texto + bloques al final.
  if (!segmentos.some((s) => s.kind === "block")) {
    const soloTexto: SegmentoCorreo[] = [{ kind: "text", html: conMarcas }];
    for (const tipo of tipos) {
      soloTexto.push({
        kind: "block",
        tipo,
        html: bloques[tipo] as string,
        incluido: true,
      });
    }
    return soloTexto;
  }

  return segmentos;
};

/** Une segmentos (texto + bloques incluidos) al HTML final del correo. */
export const montarCuerpoDesdeSegmentos = (segmentos: SegmentoCorreo[]): string => {
  const partes: string[] = [];
  const bloques: BloquesCorreo = {};

  for (const seg of segmentos) {
    if (seg.kind === "text") {
      partes.push(seg.html);
    } else if (seg.incluido) {
      const marca = marcaDeBloque(seg.tipo);
      partes.push(`<p>${marca}</p>`);
      bloques[seg.tipo] = seg.html;
    }
  }

  return restaurarBloques(partes.join(""), bloques);
};

/**
 * Devuelve cada marca a su bloque. Si el usuario borró una marca, ese bloque no
 * se envía. Si hubo bloques, además se ajusta el espaciado: Quill produce <p>
 * sin estilo y párrafos vacíos, y los clientes de correo les ponen un margen
 * grande que abre huecos entre líneas.
 */
export const restaurarBloques = (html: string, bloques: BloquesCorreo): string => {
  const tipos = Object.keys(bloques) as TipoBloque[];
  if (tipos.length === 0) {
    return (
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a;">' +
      html
        .replace(/<p><br\s*\/?><\/p>/g, "")
        .replace(/<p>/g, '<p style="margin:0 0 12px 0;">') +
      "</div>"
    );
  }

  let resultado = html;
  for (const tipo of tipos) {
    const bloque = bloques[tipo] as string;
    const marca = escaparRegExp(marcaDeBloque(tipo));
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
