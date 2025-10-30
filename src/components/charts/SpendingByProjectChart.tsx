"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartData } from '@/hooks/use-expenditure-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SpendingByProjectChartProps {
  data: ChartData[];
}

// Colores para las barras (usando tonos de azul/verde)
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#8dd1e1'];

// Componente de Tooltip personalizado
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-white border rounded-md shadow-lg text-sm">
        <p className="font-bold">{label}</p>
        <p className="text-muted-foreground">Gasto: <span className="font-semibold text-red-600">€{payload[0].value.toFixed(2)}</span></p>
      </div>
    );
  }
  return null;
};

const SpendingByProjectChart: React.FC<SpendingByProjectChartProps> = ({ data }) => {
  // Mostrar solo el top 10
  const chartData = data.slice(0, 10);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Gasto por Proyecto (Top 10)</CardTitle>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={(value) => `€${value.toFixed(0)}`} />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SpendingByProjectChart;