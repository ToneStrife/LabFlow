import React from 'react';
import { formatEuros } from "@/lib/format";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, TooltipProps } from 'recharts';
import { ChartData } from '@/hooks/use-expenditure-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChartTooltipBox, chartColors, chartOtherColor } from './chart-theme';

interface SpendingByVendorChartProps {
  data: ChartData[];
}

// Componente de Tooltip personalizado
const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = (data.percent * 100).toFixed(1);
    return (
      <ChartTooltipBox
        titulo={data.name}
        filas={[
          { etiqueta: "Gasto", valor: formatEuros(data.value) },
          { etiqueta: "Porcentaje", valor: `${percentage}%` },
        ]}
      />
    );
  }
  return null;
};

const SpendingByVendorChart: React.FC<SpendingByVendorChartProps> = ({ data }) => {
  const isMobile = useIsMobile();

  // Mostrar solo el top 5 para el gráfico de pastel, el resto se agrupa
  const topData = data.slice(0, 5);
  const otherTotal = data.slice(5).reduce((sum, entry) => sum + entry.value, 0);

  const chartData = otherTotal > 0
    ? [...topData, { id: 'other', name: 'Otros', value: otherTotal }]
    : topData;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Distribución por proveedor</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] p-2">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No hay datos de gastos por proveedor.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={isMobile ? 80 : 100}
                stroke="hsl(var(--card))"
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.id === 'other' ? chartOtherColor : chartColors[index % chartColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              {/* En el móvil la leyenda va debajo: a la derecha le quitaba medio ancho al gráfico. */}
              <Legend
                layout={isMobile ? "horizontal" : "vertical"}
                verticalAlign={isMobile ? "bottom" : "middle"}
                align={isMobile ? "center" : "right"}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value) => <span className="text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SpendingByVendorChart;
