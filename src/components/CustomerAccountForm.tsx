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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccountManagerProfiles } from "@/hooks/use-profiles";
import { Loader2 } from "lucide-react";

const customerAccountFormSchema = z.object({
  name: z.string().min(1, { message: "Account name is required." }),
  contactPerson: z.string().optional(),
  email: z.string().email({ message: "Must be a valid email address." }).optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  assignedManagerId: z.string().uuid({ message: "Invalid manager ID." }).optional().or(z.literal("")),
});

export type CustomerAccountFormValues = z.infer<typeof customerAccountFormSchema>;

interface CustomerAccountFormProps {
  initialData?: CustomerAccountFormValues;
  onSubmit: (data: CustomerAccountFormValues) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

const CustomerAccountForm: React.FC<CustomerAccountFormProps> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const { data: accountManagers, isLoading: isLoadingManagers } = useAccountManagerProfiles();

  const form = useForm<CustomerAccountFormValues>({
    resolver: zodResolver(customerAccountFormSchema),
    defaultValues: initialData || {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      notes: "",
      assignedManagerId: "",
    },
  });

  const handleSubmit = (data: CustomerAccountFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Biology Department" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactPerson"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Person (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Dr. Alice Smith" {...field} />
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
                <Input type="email" placeholder="e.g., alice.smith@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 555-123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="assignedManagerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned Account Manager (Optional)</FormLabel>
              <Select
                onValueChange={(selectedValue) => field.onChange(selectedValue === "unassigned" ? "" : selectedValue)}
                value={field.value || ""}
                disabled={isLoadingManagers}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingManagers ? "Loading managers..." : "Select an account manager"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="unassigned">No Manager</SelectItem> {/* Changed value */}
                  {accountManagers?.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.first_name} {manager.last_name} ({manager.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any specific details about this account..." {...field} />
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
              initialData ? "Save Changes" : "Add Account"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CustomerAccountForm;