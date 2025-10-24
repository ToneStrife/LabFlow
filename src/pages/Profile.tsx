"use client";

import React from "react";
import { useSession } from "@/components/SessionContextProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateProfile, getFullName } from "@/hooks/use-profiles"; // Import useUpdateProfile

const Profile: React.FC = () => {
  const { session, profile, loading, logout } = useSession();
  const updateProfileMutation = useUpdateProfile(); // Usar el hook de mutación

  const [firstName, setFirstName] = React.useState(profile?.first_name || "");
  const [lastName, setLastName] = React.useState(profile?.last_name || "");
  const [role, setRole] = React.useState(profile?.role || "");

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
      toast.error("User not logged in.");
      return;
    }
    updateProfileMutation.mutate({
      id: session.user.id,
      data: { first_name: firstName, last_name: lastName, email: session.user.email, role: profile?.role || "Requester" },
    });
  };

  const handleLogout = async () => {
    logout();
    toast.info("You have been logged out.");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading Profile...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Not Logged In</h1>
        <p className="text-lg text-muted-foreground">Please log in to view your profile.</p>
        <Button onClick={logout} className="mt-4">Simulate Login</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={session.user.email} disabled />
            </div>
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={updateProfileMutation.isPending}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={updateProfileMutation.isPending}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={role} disabled />
            </div>
            <Button type="submit" className="w-full" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Update Profile"
              )}
            </Button>
          </form>
          <Button variant="outline" onClick={handleLogout} className="w-full mt-4">
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;