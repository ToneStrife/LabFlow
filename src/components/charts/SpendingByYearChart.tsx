import React from 'react';
import { formatEuros, formatEurosRedondos } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartData } from '@/hooks/use-expenditure-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltipBox, chartAxisProps, chartCursor, chartGridProps, chartPrimaryColor } from './chart-theme';

interface SpendingByYearChartProps {
  data: ChartData[];
}

// Componente de Tooltip personalizado
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return <ChartTooltipBox titulo={`Año ${label}`} filas={[{ etiqueta: "Gasto", valor: formatEuros(payload[0].value) }]} />;
  }
  return null;
};

const SpendingByYearChart: React.FC<SpendingByYearChartProps> = ({ data }) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Gasto total por año</CardTitle>
      </CardHeader>
      <CardContent className="h-[350px] p-2">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No hay datos de gastos históricos.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid {...chartGridProps} vertical={false} />
              <XAxis dataKey="name" {...chartAxisProps} />
              <YAxis tickFormatter={(value) => formatEurosRedondos(value)} {...chartAxisProps} />
              <Tooltip content={<CustomTooltip />} cursor={chartCursor} />
              <Bar dataKey="value" name="Gasto" fill={chartPrimaryColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SpendingByYearChart;
