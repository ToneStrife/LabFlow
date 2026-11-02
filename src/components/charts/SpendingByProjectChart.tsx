import React from 'react';
import { formatEuros, formatEurosRedondos } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { ChartData } from '@/hooks/use-expenditure-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltipBox, chartAxisProps, chartCursor, chartGridProps, chartPrimaryColor } from './chart-theme';

interface SpendingByProjectChartProps {
  data: ChartData[];
}

// Componente de Tooltip personalizado
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return <ChartTooltipBox titulo={label} filas={[{ etiqueta: "Gasto", valor: formatEuros(payload[0].value) }]} />;
  }
  return null;
};

const SpendingByProjectChart: React.FC<SpendingByProjectChartProps> = ({ data }) => {
  // Mostrar solo el top 10
  const chartData = data.slice(0, 10);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Gasto por proyecto (top 10)</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] p-2">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No hay datos de gastos por proyecto.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid {...chartGridProps} horizontal={false} />
              <XAxis type="number" tickFormatter={(value) => formatEurosRedondos(value)} {...chartAxisProps} />
              <YAxis dataKey="name" type="category" width={80} {...chartAxisProps} />
              <Tooltip content={<CustomTooltip />} cursor={chartCursor} />
              {/* Un solo color: aquí lo que se compara es la longitud de la barra. */}
              <Bar dataKey="value" fill={chartPrimaryColor} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SpendingByProjectChart;
