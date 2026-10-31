import React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { RequestStatus, SupabaseRequest, Vendor, Profile, AccountManager, Project, ShippingAddress, BillingAddress } from "@/data/types";
import { useRequests, useUpdateRequestStatus } from "@/hooks/use-requests";
import { useRequestEmails } from "@/hooks/use-request-emails";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import { useAccountManagers } from "@/hooks/use-account-managers";
import EmailDialog from "@/components/EmailDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import RequestListToolbar from "@/components/request-list/RequestListToolbar";
import RequestListTable from "@/components/request-list/RequestListTable";
import { toast } from "sonner";
import { useSession } from "@/components/SessionContextProvider";
import { useProjects } from "@/hooks/use-projects";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import MergeRequestsDialog from "@/components/MergeRequestsDialog";
import { useShippingAddresses, useBillingAddresses } from "@/hooks/use-addresses";
import { useReceiveWizard } from "@/components/ReceiveWizardProvider";
import { useSedeActiva } from "@/components/SedeContextProvider";
import { requestMatchesSede } from "@/lib/sedes";

// Definir el orden de prioridad de los estados
// Los números más bajos van ARRIBA (mayor prioridad de acción)
const STATUS_ORDER: Record<RequestStatus, number> = {
  "Pending": 1,
  "Quote Requested": 2,
  "PO Requested": 3,
  "Ordered": 4,
  "Received": 90, // Estados finales, muy baja prioridad
  "Denied": 91,
  "Cancelled": 92,
};

interface RequestListProps {
  /** Estado con el que arranca el filtro. Lo usa el panel para que al pulsar
   *  una fase del recorrido la lista aparezca ya filtrada por esa fase. */
  estadoInicial?: RequestStatus | "All" | "Active";
}

