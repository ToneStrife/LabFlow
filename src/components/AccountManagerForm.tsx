"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { AccountManager } from "@/data/types";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Must be a valid email." }).optional().or(z.literal("")),
});

export type AccountManagerFormValues = z.infer<typeof formSchema>;

interface AccountManagerFormProps {
  initialData?: AccountManager;
  onSubmit: (data: AccountManagerFormValues) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

const AccountManagerForm: React.FC<AccountManagerFormProps> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const form = useForm<AccountManagerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || { name: "", email: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Smith" {...field} disabled={isSubmitting} />
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
              <FormLabel>Email (Optional)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="e.g., john.smith@example.com" {...field} disabled={isSubmitting} />
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
              initialData ? "Save Changes" : "Add Manager"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AccountManagerForm;