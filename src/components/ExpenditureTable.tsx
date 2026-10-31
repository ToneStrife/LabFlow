import React from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { Expenditure, Project } from '@/data/types';
import { isValid } from 'date-fns';
import { formatEuros, formatFecha } from '@/lib/format';
import { useIsMobile } from '@/hooks/use-mobile';
import ConfirmDialog from '@/components/ConfirmDialog';

interface ExpenditureTableProps {
  expenditures: Expenditure[];
  projects: Project[] | undefined;
  onEdit: (expenditure: Expenditure) => void;
  onDelete: (id: string) => void | Promise<void>;
}

const ExpenditureTable: React.FC<ExpenditureTableProps> = ({ expenditures, projects, onEdit, onDelete }) => {
  const isMobile = useIsMobile();
  const [aBorrar, setABorrar] = React.useState<Expenditure | null>(null);
  const [borrando, setBorrando] = React.useState(false);

  const getProjectCode = (projectId: string | null) => {
    if (!projectId) return '—';
    return projects?.find(p => p.id === projectId)?.code || 'Desconocido';
  };

  const fecha = (expenditure: Expenditure) =>
    isValid(new Date(expenditure.date_incurred)) ? formatFecha(expenditure.date_incurred) : '—';

  const confirmarBorrado = async () => {
    if (!aBorrar) return;
    setBorrando(true);
    try {
      await onDelete(aBorrar.id);
      setABorrar(null);
    } catch {
      // La mutación ya avisa del error; el diálogo sigue abierto.
    } finally {
      setBorrando(false);
    }
  };

  const botones = (expenditure: Expenditure) => (
    <>
      <Button variant="ghost" size="icon" onClick={() => onEdit(expenditure)} title="Editar gasto" aria-label="Editar gasto">
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setABorrar(expenditure)}
        title="Eliminar gasto"
        aria-label="Eliminar gasto"
        className="text-red-500 dark:text-red-400"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );

  const enlaceSolicitud = (expenditure: Expenditure) =>
    expenditure.request_id ? (
      <Link to={`/requests/${expenditure.request_id}`} className="text-primary hover:underline">
        Ver solicitud
      </Link>
    ) : (
      '—'
    );

  return (
    <div className="border rounded-lg shadow-sm">
      {isMobile ? (
        expenditures.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No hay gastos registrados.</p>
        ) : (
          <ul className="divide-y">
            {expenditures.map((expenditure) => (
              <li key={expenditure.id} className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium text-sm leading-snug">{expenditure.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {fecha(expenditure)} · {getProjectCode(expenditure.project_id)}
                  </p>
                  <p className="text-xs">{enlaceSolicitud(expenditure)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-semibold tabular-nums">{formatEuros(expenditure.amount)}</span>
                  <div className="flex">{botones(expenditure)}</div>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Fecha</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Solicitud</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="text-center w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenditures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No hay gastos registrados.
                  </TableCell>
                </TableRow>
              ) : (
                expenditures.map((expenditure) => (
                  <TableRow key={expenditure.id}>
                    <TableCell className="font-medium">{fecha(expenditure)}</TableCell>
                    <TableCell>{getProjectCode(expenditure.project_id)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{expenditure.description}</TableCell>
                    <TableCell className="text-sm">{enlaceSolicitud(expenditure)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatEuros(expenditure.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">{botones(expenditure)}</div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(aBorrar)}
        onOpenChange={(abierto) => !abierto && setABorrar(null)}
        title="Eliminar gasto"
        description={`Se borra «${aBorrar?.description ?? ''}» (${formatEuros(aBorrar?.amount)}). No se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmarBorrado}
        isPending={borrando}
      />
    </div>
  );
};

export default ExpenditureTable;
