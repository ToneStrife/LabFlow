"use client";

import React from "react";
import { useSession } from "@/components/SessionContextProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateProfile, getFullName } from "@/hooks/use-profiles";
import { useNavigate } from "react-router-dom";
import { Profile as ProfileType, RequestStatus } from "@/data/types";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useUserNotificationPreferences, useUpdateNotificationPreferences, availableStatusNotifications } from "@/hooks/use-notification-preferences"; // Importar nuevos hooks

const Profile: React.FC = () => {
  const { session, profile, loading, logout } = useSession();
  const updateProfileMutation = useUpdateProfile();
  const navigate = useNavigate();
  
  // Hooks para preferencias de notificación de estado
  const { data: prefs, isLoading: isLoadingPrefs } = useUserNotificationPreferences(session?.user?.id);
  const updatePrefsMutation = useUpdateNotificationPreferences();

  const [firstName, setFirstName] = React.useState(profile?.first_name || "");
  const [lastName, setLastName] = React.useState(profile?.last_name || "");
  const [role, setRole] = React.useState(profile?.role || "");
  
  // Estados de Profile (tabla profiles)
  const [notifyStatusChangeMaster, setNotifyStatusChangeMaster] = React.useState(profile?.notify_on_status_change ?? true);
  const [notifyNewRequest, setNotifyNewRequest] = React.useState(profile?.notify_on_new_request ?? true);
  
  // Estado para la selección granular (tabla user_notification_preferences)
  const [selectedStatuses, setSelectedStatuses] = React.useState<RequestStatus[]>(prefs?.notified_statuses || []);

  // Sincronizar estados locales con datos de hooks
  React.useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setRole(profile.role || "");
      setNotifyStatusChangeMaster(profile.notify_on_status_change ?? true);
      setNotifyNewRequest(profile.notify_on_new_request ?? true);
    }
  }, [profile]);
  
  React.useEffect(() => {
    if (prefs) {
      setSelectedStatuses(prefs.notified_statuses || []);
    }
  }, [prefs]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) {
      toast.error("Usuario no autenticado.");
      return;
    }
    
    const dataToUpdate = {
      first_name: firstName,
      last_name: lastName,
      role: profile?.role || "Requester",
      notify_on_status_change: notifyStatusChangeMaster, // Guardar el interruptor maestro
      notify_on_new_request: notifyNewRequest,
    };

    // 1. Actualizar la tabla profiles (nombre, rol, interruptores maestros)
    await updateProfileMutation.mutateAsync({
      id: session.user.id,
      data: dataToUpdate,
    });
    
    // 2. Actualizar la tabla user_notification_preferences (estados seleccionados)
    await updatePrefsMutation.mutateAsync({
        userId: session.user.id,
        statuses: selectedStatuses,
    });
  };
  
  const handleStatusToggle = (status: RequestStatus, checked: boolean) => {
    setSelectedStatuses(prev => {
      if (checked) {
        return Array.from(new Set([...prev, status]));
      } else {
        return prev.filter(s => s !== status);
      }
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isSubmitting = updateProfileMutation.isPending || updatePrefsMutation.isPending;

  if (loading || isLoadingPrefs) {
    return (
      <div className="p-4 sm:p-6 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando Perfil...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-4 sm:p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">No Has Iniciado Sesión</h1>
        <p className="text-lg text-muted-foreground">Por favor, inicia sesión para ver tu perfil.</p>
        <Button onClick={() => navigate("/login")} className="mt-4">Ir a Iniciar Sesión</Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Tu Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            
            {/* Sección de Información Básica */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Información Personal</h3>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={session.user.email || ''} disabled />
                </div>
                <div>
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rol</Label>
                  <Input id="role" value={role} disabled />
                </div>
            </div>
            
            <Separator />

            {/* Sección de Preferencias de Notificación */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Preferencias de Notificación Push</h3>
                
                {/* Interruptor Maestro */}
                <div className="flex items-center justify-between border p-3 rounded-md bg-muted/50">
                    <Label htmlFor="notifyStatusChangeMaster" className="font-bold">
                        Activar Notificaciones de Estado de Solicitud
                    </Label>
                    <Switch
                        id="notifyStatusChangeMaster"
                        checked={notifyStatusChangeMaster}
                        onCheckedChange={setNotifyStatusChangeMaster}
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
                
                {profile?.role === 'Admin' && (
                    <div className="flex items-center justify-between pt-4">
                        <Label htmlFor="notifyNewRequest">Notificar nuevas solicitudes pendientes (Solo Admin)</Label>
                        <Switch
                            id="notifyNewRequest"
                            checked={notifyNewRequest}
                            onCheckedChange={setNotifyNewRequest}
                            disabled={isSubmitting}
                        />
                    </div>
                )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                "Actualizar Perfil y Preferencias"
              )}
            </Button>
          </form>
          <Button variant="outline" onClick={handleLogout} className="w-full mt-4">
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;