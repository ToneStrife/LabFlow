import React from 'react';
import { Expenditure, Project, Vendor, SupabaseRequest } from '@/data/types';

// Tipos de datos para los gráficos
export interface ChartData {
  name: string;
  value: number;
  id: string;
}

export interface ExpenditureAnalytics {
  totalSpent: number;
  spendingByProject: ChartData[];
  spendingByVendor: ChartData[];
  spendingByYear: ChartData[]; // Nuevo campo
}

/**
 * Hook para calcular métricas de gastos y datos para gráficos.
 * @param expenditures Lista de gastos.
 * @param projects Lista de proyectos.
 * @param vendors Lista de proveedores.
 * @param requests Lista de solicitudes (necesaria para vincular gastos a proveedores).
 */
export const useExpenditureAnalytics = (
  expenditures: Expenditure[] | undefined,
  projects: Project[] | undefined,
  vendors: Vendor[] | undefined,
  requests: SupabaseRequest[] | undefined
): { analytics: ExpenditureAnalytics; isLoading: boolean } => {
  
  const isLoading = !expenditures || !projects || !vendors || !requests;

  const analytics = React.useMemo(() => {
    if (isLoading) {
      return {
        totalSpent: 0,
        spendingByProject: [],
        spendingByVendor: [],
        spendingByYear: [],
      };
    }

    const totalSpent = expenditures.reduce((sum, exp) => sum + exp.amount, 0);

    // --- 1. Gasto por Año ---
    const yearMap = new Map<string, number>();
    expenditures.forEach(exp => {
      // Asumiendo que exp.date es una cadena de fecha válida (e.g., 'YYYY-MM-DD')
      const year = new Date(exp.date).getFullYear().toString();
      const currentTotal = yearMap.get(year) || 0;
      yearMap.set(year, currentTotal + exp.amount);
    });

    const spendingByYear: ChartData[] = Array.from(yearMap.entries()).map(([year, value]) => ({
      id: year,
      name: year,
      value,
    })).sort((a, b) => a.name.localeCompare(b.name)); // Ordenar cronológicamente

    // --- 2. Gasto por Proyecto ---
    const projectMap = new Map<string, number>();
    expenditures.forEach(exp => {
      const projectId = exp.project_id || 'unassigned';
      const currentTotal = projectMap.get(projectId) || 0;
      projectMap.set(projectId, currentTotal + exp.amount);
    });

    const spendingByProject: ChartData[] = Array.from(projectMap.entries()).map(([id, value]) => {
      const project = projects.find(p => p.id === id);
      const name = project ? project.code : 'Sin Proyecto';
      return { id, name, value };
    }).sort((a, b) => b.value - a.value); // Ordenar de mayor a menor

    // --- 3. Gasto por Proveedor ---
    const vendorMap = new Map<string, number>();
    
    // Crear un mapa de solicitud a proveedor para búsquedas rápidas
    const requestVendorMap = new Map<string, string>();
    requests.forEach(req => {
      if (req.id && req.vendor_id) {
        requestVendorMap.set(req.id, req.vendor_id);
      }
    });

    expenditures.forEach(exp => {
      let vendorId = 'unlinked'; // Por defecto, si no está vinculado a una solicitud
      
      if (exp.request_id) {
        vendorId = requestVendorMap.get(exp.request_id) || 'unknown_vendor';
      }
      
      const currentTotal = vendorMap.get(vendorId) || 0;
      vendorMap.set(vendorId, currentTotal + exp.amount);
    });

    const spendingByVendor: ChartData[] = Array.from(vendorMap.entries()).map(([id, value]) => {
      let name: string;
      if (id === 'unlinked') {
        name = 'Sin Solicitud';
      } else if (id === 'unknown_vendor') {
        name = 'Proveedor Desconocido';
      } else {
        const vendor = vendors.find(v => v.id === id);
        name = vendor ? vendor.name : 'Proveedor Desconocido';
      }
      return { id, name, value };
    }).sort((a, b) => b.value - a.value); // Ordenar de mayor a menor

    return {
      totalSpent,
      spendingByProject,
      spendingByVendor,
      spendingByYear,
    };
  }, [expenditures, projects, vendors, requests, isLoading]);

  return { analytics, isLoading: isLoading };
};