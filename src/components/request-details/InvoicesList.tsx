"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Paperclip, PlusCircle, Trash2 } from "lucide-react";
import { useInvoices, useDeleteInvoice } from "@/hooks/use-invoices";
import { generateSignedUrl } from "@/utils/supabase-storage";
import { toast } from "sonner";
import { format } from "date-fns";

interface InvoicesListProps {
  requestId: string;
  onOpenInvoiceDialog: () => void;
}

const InvoicesList: React.FC<InvoicesListProps> = ({ requestId, onOpenInvoiceDialog }) => {
  const { data: invoices, isLoading } = useInvoices(requestId);
  const deleteInvoiceMutation = useDeleteInvoice();
  const [isGenerating, setIsGenerating] = React.useState<string | null>(null);

  const handleViewClick = async (filePath: string) => {
    setIsGenerating(filePath);
    const signedUrl = await generateSignedUrl(filePath);
    setIsGenerating(null);
    if (signedUrl) window.open(signedUrl, '_blank');
  };

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-5 w-5" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Facturas</CardTitle>
        <Button variant="outline" size="sm" onClick={onOpenInvoiceDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Registrar Factura
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {invoices && invoices.length > 0 ? (
          <div className="divide-y">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">Factura: {inv.invoice_number}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(inv.invoiced_at), 'yyyy-MM-dd')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {inv.invoice_url && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => handleViewClick(inv.invoice_url!)} 
                      disabled={isGenerating === inv.invoice_url}
                      className="text-xs text-blue-600"
                    >
                      {isGenerating === inv.invoice_url ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3 mr-1" />}
                      Ver PDF
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => deleteInvoiceMutation.mutate(inv.id)} className="text-red-500 h-8 w-8">
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
    </Card>
  );
};

export default InvoicesList;