"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  extraerBloques,
  marcaDeBloque,
  type BloquesCorreo,
  type TipoBloque,
} from "@/utils/email-dialog-blocks";

// Re-export tipo for callers that need it via this module.
export type { BloquesCorreo };

interface EmailComposeBodyProps {
  /** HTML completo del correo (con tablas data-bloque). */
  initialHtml: string;
  disabled?: boolean;
  onReady?: (api: { getHtml: () => string }) => void;
  className?: string;
}

function protegerBloquesEnDom(html: string): { html: string; bloques: BloquesCorreo } {
  const { html: conMarcas, bloques } = extraerBloques(html || "");
  let montado = conMarcas;
  for (const tipo of Object.keys(bloques) as TipoBloque[]) {
    const bloque = bloques[tipo];
    if (!bloque) continue;
    const marca = marcaDeBloque(tipo);
    const protegido = bloque.replace(/<table\b/i, '<table contenteditable="false" ');
    const enParrafo = new RegExp(
      `<p[^>]*>\\s*(?:<[^>]+>)*${marca.replace(/[[\]]/g, "\\$&")}(?:</[^>]+>)*\\s*</p>`,
      "g"
    );
    montado = montado.replace(enParrafo, () => protegido).replaceAll(marca, protegido);
  }
  return { html: montado, bloques };
}

function htmlListoParaEnviar(raw: string): string {
  const limpio = raw
    .replace(/\scontenteditable="[^"]*"/gi, "")
    .replace(/<p><br\s*\/?><\/p>/gi, "")
    .replace(/<p>/gi, '<p style="margin:0 0 12px 0;">');
  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a;">' +
    limpio +
    "</div>"
  );
}

/**
 * Un solo lienzo de correo: texto editable + tablas/cajas con datos (no editables).
 * Así se ve el mensaje como lo recibirá el destinatario, sin recuadros sueltos.
 */
const EmailComposeBody: React.FC<EmailComposeBodyProps> = ({
  initialHtml,
  disabled = false,
  onReady,
  className,
}) => {
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const { html } = protegerBloquesEnDom(initialHtml);
    el.innerHTML = html;
    el.querySelectorAll("table[data-bloque]").forEach((table) => {
      table.setAttribute("contenteditable", "false");
    });
  }, [initialHtml]);

  React.useEffect(() => {
    onReady?.({
      getHtml: () => {
        const el = rootRef.current;
        if (!el) return "";
        const clone = el.cloneNode(true) as HTMLElement;
        return htmlListoParaEnviar(clone.innerHTML);
      },
    });
  }, [onReady, initialHtml]);

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-background shadow-sm", className)}>
      <div
        ref={rootRef}
        role="textbox"
        aria-multiline="true"
        aria-label="Cuerpo del correo"
        contentEditable={!disabled}
        suppressContentEditableWarning
        className={cn(
          "min-h-[240px] max-h-[440px] overflow-y-auto px-5 py-4 text-[14px] leading-relaxed outline-none",
          "[&_p]:my-2 [&_table]:my-3 [&_table]:w-full",
          "[&_table[data-bloque]]:cursor-default [&_table[data-bloque]]:select-text",
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/25",
          disabled && "pointer-events-none opacity-60"
        )}
        onMouseDown={(e) => {
          const t = e.target as HTMLElement;
          if (t.closest("table[data-bloque]")) {
            // Permitir selección/copia, no el caret de edición dentro de la tabla.
          }
        }}
      />
      <p className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        Edita el texto libremente. Las tablas y cajas de datos van fijas (como las verá quien
        reciba el correo).
      </p>
    </div>
  );
};

export default EmailComposeBody;
