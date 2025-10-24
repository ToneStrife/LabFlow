"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod"; // Corregido: de '*s as z' a '* as z'
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Profile } from "@/hooks/use-profiles";

const accountManagerFormSchema = z.object({
  first_name: z.string().min(1, { message: "First name is required." }),
  last_name: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Must be a valid email address." }).min(1, { message: "Email is required." }),
});

export type AccountManagerFormValues = z.infer<typeof accountManagerFormSchema>;

interface AccountManagerFormProps {
  initialData?: Profile;
  onSubmit: (data: AccountManagerFormValues) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

const AccountManagerForm: React.FC<AccountManagerFormProps> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const form = useForm<AccountManagerFormValues>({
    resolver: zodResolver(accountManagerFormSchema),
    defaultValues: initialData ? {
      first_name: initialData.first_name || "",
      last_name: initialData.last_name || "",
      email: initialData.email || "",
    } : {
      first_name: "",
      last_name: "",
      email: "",
    },
  });

  const handleSubmit = (data: AccountManagerFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Doe" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="e.g., john.doe@example.com" {...field} disabled={isSubmitting || !!initialData} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              initialData ? "Save Changes" : "Invite Manager"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AccountManagerForm;