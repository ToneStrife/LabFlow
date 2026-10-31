import React from "react";
import { formatFecha } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Paperclip, PlusCircle, Trash2 } from "lucide-react";
import { useInvoices, useDeleteInvoice } from "@/hooks/use-invoices";
import { generateSignedUrl } from "@/utils/supabase-storage";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

interface InvoicesListProps {
  requestId: string;
  onOpenInvoiceDialog: () => void;
}

const InvoicesList: React.FC<InvoicesListProps> = ({ requestId, onOpenInvoiceDialog }) => {
  const { data: invoices, isLoading } = useInvoices(requestId);
  const deleteInvoiceMutation = useDeleteInvoice();
  const [isGenerating, setIsGenerating] = React.useState<string | null>(null);
  const [facturaABorrar, setFacturaABorrar] = React.useState<string | null>(null);
  const numeroABorrar = invoices?.find((inv) => inv.id === facturaABorrar)?.invoice_number;

  const handleViewClick = async (filePath: string) => {
    setIsGenerating(filePath);
    const signedUrl = await generateSignedUrl(filePath);
    setIsGenerating(null);
    if (signedUrl) window.open(signedUrl, '_blank');
  };

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-5 w-5" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Facturas</CardTitle>
        <Button variant="outline" size="sm" onClick={onOpenInvoiceDialog} className="w-full sm:w-auto shrink-0">
          <PlusCircle className="mr-2 h-4 w-4" /> Registrar factura
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {invoices && invoices.length > 0 ? (
          <div className="divide-y">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-2 p-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">Factura: {inv.invoice_number}</span>
                  <span className="text-xs text-muted-foreground">{formatFecha(inv.invoiced_at)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {inv.invoice_url && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => handleViewClick(inv.invoice_url!)} 
                      disabled={isGenerating === inv.invoice_url}
                      className="text-xs text-blue-600 dark:text-blue-400"
                    >
                      {isGenerating === inv.invoice_url ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3 mr-1" />}
                      Ver PDF
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setFacturaABorrar(inv.id)} title="Eliminar factura" aria-label="Eliminar factura" className="text-red-500 dark:text-red-400 h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4 text-sm">No hay facturas registradas.</p>
        )}
      </CardContent>
      <ConfirmDialog
        open={Boolean(facturaABorrar)}
        onOpenChange={(abierto) => !abierto && setFacturaABorrar(null)}
        title={`Eliminar la factura ${numeroABorrar ?? ""}`.trim()}
        description="Los artículos que cubría vuelven a quedar pendientes de facturar."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (facturaABorrar) deleteInvoiceMutation.mutate(facturaABorrar, { onSettled: () => setFacturaABorrar(null) });
        }}
        isPending={deleteInvoiceMutation.isPending}
      />
    </Card>
  );
};

export default InvoicesList;