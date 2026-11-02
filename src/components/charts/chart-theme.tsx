import React from "react";

/**
 * Estilo común de los gráficos de Gastos. Todo sale de los tokens del tema,
 * así que en modo oscuro la rejilla, los ejes y la etiqueta flotante cambian
 * solos en lugar de quedarse blancos.
 */

/** Colores por serie, en orden. Para "Otros" se usa chartOtherColor. */
export const chartColors = [1, 2, 3, 4, 5].map((n) => `hsl(var(--chart-${n}))`);
export const chartOtherColor = "hsl(var(--chart-6))";
export const chartPrimaryColor = chartColors[0];

export const chartGridProps = {
  strokeDasharray: "3 3",
  stroke: "hsl(var(--border))",
};

export const chartAxisProps = {
  stroke: "hsl(var(--border))",
  tick: { fill: "hsl(var(--muted-foreground))", fontSize: 12 },
  tickLine: false,
};

/** Franja que marca la barra bajo el ratón. */
export const chartCursor = { fill: "hsl(var(--muted))", opacity: 0.6 };

interface ChartTooltipBoxProps {
  titulo: React.ReactNode;
  filas: { etiqueta: string; valor: string }[];
}

export const ChartTooltipBox: React.FC<ChartTooltipBoxProps> = ({ titulo, filas }) => (
  <div className="rounded-md border bg-popover p-2 text-sm text-popover-foreground shadow-md">
    <p className="font-semibold">{titulo}</p>
    {filas.map((fila) => (
      <p key={fila.etiqueta} className="text-muted-foreground">
        {fila.etiqueta}: <span className="font-semibold text-foreground">{fila.valor}</span>
      </p>
    ))}
  </div>
);
