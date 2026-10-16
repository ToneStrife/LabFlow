import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  apiGetSmtpAccounts,
  apiUpsertSmtpAccount,
  type SmtpAccountPublic,
  type UpsertSmtpAccountInput,
} from "@/integrations/api";

export type { SmtpAccountPublic };

export const useSmtpAccounts = () => {
  return useQuery<SmtpAccountPublic[], Error>({
    queryKey: ["smtp_accounts"],
    queryFn: apiGetSmtpAccounts,
  });
};

export const useUpsertSmtpAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertSmtpAccountInput) => apiUpsertSmtpAccount(input),
    onSuccess: (account) => {
      toast.success(`Cuenta SMTP de ${account.email} guardada.`);
      queryClient.invalidateQueries({ queryKey: ["smtp_accounts"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo guardar la cuenta SMTP.");
    },
  });
};
