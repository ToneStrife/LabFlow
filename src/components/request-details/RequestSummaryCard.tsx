"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SupabaseRequest, RequestStatus, Address, Vendor, Profile, AccountManager, Project } from "@/data/types"; // Corrected imports
import { useAccountManagers } from "@/hooks/use-account-managers"; // Usar el nuevo hook
import { useProjects } from "@/hooks/use-projects"; // Usar el nuevo hook
import { useShippingAddresses, useBillingAddresses } from "@/hooks/use-addresses"; // Importar hooks de direcciones
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Edit, Loader2 } from "lucide-react";
import { generateSignedUrl } from "@/utils/supabase-storage"; // Importar utilidad
import { getFullName } from "@/hooks/use-profiles"; // Importar getFullName
import { toast } from "sonner"; // Importar toast

interface RequestSummaryCardProps {
  request: SupabaseRequest;
  vendor?: Vendor;
  profiles?: Profile[];
  onEditDetails: () => void; // Nuevo prop para manejar la edición
  isEditable: boolean; // Nuevo prop para controlar si se puede editar
}

const getStatusBadgeVariant = (status: RequestStatus) => {
  switch (status) {
    case "Pending":
      return "secondary";
    case "Quote Requested":
      return "outline";
    case "PO Requested":
      return "destructive";
    case "Ordered":
      return "default";
    case "Received":
      return "success"; // Now 'success' is a valid variant
    default:
      return "secondary";
  }
};

const formatAddress = (address: Address | undefined) => {
  if (!address) return "N/A";
  return (
    <div className="text-sm">
      <p className="font-medium">{address.name}</p>
      <p>{address.address_line_1}</p>
      {address.address_line_2 && <p>{address.address_line_2}</p>}
      <p>{address.city}, {address.state} {address.zip_code}</p>
      <p>{address.country}</p>
    </div>
  );
};

const RequestSummaryCard: React.FC<RequestSummaryCardProps> = ({ request, vendor, profiles, onEditDetails, isEditable }) => {
  const { data: accountManagers } = useAccountManagers(); // Usar el nuevo hook
  const { data: projects } = useProjects(); // Usar el nuevo hook
  const { data: shippingAddresses } = useShippingAddresses();
  const { data: billingAddresses } = useBillingAddresses();
  const [isGeneratingQuoteUrl, setIsGeneratingQuoteUrl] = React.useState(false);

  const getRequesterName = (requesterId: string) => {
    const profile = profiles?.find(p => p.id === requesterId);
    return getFullName(profile);
  };

  const getAccountManagerName = (managerId: string | null) => {
    if (!managerId) return "N/A";
    const manager = accountManagers?.find(am => am.id === managerId); // Buscar en la nueva lista de Account Managers
    return manager ? `${manager.first_name} ${manager.last_name}` : "N/A";
  };

  const handleViewQuote = async () => {
    if (!request.quote_url) return;
    setIsGeneratingQuoteUrl(true);
    const signedUrl = await generateSignedUrl(request.quote_url);
    setIsGeneratingQuoteUrl(false);

    if (signedUrl) {
      window.open(signedUrl, '_blank');
    } else {
      // Fallback toast in case generateSignedUrl failed but didn't show a toast (or if the user missed it)
      toast.error("No se pudo generar la URL firmada para la cotización.");
    }
  };

  const requesterName = getRequesterName(request.requester_id);
  const accountManagerName = getAccountManagerName(request.account_manager_id);

  const projectCodesDisplay = request.project_codes?.map(projectId => {
    const project = projects?.find(p => p.id === projectId); // Buscar en la nueva lista de Proyectos
    return project ? project.code : projectId;
  }).join(", ") || "N/A";

  const dateSubmitted = format(new Date(request.created_at), 'yyyy-MM-dd HH:mm');
  
  const shippingAddress = shippingAddresses?.find(a => a.id === request.shipping_address_id);
  const billingAddress = billingAddresses?.find(a => a.id === request.billing_address_id);
  
  const displayRequestNumber = request.request_number || `ID: ${request.id.substring(0, 8)}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-xl sm:text-2xl font-bold flex flex-col items-start">
          <span className="text-base font-semibold text-muted-foreground">Solicitud {displayRequestNumber}</span>
          <span>{vendor?.name || "N/A"}</span>
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
          {isEditable && (
            <Button variant="outline" size="icon" onClick={onEditDetails} title="Editar Detalles de la Solicitud">
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Solicitante</p>
            <p className="font-medium">{requesterName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gerente de Cuenta</p>
            <p className="font-medium">{accountManagerName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Códigos de Proyecto</p>
            <p className="font-medium">{projectCodesDisplay}</p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Dirección de Envío</p>
            {formatAddress(shippingAddress)}
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Dirección de Facturación</p>
            {formatAddress(billingAddress)}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Fecha de Envío</p>
            <p className="font-medium">{dateSubmitted}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Detalles de Cotización</p>
            <p className="font-medium">
              {request.quote_url ? (
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={handleViewQuote} 
                  disabled={isGeneratingQuoteUrl}
                  className="p-0 h-auto text-blue-500"
                >
                  {isGeneratingQuoteUrl ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    "Ver Cotización"
                  )}
                </Button>
              ) : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Número de PO</p>
            <p className="font-medium">{request.po_number || "N/A"}</p>
          </div>
        </div>

        {request.notes && (
          <>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Notas</p>
              <p className="text-sm italic text-gray-700">{request.notes}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RequestSummaryCard;