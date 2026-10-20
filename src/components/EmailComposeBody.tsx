import React from "react";
import { cn } from "@/lib/utils";
import {
  extraerBloques,
  marcaDeBloque,
  type BloquesCorreo,
  type TipoBloque,
} from "@/utils/email-dialog-blocks";

export type { BloquesCorreo };

interface EmailComposeBodyProps {
  /** HTML completo del correo (con tablas data-bloque). */
  initialHtml: string;
  disabled?: boolean;
  onReady?: (api: { getHtml: () => string }) => void;
  className?: string;
}

/** Inserta las tablas/cajas con datos en el HTML listo para el editor. */
function montarHtmlEditable(html: string): string {
  const { html: conMarcas, bloques } = extraerBloques(html || "");
  let montado = conMarcas;
  for (const tipo of Object.keys(bloques) as TipoBloque[]) {
    const bloque = bloques[tipo];
    if (!bloque) continue;
    const marca = marcaDeBloque(tipo);
    const marcaEsc = marca.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const enParrafo = new RegExp(
      `<p[^>]*>\\s*(?:<[^>]+>)*${marcaEsc}(?:</[^>]+>)*\\s*</p>`,
      "g"
    );
    montado = montado.replace(enParrafo, () => bloque).split(marca).join(bloque);
  }
  return montado;
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
 * Lienzo único del correo. Todo el texto (incluido el de tablas y cajas) se
 * puede editar; al enviar se manda el HTML tal cual queda.
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
    el.innerHTML = montarHtmlEditable(initialHtml);
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
          "min-h-[280px] max-h-[min(60vh,520px)] overflow-y-auto px-6 py-5 text-[15px] leading-relaxed outline-none",
          "[&_p]:my-2 [&_table]:my-3 [&_table]:w-full",
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/25",
          disabled && "pointer-events-none opacity-60"
        )}
      />
      <p className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        Puedes editar todo el texto, también el de las tablas y cajas. Se enviará tal como lo
        dejes.
      </p>
    </div>
  );
};

export default EmailComposeBody;
