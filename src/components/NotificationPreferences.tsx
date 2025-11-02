"use client";

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
import PushManagerButton from "./PushManagerButton";

interface NotificationPreferencesProps {
  profile: Profile;
  isSubmittingProfile: boolean;
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ profile, isSubmittingProfile }) => {
  const { session } = useSession();
  const updateProfileMutation = useUpdateProfile();
  
  // Hooks para preferencias de notificación de estado
  const { data: prefs, isLoading: isLoadingPrefs } = useUserNotificationPreferences(session?.user?.id);
  const updatePrefsMutation = useUpdateNotificationPreferences();

  // Estados de Profile (tabla profiles)
  const [notifyStatusChangeMaster, setNotifyStatusChangeMaster] = React.useState(profile.notify_on_status_change ?? true);
  const [notifyNewRequest, setNotifyNewRequest] = React.useState(profile.notify_on_new_request ?? true);
  
  // Estado para la selección granular (tabla user_notification_preferences)
  const [selectedStatuses, setSelectedStatuses] = React.useState<RequestStatus[]>(prefs?.notified_statuses || []);

  // Sincronizar estados locales con datos de hooks
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
            data: { notify_on_status_change: checked }, // Corrected property name
        });
    }
  };
  
  const handleNewRequestToggle = (checked: boolean) => {
    setNotifyNewRequest(checked);
    if (session?.user?.id) {
        updateProfileMutation.mutate({
            id: session.user.id,
            data: { notify_on_new_request: checked }, // Corrected property name
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
        <h3 className="text-lg font-semibold">Gestión de Dispositivos Push</h3>
        <PushManagerButton />
        
        <Separator />
        
        <h3 className="text-lg font-semibold">Preferencias de Notificación</h3>
        
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
                            {status}
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