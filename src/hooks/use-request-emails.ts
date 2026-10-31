import React from "react";
import { toast } from "sonner";
import { RequestStatus, SupabaseRequest } from "@/data/types";
import { useSendEmail, useUpdateRequestStatus } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles } from "@/hooks/use-profiles";
import { useAccountManagers } from "@/hooks/use-account-managers";
import { useProjects } from "@/hooks/use-projects";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { useShippingAddresses, useBillingAddresses } from "@/hooks/use-addresses";
import { useSession } from "@/components/SessionContextProvider";
import { useLabsCatalog } from "@/components/LabsCatalogProvider";
import type { EmailFormValues } from "@/components/EmailDialog";
import { buildStorageAttachment, EmailAttachment, normalizeAttachments } from "@/utils/email-attachments";
import { processNamedEmailTemplate } from "@/utils/email-templating";
import { pickEmailTemplate } from "@/lib/email-templates";
import { camposCorreoConGestor, correoSiGestorLab } from "@/lib/farmacia";

type NombrePlantilla = "Quote Request" | "PO Request" | "Order Confirmation";

/**
 * Los tres correos de una solicitud (presupuesto, PO y pedido) y el diálogo
 * que los envía. La lista del panel y la hoja de solicitud usan este hook,
 * así que el mismo botón prepara siempre el mismo correo.
 *
 * El estado de la solicitud solo avanza cuando el correo ha salido. Si el
 * envío falla, el diálogo sigue abierto para reintentar; si lo que falla es
 * el cambio de estado, el diálogo se cierra igualmente, para que reintentar
 * no vuelva a mandar el correo al proveedor.
 */
