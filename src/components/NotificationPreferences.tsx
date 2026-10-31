import React from "react";
import { useSession } from "@/components/SessionContextProvider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useUserNotificationPreferences, useUpdateNotificationPreferences, availableStatusNotifications } from "@/hooks/use-notification-preferences";
import { useUpdateProfile } from "@/hooks/use-profiles";
import { Profile, RequestStatus } from "@/data/types";
import { getRequestStatusLabelLong } from "@/lib/request-status";
import PushManagerButton from "./PushManagerButton";
import { Button } from "@/components/ui/button";
import { useSedes } from "@/hooks/use-labs";
import { useGuardarSedeAlerta, useSedeAlertas, type CorreoAviso } from "@/hooks/use-sede-alertas";
import { gestionaPedidos } from "@/lib/permissions";

interface NotificationPreferencesProps {
  profile: Profile;
  isSubmittingProfile: boolean;
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ profile, isSubmittingProfile }) => {
  const { session } = useSession();
  const updateProfileMutation = useUpdateProfile();
  
  const { data: prefs, isLoading: isLoadingPrefs } = useUserNotificationPreferences(session?.user?.id);
  const updatePrefsMutation = useUpdateNotificationPreferences();
  const { data: sedes = [] } = useSedes();
  const { data: alertas = [] } = useSedeAlertas(session?.user?.id);
  const guardarAlerta = useGuardarSedeAlerta();
  const sigueSolicitudes = gestionaPedidos(profile.role) || Boolean(profile.is_owner);

  // Estados de Profile (tabla profiles)
  const [notifyStatusChangeMaster, setNotifyStatusChangeMaster] = React.useState(profile.notify_on_status_change ?? true);
  const [notifyNewRequest, setNotifyNewRequest] = React.useState(profile.notify_on_new_request ?? true);
  
  // Estado para la selección granular (tabla user_notification_preferences)
  const [selectedStatuses, setSelectedStatuses] = React.useState<RequestStatus[]>(prefs?.notified_statuses || []);

  React.useEffect(() => {
    setNotifyStatusChangeMaster(profile.notify_on_status_change ?? true);
    setNotifyNewRequest(profile.notify_on_new_request ?? true);
  }, [profile]);
  
  React.useEffect(() => {
    if (prefs) {
      setSelectedStatuses(prefs.notified_statuses || []);
    }
  }, [prefs]);
  
  const isSubmitting = isSubmittingProfile || updatePrefsMutation.isPending;

  const handleStatusToggle = (status: RequestStatus, checked: boolean) => {
    setSelectedStatuses(prev => {
      const newStatuses = checked 
        ? Array.from(new Set([...prev, status]))
        : prev.filter(s => s !== status);
      
      // Actualizar inmediatamente las preferencias de estado en la base de datos
      if (session?.user?.id) {
        updatePrefsMutation.mutate({
            userId: session.user.id,
            statuses: newStatuses,
        });
      }
      return newStatuses;
    });
  };
  
  const handleMasterToggle = (checked: boolean) => {
    setNotifyStatusChangeMaster(checked);
    if (session?.user?.id) {
        updateProfileMutation.mutate({
            id: session.user.id,
            data: { notify_on_status_change: checked },
        });
    }
  };
  
  const handleNewRequestToggle = (checked: boolean) => {
    setNotifyNewRequest(checked);
    if (session?.user?.id) {
        updateProfileMutation.mutate({
            id: session.user.id,
            data: { notify_on_new_request: checked },
        });
    }
  };

  if (isLoadingPrefs) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando preferencias...
      </div>
    );
  }

  return (
    <div className="space-y-4">
        {sigueSolicitudes && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Cuando entra una solicitud</h3>
            <p className="text-sm text-muted-foreground">
              El push y el correo van por separado, y cada sede se elige aparte. «Una vez al día» junta las de la jornada para el correo de las 18:00.
            </p>
            {sedes.map((sede) => {
              const aviso = alertas.find((item) => item.sede_id === sede.id);
              const push = aviso?.push ?? false;
              const correo: CorreoAviso = aviso?.correo ?? "none";
              const guardar = (parcial: Partial<{ push: boolean; correo: CorreoAviso }>) => {
                if (!session?.user?.id) return;
                guardarAlerta.mutate({
                  user_id: session.user.id,
                  sede_id: sede.id,
                  push: parcial.push ?? push,
                  correo: parcial.correo ?? correo,
                });
              };
              return (
                <div key={sede.id} className="rounded-md border p-3 space-y-2">
                  <p className="text-sm font-medium">{sede.name}</p>
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={`push-${sede.id}`}>Push</Label>
                    <Switch
                      id={`push-${sede.id}`}
                      checked={push}
                      onCheckedChange={(valor) => guardar({ push: valor })}
                      disabled={guardarAlerta.isPending}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button type="button" size="sm" variant={correo === "none" ? "default" : "outline"} onClick={() => guardar({ correo: "none" })}>
                      Sin correo
                    </Button>
                    <Button type="button" size="sm" variant={correo === "instant" ? "default" : "outline"} onClick={() => guardar({ correo: "instant" })}>
                      Al momento
                    </Button>
                    <Button type="button" size="sm" variant={correo === "daily" ? "default" : "outline"} onClick={() => guardar({ correo: "daily" })}>
                      Una vez al día
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <h3 className="text-lg font-semibold">Gestión de dispositivos push</h3>
        <PushManagerButton />
        
        <Separator />
        
        <h3 className="text-lg font-semibold">Preferencias de notificación</h3>
        
        {/* Interruptor Maestro */}
        <div className="flex items-center justify-between border p-3 rounded-md bg-muted/50">
            <Label htmlFor="notifyStatusChangeMaster" className="font-bold">
                Notificar cambios de estado de mis solicitudes
            </Label>
            <Switch
                id="notifyStatusChangeMaster"
                checked={notifyStatusChangeMaster}
                onCheckedChange={handleMasterToggle}
                disabled={isSubmitting}
            />
        </div>
        
        {/* Selección Granular de Estados */}
        <div className="space-y-2 pl-4 pt-2">
            <p className="text-sm font-medium text-muted-foreground">Notificarme cuando el estado de mi solicitud cambie a:</p>
            <div className="grid grid-cols-2 gap-3">
                {availableStatusNotifications.map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                            id={status}
                            checked={selectedStatuses.includes(status)}
                            onCheckedChange={(checked) => handleStatusToggle(status, !!checked)}
                            disabled={isSubmitting || !notifyStatusChangeMaster}
                        />
                        <Label htmlFor={status} className="text-sm">
                            {getRequestStatusLabelLong(status)}
                        </Label>
                    </div>
                ))}
            </div>
        </div>
        
        {profile.role === 'Admin' && (
            <div className="flex items-center justify-between pt-4">
                <Label htmlFor="notifyNewRequest">Notificar nuevas solicitudes pendientes (Solo Admin)</Label>
                <Switch
                    id="notifyNewRequest"
                    checked={notifyNewRequest}
                    onCheckedChange={handleNewRequestToggle}
                    disabled={isSubmitting}
                />
            </div>
        )}
    </div>
  );
};

export default NotificationPreferences;