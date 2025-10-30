"use client";

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartData } from '@/hooks/use-expenditure-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SpendingByVendorChartProps {
  data: ChartData[];
}

// Colores para las secciones del pastel (usando tonos cálidos/fríos)
const COLORS = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#8dd1e1'];

// Componente de Tooltip personalizado
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = (data.percent * 100).toFixed(1);
    return (
      <div className="p-2 bg-white border rounded-md shadow-lg text-sm">
        <p className="font-bold">{data.name}</p>
        <p className="text-muted-foreground">Gasto: <span className="font-semibold text-red-600">€{data.value.toFixed(2)}</span></p>
        <p className="text-muted-foreground">Porcentaje: <span className="font-semibold">{percentage}%</span></p>
      </div>
    );
  }
  return null;
};

const SpendingByVendorChart: React.FC<SpendingByVendorChartProps> = ({ data }) => {
  // Mostrar solo el top 5 para el gráfico de pastel, el resto se agrupa
  const topData = data.slice(0, 5);
  const otherTotal = data.slice(5).reduce((sum, entry) => sum + entry.value, 0);
  
  const chartData = otherTotal > 0 
    ? [...topData, { id: 'other', name: 'Otros', value: otherTotal }] 
    : topData;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Distribución por Proveedor</CardTitle>
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
                outerRadius={100}
                fill="#8884d8"
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
        )}
      </CardContent>
    </Card>
  );
};

export default SpendingByVendorChart;