export const useRequestEmails = () => {
  const { profile } = useSession();
  const { memberships } = useLabsCatalog();
  const { data: vendors } = useVendors();
  const { data: profiles } = useAllProfiles();
  const { data: accountManagers } = useAccountManagers();
  const { data: projects } = useProjects();
  const { data: emailTemplates } = useEmailTemplates();
  const { data: shippingAddresses } = useShippingAddresses();
  const { data: billingAddresses } = useBillingAddresses();

  const sendEmailMutation = useSendEmail();
  const updateStatusMutation = useUpdateRequestStatus();

  const [isOpen, setIsOpen] = React.useState(false);
  const [initialData, setInitialData] = React.useState<Partial<EmailFormValues>>({});
  const [estadoAlEnviar, setEstadoAlEnviar] = React.useState<{
    requestId: string;
    status: RequestStatus;
  } | null>(null);

  const abrir = (datos: Partial<EmailFormValues>, estado: RequestStatus | null, requestId: string) => {
    setEstadoAlEnviar(estado ? { requestId, status: estado } : null);
    setInitialData(datos);
    setIsOpen(true);
  };

  const plantilla = (nombre: NombrePlantilla, labId: string | null | undefined) => {
    const encontrada = pickEmailTemplate(emailTemplates, nombre, labId);
    if (!encontrada) {
      toast.error(`Falta la plantilla de correo «${nombre}».`, {
        description: "Créala en Admin > Plantillas de correo.",
      });
    }
    return encontrada;
  };

  const contexto = (request: SupabaseRequest) => ({
    request,
    vendor: vendors?.find((v) => v.id === request.vendor_id),
    requesterProfile: profiles?.find((p) => p.id === request.requester_id),
    accountManager: accountManagers?.find((am) => am.id === request.account_manager_id),
    projects,
    profiles,
    actorProfile: profile,
    shippingAddress: shippingAddresses?.find((a) => a.id === request.shipping_address_id),
    billingAddress: billingAddresses?.find((a) => a.id === request.billing_address_id),
  });

  const correoGestor = (request: SupabaseRequest) =>
    correoSiGestorLab({
      shippingAddressId: request.shipping_address_id,
      addresses: shippingAddresses,
      requesterId: request.requester_id,
      actorId: profile?.id,
      personas: profiles,
      labId: request.lab_id,
      requestSedeId: request.sede_id,
      memberships,
    });

  const proveedor = (vendorId: string) => vendors?.find((v) => v.id === vendorId);
  const correoGerente = (managerId: string | null) =>
    accountManagers?.find((am) => am.id === managerId)?.email || "";

  const adjuntos = async (rutas: Array<string | null | undefined>) => {
    const forDialog: EmailAttachment[] = [];
    const forSend: EmailAttachment[] = [];
    for (const ruta of rutas) {
      if (!ruta) continue;
      const adjunto = await buildStorageAttachment(ruta);
      if (adjunto.forDialog.length === 0) {
        toast.warning("No se pudo previsualizar un adjunto, pero se enviará igualmente.");
      }
      forDialog.push(...adjunto.forDialog);
      forSend.push(...adjunto.forSend);
    }
    return { attachments: forDialog, attachmentsForSend: forSend };
  };

  const solicitarPresupuesto = async (request: SupabaseRequest) => {
    const especial = correoGestor(request);
    if (especial?.error) {
      toast.error(especial.error);
      return;
    }
    const tpl = plantilla("Quote Request", request.lab_id);
    if (!tpl) return;

    try {
      const { subject, body } = processNamedEmailTemplate(
        "Quote Request",
        tpl.subject_template,
        tpl.body_template,
        contexto({ ...request, status: "Quote Requested" })
      );
      const vendor = proveedor(request.vendor_id);
      const para = (vendor?.email_presupuesto || vendor?.email || "").trim();
      abrir({ ...camposCorreoConGestor(especial, para), subject, body }, "Quote Requested", request.id);
    } catch (error) {
      toast.error("No se pudo preparar el correo de presupuesto.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const solicitarPo = async (request: SupabaseRequest) => {
    if (!request.quote_url) {
      toast.error("Sube antes el presupuesto.", {
        description: "El correo de solicitud de PO lo lleva adjunto.",
      });
      return;
    }
    const especial = correoGestor(request);
    if (especial?.error) {
      toast.error(especial.error);
      return;
    }
    if (!especial && !request.account_manager_id) {
      toast.error("La solicitud no tiene gerente de cuenta.", {
        description: "Asígnalo en «Editar solicitud» para poder pedirle el PO.",
      });
      return;
    }
    const tpl = plantilla("PO Request", request.lab_id);
    if (!tpl) return;

    try {
      const { subject, body } = processNamedEmailTemplate(
        "PO Request",
        tpl.subject_template,
        tpl.body_template,
        contexto(request)
      );
      abrir(
        {
          ...camposCorreoConGestor(especial, correoGerente(request.account_manager_id)),
          subject,
          body,
          ...(await adjuntos([request.quote_url])),
        },
        "PO Requested",
        request.id
      );
    } catch (error) {
      toast.error("No se pudo preparar el correo de solicitud de PO.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const enviarPedido = async (request: SupabaseRequest) => {
    const tpl = plantilla("Order Confirmation", request.lab_id);
    if (!tpl) return;

    try {
      const { subject, body } = processNamedEmailTemplate(
        "Order Confirmation",
        tpl.subject_template,
        tpl.body_template,
        contexto(request)
      );
      const vendor = proveedor(request.vendor_id);
      abrir(
        {
          to: (vendor?.email_pedido || vendor?.email || "").trim(),
          subject,
          body,
          ...(await adjuntos([request.quote_url, request.po_url])),
        },
        request.status === "Ordered" ? null : "Ordered",
        request.id
      );
    } catch (error) {
      toast.error("No se pudo preparar el correo de pedido.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) setEstadoAlEnviar(null);
  };

  // Si el envío falla, la mutación ya avisa y el error sube al diálogo, que
  // se queda abierto con lo escrito.
  const onSend = async (emailData: EmailFormValues) => {
    await sendEmailMutation.mutateAsync({
      to: emailData.to!,
      subject: emailData.subject,
      body: emailData.body,
      fromName: emailData.fromName,
      from: emailData.from || undefined,
      attachments: normalizeAttachments(emailData.attachments),
    });

    const pendiente = estadoAlEnviar;
    setEstadoAlEnviar(null);
    setIsOpen(false);
    if (!pendiente) return;

    try {
      await updateStatusMutation.mutateAsync({ id: pendiente.requestId, status: pendiente.status });
    } catch {
      toast.warning("El correo sí se envió.", {
        description: "Cambia el estado a mano para no mandarlo dos veces.",
      });
    }
  };

  return {
    solicitarPresupuesto,
    solicitarPo,
    enviarPedido,
    dialogProps: {
      isOpen,
      onOpenChange,
      initialData,
      onSend,
      isSending: sendEmailMutation.isPending,
    },
  };
};
