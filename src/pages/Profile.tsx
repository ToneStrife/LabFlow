"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProfileForm, { ProfileFormValues } from "@/components/ProfileForm";
import { useSession } from "@/components/SessionContextProvider";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Profile: React.FC = () => {
  const { session, profile, supabase, updateProfile } = useSession();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!session || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-lg">Loading profile...</p>
      </div>
    );
  }

  const initialData: ProfileFormValues = {
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    avatar_url: profile.avatar_url || "",
  };

  const handleSubmit = async (data: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
      await updateProfile(data);
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile.", {
        description: error.message || "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl text-center">Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initialData={initialData}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;