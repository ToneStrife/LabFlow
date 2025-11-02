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
import { Separator } from "@/components/ui/separator";
import NotificationPreferences from "@/components/NotificationPreferences"; // Importar el nuevo componente

const Profile: React.FC = () => {
  const { session, profile, loading, logout } = useSession();
  const updateProfileMutation = useUpdateProfile();
  const navigate = useNavigate();
  
  const [firstName, setFirstName] = React.useState(profile?.first_name || "");
  const [lastName, setLastName] = React.useState(profile?.last_name || "");
  const [role, setRole] = React.useState(profile?.role || "");

  // Sincronizar estados locales con datos de hooks
  React.useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setRole(profile.role || "");
    }
  }, [profile]);

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
      // Las preferencias de notificación se manejan ahora en NotificationPreferences.tsx
    };

    // Actualizar solo la información básica del perfil (nombre, apellido)
    await updateProfileMutation.mutateAsync({
      id: session.user.id,
      data: dataToUpdate,
    });
  };
  
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isSubmitting = updateProfileMutation.isPending;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando Perfil...
      </div>
    );
  }

  if (!session || !profile) {
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
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                "Actualizar Información Personal"
              )}
            </Button>
          </form>
          
          <Separator />
          
          {/* Componente de Preferencias de Notificación */}
          <NotificationPreferences 
            profile={profile} 
            isSubmittingProfile={isSubmitting} 
          />
          
          <Button variant="outline" onClick={handleLogout} className="w-full mt-4">
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;