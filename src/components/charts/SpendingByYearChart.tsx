"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartData } from '@/hooks/use-expenditure-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SpendingByYearChartProps {
  data: ChartData[];
}

// Componente de Tooltip personalizado
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-white border rounded-md shadow-lg text-sm">
        <p className="font-bold">Año: {label}</p>
        <p className="text-muted-foreground">Gasto: <span className="font-semibold text-red-600">€{payload[0].value.toFixed(2)}</span></p>
      </div>
    );
  }
  return null;
};

const SpendingByYearChart: React.FC<SpendingByYearChartProps> = ({ data }) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Gasto Total por Año</CardTitle>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `€${value.toFixed(0)}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Gasto" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SpendingByYearChart;