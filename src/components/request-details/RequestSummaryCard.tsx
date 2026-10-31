import React from "react";
import { formatFechaHora } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SupabaseRequest, Address, Vendor, Profile, AccountManager, Project } from "@/data/types";
import { useAccountManagers } from "@/hooks/use-account-managers";
import { useProjects } from "@/hooks/use-projects";
import { useShippingAddresses, useBillingAddresses } from "@/hooks/use-addresses";
import { Button } from "@/components/ui/button";
import { Edit, Loader2 } from "lucide-react";
import { generateSignedUrl } from "@/utils/supabase-storage";
import { getFullName } from "@/hooks/use-profiles";
import { toast } from "sonner";
import { getRequestStatusLabel, getRequestStatusBadgeClass } from "@/lib/request-status";

interface RequestSummaryCardProps {
  request: SupabaseRequest;
  vendor?: Vendor;
  profiles?: Profile[];
  onEditDetails: () => void; // Nuevo prop para manejar la edición
  isEditable: boolean; // Nuevo prop para controlar si se puede editar
}

const formatAddress = (address: Address | undefined) => {
  if (!address) return "—";
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
  const { data: accountManagers } = useAccountManagers();
  const { data: projects } = useProjects();
  const { data: shippingAddresses } = useShippingAddresses();
  const { data: billingAddresses } = useBillingAddresses();
  const [isGeneratingQuoteUrl, setIsGeneratingQuoteUrl] = React.useState(false);

  const getRequesterName = (requesterId: string) => {
    const profile = profiles?.find(p => p.id === requesterId);
    return getFullName(profile);
  };

  const getAccountManagerName = (managerId: string | null) => {
    if (!managerId) return "—";
    const manager = accountManagers?.find(am => am.id === managerId); // Buscar en la nueva lista de Account Managers
    return manager ? `${manager.first_name} ${manager.last_name}` : "—";
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
      toast.error("No se pudo generar la URL firmada para el presupuesto.");
    }
  };

  const requesterName = getRequesterName(request.requester_id);
  const accountManagerName = getAccountManagerName(request.account_manager_id);

  const projectCodesDisplay = request.project_codes?.map(projectId => {
    const project = projects?.find(p => p.id === projectId); // Buscar en la nueva lista de Proyectos
    return project ? project.code : projectId;
  }).join(", ") || "—";

  const dateSubmitted = formatFechaHora(request.created_at);
  
  const shippingAddress = shippingAddresses?.find(a => a.id === request.shipping_address_id);
  const billingAddress = billingAddresses?.find(a => a.id === request.billing_address_id);
  
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0 pb-2">
        {/* El número ya está en el título de la página; aquí basta el proveedor. */}
        <CardTitle className="text-lg sm:text-2xl font-bold min-w-0">
          <span className="block text-sm font-medium text-muted-foreground">Proveedor</span>
          {vendor?.name || "—"}
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className={getRequestStatusBadgeClass(request.status)}>
            {getRequestStatusLabel(request.status)}
          </Badge>
          {isEditable && (
            <Button variant="outline" size="icon" onClick={onEditDetails} title="Editar detalles de la solicitud" aria-label="Editar detalles de la solicitud">
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Solicitante</p>
            <p className="font-medium">{requesterName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gerente de cuenta</p>
            <p className="font-medium">{accountManagerName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Códigos de proyecto</p>
            <p className="font-medium">{projectCodesDisplay}</p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Dirección de envío</p>
            {formatAddress(shippingAddress)}
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Dirección de facturación</p>
            {formatAddress(billingAddress)}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Fecha de envío</p>
            <p className="font-medium">{dateSubmitted}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Presupuesto</p>
            <p className="font-medium">
              {request.quote_url ? (
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={handleViewQuote} 
                  disabled={isGeneratingQuoteUrl}
                  className="p-0 h-auto text-blue-500 dark:text-blue-400"
                >
                  {isGeneratingQuoteUrl ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    "Ver presupuesto"
                  )}
                </Button>
              ) : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Número de PO</p>
            <p className="font-medium">{request.po_number || "—"}</p>
          </div>
        </div>

        {request.notes && (
          <>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Notas</p>
              <p className="text-sm italic text-muted-foreground">{request.notes}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RequestSummaryCard;