const RequestList: React.FC<RequestListProps> = ({ estadoInicial = "All" }) => {
  const navigate = useNavigate();
  const { session, profile } = useSession();
  const { sedeActiva } = useSedeActiva();
  const { data: requests, isLoading: isLoadingRequests, error: requestsError } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles();
  const { data: accountManagers, isLoading: isLoadingAccountManagers } = useAccountManagers();
  const { isLoading: isLoadingProjects } = useProjects();
  const { isLoading: isLoadingEmailTemplates } = useEmailTemplates();
  const { data: shippingAddresses, isLoading: isLoadingShippingAddresses } = useShippingAddresses();
  const { isLoading: isLoadingBillingAddresses } = useBillingAddresses();

  const updateStatusMutation = useUpdateRequestStatus();
  const correos = useRequestEmails();
  const { openReceive } = useReceiveWizard();

  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [filterStatus, setFilterStatus] = React.useState<RequestStatus | "All" | "Active">(estadoInicial);

  // Si el panel pide otra fase, el filtro la recoge sin dejar de ser editable
  // desde la barra de herramientas.
  React.useEffect(() => {
    setFilterStatus(estadoInicial);
  }, [estadoInicial]);

  const [isDenyDialogOpen, setIsDenyDialogOpen] = React.useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const [requestToModify, setRequestToModify] = React.useState<SupabaseRequest | null>(null);
  
  const [isMergeDialogOpen, setIsMergeDialogOpen] = React.useState(false);
  const [sourceRequestToMerge, setSourceRequestToMerge] = React.useState<SupabaseRequest | null>(null);

  const getRequesterName = (requesterId: string) => {
    const profile = profiles?.find(p => p.id === requesterId);
    return getFullName(profile);
  };

  const getAccountManagerName = (managerId: string | null) => {
    if (!managerId) return "—";
    const manager = accountManagers?.find(am => am.id === managerId);
    return manager ? `${manager.first_name} ${manager.last_name}` : "—";
  };

  const openQuoteAndPODetailsDialog = (request: SupabaseRequest) => {
    navigate(`/requests/${request.id}`);
  };

  const openOrderConfirmationDialog = (request: SupabaseRequest) => {
    navigate(`/requests/${request.id}`);
  };

  const handleMarkAsReceived = (request: SupabaseRequest) => {
    if (!request.items || request.items.length === 0) {
      toast.error("No se pueden recibir artículos.", { description: "La solicitud no tiene artículos." });
      return;
    }
    openReceive(request.id);
  };
  
  const numeroAModificar = requestToModify?.request_number || requestToModify?.id.substring(0, 8) || "";

  const handleDenyRequest = (request: SupabaseRequest) => {
    setRequestToModify(request);
    setIsDenyDialogOpen(true);
  };

  const handleCancelRequest = (request: SupabaseRequest) => {
    setRequestToModify(request);
    setIsCancelDialogOpen(true);
  };
  
  const confirmDenyRequest = async () => {
    if (requestToModify) {
      try {
        await updateStatusMutation.mutateAsync({ id: requestToModify.id, status: "Denied" });
      } catch {
        return; // la mutación ya avisa del error
      }
      setIsDenyDialogOpen(false);
      setRequestToModify(null);
    }
  };

  const confirmCancelRequest = async () => {
    if (requestToModify) {
      try {
        await updateStatusMutation.mutateAsync({ id: requestToModify.id, status: "Cancelled" });
      } catch {
        return; // la mutación ya avisa del error
      }
      setIsCancelDialogOpen(false);
      setRequestToModify(null);
    }
  };
  
  const handleMergeRequest = (request: SupabaseRequest) => {
    setSourceRequestToMerge(request);
    setIsMergeDialogOpen(true);
  };
  
  const mergeableRequests = React.useMemo(() => {
    if (!sourceRequestToMerge || !requests) return [];
    
    return requests.filter(req => 
      req.id !== sourceRequestToMerge.id && 
      req.vendor_id === sourceRequestToMerge.vendor_id &&
      (req.status === "Pending" || req.status === "Quote Requested" || req.status === "PO Requested")
    );
  }, [sourceRequestToMerge, requests]);

  const filteredAndSortedRequests = React.useMemo(() => {
    if (!requests) return [];

    const filtered = requests.filter(request => {
      const vendorName = vendors?.find(v => v.id === request.vendor_id)?.name || "";
      const requesterName = getRequesterName(request.requester_id);
      const accountManagerName = getAccountManagerName(request.account_manager_id);

      const matchesSearchTerm = searchTerm.toLowerCase() === "" ||
        request.items?.some(item =>
          item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.catalog_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
        ) ||
        vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accountManagerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.quote_url && request.quote_url.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (request.po_number && request.po_number.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesStatus = true;
      if (filterStatus === "All") {
        matchesStatus = true;
      } else if (filterStatus === "Active") {
        // Excluir Received, Denied, Cancelled
        matchesStatus = !["Received", "Denied", "Cancelled"].includes(request.status);
      } else {
        matchesStatus = request.status === filterStatus;
      }

      const matchesSede = requestMatchesSede(
        request.shipping_address_id,
        shippingAddresses,
        sedeActiva
      );

      return matchesSearchTerm && matchesStatus && matchesSede;
    });

    // Aplicar ordenación por estado y luego por fecha de creación (más reciente primero)
    return filtered.sort((a, b) => {
      const statusA = STATUS_ORDER[a.status] || 99;
      const statusB = STATUS_ORDER[b.status] || 99;

      if (statusA !== statusB) {
        return statusA - statusB; // Ordenar por prioridad de estado (1, 2, 3... arriba)
      }

      // Si los estados son iguales, ordenar por fecha de creación (más reciente primero)
      // Esto asegura que dentro de un mismo estado, el más reciente aparezca primero.
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [requests, searchTerm, filterStatus, vendors, profiles, accountManagers, shippingAddresses, sedeActiva]);

  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles || isLoadingAccountManagers || isLoadingProjects || isLoadingEmailTemplates || isLoadingShippingAddresses || isLoadingBillingAddresses) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando solicitudes...
      </div>
    );
  }

  if (requestsError) {
    return <div className="text-red-500 dark:text-red-400">Error al cargar solicitudes: {requestsError.message}</div>;
  }

  return (
    <div className="space-y-4">
      <RequestListToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
      />
      <RequestListTable
        requests={filteredAndSortedRequests}
        vendors={vendors}
        profiles={profiles}
        isUpdatingStatus={updateStatusMutation.isPending}
        onViewDetails={(id) => navigate(`/requests/${id}`)}
        onEnterQuoteDetails={openQuoteAndPODetailsDialog}
        onSendPORequest={correos.solicitarPo}
        onMarkAsOrdered={openOrderConfirmationDialog}
        onMarkAsReceived={handleMarkAsReceived}
        onDeny={handleDenyRequest}
        onCancel={handleCancelRequest}
        onMerge={handleMergeRequest}
        onSendQuoteRequest={correos.solicitarPresupuesto}
      />

      <EmailDialog {...correos.dialogProps} />
      
      {sourceRequestToMerge && (
        <MergeRequestsDialog
          isOpen={isMergeDialogOpen}
          onOpenChange={setIsMergeDialogOpen}
          sourceRequest={sourceRequestToMerge}
          mergeableRequests={mergeableRequests}
        />
      )}
      
      <ConfirmDialog
        open={isDenyDialogOpen}
        onOpenChange={setIsDenyDialogOpen}
        title={`Denegar la solicitud ${numeroAModificar}`}
        description="Quedará como denegada y ya no se podrá pedir."
        confirmLabel="Denegar"
        onConfirm={confirmDenyRequest}
        isPending={updateStatusMutation.isPending}
      />
      <ConfirmDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        title={`Cancelar la solicitud ${numeroAModificar}`}
        description={
          requestToModify?.status === "Ordered"
            ? "Ya está pedida: avisa tú al proveedor para anular el pedido. LabFlow no le manda ningún correo."
            : "Quedará como cancelada y saldrá de las solicitudes activas."
        }
        cancelLabel="No, mantener"
        confirmLabel="Sí, cancelar"
        onConfirm={confirmCancelRequest}
        isPending={updateStatusMutation.isPending}
      />
    </div>
  );
};

export default RequestList;