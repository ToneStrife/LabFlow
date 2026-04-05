"use client";

import React from "react";
import { useSession } from "@/components/SessionContextProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useUpdateProfile } from "@/hooks/use-profiles";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import NotificationPreferences from "@/components/NotificationPreferences";
import { supabase } from "@/integrations/supabase/client";

const Profile: React.FC = () => {
  const { session, profile, loading, logout } = useSession();
  const updateProfileMutation = useUpdateProfile();
  const navigate = useNavigate();
  
  const [firstName, setFirstName] = React.useState(profile?.first_name || "");
  const [lastName, setLastName] = React.useState(profile?.last_name || "");
  const [newPassword, setNewPassword] = React.useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

  React.useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    
    await updateProfileMutation.mutateAsync({
      id: session.user.id,
      data: { first_name: firstName, last_name: lastName },
    });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsUpdatingPassword(false);

    if (error) {
      toast.error("Error al actualizar la contraseña: " + error.message);
    } else {
      toast.success("Contraseña actualizada correctamente.");
      setNewPassword("");
    }
  };
  
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!session || !profile) return null;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader><CardTitle>Información Personal</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={updateProfileMutation.isPending} className="w-full">
              {updateProfileMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : "Guardar Cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center"><Lock className="mr-2 h-5 w-5" /> Seguridad</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Mínimo 6 caracteres" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
              />
            </div>
            <Button type="submit" variant="outline" disabled={isUpdatingPassword} className="w-full">
              {isUpdatingPassword ? <Loader2 className="animate-spin mr-2" /> : "Establecer Nueva Contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notificaciones</CardTitle></CardHeader>
        <CardContent>
          <NotificationPreferences profile={profile} isSubmittingProfile={updateProfileMutation.isPending} />
        </CardContent>
      </Card>

      <Button variant="destructive" onClick={handleLogout} className="w-full">Cerrar Sesión</Button>
    </div>
  );
};

export default Profile;